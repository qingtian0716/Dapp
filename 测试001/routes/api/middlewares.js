/**
 * API中间件模块
 * 提供API路由共享的中间件函数
 */
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// 设置JWT密钥
const secretKey = process.env.JWT_SECRET_KEY || 'blockchain_education_system_secret_key';

// 验证中间件 - 服务器端实现
const authMiddleware = async (req, res, next) => {
  // 对于预检请求，直接通过
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: null,
      message: '未提供认证令牌',
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: '无效的认证令牌',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // 验证token
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('认证错误:', error);
    return res.status(401).json({
      success: false,
      data: null,
      message: error.name === 'TokenExpiredError' ? '认证令牌已过期，请重新登录' : '认证失败，请重新登录',
      timestamp: new Date().toISOString()
    });
  }
};

// 角色验证中间件
const roleMiddleware = (allowedRoles) => (req, res, next) => {
  // 对于预检请求，直接通过
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // 从req.user中获取角色信息，这是由authMiddleware设置的
  const userRole = req.user?.role;
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      data: null,
      message: '无权访问',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// 请求体验证中间件
const validateRequestBody = (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({
      success: false,
      data: null,
      message: '请求体不能为空',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

export {
  authMiddleware,
  roleMiddleware,
  validateRequestBody
};