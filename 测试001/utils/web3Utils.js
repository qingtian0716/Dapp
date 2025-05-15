/**
 * Web3实用工具函数
 * 提供常用的Web3操作和错误处理功能
 */
import { web3, contract, initializeWeb3 as initWeb3 } from './auth/wallet.js';
import { showToast } from './error.js';
import { Web3Helper } from './web3Helper.js';

/**
 * 检查Web3连接状态
 * @returns {Promise<boolean>} 连接状态
 */
export async function checkWeb3Connection() {
    if (!web3 || !contract) {
        const connected = await initWeb3();
        if (!connected) {
            showToast('请先连接钱包', 'warning');
            return false;
        }
    }

    try {
        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) {
            showToast('请先连接钱包', 'warning');
            return false;
        }
        return true;
    } catch (error) {
        console.error('检查Web3连接失败:', error);
        showToast('检查钱包连接失败', 'error');
        return false;
    }
}

/**
 * 统一的合约错误处理函数
 * @param {Error} error - 错误对象
 * @param {string} customMessage - 自定义错误消息
 * @returns {boolean} - 始终返回false，方便在调用处进行条件判断
 */
export function handleContractError(error, customMessage = '') {
    console.error(customMessage || '合约操作失败:', error);
    
    const errorMessage = Web3Helper.handleContractError(error);
    const errorType = error.message?.includes('User denied transaction') ? 'warning' : 'error';
    
    showToast(customMessage ? `${customMessage}: ${errorMessage}` : errorMessage, errorType);
    return false;
}

/**
 * 创建缓存管理器
 * @param {number} expirationTime - 缓存过期时间（毫秒）
 * @returns {Object} 缓存管理器对象
 */
export function createCache(expirationTime = 5 * 60 * 1000) {
    return {
        data: null,
        timestamp: null,
        expirationTime,
        isValid() {
            return this.data && this.timestamp && 
                   (Date.now() - this.timestamp < this.expirationTime);
        },
        isExpired() {
            return !this.isValid();
        },
        update(data) {
            this.data = data;
            this.timestamp = Date.now();
        },
        clear() {
            this.data = null;
            this.timestamp = null;
        },
        getData() {
            return this.data;
        },
        status() {
            return {
                hasData: !!this.data,
                timestamp: this.timestamp,
                isValid: this.isValid()
            };
        }
    };
}

/**
 * 验证钱包地址格式
 * @param {string} address - 钱包地址
 * @returns {boolean} 是否为有效地址
 */
export function isValidAddress(address) {
    if (!web3) return false;
    return web3.utils.isAddress(address);
}

/**
 * 获取当前网络信息
 * @returns {Promise<Object>} 网络信息对象
 */
export async function getNetworkInfo() {
    if (!web3) throw new Error('Web3未初始化');
    
    const chainId = await web3.eth.getChainId();
    const networkId = await web3.eth.net.getId();
    const isListening = await web3.eth.net.isListening();
    
    const networkTypes = {
        1: 'Ethereum Mainnet',
        3: 'Ropsten Testnet',
        4: 'Rinkeby Testnet',
        5: 'Goerli Testnet',
        42: 'Kovan Testnet',
        56: 'BSC Mainnet',
        97: 'BSC Testnet',
        137: 'Polygon Mainnet',
        80001: 'Polygon Mumbai',
        31337: 'Hardhat Network',
        1337: 'Local Network'
    };
    
    return {
        chainId,
        networkId,
        isListening,
        networkType: networkTypes[chainId] || 'Unknown Network'
    };
}