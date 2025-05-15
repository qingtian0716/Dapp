/**
 * 交易操作助手 - 提供统一的合约调用和交易状态跟踪功能
 * 基于web3Helper.executeContractMethod实现每步操作上链
 */

import { Web3Helper } from '../utils/web3Helper.js';
import { showToast } from '../utils/error.js';

// 延迟获取Web3Helper实例，避免在页面加载时就尝试获取未初始化的实例
let web3Helper = null;

// 获取Web3Helper实例的函数
function getWeb3Helper() {
    if (!web3Helper) {
        try {
            web3Helper = Web3Helper.getInstance();
        } catch (error) {
            console.warn('Web3Helper尚未初始化，将在需要时再次尝试获取');
            return null;
        }
    }
    return web3Helper;
}

/**
 * 更新交易UI状态
 * @param {string} elementId - 进度条元素ID前缀
 * @param {string} stage - 交易阶段
 * @param {Object} data - 交易数据
 */
function updateTransactionUI(elementId, stage, data) {
    // 显示交易状态区域
    const statusContainer = document.getElementById(`${elementId}-transaction-status`);
    if (statusContainer) {
        statusContainer.style.display = 'block';
    }
    
    // 更新状态文本
    const statusElement = document.getElementById(`${elementId}-status`);
    if (statusElement) {
        statusElement.textContent = getStageText(stage);
        statusElement.className = `status-${stage}`;
    }
    
    // 更新交易哈希显示
    if (data && data.details && data.details.hash) {
        const hashElement = document.getElementById(`${elementId}-hash`);
        if (hashElement) {
            hashElement.textContent = `交易哈希: ${data.details.hash}`;
            hashElement.style.display = 'block';
        }
    }
    
    // 更新进度条
    updateProgressBar(`${elementId}-progress`, stage);
}

/**
 * 更新进度条
 * @param {string} progressBarId - 进度条元素ID
 * @param {string} stage - 交易阶段
 */
function updateProgressBar(progressBarId, stage) {
    const progressBar = document.getElementById(progressBarId);
    if (!progressBar) return;
    
    // 定义各阶段的进度百分比
    const stageProgress = {
        'preparing': 10,
        'submitted': 30,
        'mined': 60,
        'confirming': 80,
        'confirmed': 100,
        'success': 100,
        'error': 100,
        'failed': 100
    };
    
    // 更新进度条
    const progress = stageProgress[stage] || 0;
    progressBar.style.width = `${progress}%`;
    
    // 根据阶段设置颜色
    if (stage === 'error' || stage === 'failed') {
        progressBar.style.backgroundColor = '#ff4d4d';
    } else if (stage === 'confirmed' || stage === 'success') {
        progressBar.style.backgroundColor = '#4caf50';
    } else {
        progressBar.style.backgroundColor = '#2196f3';
    }
}

/**
 * 获取交易阶段的文本描述
 * @param {string} stage - 交易阶段
 * @returns {string} - 阶段文本描述
 */
function getStageText(stage) {
    const stageTexts = {
        'preparing': '准备中...',
        'submitted': '交易已提交，等待打包...',
        'mined': '交易已被打包，等待确认...',
        'confirming': '交易确认中...',
        'confirmed': '交易已确认',
        'success': '交易成功',
        'error': '交易失败',
        'failed': '交易执行失败'
    };
    
    return stageTexts[stage] || stage;
}

/**
 * 显示交易历史记录
 * @param {string} containerId - 容器元素ID
 */
function displayTransactionHistory(containerId = 'tx-history-container') {
    try {
        // 从本地存储获取交易历史
        const txHistory = JSON.parse(localStorage.getItem('txHistory') || '[]');
        
        const historyContainer = document.getElementById(containerId);
        if (!historyContainer) return;
        
        if (txHistory.length === 0) {
            historyContainer.innerHTML = '<p>暂无交易记录</p>';
            return;
        }
        
        // 按时间倒序排列
        const sortedHistory = txHistory.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // 限制显示最近的10条记录
        const recentHistory = sortedHistory.slice(0, 10);
        
        historyContainer.innerHTML = '';
        
        recentHistory.forEach(tx => {
            const txElement = document.createElement('div');
            txElement.className = `tx-item tx-${tx.status}`;
            
            // 格式化时间
            const txTime = new Date(tx.timestamp).toLocaleString();
            
            // 构建HTML
            txElement.innerHTML = `
                <div class="tx-header">
                    <span class="tx-operation">${tx.operation}</span>
                    <span class="tx-status">${getStatusText(tx.status)}</span>
                </div>
                <div class="tx-details">
                    <div class="tx-hash">交易哈希: ${tx.hash.substring(0, 10)}...</div>
                    <div class="tx-time">时间: ${txTime}</div>
                    ${tx.blockNumber ? `<div class="tx-block">区块: ${tx.blockNumber}</div>` : ''}
                    ${tx.gasUsed ? `<div class="tx-gas">Gas消耗: ${tx.gasUsed}</div>` : ''}
                </div>
            `;
            
            historyContainer.appendChild(txElement);
        });
    } catch (error) {
        console.error('获取交易历史失败:', error);
    }
}

/**
 * 获取状态文本
 * @param {string} status - 交易状态
 * @returns {string} - 状态文本描述
 */
function getStatusText(status) {
    const statusMap = {
        'pending': '处理中',
        'success': '成功',
        'failed': '失败',
        'error': '错误'
    };
    return statusMap[status] || status;
}

/**
 * 添加教师 - 通过合约调用钱包进行上链操作
 * @param {string} teacherAddress - 教师钱包地址
 * @param {Function} onSuccess - 成功回调函数
 */
async function addTeacher(teacherAddress, onSuccess = null) {
    try {
        // 导入web3和contract
        const { web3, contract } = await import('../script.js');
        
        // 初始化Web3Helper
        Web3Helper.initialize(web3, contract);
        
        // 获取Web3Helper实例
        const helper = Web3Helper.getInstance();
        
        // 显示操作开始提示
        showToast('正在准备添加教师操作...', 'info');
        
        // 验证地址格式
        if (!helper.isValidAddress(teacherAddress)) {
            throw new Error('无效的钱包地址格式');
        }
        
        // 使用executeContractMethod执行合约方法，确保操作上链
        const result = await helper.executeContractMethod(
            'addTeacher',  // 合约方法名
            [teacherAddress], // 方法参数
            {
                operationName: '添加教师',  // 操作名称
                confirmationMessage: `您正在将地址 ${teacherAddress} 添加为教师，此操作将上链并消耗gas费用，是否确认？`,
                // 交易各阶段的回调函数
                onProgress: (progressInfo) => {
                    console.log('交易进度:', progressInfo);
                    // 更新UI
                    updateTransactionUI('teacher', progressInfo.stage, progressInfo);
                    
                    // 显示适当的提示
                    if (progressInfo.stage === 'confirmed') {
                        showToast('教师添加成功!', 'success');
                    } else if (progressInfo.stage === 'error') {
                        showToast(`添加失败: ${progressInfo.details.error.message}`, 'error');
                    }
                },
                onSuccess: (txResult) => {
                    console.log('交易成功:', txResult);
                    showToast(`教师添加成功: ${teacherAddress}`, 'success');
                    
                    // 检查是否有TeacherAdded事件
                    if (txResult.events.TeacherAdded) {
                        const eventData = txResult.events.TeacherAdded;
                        console.log('教师添加事件:', eventData);
                    }
                    
                    // 调用成功回调
                    if (onSuccess && typeof onSuccess === 'function') {
                        onSuccess(txResult);
                    }
                },
                onError: (error) => {
                    console.error('交易失败:', error);
                    showToast(`教师添加失败: ${error.error}`, 'error');
                }
            }
        );
        
        return result;
    } catch (error) {
        console.error('添加教师操作失败:', error);
        showToast(`操作失败: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * 添加学生 - 通过合约调用钱包进行上链操作
 * @param {number} studentId - 学生ID
 * @param {string} name - 学生姓名
 * @param {string} walletAddress - 学生钱包地址
 * @param {Function} onSuccess - 成功回调函数
 */
async function addStudent(studentId, name, walletAddress, onSuccess = null) {
    try {
        // 获取Web3Helper实例
        const helper = getWeb3Helper();
        if (!helper) {
            throw new Error('Web3Helper未初始化，请先连接钱包');
        }
        
        // 显示操作开始提示
        showToast('正在准备添加学生操作...', 'info');
        
        // 验证参数
        if (!studentId || !name) {
            throw new Error('学生ID和姓名不能为空');
        }
        
        if (!helper.isValidAddress(walletAddress)) {
            throw new Error('无效的钱包地址格式');
        }
        
        // 使用executeContractMethod执行合约方法，确保操作上链
        const result = await helper.executeContractMethod(
            'addStudent',  // 合约方法名
            [studentId, name, walletAddress], // 方法参数
            {
                operationName: '添加学生',  // 操作名称
                confirmationMessage: `您正在添加学生: ID=${studentId}, 姓名=${name}
此操作将上链并消耗gas费用，是否确认？`,
                // 交易各阶段的回调函数
                onProgress: (progressInfo) => {
                    console.log('交易进度:', progressInfo);
                    // 更新UI
                    updateTransactionUI('student', progressInfo.stage, progressInfo);
                    
                    // 显示适当的提示
                    if (progressInfo.stage === 'confirmed') {
                        showToast('学生添加成功!', 'success');
                    } else if (progressInfo.stage === 'error') {
                        showToast(`添加失败: ${progressInfo.details.error.message}`, 'error');
                    }
                },
                onSuccess: (txResult) => {
                    console.log('交易成功:', txResult);
                    // 检查是否有StudentAdded事件
                    if (txResult.events.StudentAdded) {
                        const eventData = txResult.events.StudentAdded;
                        console.log('学生添加事件:', eventData);
                    }
                    
                    // 调用成功回调
                    if (onSuccess && typeof onSuccess === 'function') {
                        onSuccess(txResult);
                    }
                }
            }
        );
        
        return result;
    } catch (error) {
        console.error('添加学生操作失败:', error);
        showToast(`操作失败: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * 更新学生成绩 - 通过合约调用钱包进行上链操作
 * @param {number} studentId - 学生ID
 * @param {string} subject - 科目
 * @param {number} score - 分数
 * @param {Function} onSuccess - 成功回调函数
 */
async function updateScore(studentId, subject, score, onSuccess = null) {
    try {
        // 获取Web3Helper实例
        const helper = getWeb3Helper();
        if (!helper) {
            throw new Error('Web3Helper未初始化，请先连接钱包');
        }
        
        // 显示操作开始提示
        showToast('正在准备更新成绩操作...', 'info');
        
        // 验证参数
        if (!studentId || !subject) {
            throw new Error('学生ID和科目不能为空');
        }
        
        if (isNaN(score) || score < 0 || score > 100) {
            throw new Error('分数必须在0-100之间');
        }
        
        // 使用executeContractMethod执行合约方法，确保操作上链
        const result = await helper.executeContractMethod(
            'updateScore',  // 合约方法名
            [studentId, subject, score], // 方法参数
            {
                operationName: '更新学生成绩',  // 操作名称
                confirmationMessage: `您正在更新学生(ID=${studentId})的${subject}成绩为${score}分
此操作将上链并消耗gas费用，是否确认？`,
                // 交易各阶段的回调函数
                onProgress: (progressInfo) => {
                    console.log('交易进度:', progressInfo);
                    // 更新UI
                    updateTransactionUI('score', progressInfo.stage, progressInfo);
                },
                onSuccess: (txResult) => {
                    console.log('交易成功:', txResult);
                    showToast(`成绩更新成功: ${subject} = ${score}分`, 'success');
                    
                    // 检查是否有ScoreUpdated事件
                    if (txResult.events.ScoreUpdated) {
                        const eventData = txResult.events.ScoreUpdated;
                        console.log('成绩更新事件:', eventData);
                    }
                    
                    // 调用成功回调
                    if (onSuccess && typeof onSuccess === 'function') {
                        onSuccess(txResult);
                    }
                },
                onError: (error) => {
                    console.error('交易失败:', error);
                    showToast(`成绩更新失败: ${error.error}`, 'error');
                }
            }
        );
        
        return result;
    } catch (error) {
        console.error('更新成绩操作失败:', error);
        showToast(`操作失败: ${error.message}`, 'error');
        throw error;
    }
}

// 添加教师交易处理
async function addTeacherTransaction(address, onSuccess) {
    try {
        const result = await contract.methods.addTeacher(address).send({ from: currentAccount });
        if (result.status && onSuccess) {
            await onSuccess();
        }
        return { success: true, result };
    } catch (error) {
        console.error('添加教师交易失败:', error);
        return { success: false, error };
    }
}

// 导出函数
export {
    addTeacherTransaction,
    addTeacher,
    addStudent,
    updateScore,
    displayTransactionHistory,
    updateTransactionUI,
    updateProgressBar,
    getStageText,
    getStatusText
};