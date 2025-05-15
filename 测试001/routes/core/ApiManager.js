import { ComponentErrorHandler } from '../../config/components.js';

export class ApiManager {
    static apiCache = new Map();
    static pendingRequests = new Map();
    static requestHistory = [];
    static maxHistoryLength = 100;
    static cacheTimeout = 5 * 60 * 1000; // 5分钟缓存过期

    static async request(endpoint, options = {}) {
        try {
            const {
                method = 'GET',
                body = null,
                headers = {},
                useCache = false,
                forceRefresh = false
            } = options;

            // 生成请求键
            const requestKey = this.generateRequestKey(endpoint, method, body);

            // 检查是否有相同的请求正在进行
            if (this.pendingRequests.has(requestKey)) {
                return this.pendingRequests.get(requestKey);
            }

            // 检查缓存
            if (useCache && !forceRefresh && method === 'GET') {
                const cachedResponse = this.getFromCache(requestKey);
                if (cachedResponse) {
                    return cachedResponse;
                }
            }

            // 准备请求配置
            const requestConfig = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            // 添加请求体
            if (body) {
                requestConfig.body = JSON.stringify(body);
            }

            // 添加认证令牌
            const token = localStorage.getItem('jwtToken');
            if (token) {
                requestConfig.headers.Authorization = `Bearer ${token}`;
            }

            // 创建请求Promise
            const requestPromise = (async () => {
                try {
                    const response = await fetch(endpoint, requestConfig);
                    const data = await response.json();

                    // 检查响应状态
                    if (!response.ok) {
                        throw new Error(data.message || 'Request failed');
                    }

                    // 记录请求历史
                    this.addToHistory({
                        endpoint,
                        method,
                        status: response.status,
                        timestamp: new Date()
                    });

                    // 缓存响应
                    if (useCache && method === 'GET') {
                        this.setCache(requestKey, data);
                    }

                    return data;
                } finally {
                    // 清理pending请求
                    this.pendingRequests.delete(requestKey);
                }
            })();

            // 记录pending请求
            this.pendingRequests.set(requestKey, requestPromise);

            return requestPromise;
        } catch (error) {
            ComponentErrorHandler.handleError(error);
            throw error;
        }
    }

    static generateRequestKey(endpoint, method, body) {
        return `${method}:${endpoint}:${body ? JSON.stringify(body) : ''}`;
    }

    static getFromCache(key) {
        const cached = this.apiCache.get(key);
        if (!cached) return null;

        // 检查缓存是否过期
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.apiCache.delete(key);
            return null;
        }

        return cached.data;
    }

    static setCache(key, data) {
        this.apiCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    static clearCache() {
        this.apiCache.clear();
    }

    static addToHistory(requestInfo) {
        this.requestHistory.unshift(requestInfo);
        if (this.requestHistory.length > this.maxHistoryLength) {
            this.requestHistory.pop();
        }
    }

    static getRequestHistory() {
        return this.requestHistory;
    }

    static clearHistory() {
        this.requestHistory = [];
    }

    static getPendingRequests() {
        return Array.from(this.pendingRequests.keys());
    }

    static cancelRequest(endpoint) {
        const pendingKeys = Array.from(this.pendingRequests.keys())
            .filter(key => key.includes(endpoint));

        pendingKeys.forEach(key => {
            this.pendingRequests.delete(key);
        });
    }

    static async refreshEndpoint(endpoint) {
        // 清除指定端点的缓存
        const cacheKeys = Array.from(this.apiCache.keys())
            .filter(key => key.includes(endpoint));

        cacheKeys.forEach(key => {
            this.apiCache.delete(key);
        });

        // 重新请求数据
        return this.request(endpoint, { forceRefresh: true });
    }
}