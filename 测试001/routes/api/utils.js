/**
 * API工具函数模块
 * 提供API路由共享的工具函数
 */

// 创建统一的响应格式
const createResponse = (success, data = null, message = '') => ({
  success,
  data,
  message,
  timestamp: new Date().toISOString()
});

// 分页工具函数
const paginateResults = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = data.length;

  const paginatedData = data.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      pageSize: limit,
      hasNextPage: endIndex < total,
      hasPrevPage: startIndex > 0
    }
  };
};

// 验证分页参数
const validatePaginationParams = (page, limit) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    throw new Error('页码必须是大于0的整数');
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw new Error('每页条数必须是1-100之间的整数');
  }

  return { page: pageNum, limit: limitNum };
};

// 统一错误处理函数
const handleError = (res, message, statusCode = 500) => {
  res.status(statusCode).json(createResponse(false, null, message));
};

export {
  createResponse,
  paginateResults,
  validatePaginationParams,
  handleError
};