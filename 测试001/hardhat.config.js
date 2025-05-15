/**
 * Hardhat configuration file
 */
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-ethers';
import 'dotenv/config';

/** @type import('hardhat/config').HardhatUserConfig */
const hardhatConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {},
    geth: {
      url: "HTTP://127.0.0.1:8889",
      accounts: ["e5846a843b7bb1261a531c5dbf1e72658f93e5174ae9388ebc229f03dc11c9c9"]
    },
    sepolia: {
      url: process.env.SEPOLIA_API_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    timeout: 600000,
  }
};

export default hardhatConfig;