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

    // 发送交易，指定 gasPrice 以避免使用 EIP-1559
    const tx = await contract.methods.set(value).send({
        from: accounts[0],
        gasPrice: gasPrice // 显式设置 gasPrice，避免使用 EIP-1559 机制
    });

    const txHash = tx.transactionHash;
    document.getElementById('transactionInfo').innerText = "Transaction Hash: " + txHash;
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
    if (!txHash) {
        alert('Please enter a transaction hash.');
        return;
    }

    const receipt = await web3.eth.getTransactionReceipt(txHash);
    if (receipt) {
        const status = receipt.status ? "Success" : "Failed"; // 状态：成功或失败
        const blockHash = receipt.blockHash; // 区块哈希
        const blockNumber = receipt.blockNumber; // 区块号
        const from = receipt.from; // 发送者地址
        const to = receipt.to; // 接收者地址
        const gasUsed = receipt.gasUsed; // 使用的 gas

        document.getElementById('transactionInfo').innerText = `
            Status: ${status}
            Transaction Hash: ${txHash}
            Block Hash: ${blockHash}
            Block Number: ${blockNumber}
            From: ${from}
            To: ${to}
            Gas Used: ${gasUsed}
        `;
    } else {
        document.getElementById('transactionInfo').innerText = "Transaction not found!";
    }
}
