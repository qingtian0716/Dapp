// 导入依赖
import { Router } from '../../routes/router.js';
import { routes, routeGuard } from '../../routes/index.js';
import { refreshAuthToken } from '../auth.js';
import { handleError, showToast } from '../error.js';
import { saveWalletEventToLocalStorage } from '../events.js';
import { Web3Helper } from '../web3Helper.js';

// API基础URL常量 - 使用当前页面的端口
const API_BASE_URL = window.location.origin;

// 连接钱包函数
async function connectWallet() {
  try {
    // 初始化Web3
    const initialized = await initializeWeb3();
    if (!initialized) return false;
    
    // 确保web3Helper已初始化
    if (!web3Helper) {
      web3Helper = Web3Helper.initialize(web3, contract);
      if (!web3Helper) {
        throw new Error('Web3Helper初始化失败');
      }
    }

    // 获取用户角色 - 这里不再从链上获取角色，而是在选择角色时通过API验证
    // 只检查钱包连接状态
    if (!currentAccount) {
      showToast('钱包连接失败，请重试', 'error');
      return false;
    }

    // 更新UI
    const walletAddressElement = document.getElementById('walletAddress');
    if (walletAddressElement) {
      walletAddressElement.textContent = currentAccount;
    }
    
    showToast(`钱包连接成功: ${currentAccount.substring(0, 8)}...`, 'success');
    return true;
  } catch (error) {
    handleError(error, '钱包连接失败');
    return false;
  }
}

// Web3实例
let web3;
let contract;
let currentAccount;
let web3Helper;

// 更新当前账户的函数
function updateCurrentAccount(account) {
  if (account && typeof account === 'string') {
    currentAccount = account;
    return true;
  }
  return false;
}

// Web3初始化函数
async function initializeWeb3() {
  if (typeof window.ethereum === 'undefined') {
    return handleError(new Error('请安装MetaMask钱包'));
  }

  try {
    // 初始化Web3实例
    web3 = new Web3(window.ethereum);

    // 请求用户账户
    const accounts = await requestAccounts();
    if (!accounts) return false;

    // 初始化智能合约
    const contractInitialized = await initializeContract();
    if (!contractInitialized) return false;

    // 注意：web3Helper的初始化已移至connectWallet函数中
    // 这样可以确保在使用web3Helper之前，合约已经初始化完成

    return true;
  } catch (error) {
    return handleError(error, 'Web3初始化失败');
  }
}

// 请求MetaMask账户
async function requestAccounts() {
  if (!window.ethereum) {
    throw new Error('MetaMask未安装');
  }

  try {
    const accounts = await Promise.resolve(window.ethereum.request({
      method: 'eth_requestAccounts'
    }));

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('无法获取MetaMask账户');
    }

    currentAccount = accounts[0];
    console.log('当前选择的MetaMask账户:', currentAccount);
    return accounts;
  } catch (error) {
    console.error('MetaMask账户请求失败:', error);
    return handleError(error, '获取MetaMask账户失败');
  }
}

// 初始化智能合约
async function initializeContract() {
  try {
    if (!web3 || !web3.eth) {
      throw new Error('Web3实例未正确初始化');
    }

    const abiPath = '/abi/YourCollectible_ABI.json';
    const addressPath = '/address/YourCollectible_address.json';

    const [abiResponse, addressResponse] = await Promise.all([
      fetch(abiPath),
      fetch(addressPath)
    ]);

    if (!abiResponse.ok) throw new Error('ABI文件加载失败');
    if (!addressResponse.ok) throw new Error('合约地址文件加载失败');

    const [contractABI, addressData] = await Promise.all([
      abiResponse.json(),
      addressResponse.json()
    ]);

    if (!addressData.contractAddress) {
      throw new Error('合约地址未定义或无效');
    }

    // 直接使用web3.utils验证地址格式，而不是依赖web3Helper
    if (!web3.utils.isAddress(addressData.contractAddress)) {
      throw new Error('无效的合约地址格式');
    }

    contract = new web3.eth.Contract(contractABI, addressData.contractAddress);
    
    if (!contract.methods) {
      throw new Error('合约实例初始化失败');
    }

    console.log('合约初始化成功,地址:', addressData.contractAddress);
    return true;
  } catch (error) {
    return Web3Helper.handleContractError(error);
  }
}

// 检查用户角色
async function checkUserRole(account) {
  // 首先尝试从本地存储获取角色（作为缓存）
  const cachedRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('jwtToken');
  
  // 如果有token和角色，尝试验证token
  if (token && cachedRole) {
    try {
      // 验证token
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // token有效，返回角色
        return cachedRole;
      } else {
        // token无效，清除本地存储
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('userRole');
      }
    } catch (error) {
      console.error('验证token失败:', error);
    }
  }
  
  // 尝试从API获取角色信息
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/role/${account.toLowerCase()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // 尝试刷新token
      try {
        const newToken = await refreshAuthToken();
        if (newToken) {
          // 使用新token重试
          const retryResponse = await fetch(`${API_BASE_URL}/api/users/role/${account.toLowerCase()}`, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            if (data.success && data.role) {
              localStorage.setItem('userRole', data.role);
              return data.role;
            }
          }
        }
      } catch (refreshError) {
        console.error('刷新token失败:', refreshError);
      }
      throw new Error('未授权，请重新登录');
    }

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.role) {
        localStorage.setItem('userRole', data.role);
        return data.role;
      }
    }
    
    throw new Error('获取角色信息失败');
  } catch (error) {
    console.error('从API获取角色失败:', error);
    // 如果有缓存角色，返回缓存角色
    if (cachedRole) {
      return cachedRole;
    }
    throw error;
  }
}

// 在后台验证用户角色，不影响主流程
async function validateRoleInBackground(account, cachedRole) {
  // 添加一个标志，避免在已知网络问题的情况下进行不必要的验证
  const hasNetworkIssue = localStorage.getItem('networkIssueDetected') === 'true';
  if (hasNetworkIssue) {
    console.log('检测到网络问题，跳过后台角色验证');
    return;
  }
  
  try {
    // 检查web3和contract是否已初始化
    if (!web3 || !contract || !web3Helper) {
      console.warn('Web3或合约未初始化，跳过后台角色验证');
      return;
    }
    
    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
    
    try {
      // 尝试从智能合约验证角色
      const validatedRole = await validateRoleFromContract(account);
      
      clearTimeout(timeoutId);
      
      // 如果验证成功且与缓存不同，更新缓存
      if (validatedRole && validatedRole !== cachedRole) {
        console.log('后台验证：角色已更新', validatedRole);
        localStorage.setItem('userRole', validatedRole);
        // 清除网络问题标志
        localStorage.removeItem('networkIssueDetected');
      }
    } catch (validationError) {
      clearTimeout(timeoutId);
      
      // 如果是RPC错误，设置网络问题标志
      if (validationError.message.includes('Internal JSON-RPC error')) {
        console.log('检测到RPC错误，标记网络问题');
        localStorage.setItem('networkIssueDetected', 'true');
        // 设置一个定时器，30分钟后清除网络问题标志
        setTimeout(() => {
          localStorage.removeItem('networkIssueDetected');
        }, 30 * 60 * 1000);
      }
      
      throw validationError;
    }
  } catch (error) {
    // 对于RPC错误，使用更简洁的日志
    if (error.message.includes('Internal JSON-RPC error')) {
      console.warn('后台角色验证失败: MetaMask RPC错误');
    } else {
      console.warn('后台角色验证失败:', error);
    }
    // 这里不抛出错误，因为是后台验证
  }
}

// 从智能合约验证角色
async function validateRoleFromContract(account) {
  try {
    // 添加超时控制
    const timeout = (ms) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error('合约操作超时')), ms)
    );
    
    // 检查管理员角色
    try {
      const adminAddress = await Promise.race([
        contract.methods.admin().call(),
        timeout(5000) // 5秒超时
      ]);
      if (account.toLowerCase() === adminAddress.toLowerCase()) {
        return 'admin';
      }
    } catch (adminError) {
      console.warn('管理员角色检查失败:', adminError);
      // 如果是RPC错误，直接抛出以便上层处理
      if (adminError.message.includes('Internal JSON-RPC error')) {
        throw adminError;
      }
      // 否则继续检查其他角色
    }
    
    // 检查教师角色
    try {
      const isTeacher = await Promise.race([
        contract.methods.teachers(account).call(),
        timeout(5000) // 5秒超时
      ]);
      if (isTeacher) {
        return 'teacher';
      }
    } catch (teacherError) {
      console.warn('教师角色检查失败:', teacherError);
      // 如果是RPC错误，直接抛出以便上层处理
      if (teacherError.message.includes('Internal JSON-RPC error')) {
        throw teacherError;
      }
      // 否则继续检查其他角色
    }
    
    // 检查学生角色
    let studentId = 1;
    const maxAttempts = 30; // 进一步减少最大尝试次数以提高性能
    
    while (studentId <= maxAttempts) {
      try {
        const student = await Promise.race([
          contract.methods.getStudentInfo(studentId).call(),
          timeout(5000) // 5秒超时
        ]);
        if (student.walletAddress.toLowerCase() === account.toLowerCase()) {
          return 'student';
        }
        studentId++;
      } catch (error) {
        if (error.message.includes('Student not found')) {
          break;
        }
        if (error.message.includes('Internal JSON-RPC error') || 
            error.message.includes('操作超时')) {
          throw error; // 对于RPC错误或超时，直接抛出
        }
        // 其他错误继续尝试下一个学生ID
        console.warn(`检查学生ID ${studentId} 失败:`, error);
        studentId++;
      }
    }
    
    return null; // 未找到角色
  } catch (error) {
    console.error('智能合约角色验证失败:', error);
    throw error;
  }
}

// 处理用户认证
async function processUserAuthentication(offlineMode = false) {
  try {
    let role;
    
    // 检查是否有网络问题标志
    const hasNetworkIssue = localStorage.getItem('networkIssueDetected') === 'true';
    
    // 如果检测到网络问题或明确指定离线模式，使用离线模式
    if (offlineMode || hasNetworkIssue) {
      console.log('使用离线模式进行用户认证' + (hasNetworkIssue ? ' (检测到网络问题)' : ''));
      role = localStorage.getItem('userRole');
      
      if (!role || !['admin', 'teacher', 'student'].includes(role)) {
        console.error('离线模式下没有有效的角色信息');
        return false;
      }
      
      // 在离线模式下，我们跳过API请求，直接使用缓存的角色
      localStorage.setItem('userRole', role);
      showToast(`离线模式：使用缓存的${role}角色`, 'info');
      
      // 如果是由于网络问题触发的离线模式，设置一个定时器，30分钟后清除网络问题标志
      if (hasNetworkIssue && !offlineMode) {
        setTimeout(() => {
          localStorage.removeItem('networkIssueDetected');
          console.log('网络问题标志已清除，下次将尝试在线模式');
        }, 30 * 60 * 1000);
      }
      
      return true;
    }
    let retryCount = 0;
    const maxRetries = 5; // 增加最大重试次数
    let backoffDelay = 1000; // 初始延迟时间，使用指数退避策略

    // 首先尝试从本地存储获取角色作为备选
    const cachedRole = localStorage.getItem('userRole');
    
    while (retryCount < maxRetries) {
      try {
        // 使用超时控制API请求
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
        
        try {
          const userResponse = await fetch(`${API_BASE_URL}/api/users/${currentAccount}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!userResponse.ok) {
            if (userResponse.status === 401) {
              try {
                await refreshAuthToken();
                retryCount++;
                continue;
              } catch (refreshError) {
                console.error('Token刷新失败:', refreshError);
                showToast('登录已过期，请重新登录', 'error');
                // 如果有缓存的角色，在token刷新失败的情况下也可以尝试使用
                if (cachedRole && ['admin', 'teacher', 'student'].includes(cachedRole)) {
                  console.log('使用缓存角色作为备选:', cachedRole);
                  role = cachedRole;
                  break;
                }
                return false;
              }
            }
            throw new Error(`请求失败: ${userResponse.status}`);
          }

          const userData = await userResponse.json();
          
          if (userData.exists) {
            role = userData.role;
            break;
          } else {
            // 如果用户不存在，尝试从智能合约获取角色
            try {
              role = await checkUserRole(currentAccount);
              break;
            } catch (contractError) {
              console.warn('从智能合约获取角色失败，尝试使用缓存:', contractError);
              // 如果智能合约调用也失败，但有缓存角色，则使用缓存角色
              if (cachedRole && ['admin', 'teacher', 'student'].includes(cachedRole)) {
                console.log('使用缓存角色作为备选:', cachedRole);
                role = cachedRole;
                break;
              }
              throw contractError; // 如果没有缓存角色，则继续抛出错误进行重试
            }
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.warn('API请求超时');
          }
          throw fetchError; // 重新抛出错误以进入重试逻辑
        }
      } catch (roleError) {
        console.error(`第${retryCount + 1}次尝试失败:`, roleError);
        retryCount++;
        
        // 如果是最后一次尝试失败，并且有缓存的角色，则使用缓存角色
        if (retryCount === maxRetries) {
          if (cachedRole && ['admin', 'teacher', 'student'].includes(cachedRole)) {
            console.log('所有尝试失败，使用缓存角色:', cachedRole);
            role = cachedRole;
            break;
          }
          showToast('获取用户角色失败，请稍后重试', 'error');
          return false;
        }
        
        // 使用指数退避策略增加等待时间
        backoffDelay = Math.min(backoffDelay * 1.5, 8000); // 最大不超过8秒
        console.log(`等待${backoffDelay}毫秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
    
    const previousRole = localStorage.getItem('userRole');

    if (!['admin', 'teacher', 'student'].includes(role)) {
      showToast('您没有访问权限,请联系管理员', 'error');
      return false;
    }

    try {
      // 如果是离线模式，跳过API请求
      if (offlineMode) {
        console.log('离线模式：跳过用户检查API请求');
        // 创建一个模拟的响应对象
        const mockData = { exists: false };
        // 直接使用本地存储的角色
        localStorage.setItem('userRole', role);
        return true;
      }
      
      const maxRetries = 3;
      let retryCount = 0;
      let response;
      let backoffDelay = 1000;
      let data;
      
      while (retryCount < maxRetries) {
        try {
          // 使用超时控制API请求
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
          
          try {
            response = await fetch(`${API_BASE_URL}/api/users/check/${currentAccount}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            data = await response.json();
            break;
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.warn('API请求超时');
            }
            throw fetchError; // 重新抛出错误以进入重试逻辑
          }
        } catch (error) {
          retryCount++;
          console.warn(`用户检查API请求失败(${retryCount}/${maxRetries}):`, error);
          
          if (retryCount === maxRetries) {
            // 最后一次尝试失败，但不立即抛出错误
            console.error('数据库连接失败，将使用本地缓存');
            // 创建一个模拟的响应，假设用户不存在
            data = { exists: false };
            break;
          }
          
          // 使用指数退避策略
          backoffDelay = Math.min(backoffDelay * 1.5, 5000);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }

      // 如果是离线模式或者我们使用了模拟数据，跳过用户注册
      if (offlineMode) {
        console.log('离线模式：跳过用户注册');
        localStorage.setItem('userRole', role);
        return true;
      }
      
      if (!data.exists) {
        const username = `user_${currentAccount.slice(2, 8)}`;
        const userData = {
          username,
          walletAddress: currentAccount,
          role,
          name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
          status: 'active',
          lastLogin: new Date().toISOString(),
          roleVerified: true
        };

        if (role === 'student') {
          userData.studentId = `ST${Date.now().toString().slice(-6)}`;
        }

        retryCount = 0;
        let backoffDelay = 1000;
        let registrationSuccess = false;
        
        while (retryCount < maxRetries) {
          try {
            // 使用超时控制API请求
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
            
            try {
              const createResponse = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                },
                body: JSON.stringify(userData),
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);

              if (!createResponse.ok) {
                const errorData = await createResponse.json();
                throw new Error(errorData.message || '用户注册失败');
              }

              showToast('用户信息已成功登记', 'success');
              registrationSuccess = true;
              break;
            } catch (fetchError) {
              clearTimeout(timeoutId);
              if (fetchError.name === 'AbortError') {
                console.warn('用户注册API请求超时');
              }
              throw fetchError; // 重新抛出错误以进入重试逻辑
            }
          } catch (error) {
            retryCount++;
            console.warn(`用户注册第${retryCount}次尝试失败:`, error);
            
            if (retryCount === maxRetries) {
              console.error('用户注册失败，将继续使用本地角色');
              // 即使注册失败，我们也可以继续使用本地角色
              // 不抛出错误，而是记录日志并继续
              break;
            }
            
            // 使用指数退避策略
            backoffDelay = Math.min(backoffDelay * 1.5, 8000);
            console.log(`等待${backoffDelay}毫秒后重试注册...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }
        
        // 即使注册失败，我们也保存角色到本地存储
        if (!registrationSuccess) {
          console.log('用户注册失败，但仍将使用角色:', role);
          showToast('用户信息登记失败，将使用离线模式', 'warning');
        }
      } else {
        await fetch(`${API_BASE_URL}/api/users/${currentAccount}/login`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      if (previousRole && previousRole !== role) {
        localStorage.removeItem('walletEvents');
        localStorage.removeItem('jwtToken');
        showToast(`您的角色已从${previousRole}变更为${role}`, 'info');
      }

      const currentPath = window.location.pathname;
      const rolePath = `/${role}`;
      
      if (!currentPath.includes(rolePath)) {
        showToast(`正在跳转到${role}页面...`, 'info');
        await handleRoleNavigation(role);
        return true;
      }

      localStorage.setItem('userRole', role);
      showToast(`钱包连接成功,您的角色是: ${role}`, 'success');

      // 尝试向后端发送钱包地址，但不阻塞主流程
      try {
        // 使用Promise.allSettled代替Promise.all，这样即使部分请求失败也不会影响整体流程
        const results = await Promise.allSettled([
          sendWalletAddressToBackend(currentAccount, 'walletConnected'),
          sendWalletAddressToBackend(currentAccount, 'roleAssigned', { role })
        ]);
        
        // 检查结果，但只记录日志，不影响主流程
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(`后端通信部分失败(${index}):`, result.reason);
          }
        });
      } catch (error) {
        console.error('后端通信完全失败:', error);
        // 即使后端通信失败，我们也继续流程
      }

      // 尝试登录，但添加回退策略
      try {
        const loginSuccess = await loginUser(currentAccount, role);
        if (!loginSuccess) {
          // 登录失败，但如果是离线模式，我们仍然返回成功
          if (offlineMode) {
            console.log('离线模式：跳过登录验证');
            return true;
          }
          
          // 如果不是离线模式但登录失败，尝试使用离线模式
          console.warn('登录验证失败，尝试使用离线模式');
          localStorage.setItem('userRole', role); // 确保角色已保存
          showToast('登录验证失败，将使用离线模式', 'warning');
          return true; // 仍然返回成功，让用户可以继续使用
        }
      } catch (loginError) {
        console.error('登录过程发生错误:', loginError);
        // 如果登录过程出错，但我们有角色信息，仍然可以继续
        localStorage.setItem('userRole', role);
        showToast('登录过程出错，将使用离线模式', 'warning');
      }

      return true;
    } catch (error) {
      console.error('用户认证处理失败:', error);
      return handleError(error, '用户认证失败');
    }
  } catch (error) {
    return handleError(error, '角色检测或登录失败');
  }
}

// 处理角色导航
async function handleRoleNavigation(role) {
  try {
    const roleRoute = routes[role];
    if (!roleRoute || !roleRoute.path) {
      throw new Error(`无效的${role}角色路由配置`);
    }
    const targetPath = roleRoute.path;

    const currentPath = window.location.pathname;

    if (currentPath === targetPath) {
      console.log('用户已在对应角色页面');
      return true;
    }

    const routeCheck = routeGuard(roleRoute, role);
    if (!routeCheck.allowed) {
      throw new Error(routeCheck.message || '无访问权限');
    }

    if (!router) {
      router = new Router();
      router.init();
    }

    console.log(`正在导航到${role}页面: ${targetPath}`);
    const success = await router.navigate(targetPath);
    if (success) {
      console.log(`已成功导航到${role}页面: ${targetPath}`);
      return true;
    } else {
      throw new Error(`导航到${role}页面失败`);
    }
  } catch (error) {
    console.error('角色导航错误:', error);
    showToast(error.message, 'error');
    return false;
  }
}

// 更新钱包UI
function updateWalletUI() {
  document.querySelectorAll('[id="walletAddress"]').forEach(element => {
    element.textContent = currentAccount;
  });

  document.querySelectorAll('#connectWalletBtn').forEach(btn => {
    if (btn.querySelector('.btn-text')) {
      btn.querySelector('.btn-text').textContent = '已连接';
    } else {
      btn.textContent = '已连接';
    }
  });
}

// 根据角色更新UI
function updateUIByRole(role) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.style.display = 'inline-block';
  });

  if (role !== 'admin') {
    const adminElements = [
      '.user-info-card',
      '.teacher-management-card',
      '.system-monitor-card',
      '.system-log-card',
      '.settings-card'
    ];

    adminElements.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        element.style.display = 'none';
      });
    });
  }
}

// 验证JWT Token
function validateToken() {
  const token = localStorage.getItem('jwtToken');
  if (!token) {
    console.warn('未找到认证令牌,请先登录');
    return null;
  }
  return token;
}

// 检查事件是否重复
function isEventDuplicate(lastEvent, address, eventType) {
  return lastEvent &&
    lastEvent.eventType === eventType &&
    lastEvent.walletAddress === address &&
    (new Date().getTime() - new Date(lastEvent.timestamp).getTime()) < 300000;
}

// 发送钱包地址到后端
async function sendWalletAddressToBackend(address, eventType = 'connect', additionalData = {}) {
  try {
    const token = validateToken();
    if (!token) return false;

    const recentEvents = JSON.parse(localStorage.getItem('walletEvents') || '[]');
    const lastEvent = recentEvents[recentEvents.length - 1];

    if (isEventDuplicate(lastEvent, null, address, eventType)) {
      console.log('跳过重复事件:', eventType);
      return;
    }

    const eventData = {
      walletAddress: address,
      eventType: eventType,
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    saveWalletEventToLocalStorage(eventData);

    const response = await fetch(`${API_BASE_URL}/api/wallet/address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(eventData)
    });

    if (response.status === 401 || response.status === 403) {
      console.warn('认证失败或无权限,请重新登录');
      localStorage.removeItem('jwtToken');
      window.location.href = '/login';
      return;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (data.success) {
        console.log('钱包地址已发送到后端:', address);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('发送钱包地址失败:', error);
    showToast('发送钱包地址失败，请稍后重试', 'error');
    return false;
  }
}

// 选择角色函数
async function selectRole(role) {
  try {
    if (!currentAccount) {
      showToast('请先连接钱包', 'warning');
      return false;
    }

    if (!['admin', 'teacher', 'student'].includes(role)) {
      showToast('无效的角色选择', 'error');
      return false;
    }
    
    // 首先检查本地存储的角色信息作为备选
    const cachedRole = localStorage.getItem('userRole');
    
    // 检查是否有网络问题标志
    const hasNetworkIssue = localStorage.getItem('networkIssueDetected') === 'true';
    
    // 如果检测到网络问题且有缓存角色与请求角色匹配，直接使用离线模式
    if (hasNetworkIssue && cachedRole === role) {
      console.log('检测到网络问题，直接使用离线模式');
      const offlineSuccess = await processUserAuthentication(true);
      if (offlineSuccess) {
        showToast(`使用缓存角色: ${role}（离线模式）`, 'info');
        return true;
      }
    }
    
    // 确保web3Helper已初始化
    if (!web3Helper) {
      if (!web3 || !contract) {
        try {
          const initialized = await initializeWeb3();
          if (!initialized) {
            // Web3初始化失败，但如果有缓存角色且与请求角色匹配，仍可继续
            if (cachedRole === role) {
              console.log('Web3初始化失败，使用缓存角色:', cachedRole);
              // 标记网络问题
              localStorage.setItem('networkIssueDetected', 'true');
              // 尝试使用缓存角色进行身份验证
              const offlineSuccess = await processUserAuthentication(true);
              if (offlineSuccess) {
                showToast(`使用缓存角色: ${role}（离线模式）`, 'info');
                return true;
              }
            }
            showToast('Web3初始化失败', 'error');
            return false;
          }
        } catch (initError) {
          console.error('Web3初始化错误:', initError);
          // 如果是RPC错误且有缓存角色，尝试使用缓存
          if ((initError.message.includes('Internal JSON-RPC error') || 
               initError.message.includes('Failed to fetch') || 
               initError.message.includes('ERR_CONNECTION_REFUSED')) && 
              cachedRole === role) {
            console.log('检测到连接错误，使用缓存角色:', cachedRole);
            // 标记网络问题
            localStorage.setItem('networkIssueDetected', 'true');
            const offlineSuccess = await processUserAuthentication(true);
            if (offlineSuccess) {
              showToast(`使用缓存角色: ${role}（离线模式）`, 'info');
              return true;
            }
          }
          showToast('Web3初始化失败: ' + initError.message, 'error');
          return false;
        }
      }
      
      try {
        web3Helper = Web3Helper.initialize(web3, contract);
        if (!web3Helper) {
          showToast('Web3Helper初始化失败', 'error');
          return false;
        }
      } catch (helperError) {
        console.error('Web3Helper初始化错误:', helperError);
        return false;
      }
    }

    // 尝试获取用户角色，添加重试逻辑
    let userRole = null;
    let retryCount = 0;
    const maxRetries = 3;
    let backoffDelay = 1000;
    
    while (retryCount < maxRetries && !userRole) {
      try {
        userRole = await checkUserRole(currentAccount);
        if (!userRole) {
          throw new Error('未获取到用户角色');
        }
      } catch (roleError) {
        console.warn(`获取角色第${retryCount + 1}次尝试失败:`, roleError);
        retryCount++;
        
        // 最后一次尝试失败，如果有缓存角色且与请求角色匹配，则使用缓存
        if (retryCount === maxRetries) {
          if (cachedRole === role) {
            console.log('角色验证失败，使用缓存角色:', cachedRole);
            userRole = cachedRole;
          } else {
            showToast('获取用户角色失败', 'error');
            return false;
          }
        } else {
          // 使用指数退避策略
          backoffDelay = Math.min(backoffDelay * 1.5, 5000);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    if (userRole !== role) {
      showToast('您没有该角色的权限', 'error');
      return false;
    }

    // 处理用户认证，添加离线模式参数
    const success = await processUserAuthentication(false);
    if (!success) {
      // 如果在线认证失败但角色匹配，尝试离线模式
      if (cachedRole === role) {
        console.log('在线认证失败，尝试离线模式');
        const offlineSuccess = await processUserAuthentication(true);
        if (offlineSuccess) {
          showToast(`使用缓存角色: ${role}（离线模式）`, 'info');
          return true;
        }
      }
      return false;
    }

    localStorage.setItem('userRole', role);
    localStorage.setItem('lastConnectedAddress', currentAccount);
    updateUIByRole(role);
    return true;
  } catch (error) {
    console.error('角色选择过程中发生错误:', error);
    // 如果有缓存角色且与请求角色匹配，在发生错误时尝试使用缓存
    const cachedRole = localStorage.getItem('userRole');
    if (cachedRole === role) {
      console.log('发生错误，尝试使用缓存角色:', cachedRole);
      try {
        const offlineSuccess = await processUserAuthentication(true);
        if (offlineSuccess) {
          showToast(`使用缓存角色: ${role}（离线模式）`, 'info');
          return true;
        }
      } catch (fallbackError) {
        console.error('离线模式也失败:', fallbackError);
      }
    }
    return handleError(error, '角色选择失败');
  }
}

// 导出模块
export {
  web3,
  contract,
  currentAccount,
  web3Helper,
  connectWallet,
  initializeWeb3,
  requestAccounts,
  initializeContract,
  checkUserRole,
  processUserAuthentication,
  handleRoleNavigation,
  updateWalletUI,
  updateUIByRole,
  sendWalletAddressToBackend,
  selectRole,
  updateCurrentAccount
};
