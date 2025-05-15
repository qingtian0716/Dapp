/**
 * 通知相关API路由模块
 */
import express from 'express';
const router = express.Router();
import { createResponse, paginateResults, validatePaginationParams } from './utils.js';

/**
 * @api {get} /api/notifications 获取通知列表
 * @apiName GetNotifications
 * @apiGroup Notifications
 * @apiParam {Number} [page=1] 页码
 * @apiParam {Number} [limit=10] 每页条数
 * @apiSuccess {Object[]} data 通知数据列表
 * @apiSuccess {Object} pagination 分页信息
 */
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

    // 模拟数据库中的通知数据
    const notifications = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      message: `通知消息 ${i + 1}`,
      type: i % 2 === 0 ? 'info' : 'warning',
      timestamp: new Date(Date.now() - i * 60000).toISOString()
    }));

    const result = paginateResults(notifications, validPage, validLimit);
    res.json(createResponse(true, result));
  } catch (error) {
    res.status(400).json(createResponse(false, null, error.message));
  }
});

/**
 * @api {post} /api/notifications 创建通知
 * @apiName CreateNotification
 * @apiGroup Notifications
 * @apiParam {String} message 通知内容
 * @apiParam {String} type 通知类型 (info, warning, error, success)
 * @apiSuccess {Object} data 创建的通知信息
 */
router.post('/', (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message || !type) {
      return res.status(400).json(createResponse(false, null, '无效的通知参数'));
    }
    
    // 验证通知类型
    const validTypes = ['info', 'warning', 'error', 'success'];
    if (!validTypes.includes(type.toLowerCase())) {
      return res.status(400).json(createResponse(false, null, '无效的通知类型'));
    }
    
    console.log(`[${type.toUpperCase()}] ${message}`);
    res.json(createResponse(true, { message, type }, '通知已记录'));
  } catch (error) {
    console.error('创建通知失败:', error);
    res.status(500).json(createResponse(false, null, '服务器内部错误'));
  }
});

export default router;