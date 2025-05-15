// ===== 导入模块 =====
import { web3, contract, currentAccount, showToast } from '../script.js';
import { checkWeb3Connection, createCache } from '../utils/web3Utils.js';
import { Web3Helper } from '../utils/web3Helper.js';
import { addTeacherTransaction, displayTransactionHistory } from '../scripts/transactionHelper.js';

// ===== 常量配置 =====
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080' 
  : window.location.origin;

const teacherListCache = createCache(5 * 60 * 1000);
const ADMIN_ROLE = 1;

// ===== 状态管理 =====
const pageState = {
  isLoading: false,
  transactionQueue: new Set(),

  setLoading(loading) {
    this.isLoading = loading;
    document.querySelectorAll('.loading-indicator').forEach(el => {
      el.style.display = loading ? 'block' : 'none';
    });
  },

  addToQueue(txId) {
    this.transactionQueue.add(txId);
    this.updateTransactionStatus();
  },

  removeFromQueue(txId) {
    this.transactionQueue.delete(txId);
    this.updateTransactionStatus();
  },

  updateTransactionStatus() {
    const hasPending = this.transactionQueue.size > 0;
    document.querySelectorAll('.tx-pending').forEach(el => {
      el.style.display = hasPending ? 'inline' : 'none';
    });
  }
};

// ===== 工具函数 =====
const escapeHtml = (unsafe) => {
  return unsafe.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
};

const validateAddress = (address) => {
  if (!web3.utils.isAddress(address)) throw new Error('无效的钱包地址');
  if (address.toLowerCase() === currentAccount.toLowerCase()) {
    throw new Error('不能操作自己的账户');
  }
};

// ===== 权限验证 =====
async function checkAdminPermission() {
  try {
    if (!web3?.currentProvider) throw new Error('Web3未初始化');
    if (!contract?.methods) throw new Error('合约未初始化');

    const [contractAdmin, account] = await Promise.all([
      contract.methods.admin().call(),
      Web3Helper.getCurrentAccount()
    ]);

    if (!account) throw new Error('未检测到钱包账户');
    if (account.toLowerCase() !== contractAdmin.toLowerCase()) {
      throw new Error('只有管理员可以执行此操作');
    }

    return true;
  } catch (error) {
    handleContractError(error);
    return false;
  }
}

// ===== 教师管理：添加 =====
async function addTeacher() {
  const txId = Symbol('addTeacher');
  try {
    pageState.addToQueue(txId);

    if (!await checkAdminPermission()) return;

    const address = document.getElementById('teacherAddress').value.trim();
    validateAddress(address);

    await executeTeacherTransaction(address);

    document.getElementById('teacherAddress').value = '';
    teacherListCache.clear();
  } catch (error) {
    handleContractError(error);
  } finally {
    pageState.removeFromQueue(txId);
  }
}

async function executeTeacherTransaction(address) {
  const txResult = await addTeacherTransaction(address, async () => {
    await saveTeacherToDatabase(address);
    await loadAdminTeacherList();
  });

  showToast(txResult.success ? '操作成功' : '操作失败', txResult.success ? 'success' : 'error');
}

async function saveTeacherToDatabase(address) {
  const response = await fetch(`${API_BASE_URL}/api/teachers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      walletAddress: address,
      roleId: 2,
      status: 'active'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '保存教师信息失败');
  }
}

// ===== 教师管理：移除 =====
async function removeTeacher(address) {
  const txId = Symbol('removeTeacher');
  try {
    pageState.addToQueue(txId);

    if (!await checkAdminPermission()) return;

    const confirmed = confirm(`确定要移除教师：${address} 吗？`);
    if (!confirmed) return;

    const response = await fetch(`${API_BASE_URL}/api/teachers/${address}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '移除教师失败');
    }

    teacherListCache.clear();
    await loadAdminTeacherList();
    showToast('教师已移除', 'success');
  } catch (error) {
    handleContractError(error);
  } finally {
    pageState.removeFromQueue(txId);
  }
}

// ===== 教师列表：加载与渲染 =====
async function loadAdminTeacherList() {
  try {
    pageState.setLoading(true);
    const forceRefresh = teacherListCache.isExpired();
    const cachedData = forceRefresh ? null : teacherListCache.getData();

    if (!cachedData) {
      const freshData = await fetchTeacherData();
      teacherListCache.update(freshData);
      renderTeacherList(freshData);
    } else {
      renderTeacherList(cachedData);
    }
  } catch (error) {
    console.error('加载教师列表失败:', error);
    showToast('无法加载教师列表，请检查网络连接', 'error');
    renderFallbackUI();
  } finally {
    pageState.setLoading(false);
  }
}

async function fetchTeacherData() {
  try {
    const [adminAddress, events] = await Promise.all([
      contract.methods.admin().call(),
      contract.getPastEvents('TeacherAdded', { fromBlock: 0 })
    ]);

    const teachers = await Promise.all(events.map(async (event) => {
      try {
        const teacherAddress = event.returnValues?.teacher;
        if (!teacherAddress || !web3.utils.isAddress(teacherAddress)) return null;

        const isActive = await contract.methods.teachers(teacherAddress).call();
        return isActive ? teacherAddress : null;
      } catch {
        return null;
      }
    }));

    return {
      adminAddress: adminAddress || '',
      teachers: teachers.filter(Boolean)
    };
  } catch (error) {
    console.error('获取教师数据失败:', error);
    return { adminAddress: '', teachers: [] };
  }
}

function renderTeacherList(data) {
  const container = document.getElementById('teacherList');
  if (!container) return;

  const teachers = Array.isArray(data?.teachers) ? data.teachers : [];
  const adminAddress = data?.adminAddress || '';

  if (teachers.length === 0) {
    container.innerHTML = '<div class="no-teachers">暂无教师信息</div>';
    return;
  }

  container.innerHTML = teachers.map(address => {
    const isAdmin = address.toLowerCase() === adminAddress.toLowerCase();
    return `
      <div class="teacher-item">
        <span class="address">${escapeHtml(address)}</span>
        ${!isAdmin ? `
          <button class="btn-remove" onclick="removeTeacher('${escapeHtml(address)}')">移除</button>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ===== 辅助与调试 =====
function handleContractError(error) {
  const errorMap = {
    'User denied transaction': '用户取消了交易',
    'Only admin': '需要管理员权限',
    'Teacher exists': '该地址已是教师',
    'Web3未初始化': '请检查钱包连接状态',
    'contract未初始化': '智能合约加载失败',
    '未检测到钱包账户': '请先连接钱包账户',
    '获取账户信息失败': '无法获取账户信息',
    'Invalid address': '无效的钱包地址',
    'Returned error': '合约调用失败',
    'MetaMask': '请检查MetaMask状态',
    'Network Error': '网络连接异常'
  };

  let message = '操作失败，请检查控制台';

  const exactMatch = errorMap[error.message];
  if (exactMatch) {
    message = exactMatch;
  } else {
    const partialMatch = Object.entries(errorMap).find(([key]) =>
      error.message.toLowerCase().includes(key.toLowerCase())
    );
    if (partialMatch) {
      message = partialMatch[1];
    }
  }

  showToast(message, 'error');
  console.error('合约错误:', {
    message: error.message,
    code: error.code,
    stack: error.stack
  });
}

// ===== 初始化 =====
function bindEvents() {
  document.querySelector('#addTeacherBtn')?.addEventListener('click', addTeacher);
  document.querySelector('#refreshBtn')?.addEventListener('click', loadAdminTeacherList);
}

async function initialize() {
  await checkWeb3Connection();
  bindEvents();
  await loadAdminTeacherList();
  displayTransactionHistory();
}

// ===== 调试面板 =====
function createDebugPanel() {
  const panel = document.createElement('div');
  panel.style = 'position:fixed;bottom:0;right:0;background:#222;color:#fff;padding:10px;z-index:10000;';
  setInterval(() => {
    const state = {
      Web3Connected: !!web3?.currentProvider,
      ContractInitialized: !!contract?.methods,
      CurrentAccount: currentAccount,
      CacheStatus: teacherListCache.status()
    };
    panel.innerHTML = `<strong>系统监控面板</strong><pre>${JSON.stringify(state, null, 2)}</pre>`;
  }, 2000);
  document.body.appendChild(panel);
}

function renderFallbackUI() {
  const container = document.getElementById('teacherList');
  if (!container) return;
  container.innerHTML = `
    <div class="error-state">
      <h4>数据加载异常</h4>
      <ul>
        <li>检查网络连接</li>
        <li>刷新页面</li>
        <li>确认钱包已连接</li>
      </ul>
      <button onclick="location.reload()">立即刷新</button>
    </div>
  `;
}

// ===== DOM加载后启动 =====
document.addEventListener('DOMContentLoaded', () => {
  createDebugPanel();
  initialize();
});

// ===== 导出模块 =====
export {
  initialize as initializeAdmin,
  addTeacher,
  removeTeacher,
loadAdminTeacherList
};
