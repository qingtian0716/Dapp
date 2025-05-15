document.addEventListener('DOMContentLoaded', async function() {
    // 在 app.js 顶部添加一个全局变量来存储教师地址
// 从 localStorage 加载已保存的教师地址，如果没有则初始化为空数组
let teacherAddresses = JSON.parse(localStorage.getItem('teacherAddresses') || '[]');

    // 加载合约地址和ABI
    const contractAddressResponse = await fetch('./scripts/deployedAddress.json');
    const contractAddressData = await contractAddressResponse.json();
    const contractAddress = contractAddressData.address;
    
    const abiResponse = await fetch('./scripts/MyContract_ABI.json');
    const abi = await abiResponse.json();
    
    // 初始化以太坊连接
    let provider, signer, contract, currentAccount;
    
    // 显示合约地址
    document.getElementById('contractAddress').textContent = contractAddress;
    
    // 连接MetaMask
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        
        try {
            // 请求账户访问
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // 获取当前账户
            const accounts = await provider.listAccounts();
            currentAccount = accounts[0].address;
            
            // 初始化合约
            signer = await provider.getSigner();
            contract = new ethers.Contract(contractAddress, abi, signer);
            
            // 显示管理员地址
            const adminAddress = await contract.admin();
            document.getElementById('adminAddress').textContent = adminAddress;
            
            // 检查当前用户是否是管理员
            if (currentAccount.toLowerCase() !== adminAddress.toLowerCase()) {
                alert('当前账户不是管理员，部分功能将受限');
                document.getElementById('addTeacherBtn').disabled = true;
                document.getElementById('removeTeacherBtn').disabled = true;
                document.getElementById('depositBtn').disabled = true;
                document.getElementById('depositAmount').disabled = true;
            }
            
            // 初始化数据
            updateContractBalance();
            loadTeachers();
            
            // 设置定时器
            setInterval(updateContractBalance, 10000);
            setInterval(loadTeachers, 30000);
            
        } catch (error) {
            console.error("用户拒绝访问账户:", error);
        }
        
        // 监听账户变化
        window.ethereum.on('accountsChanged', function(accounts) {
            window.location.reload();
        });
    } else {
        alert('请安装MetaMask或其他以太坊钱包扩展');
    }
    
    // 按钮事件监听
    document.getElementById('addTeacherBtn').addEventListener('click', addTeacher);
    document.getElementById('removeTeacherBtn').addEventListener('click', removeTeacher);
    document.getElementById('depositBtn').addEventListener('click', deposit);
    
    // 更新合约余额
    async function updateContractBalance() {
        if (!contract) return;
        
        try {
            const balance = await contract.getContractBalance();
            const balanceInEth = ethers.formatEther(balance);
            document.getElementById('contractBalance').textContent = balanceInEth;
        } catch (error) {
            console.error("获取合约余额失败:", error);
        }
    }
    

// 修改后的 loadTeachers 函数
async function loadTeachers() {
    if (!contract) return;
    
    try {
        const teachersListElement = document.getElementById('teachersList');
        teachersListElement.innerHTML = '';
        
        if (teacherAddresses.length === 0) {
            teachersListElement.innerHTML = '<div class="col-12"><p class="text-muted">暂无教师数据</p></div>';
            return;
        }
        
        // 遍历所有教师地址并获取信息
        for (const teacherAddress of teacherAddresses) {
            try {
                const [isTeacher, salary, nextPaymentTime] = await contract.getTeacherInfo(teacherAddress);
                
                if (isTeacher) {
                    const teacherCard = createTeacherCard(teacherAddress, salary, nextPaymentTime);
                    teachersListElement.appendChild(teacherCard);
                }
            } catch (error) {
                console.error(`获取教师 ${teacherAddress} 信息失败:`, error);
            }
        }
    } catch (error) {
        console.error("加载教师列表失败:", error);
        const teachersListElement = document.getElementById('teachersList');
        teachersListElement.innerHTML = '<div class="col-12 alert alert-danger">加载教师列表失败</div>';
    }
}

// 创建教师卡片的辅助函数
function createTeacherCard(address, salary, nextPaymentTime) {
    const col = document.createElement('div');
    col.className = 'col-md-6 mb-3';
    
    const card = document.createElement('div');
    card.className = 'card teacher-card';
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    const title = document.createElement('h5');
    title.className = 'card-title';
    title.textContent = `教师: ${address.substring(0, 6)}...${address.substring(38)}`;
    
    const salaryText = document.createElement('p');
    salaryText.className = 'card-text';
    salaryText.textContent = `工资: ${ethers.formatEther(salary)} ETH`;
    
    const nextPaymentText = document.createElement('p');
    nextPaymentText.className = 'card-text';
    
    // 将 nextPaymentTime 转换为 Number
    const paymentTime = Number(nextPaymentTime);
    const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
    
    if (paymentTime <= now) {
        nextPaymentText.innerHTML = `<span class="text-success">可以领取工资</span>`;
        
        const payButton = document.createElement('button');
        payButton.className = 'btn btn-sm btn-success mt-2';
        payButton.textContent = '立即支付';
        payButton.onclick = () => paySalary(address);
        cardBody.appendChild(payButton);
    } else {
        const remainingTime = paymentTime - now;
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        nextPaymentText.innerHTML = `下次支付: <span class="countdown">${minutes}分${seconds}秒</span>`;
    }
    
    cardBody.appendChild(title);
    cardBody.appendChild(salaryText);
    cardBody.appendChild(nextPaymentText);
    card.appendChild(cardBody);
    col.appendChild(card);
    
    return col;
}
    
async function addTeacher() {
    const teacherAddress = document.getElementById('teacherAddress').value;
    const salary = document.getElementById('teacherSalary').value;
    
    if (!teacherAddress || !salary) {
        alert('请输入教师地址和工资');
        return;
    }
    
    try {
        // 检查地址有效性
        if (!ethers.isAddress(teacherAddress)) {
            alert('请输入有效的以太坊地址');
            return;
        }
        
        const tx = await contract.addTeacher(teacherAddress, ethers.parseEther(salary));
        await tx.wait();
        
        // 如果教师地址不在列表中，则添加
        if (!teacherAddresses.includes(teacherAddress)) {
            teacherAddresses.push(teacherAddress);
            // 保存到 localStorage
            localStorage.setItem('teacherAddresses', JSON.stringify(teacherAddresses));
        }
        
        alert('教师添加成功');
        loadTeachers(); // 刷新教师列表
        
        // 清空输入框
        document.getElementById('teacherAddress').value = '';
        document.getElementById('teacherSalary').value = '';
    } catch (error) {
        console.error("添加教师失败:", error);
        alert('添加教师失败: ' + error.message);
    }
}
    
async function removeTeacher() {
    const teacherAddress = document.getElementById('teacherAddress').value;
    
    if (!teacherAddress) {
        alert('请输入教师地址');
        return;
    }
    
    try {
        const tx = await contract.removeTeacher(teacherAddress);
        await tx.wait();
        
        // 从列表中移除教师
        teacherAddresses = teacherAddresses.filter(addr => addr !== teacherAddress);
        // 保存到 localStorage
        localStorage.setItem('teacherAddresses', JSON.stringify(teacherAddresses));
        
        alert('教师移除成功');
        loadTeachers(); // 刷新教师列表
        
        // 清空输入框
        document.getElementById('teacherAddress').value = '';
    } catch (error) {
        console.error("移除教师失败:", error);
        alert('移除教师失败: ' + error.message);
    }
}
    

    
    // 存入资金
    async function deposit() {
        const amount = document.getElementById('depositAmount').value;
        
        if (!amount || parseFloat(amount) <= 0) {
            alert('请输入有效的存入金额');
            return;
        }
        
        try {
            const tx = await contract.deposit({
                value: ethers.parseEther(amount)
            });
            await tx.wait();
            alert('资金存入成功');
            updateContractBalance();
            document.getElementById('depositAmount').value = '';
        } catch (error) {
            console.error("存入资金失败:", error);
            alert('存入资金失败: ' + error.message);
        }
    }
    
    // 支付工资
    async function paySalary(teacherAddress) {
        try {
            const tx = await contract.paySalary(teacherAddress);
            await tx.wait();
            alert('工资支付成功');
            loadTeachers();
        } catch (error) {
            console.error("支付工资失败:", error);
            alert('支付工资失败: ' + error.message);
        }
    }
});