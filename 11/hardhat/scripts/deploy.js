/**
 * 部署合约
 */
// 引入hardhat
const hre = require("hardhat");
// 引入文件系统
const fs = require("fs");
// 引入路径
const path = require("path");
// 加载环境变量
require('dotenv').config();

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

    // 编译并部署 YourCollectible
    console.log("正在编译合约...");
    const YourCollectible = await hre.ethers.getContractFactory("YourCollectible");

    console.log("正在部署合约...");
    const yourCollectible = await YourCollectible.deploy();
    console.log("等待合约部署确认...");
    await yourCollectible.waitForDeployment();

    const contractAddress = await yourCollectible.getAddress();
    console.log("合约部署成功！地址:", contractAddress);
    
    // 获取管理员地址（默认为部署者，除非在.env中指定）
    const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
    console.log("管理员地址:", adminAddress);
    
    // 如果管理员不是部署者，则设置新的管理员
    if (adminAddress.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("设置新的管理员地址...");
      const tx = await yourCollectible.setAdmin(adminAddress);
      await tx.wait();
      console.log("管理员地址已设置为:", adminAddress);
    }

    // 将合约地址和管理员地址写入 JSON 文件
    const addressPath = path.join(__dirname, './YourCollectible_address.json');
    const addressData = {
      contractAddress: contractAddress,
      deployedAt: new Date().toISOString(),
      network: hre.network.name,
      deployer: deployer.address,
      admin: adminAddress,
      tuitionFee: "36 ETH"
    };

    fs.writeFileSync(addressPath, JSON.stringify(addressData, null, 2));
    console.log(`合约地址已写入文件: ${addressPath}`);

    // 验证合约部署
    const deployedCode = await deployer.provider.getCode(contractAddress);
    if (deployedCode === "0x") {
      throw new Error("合约部署验证失败：在区块链上未找到合约代码");
    }

    // 提取并保存ABI
    const artifact = require("../artifacts/contracts/YourCollectible.sol/YourCollectible.json");
    const abiPath = path.join(__dirname, './YourCollectible_ABI.json');
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`ABI已写入文件: ${abiPath}`);

    console.log("合约部署验证成功！");
    console.log("\n部署摘要:");
    console.log("- 合约名称: YourCollectible");
    console.log("- 合约地址:", contractAddress);
    console.log("- 网络:", hre.network.name);
    console.log("- 部署者:", deployer.address);
    console.log("- 管理员:", adminAddress);
    console.log("- 学费金额: 36 ETH");
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
