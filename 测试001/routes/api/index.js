/**
 * API路由主入口
 * 集中管理所有API路由模块
 */
import express from ('express');
import rateLimit from('express-rate-limit');
const router = express.Router();

// 导入各个功能模块路由
import notificationsRoutes from('./notifications');
import walletRoutes from ('./wallet');
import scoresRoutes from ('./scores');
import teachersRoutes from('./teachers');

// 请求速率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: '请求过于频繁，请稍后再试'
});

// 应用速率限制
router.use(apiLimiter);

// 注册各个功能模块路由
router.use('/notifications', notificationsRoutes);
router.use('/wallet', walletRoutes);
router.use('/scores', scoresRoutes);
router.use('/teachers', teachersRoutes);

// 导出路由
module.exports = router;