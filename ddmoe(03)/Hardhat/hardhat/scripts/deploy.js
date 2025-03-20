const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // 部署 ContractA
  const ContractA = await hre.ethers.getContractFactory("YourCollectible");
  const contractA = await ContractA.deploy();
  await contractA.waitForDeployment();

  const contractAddress = contractA.target;
  console.log("ContractA deployed to:", contractAddress);

  // 将合约地址写入 JSON 文件 (scripts 文件夹下)
  const addressPath = path.join(__dirname, './YourCollectible_address.json'); // 写入 scripts 文件夹
  const addressData = {
    contractAddress: contractAddress,
  };

  fs.writeFileSync(addressPath, JSON.stringify(addressData, null, 2));
  console.log(`Contract address written to ${addressPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
