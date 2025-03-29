/**
 * 区块链和智能合约交互相关功能
 */

import { addTimestamp, BigIntSerializer } from './config.js';

// 全局变量
let web3;
let contract;

// 初始化Web3
async function initWeb3() {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        try {
            await window.ethereum.enable();
            console.log('Web3已初始化');
            return true;
        } catch (error) {
            console.error('初始化Web3失败:', error);
            return false;
        }
    } else if (window.web3) {
        web3 = new Web3(window.web3.currentProvider);
        console.log('使用旧版Web3初始化');
        return true;
    } else {
        console.warn('未检测到MetaMask或其他Web3提供者');
        return false;
    }
}

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
        return true;
    } catch (error) {
        console.error('初始化合约失败:', error);
        alert('初始化合约失败，请刷新页面重试');
        return false;
    }
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

// 获取账户信息
async function getAccountInfo() {
    const accounts = await web3.eth.getAccounts();
    const accountAddress = accounts[0];
    document.getElementById('accountAddress').innerText = "Account Address: " + accountAddress;

    const balance = await web3.eth.getBalance(accountAddress);
    const balanceInEther = web3.utils.fromWei(balance, 'ether');
    document.getElementById('accountBalance').innerText = "Account Balance: " + balanceInEther + " ETH";
}

// 获取交易信息
async function getTransactionInfo(txHash) {
    if (!txHash) {
        alert('Please enter a transaction hash.');
        return null;
    }

    const receipt = await web3.eth.getTransactionReceipt(txHash);
    return receipt;
}

// 获取合约余额
async function getContractBalance() {
    try {
        const balance = await web3.eth.getBalance(contract._address);
        const balanceInEther = web3.utils.fromWei(balance, 'ether');
        document.getElementById('contractBalance').innerText = `合约余额：${balanceInEther} ETH`;
        return balanceInEther;
    } catch (error) {
        console.error('获取合约余额失败:', error);
        document.getElementById('contractBalance').innerText = '获取余额失败';
        return null;
    }
}

// 提现功能
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
        return tx;
    } catch (error) {
        document.getElementById('withdrawError').innerText = 
            "提现失败: " + error.message;
        return null;
    }
}

// 交学费功能
async function payTuition(studentId) {
    if (!studentId) {
        document.getElementById('tuitionError').innerText = '请输入学号';
        return null;
    }

    try {
        const accounts = await web3.eth.getAccounts();
        const tuitionFee = await contract.methods.tuitionFee().call();
        
        const tx = await contract.methods.payTuition(studentId).send({
            from: accounts[0],
            value: tuitionFee
        });

        document.getElementById('tuitionTransactionInfo').innerText = 
            "交易成功！交易哈希: " + tx.transactionHash;
        document.getElementById('tuitionError').innerText = '';
        return tx;
    } catch (error) {
        document.getElementById('tuitionError').innerText = 
            "交易失败: " + error.message;
        return null;
    }
}

export {
    web3,
    contract,
    initWeb3,
    initializeContract,
    checkBlockchainConnection,
    getAccountInfo,
    getTransactionInfo,
    getContractBalance,
    withdraw,
    payTuition
};