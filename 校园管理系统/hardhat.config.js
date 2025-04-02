// require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();  // 加载 .env 文件

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",  // 正确的 Solidity 版本

  networks: {
    hardhat: {}, // 启用内置网络
    geth: {
      url: "HTTP://127.0.0.1:8889", // Ganache的RPC地址
      accounts: [process.env.PRIVATE_KEY || "e5846a843b7bb1261a531c5dbf1e72658f93e5174ae9388ebc229f03dc11c9c9"], // 修复账户配置
      networkId: 1337, // Ganache默认网络ID
      chainId: 1337 // Ganache默认链ID
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
