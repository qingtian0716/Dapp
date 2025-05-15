// 导入路由管理器和共享变量
import { web3, contract, showToast, initWeb3, connectWallet } from '../script.js';
import { Web3Helper } from '../utils/web3Helper.js';
import { addStudent, updateScore, displayTransactionHistory } from '../scripts/transactionHelper.js';
// 导入数据库模型
import Student from '../models/Student.js';
import  Score  from '../models/Score.js'; 
import Teacher from '../models/Teacher.js';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 绑定钱包连接按钮
    document.getElementById('connectWalletBtn').addEventListener('click', () => {
        connectWallet().catch(error => {
            console.error('钱包连接失败:', error);
            showToast('钱包连接失败', 'error');
        });
    });
    
    // 绑定添加学生按钮
    document.getElementById('addStudentBtn').addEventListener('click', addStudentHandler);
    
    // 绑定更新成绩按钮
    document.getElementById('updateScoreBtn').addEventListener('click', updateScoreHandler);
    
    // 显示交易历史
    displayTransactionHistory('tx-history-container');
});

// 添加交易历史记录区域
const mainContainer = document.querySelector('.dashboard-container');
if (mainContainer) {
    const txHistoryCard = document.createElement('div');
    txHistoryCard.className = 'dashboard-card tx-history';
    txHistoryCard.innerHTML = `
        <h2 class="card-title">📜 交易历史</h2>
        <p>以下是您的交易历史记录，按时间倒序排列。</p>
        <div id="tx-history-container">
            <!-- 交易历史将在这里动态生成 -->
            <p>暂无交易记录</p>
        </div>
    `;
    mainContainer.appendChild(txHistoryCard);
}

// 验证教师身份函数
async function verifyTeacherIdentity() {
    try {
        if (!web3 || !contract) {
            const connected = await initWeb3();
            if (!connected) return false;
        }

        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) return false;

        // 检查当前账户是否为教师
        const isTeacher = await contract.methods.isTeacher(accounts[0]).call();
        if (!isTeacher) {
            showToast('您不是教师，无权执行此操作', 'error');
            return false;
        }
        return true;
    } catch (error) {
        console.error('教师身份验证失败:', error);
        showToast('身份验证失败', 'error');
        return false;
    }
}

// 更新学生成绩函数 - 实现区块链和数据库双重存储
async function updateScoreHandler() {
    try {
        // 验证教师身份
        if (!await verifyTeacherIdentity()) return;

        // 获取学生信息和成绩信息
        const studentId = document.getElementById('gradeStudentId').value;
        const subject = document.getElementById('subject').value;
        const score = document.getElementById('score').value;

        // 验证输入
        if (!studentId || isNaN(studentId)) {
            showToast('请输入有效的学号', 'warning');
            return;
        }

        if (!subject || subject.trim() === '') {
            showToast('请输入科目名称', 'warning');
            return;
        }

        if (!score || isNaN(score) || score < 0 || score > 100) {
            showToast('请输入有效的分数(0-100)', 'warning');
            return;
        }

        // 禁用按钮，防止重复提交
        document.getElementById('updateScoreBtn').disabled = true;

        try {
            // 先执行区块链操作
            await updateScore(parseInt(studentId), subject, parseInt(score), async () => {
                try {
                    // 同步保存到数据库
                    await Score.create({
                        studentId: parseInt(studentId),
                        subject: subject,
                        score: parseInt(score),
                        timestamp: new Date(),
                        teacherAddress: web3.eth.defaultAccount // 记录操作教师地址
                    });
                    
                    // 清空输入框
                    document.getElementById('gradeStudentId').value = '';
                    document.getElementById('subject').value = '';
                    document.getElementById('score').value = '';
                    
                    showToast('成绩已成功保存', 'success');
                    
                    // 刷新交易历史
                    setTimeout(() => {
                        displayTransactionHistory('tx-history-container');
                    }, 1000);
                } catch (dbError) {
                    console.error('数据库保存失败:', dbError);
                    showToast('数据库保存失败: ' + dbError.message, 'error');
                }
            });
        } catch (error) {
            handleContractError(error);
        } finally {
            // 启用按钮
            document.getElementById('updateScoreBtn').disabled = false;
        }
    } catch (error) {
        handleContractError(error);
    }
}

// 添加教师函数
async function addTeacher() {
    try {
        // 检查是否已连接Web3
        if (!web3 || !contract) {
            const connected = await initWeb3();
            if (!connected) {
                showToast('请先连接钱包', 'warning');
                return;
            }
        }

        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) {
            showToast('请先连接钱包', 'warning');
            return;
        }

        // 获取教师钱包地址
        const teacherAddress = document.getElementById('teacherAddress').value;

        // 验证钱包地址格式
        if (!teacherAddress || !web3.utils.isAddress(teacherAddress)) {
            showToast('请输入有效的钱包地址', 'warning');
            return;
        }

        // 调用智能合约添加教师
        await contract.methods.addTeacher(teacherAddress).send({from: accounts[0]});
        showToast('教师添加成功', 'success');

        // 清空输入框
        document.getElementById('teacherAddress').value = '';
        
        // 刷新教师列表
        await loadTeacherList();
    } catch (error) {
        console.error('添加教师失败:', error);
        
        // 处理常见的MetaMask错误
        if (error.message.includes('Internal JSON-RPC error')) {
            showToast('MetaMask连接错误,请检查网络连接并确保选择了正确的网络', 'error');
        } else if (error.message.includes('User denied transaction')) {
            showToast('您取消了交易', 'warning');
        } else if (error.message.includes('Only admin')) {
            showToast('只有管理员才能添加教师', 'error');
        } else if (error.message.includes('Invalid teacher')) {
            showToast('无效的教师地址或该地址已经是教师', 'error');
        } else {
            showToast('添加教师失败: ' + error.message, 'error');
        }
    }
}

// 加载教师列表函数
async function loadTeacherList() {
    try {
        // 检查是否已连接Web3
        if (!web3 || !contract) {
            const connected = await initWeb3();
            if (!connected) return;
        }

        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) return;

        // 获取教师列表容器
        const teacherListContainer = document.getElementById('teacherList');
        if (!teacherListContainer) return;

        // 清空列表
        teacherListContainer.innerHTML = '';

        try {
            // 从数据库获取教师列表
            const teachers = await Teacher.findAll({
                attributes: ['walletAddress', 'name', 'status'],
                where: { status: 'active' }
            });

            // 获取管理员地址
            const adminAddress = await contract.methods.admin().call();

            // 创建教师列表
            for (const teacher of teachers) {
                const isTeacherActive = await contract.methods.isTeacher(teacher.walletAddress).call();
                if (isTeacherActive) {
                    const teacherItem = document.createElement('div');
                    teacherItem.className = 'list-item';
                    teacherItem.innerHTML = `
                        <span class="item-icon">👨‍🏫</span>
                        <span class="item-text">${teacher.walletAddress}</span>
                        ${teacher.name ? `<span class="item-name">${teacher.name}</span>` : ''}
                        ${teacher.walletAddress.toLowerCase() === adminAddress.toLowerCase() ? 
                            '<span class="item-badge admin">管理员</span>' : 
                            '<span class="item-badge teacher">教师</span>'}
                    `;
                    teacherListContainer.appendChild(teacherItem);
                }
            }
        } catch (dbError) {
            console.error('从数据库获取教师列表失败:', dbError);
            // 如果数据库查询失败，尝试从区块链获取
            const adminAddress = await contract.methods.admin().call();
            if (adminAddress) {
                const teacherItem = document.createElement('div');
                teacherItem.className = 'list-item';
                teacherItem.innerHTML = `
                    <span class="item-icon">👨‍🏫</span>
                    <span class="item-text">${adminAddress}</span>
                    <span class="item-badge admin">管理员</span>
                `;
                teacherListContainer.appendChild(teacherItem);
            }
        }
    } catch (error) {
        console.error('加载教师列表失败:', error);
        showToast('加载教师列表失败', 'error');
    }
}

// 批量更新学生成绩函数
async function batchUpdateScores() {
    try {
        // 验证教师身份
        if (!await verifyTeacherIdentity()) return;

        // 获取批量更新的信息
        const studentId = document.getElementById('batchStudentId').value;
        const subjectsText = document.getElementById('batchSubjects').value;
        const scoresText = document.getElementById('batchScores').value;

        // 验证学生ID
        if (!studentId || isNaN(studentId)) {
            showToast('请输入有效的学号', 'warning');
            return;
        }

        // 解析科目和分数
        const subjects = subjectsText.split(',').map(subject => subject.trim());
        const scores = scoresText.split(',').map(score => score.trim());

        // 验证科目和分数数量是否匹配
        if (subjects.length !== scores.length) {
            showToast('科目和分数数量不匹配', 'warning');
            return;
        }

        // 验证分数是否有效
        for (let i = 0; i < scores.length; i++) {
            if (isNaN(scores[i]) || scores[i] < 0 || scores[i] > 100) {
                showToast(`第${i+1}个分数无效,请确保所有分数在0-100之间`, 'warning');
                return;
            }
        }

        // 显示处理中提示
        showToast('正在批量更新成绩...', 'info');

        // 批量更新成绩
        let successCount = 0;
        let failCount = 0;
        const teacherAddress = web3.eth.defaultAccount;

        for (let i = 0; i < subjects.length; i++) {
            try {
                // 更新区块链数据
                await contract.methods.updateScore(studentId, subjects[i], scores[i]).send({from: teacherAddress});
                
                // 同步更新数据库
                await Score.create({
                    studentId: parseInt(studentId),
                    subject: subjects[i],
                    score: parseInt(scores[i]),
                    timestamp: new Date(),
                    teacherAddress: teacherAddress
                });
                
                successCount++;
            } catch (error) {
                console.error(`更新${subjects[i]}成绩失败:`, error);
                failCount++;
            }
        }

        // 显示结果
        if (failCount === 0) {
            showToast(`成功更新了${successCount}个科目的成绩`, 'success');
        } else {
            showToast(`成功更新了${successCount}个科目的成绩,${failCount}个科目更新失败`, 'warning');
        }

        // 清空输入框
        document.getElementById('batchStudentId').value = '';
        document.getElementById('batchSubjects').value = '';
        document.getElementById('batchScores').value = '';

        // 刷新交易历史
        setTimeout(() => {
            displayTransactionHistory('tx-history-container');
        }, 1000);
    } catch (error) {
        handleContractError(error);
    }
}

// 统一处理合约错误的函数
function handleContractError(error) {
    console.error('合约操作失败:', error);
    const errorMessage = Web3Helper.handleContractError(error);
    showToast(errorMessage, error.message.includes('User denied transaction') ? 'warning' : 'error');
    if (error.message.includes('Student not found')) {
        showToast('学生不存在,请检查学号', 'error');
    } else if (error.message.includes('Only teacher')) {
        showToast('只有教师才能执行此操作', 'error');
    } else if (error.message.includes('Student already exists')) {
        showToast('该学号已被注册', 'error');
    } else {
        showToast('操作失败: ' + error.message, 'error');
    }
}

// 添加学生函数 - 实现区块链和数据库双重存储
async function addStudentHandler() {
    try {
        // 验证教师身份
        if (!await verifyTeacherIdentity()) return;

        // 获取学生信息
        const studentId = document.getElementById('studentId').value;
        const studentName = document.getElementById('studentName').value;
        const studentWallet = document.getElementById('studentWallet').value;

        // 验证输入
        if (!studentId || isNaN(studentId)) {
            showToast('请输入有效的学号', 'warning');
            return;
        }

        if (!studentName || studentName.trim() === '') {
            showToast('请输入学生姓名', 'warning');
            return;
        }

        if (!studentWallet || !web3.utils.isAddress(studentWallet)) {
            showToast('请输入有效的钱包地址', 'warning');
            return;
        }

        // 禁用按钮，防止重复提交
        document.getElementById('addStudentBtn').disabled = true;

        try {
            // 先执行区块链操作
            await addStudent(parseInt(studentId), studentName, studentWallet, async () => {
                try {
                    // 同步保存到数据库
                    await Student.create({
                        studentId: parseInt(studentId),
                        name: studentName,
                        walletAddress: studentWallet,
                        status: 'active',
                        createdBy: web3.eth.defaultAccount
                    });
                    
                    // 清空输入框
                    document.getElementById('studentId').value = '';
                    document.getElementById('studentName').value = '';
                    document.getElementById('studentWallet').value = '';
                    
                    showToast('学生信息已成功保存', 'success');
                    
                    // 刷新交易历史
                    setTimeout(() => {
                        displayTransactionHistory('tx-history-container');
                    }, 1000);
                } catch (dbError) {
                    console.error('数据库保存失败:', dbError);
                    showToast('数据库保存失败: ' + dbError.message, 'error');
                }
            });
        } catch (error) {
            handleContractError(error);
        } finally {
            // 启用按钮
            document.getElementById('addStudentBtn').disabled = false;
        }
    } catch (error) {
        handleContractError(error);
    }
}

// 获取学生信息函数 - 从数据库和区块链获取完整信息
async function getStudentInfo() {
    try {
        // 验证教师身份
        if (!await verifyTeacherIdentity()) return;

        const studentId = document.getElementById('queryStudentId').value;

        if (!studentId || isNaN(studentId)) {
            showToast('请输入有效学号', 'warning');
            return;
        }

        // 从数据库获取详细信息
        const studentData = await Student.findOne({
            where: { studentId: parseInt(studentId) }
        });

        if (studentData) {
            document.getElementById('infoId').textContent = studentId;
            document.getElementById('infoName').textContent = studentData.name;
            document.getElementById('infoWallet').textContent = studentData.walletAddress;
            document.getElementById('infoStatus').textContent = studentData.status;
            showToast('学生信息获取成功', 'success');
        } else {
            // 如果数据库中没有，尝试从区块链获取
            const studentName = await contract.methods.getStudentInfo(studentId).call();
            if (studentName) {
                document.getElementById('infoId').textContent = studentId;
                document.getElementById('infoName').textContent = studentName;
                document.getElementById('infoWallet').textContent = '未知';
                document.getElementById('infoStatus').textContent = '活跃';
                showToast('从区块链获取学生信息成功', 'success');
            } else {
                showToast('未找到该学生信息', 'error');
            }
        }
    } catch (error) {
        handleContractError(error);
    }
}

// 获取所有成绩函数 - 从数据库获取完整成绩记录
async function getAllScores() {
    try {
        // 验证教师身份
        if (!await verifyTeacherIdentity()) return;

        const studentId = document.getElementById('queryStudentId').value;

        if (!studentId || isNaN(studentId)) {
            showToast('请输入有效学号', 'warning');
            return;
        }

        const scoreList = document.getElementById('scoreList');
        scoreList.innerHTML = '';

        // 创建表格
        const table = document.createElement('table');
        table.className = 'grade-table';
        
        // 创建表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        ['科目', '分数', '录入时间', '录入教师'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // 创建表格主体
        const tbody = document.createElement('tbody');
        
        // 从数据库获取成绩记录
        const scores = await Score.findAll({
            where: { studentId: parseInt(studentId) },
            order: [['timestamp', 'DESC']],
            include: [{
                model: Teacher,
                attributes: ['name']
            }]
        });

        if (scores && scores.length > 0) {
            scores.forEach(score => {
                const row = document.createElement('tr');
                
                // 添加科目
                const subjectCell = document.createElement('td');
                subjectCell.textContent = score.subject;
                row.appendChild(subjectCell);
                
                // 添加分数
                const scoreCell = document.createElement('td');
                scoreCell.textContent = score.score;
                row.appendChild(scoreCell);
                
                // 添加时间
                const timeCell = document.createElement('td');
                timeCell.textContent = new Date(score.timestamp).toLocaleString();
                row.appendChild(timeCell);
                
                // 添加教师信息
                const teacherCell = document.createElement('td');
                teacherCell.textContent = score.Teacher ? score.Teacher.name : score.teacherAddress;
                row.appendChild(teacherCell);
                
                tbody.appendChild(row);
            });

            // 计算统计信息
            const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
            const averageScore = (totalScore / scores.length).toFixed(2);

            // 添加统计行
            const statsRow = document.createElement('tr');
            statsRow.className = 'stats-row';
            statsRow.innerHTML = `
                <td colspan="2">平均分: ${averageScore}</td>
                <td colspan="2">总科目数: ${scores.length}</td>
            `;
            tbody.appendChild(statsRow);
        } else {
            // 如果数据库中没有记录，尝试从区块链获取
            const subjects = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
            let hasScores = false;
            
            for (const subject of subjects) {
                try {
                    const score = await contract.methods.getScore(studentId, subject).call();
                    
                    if (score > 0) {
                        hasScores = true;
                        
                        const row = document.createElement('tr');
                        
                        // 添加科目
                        const subjectCell = document.createElement('td');
                        subjectCell.textContent = subject;
                        row.appendChild(subjectCell);
                        
                        // 添加分数
                        const scoreCell = document.createElement('td');
                        scoreCell.textContent = score;
                        row.appendChild(scoreCell);
                        
                        // 添加时间和教师信息（区块链数据可能没有这些信息）
                        row.appendChild(document.createElement('td'));
                        row.appendChild(document.createElement('td'));
                        
                        tbody.appendChild(row);
                    }
                } catch (error) {
                    console.error(`获取${subject}成绩失败:`, error);
                }
            }
            
            if (!hasScores) {
                const noDataRow = document.createElement('tr');
                noDataRow.innerHTML = '<td colspan="4" class="no-data">暂无成绩记录</td>';
                tbody.appendChild(noDataRow);
            }
        }
        
        table.appendChild(tbody);
        scoreList.appendChild(table);
    } catch (error) {
        handleContractError(error);
    }
}

// 暴露函数到全局
window.addStudent = addStudent;
window.getStudentInfo = getStudentInfo;
window.getAllScores = getAllScores;
window.updateScore = updateScore;
window.addTeacher = addTeacher;
window.loadTeacherList = loadTeacherList;
window.batchUpdateScores = batchUpdateScores;


// 导出函数,使其可以在模块环境中被调用
export { updateScore, addTeacher, loadTeacherList, batchUpdateScores, getStudentInfo, getAllScores };