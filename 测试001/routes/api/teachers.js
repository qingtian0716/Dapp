/**
 * 教师相关API路由模块
 */
import express from 'express';
import Teacher from '../../models/Teacher.js';
import { Op } from 'sequelize';

const router = express.Router();
import { createResponse, paginateResults, validatePaginationParams } from './utils.js';
import { authMiddleware, roleMiddleware } from './middlewares.js';

/**
 * @api {get} /api/teachers 获取教师列表
 * @apiName GetTeachers
 * @apiGroup Teachers
 * @apiParam {Number} [page=1] 页码
 * @apiParam {Number} [limit=10] 每页条数
 * @apiSuccess {Object[]} data 教师数据列表
 * @apiSuccess {Object} pagination 分页信息
 */
router.get('/', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, addresses } = req.query;
    
    let whereClause = {};
    if (addresses) {
      whereClause.walletAddress = {
        [Op.in]: addresses.split(',')
      };
    }

    const { count, rows } = await Teacher.findAndCountAll({
      where: whereClause,
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    // 构建分页结果
    const teachers = rows.map(teacher => ({
      id: teacher.id,
      name: teacher.name,
      walletAddress: teacher.walletAddress,
      department: teacher.department,
      status: teacher.status
    }));

    const result = {
      teachers: teachers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    };

    res.json(createResponse(true, result));
  } catch (error) {
    res.status(400).json(createResponse(false, null, error.message));
  }
});

/**
 * @api {get} /api/teachers/:id 获取教师详情
 * @apiName GetTeacherDetail
 * @apiGroup Teachers
 * @apiParam {Number} id 教师ID
 * @apiSuccess {Object} data 教师详细信息
 */
router.get('/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    
    if (isNaN(teacherId) || teacherId < 1) {
      return res.status(400).json(createResponse(false, null, '无效的教师ID'));
    }
    
    // 模拟获取教师详情
    const teacher = {
      id: teacherId,
      name: `教师${teacherId}`,
      walletAddress: `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      department: ['数学', '物理', '化学', '生物'][teacherId % 4],
      status: teacherId % 5 === 0 ? 'inactive' : 'active',
      createdAt: new Date(Date.now() - teacherId * 86400000).toISOString(),
      email: `teacher${teacherId}@example.com`,
      phone: `1380000${teacherId.toString().padStart(4, '0')}`,
      courses: [
        { id: 1, name: '高等数学', students: 35 },
        { id: 2, name: '线性代数', students: 42 }
      ]
    };
    
    res.json(createResponse(true, teacher));
  } catch (error) {
    res.status(500).json(createResponse(false, null, '服务器内部错误'));
  }
});

/**
 * @api {post} /api/teachers 添加教师
 * @apiName AddTeacher
 * @apiGroup Teachers
 * @apiParam {String} username 教师用户名/钱包地址
 * @apiSuccess {Object} data 添加的教师信息
 */
router.post('/', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { username, walletAddress, name, department, roleId } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json(createResponse(false, null, '教师钱包地址不能为空'));
    }

    // 验证钱包地址格式
    const web3Helper = Web3Helper.getInstance();
    if (!web3Helper.isValidAddress(walletAddress)) {
      return res.status(400).json(createResponse(false, null, '无效的钱包地址格式'));
    }

    // 检查钱包地址是否已存在
    const existingTeacher = await Teacher.findOne({
      where: { walletAddress: walletAddress }
    });

    if (existingTeacher) {
      return res.status(409).json(createResponse(false, null, '该钱包地址已被注册为教师'));
    }

    // 检查当前用户是否为管理员
    const currentAccount = await web3Helper.checkConnection();
    const contract = web3Helper.contract;
    const userRole = await contract.methods.getUserRole(currentAccount).call();
    
    if (userRole !== 'admin') {
      return res.status(403).json(createResponse(false, null, '只有管理员才能添加教师'));
    }
    
    try {
      // 调用合约添加教师
      await contract.methods.addTeacher(walletAddress).send({ from: currentAccount });
      
      // 创建新教师记录
      const newTeacher = await Teacher.create({
        username: username || walletAddress.toLowerCase(),
        walletAddress: walletAddress,
        name: name || `教师_${walletAddress.substring(0, 8)}`,
        department: department,
        roleId: roleId || 2, // 默认教师角色ID为2
        status: 'active',
        createdAt: new Date().toISOString()
      });
      
      // 返回成功响应
      res.status(201).json(createResponse(true, newTeacher, '教师添加成功'));
    } catch (contractError) {
      console.error('合约调用失败:', contractError);
      return res.status(400).json(createResponse(false, null, `合约调用失败: ${Web3Helper.handleContractError(contractError)}`));
    }
  } catch (error) {
    console.error('添加教师失败:', error);
    res.status(500).json(createResponse(false, null, '服务器内部错误'));
  }
});

export default router;