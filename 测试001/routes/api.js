import express from 'express';
import rateLimit from 'express-rate-limit';
import { handleError } from './api/utils.js';
import { validateToken } from '../utils/auth.js';

// 导入各个功能模块路由
import notificationsRoutes from './api/notifications.js';
import walletRoutes from './api/wallet.js';
import scoresRoutes from './api/scores.js';
import teachersRoutes from './api/teachers.js';
import usersRoutes from './api/users.js';
import authRoutes from './api/auth.js';

const router = express.Router();

// API请求速率限制配置
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: '请求过于频繁，请稍后再试',
    handler: (req, res) => {
        handleError(res, '请求过于频繁，请稍后再试', 429);
    }
});

// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
    console.error('API错误:', err);
    handleError(res, err.message || '服务器内部错误', err.status || 500);
};

// 请求日志中间件
const requestLogger = (req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
};

// 导入认证中间件
import { authMiddleware } from './api/middlewares.js';

// 应用全局中间件
router.use(requestLogger);
router.use(apiLimiter);

// 注册各个功能模块路由
router.use('/auth', authRoutes); // 认证路由不需要认证中间件
router.use('/notifications', authMiddleware, notificationsRoutes);
router.use('/wallet', authMiddleware, walletRoutes);
router.use('/scores', authMiddleware, scoresRoutes);
router.use('/teachers', authMiddleware, teachersRoutes);
router.use('/users', authMiddleware, usersRoutes);

// 404处理
router.use((req, res) => {
    handleError(res, '请求的API接口不存在', 404);
});

// 错误处理中间件必须在最后
router.use(errorHandler);

export default router;