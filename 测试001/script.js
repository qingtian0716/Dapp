// 导入模块
import { Router } from './routes/router.js';
import { handleError, showToast } from './utils/error.js';
import { 
  web3,
  contract,
  currentAccount,
  initializeWeb3 as initWeb3,
  connectWallet,
  selectRole
} from './utils/auth/wallet.js';

// 声明实例
let router;

// 初始化应用
async function initializeApp() {
  try {
    // 初始化路由实例
    router = new Router();
    router.init();

    // 检查登录状态
    checkLoginStatus();

    // 初始化事件监听器
    setupEventListeners();

    // 检查Web3环境
    await checkWeb3Environment();
  } catch (error) {
    handleError(error, '应用初始化失败');
  }
}

// 检查登录状态
function checkLoginStatus() {
  const token = localStorage.getItem('jwtToken');
  const userRole = localStorage.getItem('userRole');
  
  if (!token) {
    showToast('请连接钱包并登录', 'info');
  } else if (userRole) {
    showToast(`欢迎回来，您的角色是: ${userRole}`, 'success');
  }
}

// 初始化事件监听器
function setupEventListeners() {
  // 初始化钱包连接按钮
  const connectWalletBtns = document.querySelectorAll('#connectWalletBtn, #connectWallet');
  connectWalletBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', connectWallet);
    }
  });

  // 设置MetaMask事件监听器
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
  }
}

// 检查Web3环境
async function checkWeb3Environment() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Web3未正确加载');
  }
}

// 处理账户变更事件
// 添加 updateCurrentAccount 函数
async function updateCurrentAccount(accounts) {
    try {
        currentAccount = accounts[0] || null;
        // 触发自定义事件，通知其他组件账户已更新
        window.dispatchEvent(new CustomEvent('accountChanged', { 
            detail: { account: currentAccount }
        }));
        
        // 更新UI显示
        const accountDisplay = document.getElementById('currentAccount');
        if (accountDisplay) {
            accountDisplay.textContent = currentAccount 
                ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}` 
                : '未连接';
        }
    } catch (error) {
        console.error('更新当前账户失败:', error);
        showToast('更新账户信息失败', 'error');
    }
}

// 修改 handleAccountsChanged 函数
async function handleAccountsChanged(accounts) {
    try {
        if (!Array.isArray(accounts)) {
            console.warn('收到的账户不是数组格式:', accounts);
            return;
        }

        await updateCurrentAccount(accounts);

        // 如果没有账户，可能是用户断开了连接
        if (accounts.length === 0) {
            showToast('请连接 MetaMask 钱包', 'warning');
            return;
        }

        // 账户切换成功提示
        if (accounts[0] !== currentAccount) {
            showToast('钱包账户已切换', 'info');
        }
    } catch (error) {
        console.error('处理账户变更失败:', error);
        showToast('处理账户变更失败', 'error');
    }
}

// 处理链变更事件
function handleChainChanged() {
  showToast('区块链网络已变更，正在刷新页面...', 'info');
  window.location.reload();
}

// 导出函数到全局作用域
window.connectWallet = connectWallet;
window.selectRole = selectRole;
window.showToast = showToast;

// 导出模块
export { web3, contract, currentAccount, initWeb3, connectWallet, selectRole ,showToast};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initializeApp);
// 在初始化时添加错误处理
ethereum.on('accountsChanged', (accounts) => {
  handleAccountsChanged(accounts).catch(error => {
      console.error('账户变更事件处理失败:', error);
      showToast('账户变更处理失败', 'error');
  });
});