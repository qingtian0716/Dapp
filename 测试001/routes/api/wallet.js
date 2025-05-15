/**
 * 钱包相关API路由模块
 */
import express from 'express';
const router = express.Router();
import { authMiddleware, roleMiddleware } from './middlewares.js';
import { createResponse, paginateResults, validatePaginationParams, handleError } from './utils.js';

/**
 * @api {get} /api/wallet/addresses 获取钱包地址列表
 * @apiName GetWalletAddresses
 * @apiGroup Wallet
 * @apiParam {Number} [page=1] 页码
 * @apiParam {Number} [limit=10] 每页条数
 * @apiSuccess {Object[]} data 钱包地址数据列表
 * @apiSuccess {Object} pagination 分页信息
 */
router.get('/addresses', authMiddleware, (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

    // 模拟数据库中的钱包地址数据
    const walletAddresses = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      walletAddress: `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      eventType: i % 3 === 0 ? 'connected' : i % 3 === 1 ? 'disconnected' : 'changed',
      timestamp: new Date(Date.now() - i * 300000).toISOString()
    }));

    const result = paginateResults(walletAddresses, validPage, validLimit);
    res.json(createResponse(true, result));
  } catch (error) {
    handleError(res, error.message, 400);
  }
});

/**
 * @api {post} /api/wallet/address 创建钱包地址记录
 * @apiName CreateWalletAddress
 * @apiGroup Wallet
 * @apiParam {String} walletAddress 钱包地址
 * @apiParam {String} eventType 事件类型 (connected, disconnected, changed)
 * @apiParam {String} [timestamp] 时间戳
 * @apiSuccess {Object} data 创建的钱包地址记录
 */
router.post('/address', 
  authMiddleware, 
  roleMiddleware(['admin', 'teacher']), 
  (req, res) => {
    try {
      const { walletAddress, eventType, timestamp } = req.body;
      
      // 验证请求体必需字段
      if (!walletAddress || !eventType) {
        return handleError(res, '钱包地址和事件类型为必填项', 400);
      }
      
      // 验证钱包地址格式
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return handleError(res, '无效的钱包地址格式', 400);
      }
      
      // 验证事件类型
      const validEventTypes = ['connected', 'disconnected', 'changed'];
      if (!validEventTypes.includes(eventType)) {
        return handleError(res, '无效的事件类型', 400);
      }

      // 验证时间戳格式
      if (timestamp && isNaN(Date.parse(timestamp))) {
        return handleError(res, '无效的时间戳格式', 400);
      }
      
      const walletData = { walletAddress, eventType, timestamp: timestamp || new Date().toISOString() };
      console.log(`[WALLET] ${eventType}: ${walletAddress}`);
      res.json(createResponse(true, walletData, '钱包地址已记录'));
    } catch (error) {
      handleError(res, error.message);
    }
  }
);
export default router;