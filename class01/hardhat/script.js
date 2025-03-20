let web3;
let contract;

// Initialize Web3 and Contract
window.addEventListener('load', async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        await window.ethereum.enable();

        // Fetch ABI from the JSON file
        const abiResponse = await fetch('./scripts/YourCollectible_ABI.json');
        const contractABI = await abiResponse.json();

        // Fetch Contract Address from the JSON file
        const addressResponse = await fetch('./scripts/YourCollectible_address.json');
        const addressData = await addressResponse.json();
        const contractAddress = addressData.contractAddress; // Dynamically loaded address

        // Initialize contract with ABI and address
        contract = new web3.eth.Contract(contractABI, contractAddress);
    } else {
        alert('请安装 MetaMask!');
    }
});

// 添加学生成绩
async function addGrade() {
    const studentName = document.getElementById('studentName').value;
    const subject = document.getElementById('subject').value;
    const score = document.getElementById('score').value;
    
    if (!studentName || !subject || !score) {
        alert('请填写完整的学生信息、学科和成绩');
        return;
    }
    
    const accounts = await web3.eth.getAccounts();
    const gasPrice = await web3.eth.getGasPrice();

    try {
        const tx = await contract.methods.addGrade(studentName, subject, score).send({
            from: accounts[0],
            gasPrice: gasPrice
        });

        const txHash = tx.transactionHash;
        document.getElementById('transactionInfo').innerText = "交易哈希：" + txHash;
        
        // 自动填充交易哈希到交易信息输入框
        document.getElementById('txHashInput').value = txHash;
        
        // 自动触发交易信息查询
        getTransactionInfo();
        
        // 清空输入框
        document.getElementById('studentName').value = '';
        document.getElementById('subject').value = '';
        document.getElementById('score').value = '';
        
    } catch (error) {
        alert("添加成绩失败：" + error.message);
    }
}

// 获取学生成绩
async function getGrades() {
    const studentName = document.getElementById('queryStudentName').value;
    
    if (!studentName) {
        alert('请输入学生姓名');
        return;
    }
    
    try {
        const grades = await contract.methods.getGrades(studentName).call();
        const container = document.getElementById('gradesContainer');
        
        if (grades.length === 0) {
            container.innerHTML = `<p>未找到 ${studentName} 的成绩记录</p>`;
            return;
        }
        
        let html = `<h3>${studentName} 的成绩单</h3><table class="grades-table">
                    <thead><tr><th>学科</th><th>成绩</th></tr></thead>
                    <tbody>`;
        
        for (let i = 0; i < grades.length; i++) {
            html += `<tr>
                        <td>${grades[i].subject}</td>
                        <td>${grades[i].score}</td>
                    </tr>`;
        }
        
        html += `</tbody></table>`;
        container.innerHTML = html;
        
    } catch (error) {
        alert("获取成绩失败：" + error.message);
    }
}

// 获取所有学生
async function getAllStudents() {
    try {
        const students = await contract.methods.getAllStudents().call();
        const container = document.getElementById('studentsContainer');
        
        if (students.length === 0) {
            container.innerHTML = '<p>暂无学生记录</p>';
            return;
        }
        
        let html = '<ul class="students-list">';
        
        for (let i = 0; i < students.length; i++) {
            html += `<li>
                        <span>${students[i]}</span>
                        <button onclick="fillStudentName('${students[i]}')" class="btn-small">查询</button>
                    </li>`;
        }
        
        html += '</ul>';
        container.innerHTML = html;
        
    } catch (error) {
        alert("获取学生列表失败：" + error.message);
    }
}

// 填充学生姓名到查询输入框
function fillStudentName(name) {
    document.getElementById('queryStudentName').value = name;
    getGrades();
}

// Get Account Info Function
async function getAccountInfo() {
    const accounts = await web3.eth.getAccounts();
    const accountAddress = accounts[0];
    document.getElementById('accountAddress').innerText = "账户地址: " + accountAddress;

    const balance = await web3.eth.getBalance(accountAddress);
    const balanceInEther = web3.utils.fromWei(balance, 'ether');
    document.getElementById('accountBalance').innerText = "账户余额: " + balanceInEther + " ETH";
}

// Get Transaction Info Function
async function getTransactionInfo() {
    const txHash = document.getElementById('txHashInput').value;
    const container = document.getElementById('txInfoContainer');
    
    if (!txHash) {
        alert('请输入交易哈希');
        container.style.display = 'none';
        return;
    }

    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt) {
            // 显示容器
            container.style.display = 'block';
            
            // 更新各个信息字段
            document.getElementById('txStatus').textContent = receipt.status ? "成功" : "失败";
            document.getElementById('txHash').textContent = txHash;
            document.getElementById('blockHash').textContent = receipt.blockHash;
            document.getElementById('blockNumber').textContent = receipt.blockNumber;
            document.getElementById('txFrom').textContent = receipt.from;
            document.getElementById('txTo').textContent = receipt.to;
            document.getElementById('gasUsed').textContent = receipt.gasUsed;
        } else {
            alert("未找到交易信息！");
            container.style.display = 'none';
        }
    } catch (error) {
        alert("获取交易信息时出错：" + error.message);
        container.style.display = 'none';
    }
}


function previewImage() {
    const fileInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
}

async function uploadToPinata() {
    const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlNWZjMjNkMS01NjA3LTQ0MTgtOTVhOC0xNjY1MWQxYjJjZDgiLCJlbWFpbCI6InFpbmd0aWFuMjY5MjgzNEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNDQ3NGZhZDcyYWY1MmIxYTdiY2YiLCJzY29wZWRLZXlTZWNyZXQiOiJiYWY1YzA4NmI1MjJlNDA5ZTA4ZDEzYmFlMWRkOTMzZjVhZGZkZmJlYjg2ZWZjMGFmNWFkYWY5ZGJmZmZhNTY2IiwiZXhwIjoxNzczOTAwOTI3fQ.mLLtgbOt3QwPDDPGA6cHJklhQeEaAAAqEMpUtDsbLEA';
    
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    const statusElement = document.getElementById('uploadStatus');
    const hashElement = document.getElementById('ipfsHash');

    if (!file) {
        statusElement.textContent = '请选择文件';
        return;
    }

    statusElement.textContent = '上传中...';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${JWT}`
            },
            body: formData
        });

        const result = await response.json();

        if (result.IpfsHash) {
            statusElement.textContent = '上传成功！';
            hashElement.textContent = `IPFS Hash: ${result.IpfsHash}`;
            // IPFS Gateway URL
            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
            hashElement.innerHTML += `<br>访问链接：<a href="${ipfsUrl}" target="_blank">${ipfsUrl}</a>`;
        } else {
            statusElement.textContent = '上传失败';
        }
    } catch (error) {
        statusElement.textContent = '上传出错：' + error.message;
    }
}

// 添加学科行
function addSubjectRow() {
    const container = document.getElementById('subjectsContainer');
    const newRow = document.createElement('div');
    newRow.className = 'subject-row';
    newRow.innerHTML = `
        <input type="text" class="subject-input text-input" placeholder="学科">
        <input type="number" class="score-input text-input" placeholder="成绩">
        <button class="btn-small remove-subject">删除</button>
    `;
    container.appendChild(newRow);
    
    // 为新添加的删除按钮添加事件监听
    newRow.querySelector('.remove-subject').addEventListener('click', function() {
        container.removeChild(newRow);
    });
}

// 添加多个学科成绩
async function addMultipleGrades() {
    const studentName = document.getElementById('studentName').value;
    if (!studentName) {
        alert('请填写学生姓名');
        return;
    }
    
    const subjectRows = document.querySelectorAll('.subject-row');
    const gradesData = [];
    
    // 收集所有学科和成绩
    for (let i = 0; i < subjectRows.length; i++) {
        const subject = subjectRows[i].querySelector('.subject-input').value;
        const score = subjectRows[i].querySelector('.score-input').value;
        
        if (subject && score) {
            gradesData.push({ subject, score });
        }
    }
    
    if (gradesData.length === 0) {
        alert('请至少添加一个有效的学科和成绩');
        return;
    }
    
    const accounts = await web3.eth.getAccounts();
    const gasPrice = await web3.eth.getGasPrice();
    
    try {
        // 显示处理中的消息
        document.getElementById('transactionInfo').innerText = "处理中...";
        
        // 批量提交所有成绩
        for (let i = 0; i < gradesData.length; i++) {
            const { subject, score } = gradesData[i];
            
            const tx = await contract.methods.addGrade(studentName, subject, score).send({
                from: accounts[0],
                gasPrice: gasPrice
            });
            
            // 更新最后一个交易的哈希
            if (i === gradesData.length - 1) {
                const txHash = tx.transactionHash;
                document.getElementById('transactionInfo').innerText = "交易哈希：" + txHash;
                document.getElementById('txHashInput').value = txHash;
                getTransactionInfo();
            }
        }
        
        // 清空输入框
        document.getElementById('studentName').value = '';
        const container = document.getElementById('subjectsContainer');
        container.innerHTML = `
            <div class="subject-row">
                <input type="text" class="subject-input text-input" placeholder="学科">
                <input type="number" class="score-input text-input" placeholder="成绩">
                <button class="btn-small remove-subject">删除</button>
            </div>
        `;
        
        // 重新添加事件监听
        document.querySelector('.remove-subject').addEventListener('click', function() {
            if (document.querySelectorAll('.subject-row').length > 1) {
                container.removeChild(this.parentNode);
            }
        });
        
        // 自动获取更新后的学生列表
        getAllStudents();
        
    } catch (error) {
        alert("添加成绩失败：" + error.message);
        document.getElementById('transactionInfo').innerText = "交易失败";
    }
}

// 初始化页面时添加删除按钮的事件监听
window.addEventListener('load', function() {
    // ... 现有的初始化代码 ...
    
    // 为初始的删除按钮添加事件监听
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('remove-subject')) {
            const container = document.getElementById('subjectsContainer');
            // 确保至少保留一行
            if (document.querySelectorAll('.subject-row').length > 1) {
                container.removeChild(e.target.parentNode);
            }
        }
    });
});
