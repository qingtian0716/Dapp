let web3;
let contract;

// Pinata API credentials
const pinataApiKey = '4474fad72af52b1a7bcf'; // Replace with your Pinata API key
const pinataSecretApiKey = 'baf5c086b522e409e08d13bae1dd933f5adfdfbeb86efc0af5adaf9dbfffa566'; // Replace with your Pinata Secret API key

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
async function setValue() {
    const value = document.getElementById('setValue').value;
    const accounts = await web3.eth.getAccounts();

    // Get current gas price
    const gasPrice = await web3.eth.getGasPrice();

    // Send transaction with explicit gasPrice to avoid EIP-1559
    const tx = await contract.methods.set(value).send({
        from: accounts[0],
        gasPrice: gasPrice // Explicitly set gasPrice
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
        const status = receipt.status ? "Success" : "Failed"; // Status: Success or Failed
        const blockHash = receipt.blockHash; // Block hash
        const blockNumber = receipt.blockNumber; // Block number
        const from = receipt.from; // Sender address
        const to = receipt.to; // Receiver address
        const gasUsed = receipt.gasUsed; // Gas used

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

// Upload Image to Pinata Function
async function uploadImageToPinata() {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select an image file.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': pinataApiKey,
                'pinata_secret_api_key': pinataSecretApiKey,
            },
            body: formData,
        });

        const result = await response.json();
        if (result.IpfsHash) {
            // Generate the direct link to the image using Pinata's gateway
            const imageUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
            document.getElementById('pinataResponse').innerHTML = `
                Image uploaded successfully!<br>
                IPFS Hash: ${result.IpfsHash}<br>
                <a href="${imageUrl}" target="_blank">View Image</a>
            `;
        } else {
            document.getElementById('pinataResponse').innerText = 'Failed to upload image.';
        }
    } catch (error) {
        console.error('Error uploading image to Pinata:', error);
        document.getElementById('pinataResponse').innerText = 'Error uploading image.';
    }
}