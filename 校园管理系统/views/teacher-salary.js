// 教师工资管理模块
let teacherContract;

// 初始化教师工资合约
async function initTeacherContract() {
    try {
        if (!window.ethereum) {
            alert('请安装MetaMask!');
            return;
        }

        // 加载合约ABI和地址
        const abiResponse = await fetch('../scripts/MyContract_ABI.json');
        const contractABI = await abiResponse.json();
        
        const addressResponse = await fetch('../scripts/MyContract_address.json');
        const addressData = await addressResponse.json();
        const contractAddress = addressData.contractAddress;
        
        // 初始化合约实例
        teacherContract = new web3.eth.Contract(contractABI, contractAddress);
        
        // 更新合约地址显示
        document.getElementById('teacherContractAddress').textContent = `已连接: ${contractAddress.substring(0, 6)}...${contractAddress.substring(38)}`;
        
        // 加载合约余额
        getTeacherContractBalance();
        
        // 加载教师列表
        loadTeacherList();
        
        return true;
    } catch (error) {
        console.error('初始化教师工资合约失败:', error);
        document.getElementById('teacherContractAddress').textContent = '连接失败';
        return false;
    }
}

// 获取合约余额
async function getTeacherContractBalance() {
    try {
        if (!teacherContract) {
            await initTeacherContract();
        }
        
        const balance = await teacherContract.methods.getContractBalance().call();
        const balanceInEth = web3.utils.fromWei(balance, 'ether');
        document.getElementById('teacherContractBalance').textContent = `合约余额: ${balanceInEth} ETH`;
    } catch (error) {
        console.error('获取合约余额失败:', error);
        document.getElementById('teacherContractBalance').textContent = '合约余额: 获取失败';
    }
}

// 添加教师
async function addTeacher() {
    try {
        if (!teacherContract) {
            await initTeacherContract();
        }
        
        const accounts = await web3.eth.getAccounts();
        const teacherAddress = document.getElementById('teacherAddress').value;
        const salary = document.getElementById('teacherSalary').value;
        
        if (!teacherAddress || !salary) {
            document.getElementById('adminActionStatus').textContent = '请填写教师地址和工资金额';
            return;
        }
        
        // 检查地址格式
        if (!web3.utils.isAddress(teacherAddress)) {
            document.getElementById('adminActionStatus').textContent = '无效的教师地址格式';
            return;
        }
        
        // 转换工资为wei
        const salaryInWei = web3.utils.toWei(salary, 'ether');
        
        // 获取当前的 gas 价格
        const gasPrice = await web3.eth.getGasPrice();
        
        document.getElementById('adminActionStatus').textContent = '正在添加教师...';
        
        // 调用合约方法
        const tx = await teacherContract.methods.addTeacher(teacherAddress, salaryInWei).send({
            from: accounts[0],
            gasPrice: gasPrice
        });
        
        document.getElementById('adminActionStatus').textContent = `教师添加成功! 交易哈希: ${tx.transactionHash}`;
        
        // 刷新教师列表
        loadTeacherList();
    } catch (error) {
        console.error('添加教师失败:', error);
        document.getElementById('adminActionStatus').textContent = `添加教师失败: ${error.message}`;
    }
}

// 移除教师
async function removeTeacher() {
    try {
        if (!teacherContract) {
            await initTeacherContract();
        }
        
        const accounts = await web3.eth.getAccounts();
        const teacherAddress = document.getElementById('teacherAddress').value;
        
        if (!teacherAddress) {
            document.getElementById('adminActionStatus').textContent = '请填写教师地址';
            return;
        }
        
        // 检查地址格式
        if (!web3.utils.isAddress(teacherAddress)) {
            document.getElementById('adminActionStatus').textContent = '无效的教师地址格式';
            return;
        }
        
        // 获取当前的 gas 价格
        const gasPrice = await web3.eth.getGasPrice();
        
        document.getElementById('adminActionStatus').textContent = '正在移除教师...';
        
        // 调用合约方法
        const tx = await teacherContract.methods.removeTeacher(teacherAddress).send({
            from: accounts[0],
            gasPrice: gasPrice
        });
        
        document.getElementById('adminActionStatus').textContent = `教师移除成功! 交易哈希: ${tx.transactionHash}`;
        
        // 刷新教师列表
        loadTeacherList();
    } catch (error) {
        console.error('移除教师失败:', error);
        document.getElementById('adminActionStatus').textContent = `移除教师失败: ${error.message}`;
    }
}

// 存款到合约
async function depositToContract() {
    try {
        if (!teacherContract) {
            await initTeacherContract();
        }
        
        const accounts = await web3.eth.getAccounts();
        const amount = document.getElementById('depositAmount').value;
        
        if (!amount || amount <= 0) {
            document.getElementById('depositStatus').textContent = '请输入有效的存款金额';
            return;
        }
        
        // 转换金额为wei
        const amountInWei = web3.utils.toWei(amount, 'ether');
        
        // 获取当前的 gas 价格
        const gasPrice = await web3.eth.getGasPrice();
        
        document.getElementById('depositStatus').textContent = '正在存款...';
        
        // 调用合约方法
        const tx = await teacherContract.methods.deposit().send({
            from: accounts[0],
            value: amountInWei,
            gasPrice: gasPrice
        });
        
        document.getElementById('depositStatus').textContent = `存款成功! 交易哈希: ${tx.transactionHash}`;
        
        // 刷新合约余额
        getTeacherContractBalance();
    } catch (error) {
        console.error('存款失败:', error);
        document.getElementById('depositStatus').textContent = `存款失败: ${error.message}`;
    }
}

// 支付工资
async function paySalary() {
    try {
        if (!teacherContract) {
            await initTeacherContract();
        }
        
        const accounts = await web3.eth.getAccounts();
        const teacherAddress = document.getElementById('salaryTeacherAddress').value;
        
        if (!teacherAddress) {
            document.getElementById('paymentStatus').textContent = '请填写教师地址';
            return;
        }
        
        // 检查地址格式
        if (!web3.utils.isAddress(teacherAddress)) {
            document.getElementById('paymentStatus').textContent = '无效的教师地址格式';
            return;
        }
        
        // 获取当前的 gas 价格
        const gasPrice = await web3.eth.getGasPrice();
        
        document.getElementById('paymentStatus').textContent = '正在支付工资...';
        
        // 调用合约方法
        const tx = await teacherContract.methods.paySalary(teacherAddress).send({
            from: accounts[0],
            gasPrice: gasPrice
        });
        
        document.getElementById('paymentStatus').textContent = `工资支付成功! 交易哈希: ${tx.transactionHash}`;
        
        // 刷新合约余额和教师列表
        getTeacherContractBalance();
        loadTeacherList();
    } catch (error) {
        console.error('支付工资失败:', error);
        document.getElementById('paymentStatus').textContent = `支付工资失败: ${error.message}`;
    }
}

// 检查支付时间
async function checkPaymentTime() {
    try {
        if (!teacherContract) {
            await initTeacherContract();
        }
        
        const teacherAddress = document.getElementById('salaryTeacherAddress').value;
        
        if (!teacherAddress) {
            document.getElementById('paymentStatus').textContent = '请填写教师地址';
            return;
        }
        
        // 检查地址格式
        if (!web3.utils.isAddress(teacherAddress)) {
            document.getElementById('paymentStatus').textContent = '无效的教师地址格式';
            return;
        }
        
        // 调用合约方法
        const remainingTime = await teacherContract.methods.checkPaymentTime(teacherAddress).call();
        
        if (remainingTime == 0) {
            document.getElementById('paymentStatus').textContent = '可以领取工资';
        } else {
            const remainingTimeInSeconds = parseInt(remainingTime);
            const minutes = Math.floor(remainingTimeInSeconds / 60);
            const seconds = remainingTimeInSeconds % 60;
            document.getElementById('paymentStatus').textContent = `距离下次可领取工资还有: ${minutes}分${seconds}秒`;
        }
    } catch (error) {
        console.error('检查支付时间失败:', error);
        document.getElementById('paymentStatus').textContent = `检查失败: ${error.message}`;
    }
}

// 加载教师列表
async function loadTeacherList() {
    try {
        if (!teacherContract) {
            await initTeacherContract();
        }
        
        // 清空现有列表
        const tableBody = document.getElementById('teacherListBody');
        tableBody.innerHTML = '';
        
        // 获取当前账户
        const accounts = await web3.eth.getAccounts();
        const currentAccount = accounts[0];
        
        // 获取管理员地址
        const admin = await teacherContract.methods.admin().call();
        
        // 这里我们需要一个方法来获取所有教师的地址
        // 由于合约中没有直接提供获取所有教师的方法，我们可以通过事件日志或其他方式获取
        // 这里为了简化，我们可以从本地存储中获取之前添加过的教师地址
        // 或者通过监听过去的TeacherAdded事件来获取
        
        // 模拟一些测试数据 (实际应用中应该从合约事件中获取)
        const testTeachers = [
            currentAccount, // 当前账户作为测试
            "0x1234567890123456789012345678901234567890" // 模拟地址
        ];
        
        // 为每个教师获取信息并添加到表格
        for (const teacherAddress of testTeachers) {
            try {
                const info = await teacherContract.methods.getTeacherInfo(teacherAddress).call();
                
                if (info.isTeacher) {
                    const salaryInEth = web3.utils.fromWei(info.salary, 'ether');
                    const nextPaymentTime = new Date(info.nextPaymentTime * 1000).toLocaleString();
                    
                    const row = document.createElement('tr');
                    
                    // 地址列
                    const addressCell = document.createElement('td');
                    addressCell.textContent = `${teacherAddress.substring(0, 6)}...${teacherAddress.substring(38)}`;
                    row.appendChild(addressCell);
                    
                    // 工资列
                    const salaryCell = document.createElement('td');
                    salaryCell.textContent = `${salaryInEth} ETH`;
                    row.appendChild(salaryCell);
                    
                    // 下次发放时间列
                    const timeCell = document.createElement('td');
                    timeCell.textContent = nextPaymentTime;
                    row.appendChild(timeCell);
                    
                    // 操作列
                    const actionCell = document.createElement('td');
                    const payButton = document.createElement('button');
                    payButton.textContent = '领取工资';
                    payButton.className = 'small-button';
                    payButton.onclick = function() {
                        document.getElementById('salaryTeacherAddress').value = teacherAddress;
                        paySalary();
                    };
                    actionCell.appendChild(payButton);
                    row.appendChild(actionCell);
                    
                    tableBody.appendChild(row);
                }
            } catch (error) {
                console.error(`获取教师信息失败 ${teacherAddress}:`, error);
            }
        }
        
        if (tableBody.children.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4;
            cell.textContent = '暂无教师数据';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('加载教师列表失败:', error);
        const tableBody = document.getElementById('teacherListBody');
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">加载失败</td></tr>';
    }
}

// 在页面加载时初始化教师工资合约
window.addEventListener('load', async () => {
    // 等待web3初始化完成
    setTimeout(async () => {
        if (window.ethereum && web3) {
            await initTeacherContract();
            
            // 检查当前用户是否是管理员
            try {
                const accounts = await web3.eth.getAccounts();
                const admin = await teacherContract.methods.admin().call();
                
                if (admin.toLowerCase() === accounts[0].toLowerCase()) {
                    // 添加管理员标识
                    const adminBadge = document.createElement('span');
                    adminBadge.textContent = '(管理员)';
                    adminBadge.style.color = '#4CAF50';
                    adminBadge.style.marginLeft = '10px';
                    adminBadge.style.fontWeight = 'bold';
                    
                    const contractStatus = document.getElementById('teacherContractAddress');
                    contractStatus.appendChild(adminBadge);
                }
            } catch (error) {
                console.error('检查管理员状态失败:', error);
            }
        }
    }, 1000);
});

// 监听菜单点击事件，当切换到教师工资管理标签时刷新数据
document.addEventListener('DOMContentLoaded', function() {
    const teacherSalaryLink = document.querySelector('a[href="#teacher-salary-section"]');
    if (teacherSalaryLink) {
        teacherSalaryLink.addEventListener('click', function() {
            if (window.ethereum && web3) {
                getTeacherContractBalance();
                loadTeacherList();
            }
        });
    }
});