require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",

  networks: {
    hardhat: {}, //  定义一个名为hardhat的网络
    geth: {
      url: "HTTP://127.0.0.1:8889", // Ganache的RPC地址
      accounts: ["0xe5846a843b7bb1261a531c5dbf1e72658f93e5174ae9388ebc229f03dc11c9c9"] // 从Ganache里复制一个账户的私钥
    }
  },
};
