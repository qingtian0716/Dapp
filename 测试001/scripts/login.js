// 导入必要的函数和变量
import { web3, contract, currentAccount, initializeWeb3 as initWeb3, connectWallet, selectRole } from '../utils/auth/wallet.js';
import { showToast } from '../utils/error.js';
import { Web3Helper } from '../utils/web3Helper.js';
import { getNetworkInfo } from "../utils/web3Utils.js"
// 页面元素
const elements = {
    connectWalletBtn: document.getElementById('connectWalletBtn'),
    roleSelection: document.getElementById('roleSelection'),
    studentRoleBtn: document.getElementById('studentRoleBtn'),
    teacherRoleBtn: document.getElementById('teacherRoleBtn'),
    adminRoleBtn: document.getElementById('adminRoleBtn'),
    networkIndicator: document.getElementById('networkIndicator')
};

// 统一错误处理函数
function handleError(error, customMessage = '') {
    console.error(customMessage || '操作失败:', error);
    const errorMessage = Web3Helper.handleContractError(error) || (customMessage ? `${customMessage}: ${error.message}` : error.message);
    showToast(errorMessage, error.message?.includes('User denied') ? 'warning' : 'error');
    return false;
}

// 初始化页面
async function initializePage() {
    try {
        // 初始化事件监听器
        initializeEventListeners();
        
        // 检查自动登录
        const savedAddress = localStorage.getItem('lastConnectedAddress');
        const savedRole = localStorage.getItem('userRole');
        
        if (savedAddress && savedRole) {
            const connected = await initWeb3();
            if (connected && currentAccount?.toLowerCase() === savedAddress.toLowerCase()) {
                await handleRoleSelection(savedRole, true);
                // 只有在成功连接钱包后才更新网络状态
                await updateNetworkStatus();
            } else {
                // 如果连接失败，清除本地存储的角色信息
                localStorage.removeItem('userRole');
                localStorage.removeItem('lastConnectedAddress');
                if (elements.roleSelection) {
                    elements.roleSelection.style.display = 'none';
                }
            }
        } else {
            // 更新网络状态为未连接
            if (elements.networkIndicator) {
                elements.networkIndicator.textContent = '未连接';
                elements.networkIndicator.className = 'network-indicator disconnected';
            }
        }
    } catch (error) {
        handleError(error, '页面初始化失败');
    }
}

// 处理角色选择
async function handleRoleSelection(role, isAutoLogin = false) {
    try {
        // 检查web3是否已初始化
        if (!web3) {
            showToast('请先连接钱包', 'warning');
            return false;
        }
        
        // 确保contract已初始化
        if (!contract) {
            showToast('智能合约未初始化，请先连接钱包', 'warning');
            return false;
        }
        
        // 先通过钱包地址进行API登录
        const loginSuccess = await loginWithWallet(currentAccount, role);
        if (!loginSuccess) {
            showToast('登录失败，请重试', 'error');
            return false;
        }
        
        const success = await selectRole(role);
        if (success) {
            if (!isAutoLogin) {
                showToast(`已选择${role}角色`, 'success');
            }
            
            // 根据角色跳转到相应页面
            setTimeout(() => {
                switch(role) {
                    case 'student':
                        window.location.href = 'student.html';
                        break;
                    case 'teacher':
                        window.location.href = 'teacher.html';
                        break;
                    case 'admin':
                        window.location.href = 'admin.html';
                        break;
                    default:
                        console.error('未知角色:', role);
                }
            }, 1000); // 延迟1秒跳转，让用户看到成功提示
        }
        return success;
    } catch (error) {
        return handleError(error, `选择${role}角色失败`);
    }
}

// 使用钱包地址进行API登录
async function loginWithWallet(walletAddress, role) {
    try {
        if (!walletAddress) {
            throw new Error('钱包地址不能为空');
        }
        
        // 使用API基础URL常量
        const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8080' : window.location.origin;
        const apiUrl = `${API_BASE_URL}/api/auth/wallet-login`;
        
        console.log('正在请求API:', apiUrl);
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ walletAddress }),
                credentials: 'include'
            });
            
            // 检查响应状态
            if (response.status === 405) {
                showToast('API服务器方法不允许，请检查服务器配置', 'error');
                return false;
            }
            
            // 尝试解析JSON响应
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('解析API响应失败:', jsonError);
                showToast('API响应格式错误', 'error');
                return false;
            }
            
            if (!response.ok) {
                // 如果用户不存在，尝试注册
                if (response.status === 404) {
                    return await registerUser(walletAddress, role);
                }
                throw new Error(data.message || '登录失败');
            }
            
            // 保存认证信息
            if (data.success && data.data) {
                const { token, refreshToken, expiresIn } = data.data;
                localStorage.setItem('jwtToken', token);
                localStorage.setItem('refreshToken', refreshToken);
                localStorage.setItem('tokenExpiry', (Date.now() + expiresIn * 1000).toString());
                localStorage.setItem('userRole', role);
                localStorage.setItem('walletAddress', walletAddress); // 存储钱包地址
                return true;
            }
            
            return false;
        } catch (fetchError) {
            // 处理网络错误
            console.error('API请求失败:', fetchError);
            showToast(`API请求失败: ${fetchError.message}`, 'error');
            return false;
        }
    } catch (error) {
        console.error('API登录失败:', error);
        showToast(`登录失败: ${error.message}`, 'error');
        return false;
    }
}

// 注册新用户
async function registerUser(walletAddress, role) {
    try {
        // 使用API基础URL常量
        const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8080' : window.location.origin;
        const apiUrl = `${API_BASE_URL}/api/auth/register`;
        console.log('正在请求注册API:', apiUrl);
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ walletAddress, role }),
                credentials: 'include'
            });
            
            // 检查响应状态
            if (response.status === 405) {
                showToast('API服务器方法不允许，请检查服务器配置', 'error');
                return false;
            }
            
            // 尝试解析JSON响应
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('解析API响应失败:', jsonError);
                showToast('API响应格式错误', 'error');
                return false;
            }
            
            if (!response.ok) {
                throw new Error(data.message || '注册失败');
            }
            
            // 注册成功后，再次尝试登录
            return await loginWithWallet(walletAddress, role);
        } catch (fetchError) {
            // 处理网络错误
            console.error('API请求失败:', fetchError);
            showToast(`API请求失败: ${fetchError.message}`, 'error');
            return false;
        }
    } catch (error) {
        console.error('用户注册失败:', error);
        showToast('注册失败: ' + error.message, 'error');
        return false;
    }
}

// 更新网络状态
async function updateNetworkStatus() {
    try {
        if (!web3) {
            console.log('Web3未初始化，无法获取网络状态');
            if (elements.networkIndicator) {
                elements.networkIndicator.textContent = '未连接';
                elements.networkIndicator.className = 'network-indicator disconnected';
            }
            return false;
        }
       
        try {
            const networkInfo = await getNetworkInfo();
            const networkDisplay = networkInfo.networkType ? `${networkInfo.networkType} (${networkInfo.chainId})` : '已连接';
            console.log('当前网络:', networkDisplay);
              if (elements.networkIndicator) {
                elements.networkIndicator.textContent = networkDisplay;
                elements.networkIndicator.className = 'network-indicator connected';
            }
            return true;
        } catch (networkError) {
            console.warn('获取网络信息失败:', networkError);
            if (elements.networkIndicator) {
                elements.networkIndicator.textContent = '网络错误';
                elements.networkIndicator.className = 'network-indicator error';
            }
            return false;
        }
    } catch (error) {
        if (elements.networkIndicator) {
            elements.networkIndicator.textContent = '状态未知';
            elements.networkIndicator.className = 'network-indicator disconnected';
        }
        return handleError(error, '获取网络状态失败');
    }
}

// 初始化事件监听器
function initializeEventListeners() {
    // 连接钱包按钮事件
    if (elements.connectWalletBtn) {
        elements.connectWalletBtn.addEventListener('click', async () => {
            try {
                elements.connectWalletBtn.disabled = true;
                const connected = await connectWallet();
                
                if (connected) {
                    localStorage.setItem('lastConnectedAddress', currentAccount);
                    if (elements.roleSelection) {
                        elements.roleSelection.style.display = 'block';
                    }
                    await updateNetworkStatus();
                }
            } catch (error) {
                handleError(error, '连接钱包失败');
            } finally {
                elements.connectWalletBtn.disabled = false;
            }
        });
    }

    // 角色选择按钮事件
    const roleButtons = {
        student: elements.studentRoleBtn,
        teacher: elements.teacherRoleBtn,
        admin: elements.adminRoleBtn
    };

    Object.entries(roleButtons).forEach(([role, button]) => {
        if (button) {
            button.addEventListener('click', async () => {
                // 禁用所有角色按钮
                Object.values(roleButtons).forEach(btn => {
                    if (btn) btn.disabled = true;
                });
                
                try {
                    await handleRoleSelection(role);
                } catch (error) {
                    handleError(error, `选择${role}角色失败`);
                } finally {
                    // 重新启用所有角色按钮
                    Object.values(roleButtons).forEach(btn => {
                        if (btn) btn.disabled = false;
                    });
                }
            });
        }
    });

    // MetaMask事件监听
    if (window.ethereum) {
        // 移除可能存在的旧事件监听器
        window.ethereum.removeAllListeners?.('accountsChanged');
        window.ethereum.removeAllListeners?.('chainChanged');
        
        // 添加新的事件监听器
        window.ethereum.on('accountsChanged', () => {
            localStorage.removeItem('lastConnectedAddress');
            localStorage.removeItem('userRole');
            if (elements.roleSelection) {
                elements.roleSelection.style.display = 'none';
            }
            if (elements.connectWalletBtn) {
                elements.connectWalletBtn.disabled = false;
            }
            updateNetworkStatus();
        });

        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializePage);
