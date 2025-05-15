// Web3工具类
class Web3Helper {
    static instance = null;

    static initialize(web3, contract) {
        if (!Web3Helper.instance) {
            Web3Helper.instance = new Web3Helper(web3, contract);
        }
        return Web3Helper.instance;
    }

    static getInstance() {
        if (!Web3Helper.instance) {
            throw new Error('Web3Helper未初始化,请先调用initialize方法');
        }
        return Web3Helper.instance;
    }
    constructor(web3, contract) {
        this.web3 = web3;
        this.contract = contract;
    }

    // 检查Web3连接状态
    async checkConnection() {
        if (!this.web3 || !this.contract) {
            throw new Error('Web3未初始化');
        }

        const accounts = await this.web3.eth.getAccounts();
        if (accounts.length === 0) {
            throw new Error('请先连接钱包');
        }

        return accounts[0];
    }
    
    // 检查网络连接状态
    async checkNetwork() {
        if (!this.web3) {
            throw new Error('Web3未初始化');
        }
        
        try {
            // 增加网络检测的全面性，同时检查多个网络状态指标
            const [chainId, isListening, networkId, blockNumber, gasPrice] = await Promise.all([
                this.web3.eth.getChainId(),
                this.web3.eth.net.isListening(),
                this.web3.eth.net.getId(),
                this.web3.eth.getBlockNumber().catch(() => null),
                this.web3.eth.getGasPrice().catch(() => null)
            ]);

            if (!isListening) {
                throw new Error('网络连接已断开');
            }

            // 如果无法获取区块号，可能表示节点同步问题
            if (blockNumber === null) {
                console.warn('无法获取最新区块号，节点可能存在同步问题');
            }

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
                1337: 'Local Network',
                11155111: 'Sepolia Testnet',
                84531: 'Base Goerli Testnet',
                8453: 'Base Mainnet',
                10: 'Optimism Mainnet',
                420: 'Optimism Goerli',
                42161: 'Arbitrum One',
                421613: 'Arbitrum Goerli'
            };
            
            const networkName = networkTypes[chainId] || 'Unknown Network';
            console.log(`当前连接网络: ${networkName} (${chainId})`);
            
            // 检查网络是否受支持
            const isSupported = Object.keys(networkTypes).includes(chainId.toString());
            if (!isSupported) {
                console.warn(`不支持的网络类型: ${networkName} (${chainId})`);
            }

            return {
                chainId,
                networkId,
                networkName,
                blockNumber,
                gasPrice: gasPrice ? this.web3.utils.fromWei(gasPrice, 'gwei') + ' Gwei' : null,
                isSupported,
                isValid: isListening && blockNumber !== null
            };
        } catch (error) {
            console.error('网络检查失败:', error);
            throw new Error(error.message || '网络连接异常,请检查MetaMask网络设置');
        }
    }

    // 验证地址格式
    isValidAddress(address) {
        return this.web3.utils.isAddress(address);
    }

    // 统一的错误处理 - 增强版
    static handleContractError(error) {
        console.error('合约操作失败:', error);
        
        // 扩展错误消息映射，提供更详细的错误信息和建议
        const errorMessages = {
            // MetaMask相关错误
            'Internal JSON-RPC error': '区块链网络连接异常，系统将切换到离线模式。建议检查网络连接或重启MetaMask',
            'User denied transaction': '您取消了交易',
            'nonce too low': '交易序号过低，请重新发送交易',
            'insufficient funds': '账户余额不足',
            'gas required exceeds allowance': '所需gas超过限制',
            'execution reverted': '合约执行失败',
            'replacement transaction underpriced': '替换交易价格过低',
            'known transaction': '重复的交易',
            
            // 网络连接错误
            'connection refused': '无法连接到服务器，系统将切换到离线模式',
            'Failed to fetch': '网络请求失败，系统将切换到离线模式',
            'Network Error': '网络连接异常，系统将切换到离线模式',
            'timeout': '请求超时，系统将切换到离线模式',
            'ERR_CONNECTION_REFUSED': '连接被拒绝，系统将切换到离线模式',
            'net::ERR_CONNECTION_REFUSED': '服务器连接失败，系统将切换到离线模式',
            'net::ERR_NETWORK_CHANGED': '网络已更改，请刷新页面',
            'net::ERR_INTERNET_DISCONNECTED': '网络已断开，请检查网络连接',
            
            // 权限和业务错误
            'Only admin': '只有管理员才能执行此操作',
            'Invalid teacher': '无效的教师地址或该地址已经是教师',
            'Student not found': '学生不存在，请检查学号',
            'Invalid score': '无效的分数，请确保分数在0-100之间',
            'unauthorized': '未授权的操作',
            'invalid parameters': '无效的参数'
        };

        for (const [key, message] of Object.entries(errorMessages)) {
            if (error.message.includes(key)) {
                return message;
            }
        }

        return '操作失败: ' + error.message;
    }

    // 缓存管理器
    static createCache(expirationTime = 5 * 60 * 1000) {
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

    // 批量处理助手
    static async batchProcess(items, processor, options = {}) {
        const {
            onProgress,
            onError,
            stopOnError = false
        } = options;

        let successCount = 0;
        let failureCount = 0;

        for (const item of items) {
            try {
                await processor(item);
                successCount++;
                if (onProgress) {
                    onProgress(successCount, failureCount, items.length);
                }
            } catch (error) {
                failureCount++;
                if (onError) {
                    onError(item, error);
                }
                if (stopOnError) {
                    throw error;
                }
            }
        }

        return { successCount, failureCount };
    }

    // 重试操作函数 - 增强版
    async retryOperation(operation, fallback = null, options = {}) {
        // 默认配置与用户配置合并
        const config = {
            maxRetries: 3,                // 最大重试次数
            initialDelay: 1000,          // 初始延迟时间(毫秒)
            maxDelay: 15000,             // 最大延迟时间(毫秒)
            timeout: 8000,               // 操作超时时间(毫秒)
            checkNetworkBeforeRetry: true, // 重试前是否检查网络
            retryableErrors: [           // 可重试的错误类型
                'Internal JSON-RPC error',
                'connection error',
                'timeout',
                'nonce too low',
                'replacement transaction underpriced',
                'known transaction',
                'insufficient funds',
                'gas required exceeds allowance',
                'execution reverted',
                'network error',
                'invalid response',
                'operation timeout'
            ],
            nonRetryableErrors: [         // 不可重试的错误类型
                'User denied',
                'User rejected',
                'canceled',
                'rejected',
                'unauthorized',
                'invalid parameters'
            ],
            onRetry: null,                // 重试回调函数
            ...options
        };

        let lastError;
        let lastNetworkStatus = null;

        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
            try {
                // 每次重试前检查网络状态，但不要让网络检查失败阻止重试
                if (attempt > 1 && config.checkNetworkBeforeRetry) {
                    try {
                        lastNetworkStatus = await this.checkNetwork();
                        // 如果网络状态无效，增加警告但继续尝试
                        if (!lastNetworkStatus.isValid) {
                            console.warn(`网络状态异常，但仍将尝试操作 (尝试 ${attempt}/${config.maxRetries})`);
                        }
                    } catch (networkError) {
                        console.warn(`重试前网络检查失败 (尝试 ${attempt}/${config.maxRetries}):`, networkError);
                    }
                }
                
                // 添加超时机制
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('操作超时')), config.timeout);
                });
                
                // 使用Promise.race实现超时控制
                const result = await Promise.race([
                    operation(),
                    timeoutPromise
                ]);
                
                // 验证结果有效性
                if (result === undefined || result === null) {
                    throw new Error('操作返回值无效');
                }
                
                // 操作成功，返回结果
                return result;
            } catch (error) {
                lastError = error;
                const errorMessage = error.message || '未知错误';
                
                // 检查是否为不可重试的错误
                const isNonRetryable = config.nonRetryableErrors.some(errType => 
                    errorMessage.toLowerCase().includes(errType.toLowerCase()));
                if (isNonRetryable) {
                    console.log(`遇到不可重试的错误: ${errorMessage}`);
                    throw error;
                }
                
                // 检查是否为可重试的错误
                const isRetryable = config.retryableErrors.some(errType => 
                    errorMessage.toLowerCase().includes(errType.toLowerCase()));
                
                // 对于网络错误，提供更详细的日志
                if (errorMessage.includes('Internal JSON-RPC error')) {
                    console.warn(`网络错误，第${attempt}次重试:`, errorMessage);
                } else {
                    console.warn(`操作失败，第${attempt}次重试:`, error);
                }
                
                // 如果配置了重试回调，则调用
                if (config.onRetry) {
                    try {
                        config.onRetry(attempt, error, lastNetworkStatus);
                    } catch (callbackError) {
                        console.warn('重试回调函数执行失败:', callbackError);
                    }
                }
                
                // 如果还有重试机会，则等待后重试
                if (attempt < config.maxRetries) {
                    // 使用指数退避策略计算延迟时间
                    let backoffDelay = config.initialDelay * Math.pow(2, attempt - 1);
                    
                    // 对于网络错误，使用更长的延迟
                    if (isRetryable) {
                        backoffDelay = Math.max(backoffDelay, 3000); // 至少3秒
                    }
                    
                    // 确保延迟不超过最大值
                    backoffDelay = Math.min(backoffDelay, config.maxDelay);
                    
                    // 添加随机抖动，避免多个请求同时重试
                    const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15之间的随机数
                    backoffDelay = Math.floor(backoffDelay * jitter);
                    
                    console.log(`将在 ${backoffDelay}ms 后进行第 ${attempt+1} 次重试...`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                }
            }
        }
        
        // 所有重试都失败了
        const errorMessage = lastError?.message || '未知错误';
        console.error(`操作失败，已达到最大重试次数(${config.maxRetries}):`, errorMessage);
        
        // 尝试使用回退函数
        if (fallback) {
            try {
                console.log('尝试执行回退操作...');
                return await fallback(lastError, lastNetworkStatus);
            } catch (fallbackError) {
                console.error('回退操作失败:', fallbackError);
                throw new Error(`主操作和回退操作均失败: ${errorMessage} -> ${fallbackError.message}`);
            }
        }
        
        // 对于特定错误类型，提供更友好的错误信息
        if (lastError.message.includes('Internal JSON-RPC error')) {
            throw new Error('区块链网络连接失败，请检查MetaMask连接状态和网络设置');
        } else if (lastError.message.includes('gas required exceeds allowance')) {
            throw new Error('交易所需gas超出账户余额，请确保有足够的ETH支付gas费');
        } else if (lastError.message.includes('insufficient funds')) {
            throw new Error('账户余额不足，无法完成交易');
        } else if (lastError.message.includes('nonce too low')) {
            throw new Error('交易nonce值过低，可能是由于之前的交易已经被确认');
        } else if (lastError.message.includes('replacement transaction underpriced')) {
            throw new Error('替换交易的gas价格过低，无法替换之前的交易');
        }
        
        throw lastError;
    }
    // 监听合约事件
    listenToContractEvent(eventName, options = {}, callback) {
        if (!this.contract) {
            throw new Error('合约未初始化');
        }

        const defaultOptions = {
            fromBlock: 'latest',
            toBlock: 'latest',
            filter: {}
        };

        const eventOptions = { ...defaultOptions, ...options };
        console.log(`开始监听合约事件: ${eventName}`, eventOptions);

        return this.contract.events[eventName](eventOptions)
            .on('data', (event) => {
                console.log(`接收到合约事件 ${eventName}:`, event);
                if (callback) callback(null, event);
            })
            .on('error', (error) => {
                console.error(`合约事件 ${eventName} 监听错误:`, error);
                if (callback) callback(error, null);
            });
    }

    // 获取交易收据并等待确认
    async getTransactionReceipt(txHash, confirmations = 1, timeout = 60000) {
        if (!this.web3) {
            throw new Error('Web3未初始化');
        }

        const startTime = Date.now();
        let receipt = null;

        while (Date.now() - startTime < timeout) {
            try {
                // 获取交易收据
                receipt = await this.web3.eth.getTransactionReceipt(txHash);
                
                // 如果交易尚未被打包，继续等待
                if (!receipt) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                // 如果不需要确认或者已经有足够的确认数，返回收据
                if (confirmations <= 0) {
                    return receipt;
                }

                // 获取当前区块号
                const currentBlock = await this.web3.eth.getBlockNumber();
                
                // 计算确认数
                const confirmationBlocks = currentBlock - receipt.blockNumber + 1;
                
                if (confirmationBlocks >= confirmations) {
                    return receipt;
                }

                console.log(`交易 ${txHash} 已有 ${confirmationBlocks}/${confirmations} 个确认...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.warn(`获取交易收据失败: ${error.message}，将重试...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        throw new Error(`获取交易收据超时: ${txHash}`);
    }

    // 估算交易的gas用量
    async estimateGas(method, options = {}) {
        if (!this.web3 || !this.contract) {
            throw new Error('Web3或合约未初始化');
        }

        try {
            // 获取当前账户
            const accounts = await this.web3.eth.getAccounts();
            if (accounts.length === 0) {
                throw new Error('未连接钱包账户');
            }

            // 准备交易参数
            const txParams = {
                from: options.from || accounts[0],
                ...options
            };

            // 估算gas用量
            const gasEstimate = await method.estimateGas(txParams);
            
            // 添加一定的安全边际
            const safetyMargin = 1.2; // 增加20%的安全边际
            const safeGasLimit = Math.ceil(gasEstimate * safetyMargin);
            
            // 获取当前gas价格
            const gasPrice = await this.web3.eth.getGasPrice();
            
            // 计算预估的交易费用
            const estimatedFee = this.web3.utils.fromWei(
                (BigInt(safeGasLimit) * BigInt(gasPrice)).toString(),
                'ether'
            );
            
            return {
                gasEstimate,
                safeGasLimit,
                gasPrice: this.web3.utils.fromWei(gasPrice, 'gwei') + ' Gwei',
                estimatedFee: estimatedFee + ' ETH'
            };
        } catch (error) {
            console.error('估算gas失败:', error);
            throw new Error(`估算交易gas失败: ${error.message}`);
        }
    }

    // 发送交易并跟踪状态 - 增强版，支持每一步操作上链
    async sendTransactionWithTracking(method, options = {}) {
        if (!this.web3 || !this.contract) {
            throw new Error('Web3或合约未初始化');
        }

        // 默认配置
        const config = {
            from: null,                // 发送地址，默认使用当前连接的账户
            value: 0,                  // 发送的ETH数量
            gasPrice: null,            // gas价格，null表示使用网络建议值
            gasLimit: null,            // gas限制，null表示自动估算
            nonce: null,               // 交易nonce，null表示自动计算
            confirmations: 1,          // 需要等待的确认数
            onSubmitted: null,         // 交易提交回调
            onConfirmed: null,         // 交易确认回调
            onError: null,             // 错误回调
            onProgress: null,          // 交易进度回调
            onSuccess: null,           // 交易成功回调
            onComplete: null,          // 交易完成回调(无论成功失败)
            waitForConfirmations: true, // 是否等待确认
            showGasEstimation: true,   // 是否显示gas估算信息
            retryOnFailure: true,      // 失败时是否重试
            maxRetries: 2,             // 最大重试次数
            operationName: '区块链操作', // 操作名称，用于日志和UI显示
            saveToHistory: true,       // 是否保存到交易历史
            ...options
        };

        try {
            // 检查网络连接状态
            try {
                const networkStatus = await this.checkNetwork();
                if (!networkStatus.isValid) {
                    throw new Error(`网络状态异常: ${networkStatus.networkName}`);
                }
                console.log(`[${config.operationName}] 当前网络: ${networkStatus.networkName}`);
            } catch (networkError) {
                console.warn(`[${config.operationName}] 网络检查失败:`, networkError);
                // 继续执行，让MetaMask处理网络问题
            }

            // 获取当前账户
            const accounts = await this.web3.eth.getAccounts();
            if (accounts.length === 0) {
                throw new Error('未连接钱包账户');
            }

            // 准备交易参数
            const txParams = {
                from: config.from || accounts[0],
                value: config.value > 0 ? this.web3.utils.toWei(config.value.toString(), 'ether') : 0
            };

            // 如果指定了gasPrice，添加到参数中
            if (config.gasPrice) {
                txParams.gasPrice = this.web3.utils.toWei(config.gasPrice.toString(), 'gwei');
            }

            // 如果指定了gasLimit，添加到参数中
            if (config.gasLimit) {
                txParams.gas = config.gasLimit;
            } else {
                // 自动估算gas并添加安全边际
                try {
                    if (config.showGasEstimation) {
                        console.log(`[${config.operationName}] 正在估算Gas...`);
                    }
                    
                    const gasEstimate = await method.estimateGas({ ...txParams });
                    txParams.gas = Math.ceil(gasEstimate * 1.2); // 增加20%的安全边际
                    
                    if (config.showGasEstimation) {
                        const gasPrice = await this.web3.eth.getGasPrice();
                        const estimatedFee = this.web3.utils.fromWei(
                            (BigInt(txParams.gas) * BigInt(gasPrice)).toString(),
                            'ether'
                        );
                        console.log(`[${config.operationName}] Gas估算: ${txParams.gas} (约 ${estimatedFee} ETH)`);
                    }
                } catch (gasError) {
                    console.warn(`[${config.operationName}] Gas估算失败，将使用默认值:`, gasError);
                    txParams.gas = 3000000; // 使用一个较大的默认值
                }
            }

            // 如果指定了nonce，添加到参数中
            if (config.nonce !== null) {
                txParams.nonce = config.nonce;
            }

            console.log(`[${config.operationName}] 准备发送交易，参数:`, txParams);
            
            // 进度通知 - 准备中
            if (config.onProgress) {
                config.onProgress({
                    stage: 'preparing',
                    message: '正在准备交易...',
                    details: { txParams },
                    timestamp: new Date().toISOString()
                });
            }

            // 使用重试机制发送交易
            const sendTransaction = async () => {
                return new Promise((resolve, reject) => {
                    method.send(txParams)
                        .on('transactionHash', (hash) => {
                            console.log(`[${config.operationName}] 交易已提交，哈希:`, hash);
                            
                            // 保存交易哈希到本地存储
                            if (config.saveToHistory) {
                                try {
                                    const txHistory = JSON.parse(localStorage.getItem('txHistory') || '[]');
                                    txHistory.push({
                                        hash,
                                        operation: config.operationName,
                                        status: 'pending',
                                        timestamp: new Date().toISOString(),
                                        from: txParams.from
                                    });
                                    localStorage.setItem('txHistory', JSON.stringify(txHistory));
                                } catch (storageError) {
                                    console.warn('保存交易历史失败:', storageError);
                                }
                            }
                            
                            // 进度通知 - 已提交
                            if (config.onProgress) {
                                config.onProgress({
                                    stage: 'submitted',
                                    message: '交易已提交到区块链',
                                    details: { hash },
                                    timestamp: new Date().toISOString()
                                });
                            }
                            
                            if (config.onSubmitted) {
                                config.onSubmitted(hash);
                            }
                        })
                        .on('receipt', (receipt) => {
                            console.log(`[${config.operationName}] 收到交易收据:`, receipt);
                            
                            // 更新交易历史状态
                            if (config.saveToHistory) {
                                try {
                                    const txHistory = JSON.parse(localStorage.getItem('txHistory') || '[]');
                                    const updatedHistory = txHistory.map(tx => {
                                        if (tx.hash === receipt.transactionHash) {
                                            return {
                                                ...tx,
                                                status: receipt.status ? 'success' : 'failed',
                                                blockNumber: receipt.blockNumber,
                                                gasUsed: receipt.gasUsed
                                            };
                                        }
                                        return tx;
                                    });
                                    localStorage.setItem('txHistory', JSON.stringify(updatedHistory));
                                } catch (storageError) {
                                    console.warn('更新交易历史失败:', storageError);
                                }
                            }
                            
                            // 进度通知 - 已打包
                            if (config.onProgress) {
                                config.onProgress({
                                    stage: 'mined',
                                    message: '交易已被矿工打包',
                                    details: { receipt },
                                    timestamp: new Date().toISOString()
                                });
                            }
                            
                            // 如果不需要等待确认，直接返回收据
                            if (!config.waitForConfirmations || config.confirmations <= 0) {
                                resolve(receipt);
                            }
                        })
                        .on('confirmation', (confirmationNumber, receipt) => {
                            console.log(`[${config.operationName}] 交易确认 #${confirmationNumber}:`, receipt.transactionHash);
                            
                            // 进度通知 - 确认中
                            if (config.onProgress) {
                                config.onProgress({
                                    stage: 'confirming',
                                    message: `交易确认中 (${confirmationNumber}/${config.confirmations})`,
                                    details: { confirmationNumber, receipt },
                                    timestamp: new Date().toISOString()
                                });
                            }
                            
                            if (config.onConfirmed) {
                                config.onConfirmed(confirmationNumber, receipt);
                            }
                            
                            // 当达到指定的确认数时，解析Promise
                            if (confirmationNumber >= config.confirmations) {
                                // 进度通知 - 已确认
                                if (config.onProgress) {
                                    config.onProgress({
                                        stage: 'confirmed',
                                        message: '交易已确认',
                                        details: { confirmationNumber, receipt },
                                        timestamp: new Date().toISOString()
                                    });
                                }
                                
                                resolve(receipt);
                            }
                        })
                        .on('error', (error) => {
                            console.error(`[${config.operationName}] 交易错误:`, error);
                            
                            // 更新交易历史状态（如果有交易哈希）
                            if (config.saveToHistory && error.receipt) {
                                try {
                                    const txHistory = JSON.parse(localStorage.getItem('txHistory') || '[]');
                                    const updatedHistory = txHistory.map(tx => {
                                        if (tx.hash === error.receipt.transactionHash) {
                                            return {
                                                ...tx,
                                                status: 'error',
                                                error: error.message
                                            };
                                        }
                                        return tx;
                                    });
                                    localStorage.setItem('txHistory', JSON.stringify(updatedHistory));
                                } catch (storageError) {
                                    console.warn('更新交易历史失败:', storageError);
                                }
                            }
                            
                            // 进度通知 - 错误
                            if (config.onProgress) {
                                config.onProgress({
                                    stage: 'error',
                                    message: '交易执行出错',
                                    details: { error },
                                    timestamp: new Date().toISOString()
                                });
                            }
                            
                            if (config.onError) {
                                config.onError(error);
                            }
                            
                            reject(error);
                        });
                });
            };

            // 使用重试机制
            let receipt;
            if (config.retryOnFailure) {
                receipt = await this.retryOperation(
                    sendTransaction,
                    null,
                    {
                        maxRetries: config.maxRetries,
                        onRetry: (attempt, error) => {
                            console.log(`[${config.operationName}] 交易失败，尝试重试 (${attempt}/${config.maxRetries})...`);
                            if (config.onProgress) {
                                config.onProgress({
                                    stage: 'retrying',
                                    message: `交易失败，正在重试 (${attempt}/${config.maxRetries})`,
                                    details: { attempt, error },
                                    timestamp: new Date().toISOString()
                                });
                            }
                        }
                    }
                );
            } else {
                receipt = await sendTransaction();
            }

            // 检查交易状态
            if (!receipt.status) {
                const error = new Error('交易执行失败，但已被区块链接受');
                
                // 进度通知 - 执行失败
                if (config.onProgress) {
                    config.onProgress({
                        stage: 'failed',
                        message: '交易已上链但执行失败',
                        details: { receipt },
                        timestamp: new Date().toISOString()
                    });
                }
                
                throw error;
            }

            // 进度通知 - 完成
            if (config.onProgress) {
                config.onProgress({
                    stage: 'completed',
                    message: '交易已成功完成',
                    details: { receipt },
                    timestamp: new Date().toISOString()
                });
            }

            // 构建结果对象
            const result = {
                success: true,
                receipt,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed,
                events: receipt.events || {}
            };
            
            // 成功回调
            if (config.onSuccess) {
                config.onSuccess(result);
            }
            
            // 完成回调
            if (config.onComplete) {
                config.onComplete(result);
            }

            return result;
        } catch (error) {
            console.error(`[${config.operationName}] 发送交易失败:`, error);
            
            // 错误回调
            if (config.onError) {
                config.onError(error);
            }
            
            // 完成回调
            if (config.onComplete) {
                config.onComplete({
                    success: false,
                    error: Web3Helper.handleContractError(error)
                });
            }
            
            throw error;
        }
    }

    // 解码交易输入数据
    decodeTransactionInput(inputData) {
        if (!this.web3 || !this.contract) {
            throw new Error('Web3或合约未初始化');
        }

        try {
            // 获取合约ABI
            const abi = this.contract.options.jsonInterface;
            
            // 提取函数选择器（前4个字节）
            const functionSelector = inputData.slice(0, 10);
            
            // 在ABI中查找匹配的函数
            const abiItem = abi.find(item => 
                item.type === 'function' && 
                this.web3.utils.sha3(`${item.name}(${item.inputs.map(input => input.type).join(',')})`).slice(0, 10) === functionSelector
            );
            
            if (!abiItem) {
                return {
                    method: '未知方法',
                    params: [],
                    raw: inputData
                };
            }
            
            // 解码参数
            const paramData = inputData.slice(10);
            const params = this.web3.eth.abi.decodeParameters(abiItem.inputs, paramData);
            
            // 格式化参数为可读形式
            const formattedParams = {};
            abiItem.inputs.forEach((input, index) => {
                formattedParams[input.name || index] = params[index];
            });
            
            return {
                method: abiItem.name,
                params: formattedParams,
                raw: inputData
            };
        } catch (error) {
            console.error('解码交易输入数据失败:', error);
            return {
                method: '解码失败',
                params: [],
                raw: inputData,
                error: error.message
            };
        }
    }

    // 获取合约事件历史
    async getContractEventHistory(eventName, options = {}) {
        if (!this.web3 || !this.contract) {
            throw new Error('Web3或合约未初始化');
        }

        const defaultOptions = {
            fromBlock: 0,
            toBlock: 'latest',
            filter: {},
            maxResults: 1000  // 限制结果数量，避免请求过大
        };

        const eventOptions = { ...defaultOptions, ...options };
        console.log(`获取合约事件历史: ${eventName}`, eventOptions);

        try {
            // 获取事件日志
            const events = await this.contract.getPastEvents(eventName, {
                fromBlock: eventOptions.fromBlock,
                toBlock: eventOptions.toBlock,
                filter: eventOptions.filter
            });

            // 限制结果数量
            const limitedEvents = events.slice(0, eventOptions.maxResults);
            
            // 如果结果被截断，添加警告
            if (events.length > eventOptions.maxResults) {
                console.warn(`事件结果数量(${events.length})超过限制(${eventOptions.maxResults})，已截断`);
            }

            // 格式化事件数据
            const formattedEvents = await Promise.all(limitedEvents.map(async (event) => {
                // 获取事件所在区块的时间戳
                let timestamp = null;
                try {
                    const block = await this.web3.eth.getBlock(event.blockNumber);
                    timestamp = block ? new Date(block.timestamp * 1000).toISOString() : null;
                } catch (error) {
                    console.warn(`获取区块时间戳失败: ${error.message}`);
                }
                
                return {
                    id: `${event.blockNumber}-${event.logIndex}`,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash,
                    timestamp,
                    event: event.event,
                    returnValues: event.returnValues,
                    raw: event
                };
            }));
            
            return formattedEvents;
        } catch (error) {
            console.error(`获取合约事件历史失败: ${error.message}`);
            throw new Error(`获取事件历史失败: ${error.message}`);
        }
    }

    /**
     * 执行合约方法并确保每一步操作都上链
     * @param {string} methodName - 合约方法名称
     * @param {Array} args - 合约方法参数数组
     * @param {Object} options - 交易选项
     * @returns {Promise<Object>} - 交易结果
     */
    async executeContractMethod(methodName, args = [], options = {}) {
        if (!this.web3 || !this.contract) {
            throw new Error('Web3或合约未初始化');
        }

        // 验证方法是否存在
        if (!this.contract.methods[methodName]) {
            throw new Error(`合约方法 ${methodName} 不存在`);
        }

        try {
            // 检查钱包连接状态
            const currentAccount = await this.checkConnection();
            console.log(`准备执行合约方法: ${methodName}，当前账户: ${currentAccount}`);
            
            // 构建合约方法调用
            const contractMethod = this.contract.methods[methodName](...args);
            
            // 默认交易选项
            const defaultOptions = {
                from: currentAccount,
                operationName: `执行合约方法: ${methodName}`,
                showConfirmationModal: true,  // 是否显示确认对话框
                confirmationMessage: `您正在执行操作: ${methodName}，此操作将上链并消耗gas费用，是否确认？`,
                waitForConfirmations: true,    // 是否等待确认
                confirmations: 1,              // 需要等待的确认数
                showGasEstimation: true,       // 是否显示gas估算
                onBeforeSubmit: null,          // 提交前回调
                onSubmitted: null,             // 交易提交回调
                onConfirmed: null,             // 交易确认回调
                onError: null,                 // 错误回调
                onProgress: null,              // 进度回调
                onSuccess: null,               // 成功回调
                onComplete: null               // 完成回调(无论成功失败)
            };
            
            // 合并选项
            const txOptions = { ...defaultOptions, ...options };
            
            // 估算gas费用
            let gasEstimation = null;
            if (txOptions.showGasEstimation) {
                try {
                    gasEstimation = await this.estimateGas(contractMethod, { from: txOptions.from });
                    console.log(`Gas估算结果:`, gasEstimation);
                } catch (gasError) {
                    console.warn(`Gas估算失败: ${gasError.message}`);
                }
            }
            
            // 用户确认步骤
            if (txOptions.showConfirmationModal) {
                // 构建确认信息
                let confirmMessage = txOptions.confirmationMessage;
                
                // 如果有gas估算，添加到确认信息中
                if (gasEstimation) {
                    confirmMessage += `\n\n预估Gas: ${gasEstimation.safeGasLimit} (约 ${gasEstimation.estimatedFee})`;
                }
                
                // 请求用户确认
                const confirmed = window.confirm(confirmMessage);
                if (!confirmed) {
                    console.log('用户取消了操作');
                    throw new Error('用户取消了操作');
                }
            }
            
            // 执行前回调
            if (txOptions.onBeforeSubmit) {
                await txOptions.onBeforeSubmit({
                    method: methodName,
                    args,
                    options: txOptions,
                    gasEstimation
                });
            }
            
            // 进度通知 - 准备中
            if (txOptions.onProgress) {
                txOptions.onProgress({
                    stage: 'preparing',
                    message: '正在准备交易...',
                    details: { method: methodName, args, options: txOptions }
                });
            }
            
            // 使用sendTransactionWithTracking执行交易
            const result = await this.sendTransactionWithTracking(contractMethod, {
                ...txOptions,
                onProgress: (progressInfo) => {
                    // 转发进度信息
                    if (txOptions.onProgress) {
                        txOptions.onProgress({
                            ...progressInfo,
                            method: methodName,
                            args
                        });
                    }
                }
            });
            
            // 交易成功
            console.log(`合约方法 ${methodName} 执行成功:`, result);
            
            // 解析事件日志
            const events = {};
            if (result.receipt && result.receipt.events) {
                Object.entries(result.receipt.events).forEach(([eventName, eventData]) => {
                    // 格式化事件数据
                    events[eventName] = {
                        event: eventData.event,
                        returnValues: eventData.returnValues,
                        raw: eventData
                    };
                });
            }
            
            // 构建结果对象
            const txResult = {
                success: true,
                method: methodName,
                args,
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber,
                gasUsed: result.gasUsed,
                events,
                receipt: result.receipt
            };
            
            // 成功回调
            if (txOptions.onSuccess) {
                txOptions.onSuccess(txResult);
            }
            
            // 完成回调
            if (txOptions.onComplete) {
                txOptions.onComplete(txResult);
            }
            
            return txResult;
        } catch (error) {
            console.error(`执行合约方法 ${methodName} 失败:`, error);
            
            // 构建错误对象
            const errorResult = {
                success: false,
                method: methodName,
                args,
                error: Web3Helper.handleContractError(error)
            };
            
            // 错误回调
            if (options.onError) {
                options.onError(errorResult);
            }
            
            // 完成回调
            if (options.onComplete) {
                options.onComplete(errorResult);
            }
            
            throw error;
        }
    }
}

export { Web3Helper };