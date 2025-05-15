/**
 * 错误处理工具 - 增强版
 * 提供更全面的错误处理、分类和重定向功能
 */

// 错误类型定义
const ErrorTypes = {
    ERROR: 'error',      // 一般系统错误
    AUTH: 'auth',        // 认证/授权错误
    NOTFOUND: 'notfound', // 资源未找到
    WALLET: 'wallet',     // 钱包相关错误
    CONTRACT: 'contract', // 智能合约错误
    NETWORK: 'network'    // 网络连接错误
};

// 错误代码前缀
const ErrorCodePrefix = {
    [ErrorTypes.ERROR]: 'SYS',
    [ErrorTypes.AUTH]: 'AUTH',
    [ErrorTypes.NOTFOUND]: 'NFD',
    [ErrorTypes.WALLET]: 'WAL',
    [ErrorTypes.CONTRACT]: 'CTR',
    [ErrorTypes.NETWORK]: 'NET'
};

/**
 * 生成错误代码
 * @param {string} type - 错误类型
 * @returns {string} - 格式化的错误代码
 */
function generateErrorCode(type) {
    const prefix = ErrorCodePrefix[type] || ErrorCodePrefix[ErrorTypes.ERROR];
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
}

/**
 * 重定向到错误页面
 * @param {string} message - 错误消息
 * @param {string} type - 错误类型
 * @param {string} [code] - 可选的错误代码，如不提供将自动生成
 */
export function redirectToErrorPage(message, type = ErrorTypes.ERROR, code = null) {
    const errorCode = code || generateErrorCode(type);
    const params = new URLSearchParams();
    params.append('message', message);
    params.append('type', type);
    params.append('code', errorCode);
    
    window.location.href = `/html/error.html?${params.toString()}`;
}

/**
 * 处理钱包错误
 * @param {Error} error - 错误对象
 * @param {string} customMessage - 自定义错误消息
 */
export function handleWalletError(error, customMessage = '钱包操作失败') {
    console.error('钱包错误:', error);
    
    // 提取错误消息
    let errorMessage = customMessage;
    if (error && error.message) {
        errorMessage += ': ' + error.message;
    }
    
    redirectToErrorPage(errorMessage, ErrorTypes.WALLET);
}

/**
 * 处理合约错误
 * @param {Error} error - 错误对象
 * @param {string} customMessage - 自定义错误消息
 */
export function handleContractError(error, customMessage = '合约操作失败') {
    console.error('合约错误:', error);
    
    // 提取错误消息
    let errorMessage = customMessage;
    if (error && error.message) {
        errorMessage += ': ' + error.message;
    }
    
    redirectToErrorPage(errorMessage, ErrorTypes.CONTRACT);
}

/**
 * 处理认证错误
 * @param {string} message - 错误消息
 */
export function handleAuthError(message = '未授权访问') {
    console.error('认证错误:', message);
    redirectToErrorPage(message, ErrorTypes.AUTH);
}

/**
 * 处理资源未找到错误
 * @param {string} resource - 未找到的资源名称
 */
export function handleNotFoundError(resource = '页面') {
    const message = `请求的${resource}不存在或已被移除`;
    console.error('未找到:', message);
    redirectToErrorPage(message, ErrorTypes.NOTFOUND);
}

/**
 * 处理网络错误
 * @param {Error} error - 错误对象
 * @param {string} customMessage - 自定义错误消息
 */
export function handleNetworkError(error, customMessage = '网络连接失败') {
    console.error('网络错误:', error);
    
    // 提取错误消息
    let errorMessage = customMessage;
    if (error && error.message) {
        errorMessage += ': ' + error.message;
    }
    
    redirectToErrorPage(errorMessage, ErrorTypes.NETWORK);
}

/**
 * 通用错误处理函数
 * @param {Error} error - 错误对象
 * @param {string} customMessage - 自定义错误消息
 * @param {boolean} redirect - 是否重定向到错误页面
 * @returns {boolean} - 始终返回false，方便在调用处进行条件判断
 */
export function handleError(error, customMessage = '操作失败', redirect = true) {
    console.error(customMessage, error);
    
    // 提取错误消息
    let errorMessage = customMessage;
    if (error && error.message) {
        errorMessage += ': ' + error.message;
    }
    
    if (redirect) {
        redirectToErrorPage(errorMessage, ErrorTypes.ERROR);
    } else {
        // 使用现有的toast通知
        try {
            // 尝试导入并使用现有的showToast函数
            import('../utils/error.js')
                .then(module => {
                    if (module.showToast) {
                        module.showToast(errorMessage, 'error');
                    }
                })
                .catch(err => {
                    console.error('无法加载通知模块:', err);
                    alert(errorMessage);
                });
        } catch (e) {
            console.error('显示通知失败:', e);
            alert(errorMessage);
        }
    }
    
    return false;
}

// 导出错误类型常量
export { ErrorTypes };