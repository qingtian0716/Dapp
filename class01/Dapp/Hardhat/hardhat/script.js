const contractAddress = '0xb72Df152f77632C3CF00Cbe7E0e6382BBf37d762';
const contractABI = [
    {
        "inputs": [],
        "name": "get",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "set",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

let web3;
let contract;

// Initialize Web3 and Contract
window.addEventListener('load', async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        await window.ethereum.enable();
        contract = new web3.eth.Contract(contractABI, contractAddress);
    } else {
        alert('Please install MetaMask!');
    }
});

// Set Value Function
async function setValue() {
    const value = document.getElementById('setValue').value;
    const accounts = await web3.eth.getAccounts();
    const tx = await contract.methods.set(value).send({ from: accounts[0] });
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