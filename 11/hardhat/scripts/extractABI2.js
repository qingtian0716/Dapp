const fs = require("fs");
const path = require("path");

async function main() {
  // 1. 找到原始的 artifacts 里的合约文件
  const artifactsPath = path.join(__dirname, "..", "artifacts", "contracts", "MyContract.sol", "MyContract.json");

  // 2. 读取合约 JSON
  const contractJson = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));

  // 3. 只提取 ABI
  const abi = contractJson.abi;

  // 4. 要保存的目标路径（在 scripts 文件夹下）
  const outputPath = path.join(__dirname, "MyContract_ABI.json");

  // 5. 写入新的 JSON 文件
  fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));

  console.log(`ABI successfully extracted to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
