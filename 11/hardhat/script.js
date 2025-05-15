let web3;
let contract;
// 存储解析后的Excel数据
let excelData = null;

// Pinata API credentials
const pinataApiKey = '5ccde61cde3a4ca10373'; // Replace with your Pinata API key
const pinataSecretApiKey = '9537762a03a4a3e1fe0e5e5f8e0190f1c6fb4f6d6aae993864bef23a590a2e57'; // Replace with your Pinata Secret API key

// 添加时间戳以防止缓存
function addTimestamp(url) {
    return url + '?t=' + new Date().getTime();
}

// 初始化时检测连接状态
document.addEventListener('DOMContentLoaded', async function () {
    // 初始化Web3
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        try {
            await window.ethereum.enable();
            console.log('Web3已初始化');
            
            // 加载合约
            await initializeContract();
            
            // 添加课程按钮事件
            document.getElementById('addSubject').addEventListener('click', addSubjectRow);
            
            // 添加查询按钮事件
            document.getElementById('queryButton').addEventListener('click', queryStudentInfo);
        } catch (error) {
            console.error('初始化Web3失败:', error);
        }
    } else if (window.web3) {
        web3 = new Web3(window.web3.currentProvider);
        console.log('使用旧版Web3初始化');
    } else {
        console.warn('未检测到MetaMask或其他Web3提供者');
    }
    
    // 检查区块链连接
    checkBlockchainConnection();

    // 检查数据库服务器连接
    checkDatabaseConnection();
});

// 初始化合约
async function initializeContract() {
    try {
        // 使用时间戳防止缓存
        const abiResponse = await fetch(addTimestamp('./scripts/YourCollectible_ABI.json'));
        const contractABI = await abiResponse.json();
        console.log('加载的ABI:', contractABI);

        const addressResponse = await fetch(addTimestamp('./scripts/YourCollectible_address.json'));
        const addressData = await addressResponse.json();
        const contractAddress = addressData.contractAddress;
        console.log('合约地址:', contractAddress);

        // Initialize contract with ABI and address
        contract = new web3.eth.Contract(contractABI, contractAddress);

        // 显示合约信息
        console.log('合约初始化成功');
        console.log('合约方法:', Object.keys(contract.methods));
    } catch (error) {
        console.error('初始化合约失败:', error);
        alert('初始化合约失败，请刷新页面重试');
    }
}

// 添加课程行
function addSubjectRow() {
    const container = document.getElementById('subjects-container');
    const newRow = document.createElement('div');
    newRow.className = 'subject-row';

    const subjectSelect = document.createElement('select');
    subjectSelect.className = 'subject-name';
    subjectSelect.innerHTML = `
        <option value="">请选择课程</option>
        <option value="语文">语文</option>
        <option value="数学">数学</option>
        <option value="英语">英语</option>
        <option value="物理">物理</option>
        <option value="化学">化学</option>
        <option value="生物">生物</option>
        <option value="历史">历史</option>
        <option value="地理">地理</option>
        <option value="政治">政治</option>
        <option value="计算机">计算机</option>
        <option value="体育">体育</option>
        <option value="音乐">音乐</option>
        <option value="美术">美术</option>
    `;

    const scoreInput = document.createElement('input');
    scoreInput.type = 'number';
    scoreInput.className = 'subject-score';
    scoreInput.placeholder = '成绩';
    scoreInput.min = '0';
    scoreInput.max = '100';

    const removeButton = document.createElement('button');
    removeButton.innerText = '删除';
    removeButton.onclick = function () {
        container.removeChild(newRow);
    };

    newRow.appendChild(subjectSelect);
    newRow.appendChild(scoreInput);
    newRow.appendChild(removeButton);
    container.appendChild(newRow);
}

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

// Set Value Function
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
        // Send transaction with explicit gasPrice to avoid EIP-1559
        const tx = await contract.methods.set(studentId, subjectNames, scores).send({
            from: accounts[0],
            gasPrice: gasPrice // Explicitly set gasPrice
        });

        const txHash = tx.transactionHash;
        document.getElementById('transactionInfo').innerText = "交易哈希: " + txHash;
    } catch (error) {
        document.getElementById('setError').innerText = "交易失败: " + error.message;
        console.error(error);
    }
}

// 添加BigInt序列化支持
const BigIntSerializer = {
    stringify: (obj) => {
        return JSON.stringify(obj, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value
        );
    }
};

// 查询学生信息
async function queryStudentInfo() {
    const studentId = document.getElementById('queryStudentId').value;
    const resultsDiv = document.getElementById('results');
    
    if (!studentId) {
        resultsDiv.innerHTML = '<p class="error">请输入学号</p>';
        return;
    }

    try {
        setLoading(true);
        
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

        let exists, subjectNames, scores, hasPaid;

        // 尝试多种方式解析返回值
        if (Array.isArray(result)) {
            console.log('使用数组方式解析');
            [exists, subjectNames, scores, hasPaid] = result;
        } else if (typeof result === 'object') {
            console.log('使用对象方式解析');
            if ('0' in result && '1' in result && '2' in result && '3' in result) {
                exists = result['0'];
                subjectNames = result['1'];
                scores = result['2'];
                hasPaid = result['3'];
            } else if ('exists' in result && 'subjectNames' in result && 'scores' in result && 'hasPaid' in result) {
                exists = result.exists;
                subjectNames = result.subjectNames;
                scores = result.scores;
                hasPaid = result.hasPaid;
            } else {
                throw new Error('返回值格式不符合预期');
            }
        } else {
            throw new Error('无法识别的返回值类型');
        }

        console.log('解析后的数据:', BigIntSerializer.stringify({
            exists: exists,
            subjectNames: subjectNames,
            scores: scores,
            hasPaid: hasPaid
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
                    hasPaid = false; // 数据库没有缴费信息，默认为未缴费

                    resultsDiv.innerHTML = `
                        <p class="info">数据来源: MySQL数据库</p>
                        ${generateResultTable(studentId, subjectNames, scores, hasPaid)}
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
            ${generateResultTable(studentId, subjectNames, scores, hasPaid)}
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
                const hasPaid = false; // 数据库没有缴费信息，默认为未缴费

                if (Array.isArray(dbSubjectNames) && Array.isArray(dbScores)) {
                    resultsDiv.innerHTML = `
                        <p class="info">数据来源: MySQL数据库 (区块链查询失败)</p>
                        <p class="warning">区块链查询错误: ${error.message}</p>
                        ${generateResultTable(studentId, dbSubjectNames, dbScores, hasPaid)}
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
    } finally {
        setLoading(false);
    }
}

// 生成结果表格的函数
function generateResultTable(studentId, subjectNames, scores, hasPaid) {
    // 计算平均分
    const totalScore = scores.reduce((sum, score) => sum + parseInt(score), 0);
    const averageScore = scores.length > 0 ? (totalScore / scores.length).toFixed(2) : 0;

    // 缴费状态样式和文本
    const paymentStatusClass = hasPaid ? 'success' : 'warning';
    const paymentStatusText = hasPaid ? '已缴费' : '未缴费';

    // 创建结果表格
    let tableHTML = `
        <h3>学号 ${studentId} 的成绩单</h3>
        <p class="${paymentStatusClass}">缴费状态: ${paymentStatusText}</p>
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

// Get Account Info Function
async function getAccountInfo() {
    const accounts = await web3.eth.getAccounts();
    const accountAddress = accounts[0];
    document.getElementById('accountAddressDetail').innerText = "账户地址：" + accountAddress;

    const balance = await web3.eth.getBalance(accountAddress);
    const balanceInEther = web3.utils.fromWei(balance, 'ether');
    document.getElementById('accountBalanceDetail').innerText = "账户余额：" + balanceInEther + " ETH";
}

// Get Transaction Info Function
async function getTransactionInfo() {
    const txHash = document.getElementById('txHashInput').value;
    if (!txHash) {
        alert('请输入交易哈希');
        return;
    }

    try {
        setLoading(true);
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        
        if (receipt) {
            const status = receipt.status ? "成功" : "失败"; // 状态：成功或失败
            const blockHash = receipt.blockHash; // 区块哈希
            const blockNumber = receipt.blockNumber; // 区块号
            const from = receipt.from; // 发送方地址
            const to = receipt.to; // 接收方地址
            const gasUsed = receipt.gasUsed; // 使用的gas

            // 获取交易详情以获取交易金额
            const tx = await web3.eth.getTransaction(txHash);
            const value = tx ? web3.utils.fromWei(tx.value, 'ether') : '0';

            document.getElementById('transactionInfo').innerHTML = `
                <p><strong>状态:</strong> ${status}</p>
                <p><strong>交易哈希:</strong> ${txHash}</p>
                <p><strong>区块哈希:</strong> ${blockHash}</p>
                <p><strong>区块号:</strong> ${blockNumber}</p>
                <p><strong>发送方:</strong> ${from}</p>
                <p><strong>接收方:</strong> ${to}</p>
                <p><strong>使用的Gas:</strong> ${gasUsed}</p>
                <p><strong>交易金额:</strong> ${value} ETH</p>
            `;
        } else {
            document.getElementById('transactionInfo').innerHTML = "未找到该交易！";
        }
    } catch (error) {
        console.error('获取交易信息失败:', error);
        document.getElementById('transactionInfo').innerHTML = `获取交易信息失败: ${error.message}`;
    } finally {
        setLoading(false);
    }
}

// Upload Image to Pinata Function
async function uploadImageToPinata() {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select an image file.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': pinataApiKey,
                'pinata_secret_api_key': pinataSecretApiKey,
            },
            body: formData,
        });

        const result = await response.json();
        if (result.IpfsHash) {
            // Generate the direct link to the image using Pinata's gateway
            const imageUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
            document.getElementById('pinataResponse').innerHTML = `
                Image uploaded successfully!<br>
                IPFS Hash: ${result.IpfsHash}<br>
                <a href="${imageUrl}" target="_blank">View Image</a>
            `;
        } else {
            document.getElementById('pinataResponse').innerText = 'Failed to upload image.';
        }
    } catch (error) {
        console.error('Error uploading image to Pinata:', error);
        document.getElementById('pinataResponse').innerText = 'Error uploading image.';
    }
}

// 预览Excel数据
async function previewExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('请选择一个Excel文件');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 获取第一个工作表
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // 将工作表转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length < 2) {
                document.getElementById('batchError').innerText = '表格数据不足，至少需要标题行和一行数据';
                return;
            }

            // 处理表格数据
            const headers = jsonData[0];

            if (headers.length < 2) {
                document.getElementById('batchError').innerText = '表格至少需要两列：学号和至少一个课程';
                return;
            }

            // 准备处理后的数据
            const processedData = {
                headers: headers.slice(1), // 第一列是学号，所以从第二列开始为课程名
                students: []
            };

            // 处理每个学生的数据
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];

                if (row.length < 2 || row[0] === undefined || row[0] === '') {
                    continue; // 跳过没有学号的行
                }

                const studentId = String(row[0]).trim();
                const scores = [];

                // 收集每门课程的成绩
                for (let j = 1; j < row.length; j++) {
                    if (j < headers.length) {
                        const score = row[j] !== undefined ? parseInt(row[j]) : null;
                        scores.push(score);
                    }
                }

                // 添加学生数据
                processedData.students.push({
                    studentId: studentId,
                    scores: scores
                });
            }

            if (processedData.students.length === 0) {
                document.getElementById('batchError').innerText = '没有找到有效的学生数据';
                return;
            }

            // 保存处理后的数据
            excelData = processedData;

            // 生成预览表格
            generatePreviewTable(processedData);

            // 启用导入按钮
            document.getElementById('importButton').disabled = false;

            // 清除错误信息
            document.getElementById('batchError').innerText = '';
        } catch (error) {
            console.error('解析Excel文件时出错:', error);
            document.getElementById('batchError').innerText = '解析文件失败: ' + error.message;
        }
    };

    reader.onerror = function () {
        document.getElementById('batchError').innerText = '读取文件失败';
    };

    reader.readAsArrayBuffer(file);
}

// 生成预览表格
function generatePreviewTable(data) {
    const previewContainer = document.getElementById('previewContainer');
    const previewTable = document.getElementById('previewTable');

    // 构建表格HTML
    let tableHTML = '<table>';

    // 表头
    tableHTML += '<thead><tr><th>学号</th>';
    for (const header of data.headers) {
        tableHTML += `<th>${header}</th>`;
    }
    tableHTML += '</tr></thead>';

    // 表体
    tableHTML += '<tbody>';
    for (const student of data.students) {
        tableHTML += `<tr><td>${student.studentId}</td>`;

        for (let i = 0; i < data.headers.length; i++) {
            const score = i < student.scores.length ? student.scores[i] : '';
            const scoreClass = score !== null && !isNaN(score) && score >= 0 && score <= 100 ? 'valid-data' : 'invalid-data';
            tableHTML += `<td class="${scoreClass}">${score !== null ? score : ''}</td>`;
        }

        tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';

    // 更新预览
    previewTable.innerHTML = tableHTML;
    previewContainer.style.display = 'block';
}

// 批量导入数据
async function importExcel() {
    if (!excelData || !excelData.students || excelData.students.length === 0) {
        document.getElementById('batchError').innerText = '没有有效的数据可导入';
        return;
    }

    try {
        // 准备批量导入的数据结构
        const studentIds = [];
        const subjectNamesArray = [];
        const scoresArray = [];

        // 准备数据库API请求的数据结构
        const dbStudents = [];

        // 遍历每个学生
        for (const student of excelData.students) {
            const studentId = parseInt(student.studentId);

            if (isNaN(studentId)) {
                continue; // 跳过无效学号
            }

            const studentSubjects = [];
            const studentScores = [];

            // 遍历每门课程
            for (let i = 0; i < excelData.headers.length; i++) {
                const score = i < student.scores.length ? student.scores[i] : null;

                // 只添加有效成绩的课程
                if (score !== null && !isNaN(score) && score >= 0 && score <= 100) {
                    studentSubjects.push(excelData.headers[i]);
                    studentScores.push(score);
                }
            }

            // 只有有课程数据的学生才添加
            if (studentSubjects.length > 0) {
                studentIds.push(studentId);
                subjectNamesArray.push(studentSubjects);
                scoresArray.push(studentScores);

                // 为数据库API添加记录
                dbStudents.push({
                    studentId: studentId,
                    subjectNames: studentSubjects,
                    scores: studentScores
                });
            }
        }

        if (studentIds.length === 0) {
            document.getElementById('batchError').innerText = '没有有效的学生成绩数据可导入';
            return;
        }

        // 获取用户账户
        const accounts = await web3.eth.getAccounts();

        // 获取当前gas价格
        const gasPrice = await web3.eth.getGasPrice();

        // 调用合约的setBatch方法
        const tx = await contract.methods.setBatch(studentIds, subjectNamesArray, scoresArray).send({
            from: accounts[0],
            gasPrice: gasPrice
        });

        // 显示交易哈希
        document.getElementById('batchTransactionInfo').innerText = "交易哈希: " + tx.transactionHash;

        // 调用后端API将数据保存到MySQL数据库
        try {
            const apiResponse = await fetch('http://localhost:8080/api/students/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ students: dbStudents })
            });

            const apiResult = await apiResponse.json();

            if (apiResult.success) {
                console.log('成功保存数据到MySQL:', apiResult);
            } else {
                console.error('保存数据到MySQL失败:', apiResult);
                document.getElementById('batchError').innerText = '区块链导入成功，但数据库保存失败: ' + apiResult.message;
            }
        } catch (apiError) {
            console.error('调用数据库API失败:', apiError);
            document.getElementById('batchError').innerText = '区块链导入成功，但数据库API调用失败: ' + apiError.message;
        }

        // 清除错误信息
        document.getElementById('batchError').innerText = '';

        // 显示成功消息
        alert(`成功导入 ${studentIds.length} 名学生的成绩数据到区块链和数据库`);
    } catch (error) {
        console.error('批量导入失败:', error);
        document.getElementById('batchError').innerText = '批量导入失败: ' + error.message;
    }
}

// 动态加载脚本
function loadScript(src) {
    return new Promise(function (resolve, reject) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 检查区块链连接状态
async function checkBlockchainConnection() {
    const blockchainIcon = document.getElementById('blockchainIcon');
    const blockchainStatusText = document.getElementById('blockchainStatusText');

    blockchainIcon.textContent = '🔄';
    blockchainIcon.className = 'status-icon connecting';
    blockchainStatusText.textContent = '正在连接...';
    blockchainStatusText.className = 'connecting';

    // 检查web3是否已初始化
    if (!web3) {
        blockchainIcon.textContent = '❌';
        blockchainIcon.className = 'status-icon disconnected';
        blockchainStatusText.textContent = '未连接 (未找到Web3提供者)';
        blockchainStatusText.className = 'disconnected';
        return;
    }

    try {
        // 尝试获取网络ID
        const networkId = await web3.eth.net.getId();
        const accounts = await web3.eth.getAccounts();

        if (accounts && accounts.length > 0) {
            blockchainIcon.textContent = '✅';
            blockchainIcon.className = 'status-icon connected';
            let networkName = '';

            switch (networkId) {
                case 1:
                    networkName = 'Ethereum主网';
                    break;
                case 3:
                    networkName = 'Ropsten测试网';
                    break;
                case 4:
                    networkName = 'Rinkeby测试网';
                    break;
                case 5:
                    networkName = 'Goerli测试网';
                    break;
                case 42:
                    networkName = 'Kovan测试网';
                    break;
                case 1337:
                    networkName = 'Hardhat本地网络';
                    break;
                case 5777:
                    networkName = 'Ganache本地网络';
                    break;
                case 31337:
                    networkName = 'Hardhat本地网络';
                    break;
                default:
                    networkName = `网络ID: ${networkId}`;
            }

            blockchainStatusText.textContent = `已连接 (${networkName})`;
            blockchainStatusText.className = 'connected';
        } else {
            blockchainIcon.textContent = '⚠️';
            blockchainIcon.className = 'status-icon connecting';
            blockchainStatusText.textContent = '已连接网络，但未获取到账户';
            blockchainStatusText.className = 'connecting';
        }
    } catch (error) {
        console.error('区块链连接检查失败:', error);
        blockchainIcon.textContent = '❌';
        blockchainIcon.className = 'status-icon disconnected';
        blockchainStatusText.textContent = '连接失败';
        blockchainStatusText.className = 'disconnected';
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

// 设置选项卡切换功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有选项卡按钮和内容
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 为每个选项卡按钮添加点击事件
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有active类
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加active类到当前选项卡
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // 如果切换到数据统计选项卡，加载统计数据
            if (tabId === 'statsTab') {
                loadStatistics();
            }
            
            // 如果切换到缴费选项卡，检查合约余额
            if (tabId === 'paymentTab') {
                checkContractBalance();
            }
        });
    });
    
    // 为缴费相关按钮添加事件监听
    if (document.getElementById('checkPaymentStatus')) {
        document.getElementById('checkPaymentStatus').addEventListener('click', checkPaymentStatus);
    }
    if (document.getElementById('payTuition')) {
        document.getElementById('payTuition').addEventListener('click', payTuition);
    }
    if (document.getElementById('refreshStats')) {
        document.getElementById('refreshStats').addEventListener('click', loadStatistics);
    }
    if (document.getElementById('queryButton')) {
        document.getElementById('queryButton').addEventListener('click', queryStudentInfo);
    }
    if (document.getElementById('previewButton')) {
        document.getElementById('previewButton').addEventListener('click', previewExcel);
    }
    if (document.getElementById('importButton')) {
        document.getElementById('importButton').addEventListener('click', importExcel);
    }
    
    // 添加管理员功能按钮事件监听
    if (document.getElementById('withdrawButton')) {
        document.getElementById('withdrawButton').addEventListener('click', withdrawFunds);
    }
    if (document.getElementById('getPaidStudentsButton')) {
        document.getElementById('getPaidStudentsButton').addEventListener('click', getPaidStudents);
    }
});

// 显示/隐藏加载状态
function setLoading(isLoading) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
}

// 加载统计数据
async function loadStatistics() {
    try {
        setLoading(true);
        
        // 从后端API获取统计数据
        const response = await fetch('http://localhost:8080/api/statistics');
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '获取统计数据失败');
        }
        
        const stats = result.data;
        
        // 更新统计卡片
        document.getElementById('totalStudents').textContent = stats.totalStudents;
        document.getElementById('totalSubjects').textContent = Object.keys(stats.subjectStats).length;
        document.getElementById('totalScores').textContent = stats.totalScoresCount;
        
        // 创建科目平均分柱状图
        createSubjectAvgChart(stats.subjectStats);
        
        // 创建成绩分布饼图
        createGradeDistributionChart(stats.gradePercentage);
        
    } catch (error) {
        console.error('加载统计数据失败:', error);
        alert('加载统计数据失败: ' + error.message);
    } finally {
        setLoading(false);
    }
}

// 创建科目平均分柱状图
function createSubjectAvgChart(subjectStats) {
    const chartContainer = document.getElementById('subjectAvgChart');
    if (!chartContainer) return;
    
    // 准备数据
    const subjects = Object.keys(subjectStats);
    const averages = subjects.map(subject => parseFloat(subjectStats[subject].average));
    
    // 初始化ECharts实例
    const chart = echarts.init(chartContainer);
    
    // 配置图表选项
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: '{b}: {c}分'
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: subjects,
            axisLabel: {
                interval: 0,
                rotate: subjects.length > 5 ? 30 : 0
            }
        },
        yAxis: {
            type: 'value',
            name: '平均分',
            min: 0,
            max: 100
        },
        series: [{
            name: '平均分',
            type: 'bar',
            data: averages,
            itemStyle: {
                color: function(params) {
                    // 根据平均分设置不同颜色
                    const value = params.value;
                    if (value >= 90) return '#27ae60';
                    if (value >= 80) return '#2ecc71';
                    if (value >= 70) return '#f39c12';
                    if (value >= 60) return '#e67e22';
                    return '#e74c3c';
                }
            },
            label: {
                show: true,
                position: 'top',
                formatter: '{c}分'
            }
        }]
    };
    
    // 渲染图表
    chart.setOption(option);
    
    // 响应窗口大小变化
    window.addEventListener('resize', function() {
        chart.resize();
    });
}

// 创建成绩分布饼图
function createGradeDistributionChart(gradePercentage) {
    const chartContainer = document.getElementById('gradeDistributionChart');
    if (!chartContainer) return;
    
    // 准备数据
    const data = [
        { value: gradePercentage.excellent, name: '优秀 (90-100)' },
        { value: gradePercentage.good, name: '良好 (80-89)' },
        { value: gradePercentage.average, name: '中等 (70-79)' },
        { value: gradePercentage.pass, name: '及格 (60-69)' },
        { value: gradePercentage.fail, name: '不及格 (0-59)' }
    ];
    
    // 初始化ECharts实例
    const chart = echarts.init(chartContainer);
    
    // 配置图表选项
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}%'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            data: data.map(item => item.name)
        },
        series: [{
            name: '成绩分布',
            type: 'pie',
            radius: '55%',
            center: ['60%', '50%'],
            data: data,
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            itemStyle: {
                color: function(params) {
                    // 设置不同等级的颜色
                    const colors = ['#27ae60', '#2ecc71', '#f39c12', '#e67e22', '#e74c3c'];
                    return colors[params.dataIndex];
                }
            },
            label: {
                formatter: '{b}: {c}%',
                fontSize: 12
            }
        }]
    };
    
    // 渲染图表
    chart.setOption(option);
    
    // 响应窗口大小变化
    window.addEventListener('resize', function() {
        chart.resize();
    });
}

// 检查缴费状态
async function checkPaymentStatus() {
    const studentId = document.getElementById('paymentStudentId').value;
    
    if (!studentId) {
        alert('请输入学号');
        return;
    }
    
    try {
        setLoading(true);
        
        // 检查学生是否存在
        const studentExists = await checkStudentExists(studentId);
        
        if (!studentExists) {
            setPaymentStatus('未找到该学号对应的学生信息', 'error-message');
            return;
        }
        
        // 检查学生是否已缴费
        const hasPaid = await contract.methods.hasPaidTuition(studentId).call();
        
        if (hasPaid) {
            setPaymentStatus('该学生已完成学费缴纳', 'success-message');
        } else {
            setPaymentStatus('该学生尚未缴纳学费', 'status-message');
        }
        
    } catch (error) {
        console.error('检查缴费状态失败:', error);
        setPaymentStatus('检查缴费状态失败: ' + error.message, 'error-message');
    } finally {
        setLoading(false);
    }
}

// 设置缴费状态显示
function setPaymentStatus(message, className) {
    const statusDiv = document.getElementById('paymentStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = 'status-message';
        
        if (className) {
            statusDiv.classList.add(className);
        }
    }
}

// 检查学生是否存在
async function checkStudentExists(studentId) {
    try {
        const result = await contract.methods.get(studentId).call();
        return result.exists || result[0];
    } catch (error) {
        console.error('检查学生是否存在失败:', error);
        return false;
    }
}

// 缴纳学费
// 缴纳学费
async function payTuition() {
    const studentId = document.getElementById('paymentStudentId').value;
    
    if (!studentId) {
        alert('请输入学号');
        return;
    }
    
    try {
        setLoading(true);
        
        // 检查学生是否存在
        const studentExists = await checkStudentExists(studentId);
        
        if (!studentExists) {
            setPaymentStatus('未找到该学号对应的学生信息', 'error-message');
            return;
        }
        
        // 检查学生是否已缴费
        const hasPaid = await contract.methods.hasPaidTuition(studentId).call();
        
        if (hasPaid) {
            setPaymentStatus('该学生已完成学费缴纳，无需重复支付', 'status-message');
            return;
        }
        
        // 获取当前账户
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        
        // 获取学费金额
        const tuitionFee = await contract.methods.TUITION_FEE().call();
        console.log('学费金额:', web3.utils.fromWei(tuitionFee, 'ether'), 'ETH');
        
        // 检查账户余额
        const balance = await web3.eth.getBalance(account);
        if (BigInt(balance) < BigInt(tuitionFee)) {
            setPaymentStatus(`账户余额不足，需要 ${web3.utils.fromWei(tuitionFee, 'ether')} ETH，当前余额 ${web3.utils.fromWei(balance, 'ether')} ETH`, 'error-message');
            return;
        }
        
        // 获取网络信息
        const network = await web3.eth.net.getId();

        // 检查是否是支持EIP-1559的网络
        const supportsEIP1559 = (network === 1 || network === 5 || network === 11155111); // 以太坊主网、Goerli、Sepolia
        
        let transactionParameters;
        if (supportsEIP1559) {
            // 如果网络支持EIP-1559，使用maxFeePerGas和maxPriorityFeePerGas
            transactionParameters = {
                from: account,
                value: tuitionFee,
                maxFeePerGas: web3.utils.toWei('100', 'gwei'), // 自行设定适当的费用
                maxPriorityFeePerGas: web3.utils.toWei('2', 'gwei'),
                gas: 300000
            };
        } else {
            // Ganache网络使用传统的gasPrice
            transactionParameters = {
                from: account,
                value: tuitionFee,
                gasPrice: web3.utils.toWei('20', 'gwei'), // 传统的gasPrice
                gas: 300000
            };
        }
        
        // 发送交易
        const result = await contract.methods.payTuition(studentId).send(transactionParameters);
        
        // 显示交易结果
        const paymentResult = document.getElementById('paymentResult');
        if (paymentResult) {
            paymentResult.innerHTML = `
                <h3>缴费成功</h3>
                <p>学号: ${studentId}</p>
                <p>支付金额: ${web3.utils.fromWei(tuitionFee, 'ether')} ETH</p>
                <p>交易哈希: ${result.transactionHash}</p>
            `;
        }
        
        setPaymentStatus('学费缴纳成功', 'success-message');
        
        // 更新账户余额显示
        await getAccountInfo();
        
    } catch (error) {
        console.error('缴纳学费失败:', error);
        setPaymentStatus('缴纳学费失败: ' + error.message, 'error-message');
    } finally {
        setLoading(false);
    }
}


// 检查合约余额
async function checkContractBalance() {
    try {
        // 获取合约地址
        const contractAddress = contract._address;
        
        // 获取合约余额
        const balance = await contract.methods.getContractBalance().call();
        
        console.log('合约余额:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        
    } catch (error) {
        console.error('检查合约余额失败:', error);
    }
}

// 获取学生信息(更新get方法)
async function getStudentInfo(studentId) {
    const result = await contract.methods.get(studentId).call();
    return {
        exists: result.exists || result[0],
        subjectNames: result.subjectNames || result[1],
        scores: result.scores || result[2],
        hasPaid: result.hasPaid || result[3] // 新增缴费状态
    };
}

// 提现合约余额
async function withdrawFunds() {
    try {
        setLoading(true);
        
        // 获取当前账户
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        
        // 检查当前账户是否是管理员
        const adminAddress = await contract.methods.admin().call();
        
        if (adminAddress.toLowerCase() !== account.toLowerCase()) {
            document.getElementById('adminResult').innerHTML = `
                <p class="error-message">权限不足：只有管理员才能提现</p>
                <p>当前账户: ${account}</p>
                <p>管理员账户: ${adminAddress}</p>
                <p>请使用MetaMask切换到管理员账户后重试</p>
            `;
            return;
        }
        
        // 检查合约余额
        const contractBalance = await contract.methods.getContractBalance().call();
        
        if (BigInt(contractBalance) <= 0) {
            document.getElementById('adminResult').innerHTML = "合约余额为0，无法提现";
            return;
        }

        // 获取网络ID，判断是否支持EIP-1559
        const networkId = await web3.eth.net.getId();
        const supportsEIP1559 = (networkId === 1 || networkId === 5 || networkId === 11155111); // 以太坊主网、Goerli、Sepolia

        let transactionParameters;
        if (supportsEIP1559) {
            // 如果网络支持EIP-1559，使用maxFeePerGas和maxPriorityFeePerGas
            transactionParameters = {
                from: account,
                maxFeePerGas: web3.utils.toWei('100', 'gwei'),
                maxPriorityFeePerGas: web3.utils.toWei('2', 'gwei'),
                gas: 300000
            };
        } else {
            // 如果网络不支持EIP-1559（例如Ganache），使用传统的gasPrice
            transactionParameters = {
                from: account,
                gasPrice: web3.utils.toWei('20', 'gwei'),
                gas: 300000
            };
        }

        // 调用提现函数
        const result = await contract.methods.withdraw().send(transactionParameters);
        
        // 显示交易结果
        document.getElementById('adminResult').innerHTML = `
            <p class="success-message">提现成功</p>
            <p><strong>提现金额:</strong> ${web3.utils.fromWei(contractBalance, 'ether')} ETH</p>
            <p><strong>交易哈希:</strong> ${result.transactionHash}</p>
        `;
        
        // 更新账户余额显示
        await getAccountInfo();
        
    } catch (error) {
        console.error('提现失败:', error);
        
        // 提供更友好的错误信息
        let errorMessage = error.message;
        
        // 检查是否包含一些常见错误信息并进行翻译
        if (error.message.includes('Only admin can call this function')) {
            errorMessage = '权限不足：只有管理员才能提现';
        } else if (error.message.includes('user denied transaction')) {
            errorMessage = '用户取消了交易';
        } else if (error.message.includes('No funds to withdraw')) {
            errorMessage = '没有可提现的资金';
        }
        
        document.getElementById('adminResult').innerHTML = `
            <p class="error-message">提现失败: ${errorMessage}</p>
        `;
    } finally {
        setLoading(false);
    }
}


// 获取已缴费学生列表
async function getPaidStudents() {
    try {
        setLoading(true);
        
        // 获取已缴费学生列表（通过遍历学生ID查询）
        const paidStudents = [];
        
        // 模拟一个查询范围，假设学号范围是1到1000
        // 注意：这种方法在学生数量多时效率较低，
        // 在实际生产环境中应当在合约中实现getPaidStudents函数
        const maxStudentId = 1100;
        
        for (let studentId = 1000; studentId <= maxStudentId; studentId++) {
            try {
                const isPaid = await contract.methods.hasPaidTuition(studentId).call();
                if (isPaid) {
                    paidStudents.push(studentId);
                }
            } catch (err) {
                // 忽略不存在的学生ID
                continue;
            }
        }
        
        const paidStudentsDiv = document.getElementById('paidStudentsList');
        
        if (!paidStudents || paidStudents.length === 0) {
            paidStudentsDiv.innerHTML = "<p>暂无学生缴费记录</p>";
            return;
        }
        
        // 显示已缴费学生列表
        let html = `
            <h3>已缴费学生列表 (${paidStudents.length}名)</h3>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>学号</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // 添加每个学生的信息
        paidStudents.forEach((studentId, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${studentId}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        paidStudentsDiv.innerHTML = html;
        
    } catch (error) {
        console.error('获取已缴费学生列表失败:', error);
        document.getElementById('paidStudentsList').innerHTML = `
            <p class="error-message">获取已缴费学生列表失败: ${error.message}</p>
        `;
    } finally {
        setLoading(false);
    }
}