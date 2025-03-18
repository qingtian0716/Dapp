require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();  // 添加 dotenv 支持

task("deploy", "Deploys the contract", async (taskArgs, hre) => {
  // 这里的 hre (Hardhat Runtime Environment) 包含了所有的 Hardhat 功能
  await hre.run("run", { script: "./test/deploy.js", network: "geth" });
});

module.exports = {
  solidity: "0.8.0",
  networks: {
    hardhat: {},
   // sepolia: {
      //url: "https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY",  // 使用实际的 Alchemy API 密钥
     // accounts: [process.env.PRIVATE_KEY],  // 从 .env 文件中读取私钥
   // },
    geth: {
      url: "http://127.0.0.1:8889",
      accounts: [process.env.PRIVATE_KEY],  // 从 .env 文件中读取私钥
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "QUVRSYMTKFU3KVXUKTIAY6QSMIK7BRI17A",  // 优先使用环境变量
    timeout: 600000,
  },
};
