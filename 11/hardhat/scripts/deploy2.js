const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // 获取合约工厂
  const MyContract = await hre.ethers.getContractFactory("MyContract");

  // 部署合约
  const myContract = await MyContract.deploy();

  // 等待部署完成（Ethers v6）
  await myContract.waitForDeployment();

  console.log(`MyContract deployed to: ${myContract.target}`);

  // 要保存的数据
  const contractData = {
    address: myContract.target,
    deployTime: new Date().toISOString()
  };

  // 保存到 scripts/deployedAddress.json
  const outputPath = path.join(__dirname, "deployedAddress.json");  // ← 只用 __dirname
  fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2));

  console.log(`Contract address saved to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
