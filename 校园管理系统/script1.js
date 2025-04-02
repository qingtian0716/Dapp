


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
    
    // 初始化侧边栏功能
    initSidebar();
    
    // 默认显示第一个部分
    showSection('grades-section');
});

// 初始化侧边栏功能
function initSidebar() {
    // 侧边栏折叠/展开功能
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebarLayout = document.querySelector('.sidebar-layout');
    
    sidebarToggle.addEventListener('click', function() {
        sidebarLayout.classList.toggle('sidebar-collapsed');
        sidebarLayout.classList.toggle('sidebar-open');
    });
    
    // 侧边栏导航功能
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活动状态
            menuLinks.forEach(item => item.classList.remove('active'));
            
            // 添加当前活动状态
            this.classList.add('active');
            
            // 获取目标部分ID
            const targetId = this.getAttribute('href').substring(1);
            
            // 显示目标部分
            showSection(targetId);
        });
    });
}

// 显示指定部分，隐藏其他部分
function showSection(sectionId) {
    // 隐藏所有部分
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示目标部分
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// 初始化合约
async function initializeContract() {
    try {
        // 使用时间戳防止缓存
        const abiResponse = await fetch(addTimestamp('../scripts/YourCollectible_ABI.json'));
        const contractABI = await abiResponse.json();
        console.log('加载的ABI:', contractABI);

        const addressResponse = await fetch(addTimestamp('../scripts/YourCollectible_address.json'));
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

// 查询学费状态
async function checkTuitionStatus() {
    const studentId = document.getElementById('tuitionStudentId').value;
    if (!studentId) {
        document.getElementById('tuitionError').innerText = '请输入学号';
        document.getElementById('tuitionStatus').innerText = '';
        return;
    }

    try {
        // 调用合约的get方法获取学生信息
        const result = await contract.methods.get(parseInt(studentId)).call();
        
        // 解析返回值
        let hasPaidTuition;
        if (Array.isArray(result) && result.length >= 4) {
            hasPaidTuition = result[3]; // 第四个返回值是hasPaidTuition
        } else if (typeof result === 'object') {
            hasPaidTuition = result.hasPaidTuition || result[3];
        } else {
            throw new Error('无法识别的返回值类型');
        }

        // 显示学费状态
        const statusElement = document.getElementById('tuitionStatus');
        if (hasPaidTuition) {
            statusElement.innerText = '✅ 该学生已缴纳学费';
            statusElement.className = 'status-message paid';
        } else {
            statusElement.innerText = '❌ 该学生尚未缴纳学费';
            statusElement.className = 'status-message unpaid';
        }
        
        // 清除错误信息
        document.getElementById('tuitionError').innerText = '';
        
    } catch (error) {
        console.error('查询学费状态失败:', error);
        document.getElementById('tuitionError').innerText = '查询失败: ' + error.message;
        document.getElementById('tuitionStatus').innerText = '';
    }
}

// 修改交学费功能
async function payTuition() {
    const studentId = document.getElementById('tuitionStudentId').value;
    if (!studentId) {
        document.getElementById('tuitionError').innerText = '请输入学号';
        return;
    }

    try {
        // 先检查学费状态
        const result = await contract.methods.get(parseInt(studentId)).call();
        
        // 解析返回值
        let hasPaidTuition;
        if (Array.isArray(result) && result.length >= 4) {
            hasPaidTuition = result[3]; // 第四个返回值是hasPaidTuition
        } else if (typeof result === 'object') {
            hasPaidTuition = result.hasPaidTuition || result[3];
        } else {
            throw new Error('无法识别的返回值类型');
        }

        // 如果已经缴费，显示提示并返回
        if (hasPaidTuition) {
            document.getElementById('tuitionError').innerText = '';
            document.getElementById('tuitionStatus').innerText = '⚠️ 该学生已缴纳学费，无需重复缴费';
            document.getElementById('tuitionStatus').className = 'status-message warning';
            return;
        }

        // 获取账户和学费金额
        const accounts = await web3.eth.getAccounts();
        const tuitionFee = await contract.methods.tuitionFee().call();
        
        // 执行交易
        const tx = await contract.methods.payTuition(studentId).send({
            from: accounts[0],
            value: tuitionFee
        });

        // 更新状态
        document.getElementById('tuitionTransactionInfo').innerText = 
            "交易成功！交易哈希: " + tx.transactionHash;
        document.getElementById('tuitionError').innerText = '';
        document.getElementById('tuitionStatus').innerText = '✅ 学费缴纳成功！';
        document.getElementById('tuitionStatus').className = 'status-message paid';
    } catch (error) {
        document.getElementById('tuitionError').innerText = 
            "交易失败: " + error.message;
        document.getElementById('tuitionStatus').innerText = '';
    }
}

// 提现功能
// 获取合约余额
async function getContractBalance() {
    try {
        const balance = await web3.eth.getBalance(contract._address);
        const balanceInEther = web3.utils.fromWei(balance, 'ether');
        document.getElementById('contractBalance').innerText = `合约余额：${balanceInEther} ETH`;
    } catch (error) {
        console.error('获取合约余额失败:', error);
        document.getElementById('contractBalance').innerText = '获取余额失败';
    }
}

// 修改 withdraw 函数，添加余额刷新
async function withdraw() {
    try {
        const accounts = await web3.eth.getAccounts();
        
        const tx = await contract.methods.withdraw().send({
            from: accounts[0]
        });

        document.getElementById('withdrawTransactionInfo').innerText = 
            "提现成功！交易哈希: " + tx.transactionHash;
        document.getElementById('withdrawError').innerText = '';
        
        // 提现后刷新余额
        await getContractBalance();
    } catch (error) {
        document.getElementById('withdrawError').innerText = 
            "提现失败: " + error.message;
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

// 保存学生信息
async function saveStudentInfo() {
    const studentId = document.getElementById('infoStudentId').value;
    const name = document.getElementById('studentName').value;
    const gender = document.getElementById('studentGender').value;
    const className = document.getElementById('className').value;

    if (!studentId || !name || !gender || !className) {
        document.getElementById('studentInfoError').innerText = '请填写完整的学生信息';
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/student-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: parseInt(studentId),
                name,
                gender,
                className
            })
        });

        const result = await response.json();
        if (result.success) {
            document.getElementById('studentInfoError').innerText = '学生信息保存成功';
            document.getElementById('studentInfoResult').innerHTML = '';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        document.getElementById('studentInfoError').innerText = '保存失败: ' + error.message;
    }
}

// 获取学生信息
// ... existing code ...

// 按学号查询学生
async function searchStudentById() {
    const studentId = document.getElementById('searchStudentId').value;
    if (!studentId) {
        document.getElementById('searchError').innerText = '请输入学号';
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/api/student-info/${studentId}`);
        const result = await response.json();

        if (result.success) {
            displayStudentInfo([result.data]);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        document.getElementById('searchError').innerText = '查询失败: ' + error.message;
        document.getElementById('searchResults').innerHTML = '';
    }
}

// 按姓名查询学生
async function searchStudentByName() {
    const name = document.getElementById('searchStudentName').value;
    if (!name) {
        document.getElementById('searchError').innerText = '请输入姓名';
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/api/student-info/name/${encodeURIComponent(name)}`);
        const result = await response.json();

        if (result.success) {
            displayStudentInfo(result.data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        document.getElementById('searchError').innerText = '查询失败: ' + error.message;
        document.getElementById('searchResults').innerHTML = '';
    }
}

// 按班级查询学生
async function searchStudentsByClass() {
    const className = document.getElementById('searchClassName').value;
    if (!className) {
        document.getElementById('searchError').innerText = '请输入班级';
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/api/student-info/class/${encodeURIComponent(className)}`);
        const result = await response.json();

        if (result.success) {
            displayStudentInfo(result.data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        document.getElementById('searchError').innerText = '查询失败: ' + error.message;
        document.getElementById('searchResults').innerHTML = '';
    }
}

// 显示学生信息
function displayStudentInfo(students) {
    if (!Array.isArray(students) || students.length === 0) {
        document.getElementById('searchError').innerText = '未找到学生信息';
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    let html = '<div class="students-grid">';
    students.forEach(student => {
        html += `
            <div class="student-card">
                <h3>学生信息</h3>
                <p><strong>学号：</strong>${student.student_id}</p>
                <p><strong>姓名：</strong>${student.name}</p>
                <p><strong>性别：</strong>${student.gender}</p>
                <p><strong>班级：</strong>${student.class_name}</p>
                <p><strong>创建时间：</strong>${new Date(student.created_at).toLocaleString()}</p>
                <p><strong>更新时间：</strong>${new Date(student.updated_at).toLocaleString()}</p>
            </div>
        `;
    });
    html += '</div>';

    document.getElementById('searchResults').innerHTML = html;
    document.getElementById('searchError').innerText = '';
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

// Get Value Function
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
