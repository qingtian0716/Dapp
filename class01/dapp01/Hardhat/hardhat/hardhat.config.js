require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();  // 加载 .env 文件

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",  // 正确的 Solidity 版本

  networks: {
    hardhat: {}, //  定义一个名为hardhat的网络
    geth: {
      url: "HTTP://127.0.0.1:8889", // Ganache的RPC地址
      accounts: [process.env.PRIVATE_KEY] // 从Ganache里复制一个账户的私钥
    }
  },

  // networks: {
  //   sepolia: {
  //     url: process.env.SEPOLIA_API_URL,  // 使用实际的 Alchemy API 密钥
  //     accounts: [process.env.PRIVATE_KEY],  // 从 .env 文件中读取私钥
  //   },
  // },

  
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,  // 使用实际的 Etherscan API 密钥
  //   timeout: 600000,
  // },
};