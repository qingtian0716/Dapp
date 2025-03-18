let accounts = [];
let web3 = new Web3(Web3.givenProvider || "http://localhost:8889");
console.log("web3===>", web3);

if (typeof window.ethereum !== 'undefined') {
    console.log('MetaMask is installed!');
}

console.log("isMetaMask:" + ethereum.isMetaMask);

// 更新合约 ABI
var contractAbi = [
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
	},
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
	}
];

const address = '0x2fAe9C31853198bF822f185A01b10D00428688d7'; // 你的合约地址
const contract = new web3.eth.Contract(contractAbi, address);
console.log('contract:', contract);

// 绑定事件
$(".enableEthereumButton").click(function () {
    getAccount();
});

// 新增功能：设置值
$(".setValueButton").click(function () {
    setValue();
});

// 新增功能：获取值
$(".getValueButton").click(function () {
    getValue();
});

$(".getTransactionButton").click(function () {
    const transactionHash = $('#transactionHash').val(); // 获取输入的交易哈希
    if (transactionHash) {
        getTransactionInfo(transactionHash);
    } else {
        alert("Please enter a transaction hash.");
    }
});

// 获取当前账户
async function getAccount() {
    accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    $(".showAccount").html(account);
}

// 设置值
async function setValue() {
    const newValue = $('#newValue').val(); 
    console.log('Setting value to:', newValue);
    accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    contract.methods.set(newValue).send({ from: accounts[0] }).then(
        function (result) {
            console.log('Set value result:', result);
            $("#setStatus").html(result.status);
            $("#setTransaction").html(result.transactionHash);
        }
    );
}
// 获取值
async function getValue() {
    try {
        accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        const result = await contract.methods.get().call({ from: accounts[0] });
        console.log('Current value:', result);
        $(".currentValue").html(result);
    } catch (error) {
        console.error("Error fetching value:", error);
        alert("Failed to fetch value. Please check the console for more details.");
    }
}

async function getTransactionInfo(transactionHash) {
    try {
        // 获取交易收据
        const receipt = await web3.eth.getTransactionReceipt(transactionHash);

        if (receipt) {
            // 显示获取的交易信息
            $("#blockHash").text(receipt.blockHash || "Not Available");
            $("#blockNumber").text(receipt.blockNumber || "Not Available");
            $("#gasUsed").text(receipt.gasUsed || "Not Available");
            $("#status").text(receipt.status ? "Success" : "Failed");
			$("#from").text(receipt.from || "Not Available");
			$("#to").text(receipt.to || "Not Available");
        } else {
            alert("Transaction not found or still pending.");
        }
    } catch (error) {
        console.error("Error fetching transaction info:", error);
        alert("Failed to fetch transaction info.");
    }
}

ethereum.on('accountsChanged', function (accounts) {
    console.log("accountsChanged");
    getAccount();
});

ethereum.on('chainChanged', (chainId) => {
    console.log("chainId", chainId);
});
