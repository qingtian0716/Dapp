/**
 * 数据处理和验证功能
 */

import { BigIntSerializer } from './config.js';
import { web3, contract } from './blockchain.js';

// 存储解析后的Excel数据
let excelData = null;

// 验证表单
function validateForm() {
    const studentId = document.getElementById('studentId').value;
    if (!studentId) {
        document.getElementById('setError').innerText = '请输入学号';
        return false;
    }

    const subjectNames = Array.from(document.getElementsByClassName('subject-name')).map(input => input.value);
    const scores = Array.from(document.getElementsByClassName('subject-score')).map(input => input.value);

    // 验证每个科目都有名称和成绩
    for (let i = 0; i < subjectNames.length; i++) {
        if (!subjectNames[i]) {
            document.getElementById('setError').innerText = `第${i + 1}个课程名称不能为空`;
            return false;
        }
        if (!scores[i]) {
            document.getElementById('setError').innerText = `第${i + 1}个课程成绩不能为空`;
            return false;
        }
        if (parseInt(scores[i]) < 0 || parseInt(scores[i]) > 100) {
            document.getElementById('setError').innerText = `第${i + 1}个课程成绩必须在0-100之间`;
            return false;
        }
    }

    document.getElementById('setError').innerText = '';
    return true;
}

// 生成结果表格的函数
function generateResultTable(studentId, subjectNames, scores) {
    // 计算平均分
    const totalScore = scores.reduce((sum, score) => sum + parseInt(score), 0);
    const averageScore = scores.length > 0 ? (totalScore / scores.length).toFixed(2) : 0;

    // 创建结果表格
    let tableHTML = `
        <h3>学号 ${studentId} 的成绩单</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>课程</th>
                    <th>成绩</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (let i = 0; i < subjectNames.length; i++) {
        tableHTML += `
            <tr>
                <td>${subjectNames[i]}</td>
                <td>${scores[i]}</td>
            </tr>
        `;
    }

    tableHTML += `
            </tbody>
            <tfoot>
                <tr>
                    <th>平均分</th>
                    <td>${averageScore}</td>
                </tr>
            </tfoot>
        </table>
    `;

    return tableHTML;
}

// 设置学生成绩
async function setValue() {
    if (!validateForm()) {
        return;
    }

    const studentId = document.getElementById('studentId').value;
    const subjectNames = Array.from(document.getElementsByClassName('subject-name')).map(input => input.value);
    const scores = Array.from(document.getElementsByClassName('subject-score')).map(input => parseInt(input.value));

    const accounts = await web3.eth.getAccounts();

    // Get current gas price
    const gasPrice = await web3.eth.getGasPrice();

    try {
        // 调用智能合约
        const tx = await contract.methods.set(studentId, subjectNames, scores).send({
            from: accounts[0],
            gasPrice: gasPrice
        });

        document.getElementById('transactionInfo').innerText = "交易哈希: " + tx.transactionHash;

        // 保存到数据库
        try {
            const response = await fetch('http://localhost:8080/api/students/single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: parseInt(studentId),
                    subjectNames,
                    scores
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message);
            }
        } catch (dbError) {
            console.error('保存到数据库失败:', dbError);
            document.getElementById('setError').innerText = "数据库保存失败: " + dbError.message;
        }
    } catch (error) {
        document.getElementById('setError').innerText = "交易失败: " + error.message;
        console.error(error);
    }
}

// 获取学生成绩
async function getValue() {
    const studentId = document.getElementById('queryStudentId').value;
    if (!studentId) {
        alert('请输入要查询的学号');
        return;
    }

    const resultsDiv = document.getElementById('results');

    try {
        // 首先尝试从区块链获取数据
        console.log('开始查询学生信息...');
        const queryParams = {
            studentId: studentId,
            contractAddress: contract._address,
            networkId: (await web3.eth.net.getId()).toString(),
            currentAccount: (await web3.eth.getAccounts())[0]
        };
        console.log('查询参数:', BigIntSerializer.stringify(queryParams));

        // 验证合约方法
        if (!contract.methods.get) {
            throw new Error('合约方法get不存在');
        }

        // 检查合约代码
        const code = await web3.eth.getCode(contract._address);
        if (code === '0x' || code === '0x0') {
            throw new Error('合约未部署或地址错误');
        }

        console.log('准备调用合约get方法...');
        const result = await contract.methods.get(studentId).call();
        console.log('原始查询结果:', BigIntSerializer.stringify(result));
        console.log('结果类型:', typeof result, Array.isArray(result) ? '是数组' : '不是数组');

        let exists, subjectNames, scores;

        // 尝试多种方式解析返回值
        if (Array.isArray(result)) {
            console.log('使用数组方式解析');
            [exists, subjectNames, scores] = result;
        } else if (typeof result === 'object') {
            console.log('使用对象方式解析');
            if ('0' in result && '1' in result && '2' in result) {
                exists = result['0'];
                subjectNames = result['1'];
                scores = result['2'];
            } else if ('exists' in result && 'subjectNames' in result && 'scores' in result) {
                exists = result.exists;
                subjectNames = result.subjectNames;
                scores = result.scores;
            } else {
                throw new Error('返回值格式不符合预期');
            }
        } else {
            throw new Error('无法识别的返回值类型');
        }

        console.log('解析后的数据:', BigIntSerializer.stringify({
            exists: exists,
            subjectNames: subjectNames,
            scores: scores
        }));

        if (!exists) {
            // 如果区块链没有找到数据，尝试从MySQL数据库获取
            try {
                console.log('区块链未找到数据，尝试从数据库查询...');
                const apiResponse = await fetch(`http://localhost:8080/api/students/${studentId}`);
                const apiResult = await apiResponse.json();

                if (apiResult.success) {
                    console.log('从数据库获取数据成功:', apiResult);

                    // 从数据库结果提取数据
                    exists = true;
                    subjectNames = apiResult.data.subject_names;
                    scores = apiResult.data.scores;

                    resultsDiv.innerHTML = `
                        <p class="info">数据来源: MySQL数据库</p>
                        ${generateResultTable(studentId, subjectNames, scores)}
                    `;
                    return;
                } else {
                    console.log('数据库也未找到数据:', apiResult);
                    resultsDiv.innerHTML = '<p>未找到该学号的学生信息</p>';
                    return;
                }
            } catch (dbError) {
                console.error('数据库查询失败:', dbError);
                resultsDiv.innerHTML = '<p>未找到该学号的学生信息</p>';
                return;
            }
        }

        if (!Array.isArray(subjectNames) || !Array.isArray(scores)) {
            throw new Error('科目名称或成绩数据格式错误');
        }

        // 显示区块链结果
        resultsDiv.innerHTML = `
            <p class="info">数据来源: 区块链</p>
            ${generateResultTable(studentId, subjectNames, scores)}
        `;

    } catch (error) {
        console.error('详细错误信息:', error);
        const debugInfo = {
            contractAddress: contract._address,
            networkId: (await web3.eth.net.getId()).toString(),
            hasCode: await web3.eth.getCode(contract._address) !== '0x',
            currentAccount: (await web3.eth.getAccounts())[0]
        };

        // 如果区块链查询失败，尝试从MySQL数据库获取
        try {
            console.log('区块链查询失败，尝试从数据库查询...');
            const apiResponse = await fetch(`http://localhost:8080/api/students/${studentId}`);
            const apiResult = await apiResponse.json();

            if (apiResult.success) {
                console.log('从数据库获取数据成功:', apiResult);

                // 从数据库结果提取数据
                const dbSubjectNames = apiResult.data.subject_names;
                const dbScores = apiResult.data.scores;

                if (Array.isArray(dbSubjectNames) && Array.isArray(dbScores)) {
                    resultsDiv.innerHTML = `
                        <p class="info">数据来源: MySQL数据库 (区块链查询失败)</p>
                        <p class="warning">区块链查询错误: ${error.message}</p>
                        ${generateResultTable(studentId, dbSubjectNames, dbScores)}
                    `;
                    return;
                }
            }
        } catch (dbError) {
            console.error('数据库查询也失败:', dbError);
        }

        // 如果两者都失败，显示错误信息
        document.getElementById('results').innerHTML = `
            <p class="error">查询失败: ${error.message}</p>
            <p>请检查以下内容：</p>
            <ul>
                <li>合约是否已正确部署（当前地址: ${contract._address}）</li>
                <li>是否已录入该学号的成绩</li>
                <li>网络连接是否正常（当前网络ID: ${await web3.eth.net.getId()}）</li>
                <li>MetaMask是否已解锁并选择了正确的网络</li>
                <li>ABI文件是否已更新</li>
                <li>数据库服务是否正常运行</li>
            </ul>
            <p>调试信息：</p>
            <pre>${BigIntSerializer.stringify(debugInfo)}</pre>
            <button onclick="window.location.reload()">刷新页面</button>
        `;
    }
}

// 检查数据库服务器连接状态
async function checkDatabaseConnection() {
    const databaseIcon = document.getElementById('databaseIcon');
    const databaseStatusText = document.getElementById('databaseStatusText');

    databaseIcon.textContent = '🔄';
    databaseIcon.className = 'status-icon connecting';
    databaseStatusText.textContent = '正在连接...';
    databaseStatusText.className = 'connecting';

    try {
        // 发送一个简单的请求以检查服务器是否在线
        const response = await fetch('http://localhost:8080/api/students/1', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // 只要服务器响应，就认为连接成功，不关心是否找到了学生
        if (response.ok || response.status === 404) {
            databaseIcon.textContent = '✅';
            databaseIcon.className = 'status-icon connected';
            databaseStatusText.textContent = '已连接';
            databaseStatusText.className = 'connected';
        } else {
            throw new Error(`服务器返回状态码 ${response.status}`);
        }
    } catch (error) {
        console.error('数据库服务器连接检查失败:', error);
        databaseIcon.textContent = '❌';
        databaseIcon.className = 'status-icon disconnected';
        databaseStatusText.textContent = '连接失败';
        databaseStatusText.className = 'disconnected';
    }
}

export {
    excelData,
    validateForm,
    generateResultTable,
    setValue,
    getValue,
    checkDatabaseConnection
};