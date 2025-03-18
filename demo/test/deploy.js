// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // 部署 ContractA
  const ContractA = await hre.ethers.getContractFactory("ContractA");
  const contractA = await ContractA.deploy();
  await contractA.waitForDeployment();
  console.log("ContractA deployed to:", contractA.target);

  // 部署 ContractB
  const ContractB = await hre.ethers.getContractFactory("ContractB");
  const contractB = await ContractB.deploy();
  await contractB.waitForDeployment();
  console.log("ContractB deployed to:", contractB.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });