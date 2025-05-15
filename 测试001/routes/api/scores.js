/**
 * 学生成绩相关API路由模块
 */
import express from 'express';
const router = express.Router();
import { createResponse, paginateResults, validatePaginationParams } from './utils.js';
import { authMiddleware } from './middlewares.js';
import Score  from '../../models/Score.js';
import { Op } from 'sequelize';

/**
 * @api {get} /api/scores 获取学生成绩
 * @apiName GetScores
 * @apiGroup Scores
 * @apiParam {Number} [page=1] 页码
 * @apiParam {Number} [limit=10] 每页条数
 * @apiParam {String} studentId 学生ID
 * @apiParam {String} [courseName] 课程名称（支持模糊查询）
 * @apiParam {Number} [minScore] 最低分数
 * @apiParam {Number} [maxScore] 最高分数
 * @apiParam {String} [sortBy] 排序字段 (score, courseName)
 * @apiParam {String} [sortOrder] 排序方式 (asc, desc)
 * @apiSuccess {Object[]} data 成绩数据列表
 * @apiSuccess {Object} pagination 分页信息
 * @apiExample {curl} 请求示例:
 *     curl -X GET "http://localhost:3000/api/scores?studentId=1001&courseName=数学&minScore=60&maxScore=100&sortBy=score&sortOrder=desc"
 * @apiSuccessExample {json} 成功响应:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": [
 *         {
 *           "id": 1,
 *           "studentId": "1001",
 *           "courseName": "高等数学",
 *           "score": 95
 *         }
 *       ],
 *       "pagination": {
 *         "page": 1,
 *         "limit": 10,
 *         "total": 1
 *       }
 *     }
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      studentId,
      courseName,
      minScore,
      maxScore,
      sortBy,
      sortOrder
    } = req.query;
    const { page: validPage, limit: validLimit } = validatePaginationParams(page, limit);

    if (!studentId) {
      return res.status(400).json(createResponse(false, null, '学号不能为空'));
    }

    // 构建查询条件
    const where = { studentId };
    if (courseName) {
      where.courseName = { [Op.like]: `%${courseName}%` };
    }
    if (minScore !== undefined) {
      where.score = { ...where.score, [Op.gte]: parseFloat(minScore) };
    }
    if (maxScore !== undefined) {
      where.score = { ...where.score, [Op.lte]: parseFloat(maxScore) };
    }

    // 构建排序条件
    const order = [];
    if (sortBy && ['score', 'courseName'].includes(sortBy)) {
      order.push([sortBy, sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC']);
    }

    // 从数据库中获取成绩数据
    const scores = await Score.findAll({
      where,
      order,
      offset: (validPage - 1) * validLimit,
      limit: validLimit
    });

    const result = paginateResults(scores, validPage, validLimit);
    res.json(createResponse(true, result));
  } catch (error) {
    console.error('获取成绩失败:', error);
    res.status(500).json(createResponse(false, null, '获取成绩数据失败'));
  }
});

/**
 * @api {get} /api/scores/statistics 获取学生成绩统计
 * @apiName GetScoreStatistics
 * @apiGroup Scores
 * @apiParam {String} studentId 学生ID
 * @apiParam {String} [courseName] 课程名称（可选，用于统计特定课程）
 * @apiSuccess {Object} data 成绩统计数据
 * @apiExample {curl} 请求示例:
 *     curl -X GET "http://localhost:3000/api/scores/statistics?studentId=1001"
 * @apiSuccessExample {json} 成功响应:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": {
 *         "studentId": 1001,
 *         "totalScore": 280,
 *         "averageScore": 93.33,
 *         "maxScore": 98,
 *         "minScore": 85,
 *         "subjectCount": 3,
 *         "courseDistribution": {
 *           "优秀": 2,
 *           "良好": 1,
 *           "及格": 0,
 *           "不及格": 0
 *         }
 *       }
 *     }
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const { studentId, courseName } = req.query;

    if (!studentId) {
      return res.status(400).json(createResponse(false, null, '学号不能为空'));
    }

    // 构建查询条件
    const where = { studentId };
    if (courseName) {
      where.courseName = { [Op.like]: `%${courseName}%` };
    }

    // 从数据库中获取成绩数据
    const scores = await Score.findAll({
      where,
      attributes: ['courseName', 'score']
    });

    if (!scores || scores.length === 0) {
      return res.json(createResponse(true, {
        studentId: parseInt(studentId),
        totalScore: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        subjectCount: 0,
        courseDistribution: {
          '优秀': 0,
          '良好': 0,
          '及格': 0,
          '不及格': 0
        }
      }));
    }

    // 计算统计数据
    const scoreValues = scores.map(score => parseFloat(score.score));
    const totalScore = scoreValues.reduce((sum, score) => sum + score, 0);
    const averageScore = parseFloat((totalScore / scores.length).toFixed(2));
    const maxScore = Math.max(...scoreValues);
    const minScore = Math.min(...scoreValues);

    // 计算成绩分布
    const courseDistribution = {
      '优秀': scores.filter(s => parseFloat(s.score) >= 90).length,
      '良好': scores.filter(s => parseFloat(s.score) >= 80 && parseFloat(s.score) < 90).length,
      '及格': scores.filter(s => parseFloat(s.score) >= 60 && parseFloat(s.score) < 80).length,
      '不及格': scores.filter(s => parseFloat(s.score) < 60).length
    };

    const statistics = {
      studentId: parseInt(studentId),
      totalScore,
      averageScore,
      maxScore,
      minScore,
      subjectCount: scores.length,
      courseDistribution
    };

    res.json(createResponse(true, statistics));
  } catch (error) {
    console.error('获取成绩统计失败:', error);
    res.status(500).json(createResponse(false, null, '获取成绩统计数据失败'));
  }
});

export default router;