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
        alert('Please install MetaMask!');
    }
});

// Set Value Function
// Set Value Function
async function setValue() {
    const value = document.getElementById('setValue').value;
    const accounts = await web3.eth.getAccounts();

    // 获取当前的 gas 价格
    const gasPrice = await web3.eth.getGasPrice();

    try {
        // 发送交易，指定 gasPrice 以避免使用 EIP-1559
        const tx = await contract.methods.set(value).send({
            from: accounts[0],
            gasPrice: gasPrice
        });

        const txHash = tx.transactionHash;
        document.getElementById('transactionInfo').innerText = "交易哈希：" + txHash;
        
        // 自动填充交易哈希到交易信息输入框
        document.getElementById('txHashInput').value = txHash;
        
        // 自动触发交易信息查询
        getTransactionInfo();
        
    } catch (error) {
        alert("设置数值失败：" + error.message);
    }
}


// Get Value Function
async function getValue() {
    const value = await contract.methods.get().call();
    document.getElementById('value').innerText = value;
}

// Get Account Info Function
async function getAccountInfo() {
    const accounts = await web3.eth.getAccounts();
    const accountAddress = accounts[0];
    document.getElementById('accountAddress').innerText = "Account Address: " + accountAddress;

    const balance = await web3.eth.getBalance(accountAddress);
    const balanceInEther = web3.utils.fromWei(balance, 'ether');
    document.getElementById('accountBalance').innerText = "Account Balance: " + balanceInEther + " ETH";
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
