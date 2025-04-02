const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("开始提取合约ABI...");

    // 读取编译后的合约文件
    const contractsPath = path.join(__dirname, "../artifacts/contracts/YourCollectible.sol/YourCollectible.json");
    
    if (!fs.existsSync(contractsPath)) {
      throw new Error("找不到编译后的合约文件，请先运行 'npx hardhat compile'");
    }

    console.log("正在读取编译后的合约文件...");
    const contractJson = require(contractsPath);

    // 提取ABI
    const abi = contractJson.abi;
    
    // 验证ABI中包含必要的函数
    const hasSetFunction = abi.some(item => 
      item.type === "function" && 
      item.name === "set" &&
      item.inputs.length === 3
    );
    
    const hasGetFunction = abi.some(item =>
      item.type === "function" &&
      item.name === "get" &&
      item.inputs.length === 1
    );

    if (!hasSetFunction || !hasGetFunction) {
      throw new Error("ABI验证失败：缺少必要的函数定义");
    }

    // 将ABI写入文件
    const abiPath = path.join(__dirname, "./YourCollectible_ABI.json");
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));

    console.log("ABI提取成功！");
    console.log(`ABI文件已保存至: ${abiPath}`);
    
    // 打印函数列表
    console.log("\n合约包含以下函数:");
    abi.filter(item => item.type === "function").forEach(func => {
      console.log(`- ${func.name}(${func.inputs.map(input => `${input.type} ${input.name}`).join(", ")})`);
      if (func.outputs && func.outputs.length > 0) {
        console.log(`  返回值: (${func.outputs.map(output => `${output.type} ${output.name}`).join(", ")})`);
      }
    });

  } catch (error) {
    console.error("\nABI提取失败！");
    console.error("错误详情:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\nABI提取脚本执行完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n脚本执行失败！");
    console.error("错误详情:", error);
    process.exit(1);
  });
