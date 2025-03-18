require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.28",
  networks: {
    geth: {
      url: "http://127.0.0.1:8889",
      accounts: ["e5846a843b7bb1261a531c5dbf1e72658f93e5174ae9388ebc229f03dc11c9c9"]
    }
  }
};

