/**
 * 通用路由处理工具类
 */
class RouteHandler {
  /**
   * 创建标准响应对象
   * @param {boolean} success 是否成功
   * @param {*} data 响应数据
   * @param {string} [message] 响应消息
   * @returns {Object} 标准响应对象
   */
  static createResponse(success, data, message = '') {
    return {
      success,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 验证分页参数
   * @param {number|string} page 页码
   * @param {number|string} limit 每页条数
   * @returns {Object} 验证后的分页参数
   */
  static validatePaginationParams(page, limit) {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    return { page: validPage, limit: validLimit };
  }

  /**
   * 对数据进行分页处理
   * @param {Array} data 需要分页的数据数组
   * @param {number} page 页码
   * @param {number} limit 每页条数
   * @returns {Object} 分页结果
   */
  static paginateResults(data, page, limit) {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = data.length;

    return {
      data: data.slice(startIndex, endIndex),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 异步错误处理包装器
   * @param {Function} handler 路由处理函数
   * @returns {Function} 包装后的处理函数
   */
  static asyncHandler(handler) {
    return async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        console.error('Route Error:', error);
        res.status(500).json(
          RouteHandler.createResponse(false, null, error.message || '服务器内部错误')
        );
      }
    };
  }

  /**
   * 验证请求体是否包含必需字段
   * @param {Object} body 请求体
   * @param {string[]} requiredFields 必需字段数组
   * @returns {string|null} 验证错误信息，通过则返回null
   */
  static validateRequestBody(body, requiredFields) {
    for (const field of requiredFields) {
      if (!body[field]) {
        return `缺少必需字段: ${field}`;
      }
    }
    return null;
  }
}

export default RouteHandler;