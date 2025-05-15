
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

    // 加载ECharts库
    loadEChartsLibrary();

    // 默认显示第一个部分
    showSection('grades-section');
});

// 加载ECharts库
function loadEChartsLibrary() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
    script.onload = function() {
        console.log('ECharts库加载成功');
    };
    script.onerror = function() {
        console.error('ECharts库加载失败');
    };
    document.head.appendChild(script);
}

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
    // 修改这里使用新的元素ID
    const studentId = document.getElementById('tuitionQueryStudentId').value;
    if (!studentId) {
        document.getElementById('tuitionQueryError').innerText = '请输入学号';
        document.getElementById('tuitionQueryStatus').innerText = '';
        return;
    }

    try {
        // 调用合约的get方法获取学生信息
        const result = await contract.methods.get(parseInt(studentId)).call();
        
        // 解析返回值 - 适应新的返回结构
        let tuitionPaid;
        if (Array.isArray(result) && result.length >= 4) {
            tuitionPaid = result[3]; // 第四个返回值是tuitionPaid
        } else if (typeof result === 'object') {
            tuitionPaid = result.tuitionPaid || result[3];
        } else {
            throw new Error('无法识别的返回值类型');
        }

        // 显示学费状态 - 修改使用新的元素ID
        const statusElement = document.getElementById('tuitionQueryStatus');
        if (tuitionPaid) {
            statusElement.innerText = '✅ 该学生已缴纳学费';
            statusElement.className = 'status-message paid';
        } else {
            statusElement.innerText = '❌ 该学生尚未缴纳学费';
            statusElement.className = 'status-message unpaid';
        }
        
        // 清除错误信息 - 修改使用新的元素ID
        document.getElementById('tuitionQueryError').innerText = '';
        
    } catch (error) {
        console.error('查询学费状态失败:', error);
        // 修改使用新的元素ID
        document.getElementById('tuitionQueryError').innerText = '查询失败: ' + error.message;
        document.getElementById('tuitionQueryStatus').innerText = '';
    }
}

// 修改交学费功能
async function payTuition() {
    // 修改这里使用新的元素ID
    const studentId = document.getElementById('payTuitionStudentId').value;
    if (!studentId) {
        document.getElementById('payTuitionError').innerText = '请输入学号';
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

        // 如果已经缴费，显示提示并返回 - 修改使用新的元素ID
        if (hasPaidTuition) {
            document.getElementById('payTuitionError').innerText = '';
            document.getElementById('payTuitionStatus').innerText = '⚠️ 该学生已缴纳学费，无需重复缴费';
            document.getElementById('payTuitionStatus').className = 'status-message warning';
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

        // 更新状态 - 修改使用新的元素ID
        document.getElementById('payTuitionTransactionInfo').innerText = 
            "交易成功！交易哈希: " + tx.transactionHash;
        document.getElementById('payTuitionError').innerText = '';
        document.getElementById('payTuitionStatus').innerText = '✅ 学费缴纳成功！';
        document.getElementById('payTuitionStatus').className = 'status-message paid';
    } catch (error) {
        // 修改使用新的元素ID
        document.getElementById('payTuitionError').innerText = 
            "交易失败: " + error.message;
        document.getElementById('payTuitionStatus').innerText = '';
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
        document.getElementById('studentInfoError').innerText = '';
        document.getElementById('studentInfoResult').innerHTML = '<div class="status-message info">⏳ 正在保存学生信息...</div>';
        
        // 获取账户和gas价格
        const accounts = await web3.eth.getAccounts();
        const gasPrice = await web3.eth.getGasPrice();
        
        // 首先保存到区块链
        try {
            const tx = await contract.methods.setStudentInfo(
                parseInt(studentId),
                name,
                gender,
                className
            ).send({
                from: accounts[0],
                gasPrice: gasPrice
            });
            
            document.getElementById('studentInfoResult').innerHTML = `
                <div class="status-message success">
                    ✅ 区块链保存成功！交易哈希: ${tx.transactionHash}
                </div>
            `;
        } catch (blockchainError) {
            console.error('区块链保存失败:', blockchainError);
            document.getElementById('studentInfoResult').innerHTML = `
                <div class="status-message error">
                    ❌ 区块链保存失败: ${blockchainError.message}
                </div>
            `;
        }
        
        // 然后保存到数据库
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
                document.getElementById('studentInfoResult').innerHTML += `
                    <div class="status-message success">
                        ✅ 数据库保存成功！
                    </div>
                `;
            } else {
                throw new Error(result.message);
            }
        } catch (dbError) {
            console.error('数据库保存失败:', dbError);
            document.getElementById('studentInfoResult').innerHTML += `
                <div class="status-message error">
                    ❌ 数据库保存失败: ${dbError.message || '服务器错误'}
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('studentInfoError').innerText = '保存失败: ' + error.message;
    }
}

// 获取学生信息
// 学生信息查询功能
async function searchStudentByIdOrName() {
    const searchTerm = document.getElementById('searchStudentTerm').value.trim();
    if (!searchTerm) {
        document.getElementById('searchError').innerText = '请输入学号或姓名';
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    try {
        // 清除之前的错误信息
        document.getElementById('searchError').innerText = '';
        
        // 判断搜索词是否为数字（学号）
        const isStudentId = /^\d+$/.test(searchTerm);
        
        if (isStudentId) {
            // 按学号查询
            try {
                // 先尝试从区块链获取成绩信息
                const result = await contract.methods.get(parseInt(searchTerm)).call();
                
                if (!result || !result[0]) { 
                    // 区块链中没有找到，尝试从数据库查询基本信息
                    try {
                        const response = await fetch(`http://localhost:8080/api/student-info/${searchTerm}`);
                        const studentInfo = await response.json();
                        
                        if (studentInfo.success) {
                            displayStudentInfo([studentInfo.data]);
                        } else {
                            document.getElementById('searchResults').innerHTML = `<p>未找到学号为 ${searchTerm} 的学生</p>`;
                        }
                        return;
                    } catch (dbError) {
                        document.getElementById('searchResults').innerHTML = `<p>未找到学号为 ${searchTerm} 的学生</p>`;
                        return;
                    }
                }
                
                // 显示学生成绩信息
                const subjectNames = result[1];
                const scores = result[2];
                const hasPaidTuition = result[3];
                
                // 尝试获取学生基本信息
                let studentBasicInfo = null;
                try {
                    const response = await fetch(`http://localhost:8080/api/student-info/${searchTerm}`);
                    const studentInfoResult = await response.json();
                    if (studentInfoResult.success) {
                        studentBasicInfo = studentInfoResult.data;
                    }
                } catch (error) {
                    console.error('获取学生基本信息失败:', error);
                }
                
                // 生成结果HTML
                let resultHTML = `
                    <div class="search-result">
                        <h3>学号: ${searchTerm}</h3>
                `;
                
                if (studentBasicInfo) {
                    resultHTML += `
                        <p><strong>姓名:</strong> ${studentBasicInfo.name}</p>
                        <p><strong>性别:</strong> ${studentBasicInfo.gender}</p>
                        <p><strong>班级:</strong> ${studentBasicInfo.class_name}</p>
                    `;
                }
                
                resultHTML += `
                        <p><strong>学费状态:</strong> ${hasPaidTuition ? '<span class="paid-status">已缴费</span>' : '<span class="unpaid-status">未缴费</span>'}</p>
                        ${subjectNames.length > 0 ? generateResultTable(searchTerm, subjectNames, scores) : '<p>暂无成绩记录</p>'}
                    </div>
                `;
                
                document.getElementById('searchResults').innerHTML = resultHTML;
            } catch (error) {
                console.error('区块链查询失败:', error);
                
                // 尝试从数据库查询基本信息
                try {
                    const response = await fetch(`http://localhost:8080/api/student-info/${searchTerm}`);
                    const studentInfo = await response.json();
                    
                    if (studentInfo.success) {
                        displayStudentInfo([studentInfo.data]);
                    } else {
                        document.getElementById('searchResults').innerHTML = `<p>未找到学号为 ${searchTerm} 的学生</p>`;
                    }
                } catch (dbError) {
                    document.getElementById('searchError').innerText = '查询失败: ' + error.message;
                }
            }
        } else {
            // 按姓名查询
            try {
                const response = await fetch(`http://localhost:8080/api/student-info/name/${encodeURIComponent(searchTerm)}`);
                const result = await response.json();
                
                if (result.success) {
                    displayStudentInfo(result.data);
                } else {
                    document.getElementById('searchResults').innerHTML = `<p>未找到姓名包含 "${searchTerm}" 的学生</p>`;
                }
            } catch (error) {
                console.error('按姓名查询失败:', error);
                document.getElementById('searchError').innerText = '查询失败: ' + error.message;
            }
        }
    } catch (error) {
        console.error('查询学生信息失败:', error);
        document.getElementById('searchError').innerText = '查询失败: ' + error.message;
    }
}

// 按班级查询学生
async function searchStudentsByClass() {
    const className = document.getElementById('searchClassName').value.trim();
    if (!className) {
        document.getElementById('searchError').innerText = '请输入班级名称';
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    try {
        // 清除之前的错误信息
        document.getElementById('searchError').innerText = '';
        
        // 调用API按班级查询
        const response = await fetch(`http://localhost:8080/api/student-info/class/${encodeURIComponent(className)}`);
        const result = await response.json();
        
        if (result.success) {
            displayStudentInfo(result.data);
        } else {
            document.getElementById('searchResults').innerHTML = `<p>未找到班级名称包含 "${className}" 的学生</p>`;
        }
    } catch (error) {
        console.error('按班级查询学生失败:', error);
        document.getElementById('searchError').innerText = '查询失败: ' + error.message;
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
                <button onclick="getStudentGrades(${student.student_id})">查看成绩</button>
                <button onclick="checkStudentTuition(${student.student_id})">查看学费状态</button>
            </div>
        `;
    });
    html += '</div>';

    document.getElementById('searchResults').innerHTML = html;
    document.getElementById('searchError').innerText = '';
}

// 查看学生成绩
async function getStudentGrades(studentId) {
    try {
        // 调用合约的get方法获取学生信息
        const result = await contract.methods.get(parseInt(studentId)).call();
        
        if (!result || !result[0]) {
            alert(`学号为 ${studentId} 的学生暂无成绩记录`);
            return;
        }
        
        // 显示学生成绩信息
        const subjectNames = result[1];
        const scores = result[2];
        
        if (!subjectNames || subjectNames.length === 0) {
            alert(`学号为 ${studentId} 的学生暂无成绩记录`);
            return;
        }
        
        // 创建成绩弹窗
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>学号 ${studentId} 的成绩单</h3>
                ${generateResultTable(studentId, subjectNames, scores)}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭按钮事件
        modal.querySelector('.close-button').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                document.body.removeChild(modal);
            }
        });
    } catch (error) {
        console.error('获取学生成绩失败:', error);
        alert('获取学生成绩失败: ' + error.message);
    }
}
