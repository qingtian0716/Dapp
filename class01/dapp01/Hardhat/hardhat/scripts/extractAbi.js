const fs = require('fs');
const path = require('path');

async function main() {
  const contractName = "YourCollectible"; // 合约名称
  const artifactsPath = path.join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
  
  // 读取生成的 JSON 文件
  const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
  
  // 提取 ABI
  const abi = artifact.abi;

  // 写入 ABI 到文件中
  const abiPath = path.join(__dirname, `${contractName}_ABI.json`);
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log(`ABI 已写入到 ${abiPath}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
