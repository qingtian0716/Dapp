// require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",  // 正确的 Solidity 版本

  networks: {
    hardhat: {
      // Hardhat本地网络配置
    },
    ganache: {
      url: "HTTP://127.0.0.1:7545", // Ganache的RPC地址
      accounts: [process.env.PRIVATE_KEY || "7889bb8ea0751a0fb1cb7f97769d43875d428ce7e9aafb9bdc744fe782141973"], // 从Ganache里复制一个账户的私钥
      networkId: 5777, // Ganache默认网络ID
      chainId: 1337 // Ganache默认链ID
    }
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test"
  }
};