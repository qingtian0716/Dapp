/**
 * 部署合约
 */
// 引入hardhat
const hre = require("hardhat");
// 引入文件系统
const fs = require("fs");
// 引入路径
const path = require("path");

async function deployContract(contractName, deployer) {
  console.log(`正在编译${contractName}合约...`);
  const ContractFactory = await hre.ethers.getContractFactory(contractName);

  console.log(`正在部署${contractName}合约...`);
  const contract = await ContractFactory.deploy();
  console.log(`等待${contractName}合约部署确认...`);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`${contractName}合约部署成功！地址:`, contractAddress);

  // 将合约地址写入 JSON 文件
  const addressPath = path.join(__dirname, `./${contractName}_address.json`);
  const addressData = {
    contractAddress: contractAddress,
    deployedAt: new Date().toISOString(),
    network: hre.network.name,
    deployer: deployer.address
  };

  fs.writeFileSync(addressPath, JSON.stringify(addressData, null, 2));
  console.log(`${contractName}合约地址已写入文件: ${addressPath}`);

  // 验证合约部署
  const deployedCode = await deployer.provider.getCode(contractAddress);
  if (deployedCode === "0x") {
    throw new Error(`${contractName}合约部署验证失败：在区块链上未找到合约代码`);
  }

  // 提取并保存ABI
  const artifact = require(`../artifacts/contracts/${contractName}.sol/${contractName}.json`);
  const abiPath = path.join(__dirname, `./${contractName}_ABI.json`);
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`${contractName}的ABI已写入文件: ${abiPath}`);

  console.log(`${contractName}合约部署验证成功！`);
  
  return {
    name: contractName,
    address: contractAddress
  };
}

async function main() {
  try {
    console.log("开始部署合约...");
    console.log("当前网络:", hre.network.name);

    // 获取部署者账户
    const [deployer] = await hre.ethers.getSigners();
    console.log("部署账户地址:", deployer.address);

    // 检查账户余额
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("部署账户余额:", hre.ethers.formatEther(balance), "ETH");

    // 部署合约列表
    const contractsToDeply = ["YourCollectible", "MyContract"];
    const deployedContracts = [];

    // 依次部署每个合约
    for (const contractName of contractsToDeply) {
      const deployedContract = await deployContract(contractName, deployer);
      deployedContracts.push(deployedContract);
    }

    console.log("\n所有合约部署摘要:");
    deployedContracts.forEach(contract => {
      console.log(`- 合约名称: ${contract.name}`);
      console.log(`- 合约地址: ${contract.address}`);
    });
    console.log("- 网络:", hre.network.name);
    console.log("- 部署者:", deployer.address);
    console.log("- 部署时间:", new Date().toLocaleString());

  } catch (error) {
    console.error("\n部署失败！");
    console.error("错误详情:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n部署脚本执行完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n脚本执行失败！");
    console.error("错误详情:", error);
    process.exit(1);
  });
