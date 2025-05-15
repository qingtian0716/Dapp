// 导入共享变量和函数
import { web3, contract, currentAccount, initWeb3, showToast } from '../script.js';
import { Web3Helper } from '../utils/web3Helper.js';
// 页面状态管理
const state = {
    studentId: null,
    studentName: null,
    isLoading: false
};

// 分页状态管理
const pageState = {
    currentPage: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
};

// 缓存管理
const cache = {
    scores: {
        data: null,
        timestamp: null,
        expirationTime: 5 * 60 * 1000 // 5分钟缓存过期
    },
    studentInfo: {
        data: null,
        timestamp: null,
        expirationTime: 30 * 60 * 1000 // 30分钟缓存过期
    }
};

// 科目配置
const SUBJECTS = {
    required: ['数学', '语文', '英语', '物理', '化学'],
    optional: ['生物', '历史', '地理', '政治']
};

// 检查Web3连接状态
async function checkWeb3Connection() {
    if (!web3 || !contract) {
        const connected = await initWeb3();
        if (!connected) {
            showToast('请先连接钱包', 'warning');
            return false;
        }
    }

    const accounts = await web3.eth.getAccounts();
    if (accounts.length === 0) {
        showToast('请先连接钱包', 'warning');
        return false;
    }

    return true;
}

// 验证学生身份
async function verifyStudentIdentity(studentId) {
    try {
        if (!await checkWeb3Connection()) return false;

        const studentName = await contract.methods.getStudentInfo(studentId).call();
        return studentName ? true : false;
    } catch (error) {
        console.error('身份验证失败:', error);
        return false;
    }
}

// 获取学生信息
async function getStudentInfo() {
    try {
        if (!await checkWeb3Connection()) return;

        const studentId = document.getElementById('queryStudentId').value;
        if (!studentId || isNaN(studentId)) {
            showToast('请输入有效的学号', 'warning');
            return;
        }

        // 检查缓存
        const now = Date.now();
        if (cache.studentInfo.data && 
            cache.studentInfo.data.id === studentId &&
            cache.studentInfo.timestamp && 
            (now - cache.studentInfo.timestamp < cache.studentInfo.expirationTime)) {
            updateStudentInfoDisplay(cache.studentInfo.data);
            return;
        }

        const studentName = await contract.methods.getStudentInfo(studentId).call();
        const studentData = { id: studentId, name: studentName };
        
        // 更新缓存
        cache.studentInfo.data = studentData;
        cache.studentInfo.timestamp = now;

        updateStudentInfoDisplay(studentData);
        showToast('学生信息获取成功', 'success');
    } catch (error) {
        handleContractError(error);
    }
}

// 更新学生信息显示
function updateStudentInfoDisplay(studentData) {
    document.getElementById('infoId').textContent = studentData.id;
    document.getElementById('infoName').textContent = studentData.name;
}

// 获取学生成绩
async function getMyScores() {
    if (state.isLoading || !await checkWeb3Connection()) return;
    
    try {
        state.isLoading = true;
        const scoreList = document.getElementById('myScoreList');
        scoreList.innerHTML = '';

        // 获取或验证学生ID
        if (!await initializeStudentId()) return;

        // 检查缓存
        const now = Date.now();
        if (cache.scores.data && cache.scores.timestamp && 
            (now - cache.scores.timestamp < cache.scores.expirationTime)) {
            displayScores(cache.scores.data);
            showToast('已加载缓存的成绩数据', 'info');
            return;
        }

        // 从API获取分页数据
        const response = await fetch(`/api/scores?studentId=${state.studentId}&page=${pageState.currentPage}&limit=${pageState.pageSize}`);
        if (!response.ok) {
            throw new Error('获取成绩数据失败');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || '获取成绩失败');
        }

        const { data, pagination } = result.data;
        
        // 更新分页状态
        Object.assign(pageState, {
            total: pagination.total,
            totalPages: pagination.totalPages,
            currentPage: pagination.currentPage
        });

        // 计算统计数据
        const totalScore = data.reduce((sum, { score }) => sum + score, 0);
        const averageScore = data.length > 0 ? (totalScore / data.length).toFixed(2) : '-';

        // 更新缓存
        cache.scores.data = data;
        cache.scores.timestamp = now;

        // 更新UI
        document.getElementById('lastUpdateTime').textContent = new Date(now).toLocaleString();
        document.getElementById('averageScore').textContent = averageScore;
        document.getElementById('subjectCount').textContent = data.length;

        // 显示成绩和分页控件
        displayScores(data);
        updatePagination();
        showToast('成绩加载完成', 'success');
    } catch (error) {
        handleContractError(error);
    } finally {
        state.isLoading = false;
    }
}

// 初始化学生ID
async function initializeStudentId() {
    if (state.studentId) return true;

    let studentId = localStorage.getItem('studentId');
    if (!studentId) {
        studentId = prompt('请输入您的学号:', '');
        if (!studentId || isNaN(studentId)) {
            showToast('请输入有效的学号', 'warning');
            return false;
        }
    }

    const isValidStudent = await verifyStudentIdentity(studentId);
    if (!isValidStudent) {
        if (await handleUnregisteredStudent(studentId)) {
            state.studentId = studentId;
            return true;
        }
        return false;
    }

    state.studentId = studentId;
    localStorage.setItem('studentId', studentId);
    return true;
}

// 处理未注册学生
async function handleUnregisteredStudent(studentId) {
    const registerNow = confirm('该学号未注册,是否立即注册？');
    if (!registerNow) return false;

    const studentName = prompt('请输入您的姓名:');
    if (!studentName) return false;

    try {
        await contract.methods.registerStudent(studentId, studentName)
            .send({from: currentAccount});
        showToast('注册成功！', 'success');
        return true;
    } catch (error) {
        handleContractError(error);
        return false;
    }
}

// 显示成绩数据
function displayScores(scoreData) {
    const scoreList = document.getElementById('myScoreList');
    if (!scoreData || scoreData.length === 0) {
        scoreList.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center;">暂无成绩数据</td>
            </tr>
        `;
        return;
    }

    const rows = scoreData.map(({subject, score, timestamp}) => `
        <tr>
            <td>${subject}</td>
            <td>${score}</td>
            <td>${new Date(timestamp).toLocaleString()}</td>
        </tr>
    `).join('');

    scoreList.innerHTML = rows;
}

// 更新分页控件
function updatePagination() {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';
    paginationContainer.innerHTML = `
        <button class="page-btn" ${pageState.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${pageState.currentPage - 1})">
            上一页
        </button>
        <span class="page-info">${pageState.currentPage} / ${pageState.totalPages}</span>
        <button class="page-btn" ${pageState.currentPage === pageState.totalPages ? 'disabled' : ''} onclick="changePage(${pageState.currentPage + 1})">
            下一页
        </button>
    `;

    const scoreTable = document.getElementById('myScoreTable');
    const existingPagination = document.querySelector('.pagination');
    if (existingPagination) {
        existingPagination.replaceWith(paginationContainer);
    } else {
        scoreTable.parentNode.insertBefore(paginationContainer, scoreTable.nextSibling);
    }
}

// 切换页码
async function changePage(newPage) {
    if (newPage < 1 || newPage > pageState.totalPages || pageState.currentPage === newPage) {
        return;
    }
    pageState.currentPage = newPage;
    await getMyScores();
}

// 导出成绩数据
function exportScores() {
    if (!cache.scores.data) {
        showToast('暂无成绩数据可导出', 'warning');
        return;
    }

    const csvContent = [
        ['科目', '分数', '录入时间'].join(','),
        ...cache.scores.data.map(({subject, score, timestamp}) =>
            [subject, score, new Date(timestamp).toLocaleString()].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `成绩单_${state.studentId}_${new Date().toLocaleDateString()}.csv`;
    link.click();
}

// 清除成绩缓存
function clearScoreCache() {
    cache.scores.data = null;
    cache.scores.timestamp = null;
    showToast('成绩缓存已清除', 'success');
}

// 统一的合约错误处理
function handleContractError(error) {
    const errorMessage = Web3Helper.handleContractError(error);
    showToast(errorMessage, error.message.includes('User denied transaction') ? 'warning' : 'error');
    if (error.message.includes('Student not found')) {
        showToast('学生不存在,请检查学号', 'error');
    } else {
        showToast(error.message || '操作失败', 'error');
    }
}

// 导出函数
export { getMyScores, getStudentInfo, exportScores, clearScoreCache, changePage };

// 设置全局函数
Object.assign(window, {
    getMyScores,
    getStudentInfo,
    exportScores,
    clearScoreCache,
    changePage
});