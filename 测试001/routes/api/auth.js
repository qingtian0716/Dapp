/**
 * 认证相关API路由
 * 处理用户登录、注册和token刷新等功能
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../../models/User.js';
import { validateRequestBody } from './middlewares.js';

dotenv.config();
const router = express.Router();

// 设置JWT密钥和过期时间
const secretKey = process.env.JWT_SECRET_KEY || 'blockchain_education_system_secret_key';
const tokenExpiry = process.env.JWT_EXPIRY || '24h';
const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// 钱包登录
router.post('/wallet-login', validateRequestBody, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '钱包地址不能为空',
        timestamp: new Date().toISOString()
      });
    }
    
    // 查找用户
    const user = await User.findOne({
      where: { walletAddress: walletAddress }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '用户不存在，请先注册',
        timestamp: new Date().toISOString()
      });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { 
        id: user.id, 
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name
      },
      secretKey,
      { expiresIn: tokenExpiry }
    );
    
    // 生成刷新令牌
    const refreshToken = jwt.sign(
      { id: user.id },
      secretKey,
      { expiresIn: refreshTokenExpiry }
    );
    
    // 计算过期时间（毫秒）
    const expiresIn = parseInt(tokenExpiry) || 86400; // 默认24小时
    
    res.status(200).json({
      success: true,
      data: {
        token,
        refreshToken,
        expiresIn,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          role: user.role,
          name: user.name
        }
      },
      message: '登录成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '登录失败: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 刷新令牌
router.post('/refresh', validateRequestBody, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '刷新令牌不能为空',
        timestamp: new Date().toISOString()
      });
    }
    
    // 验证刷新令牌
    const decoded = jwt.verify(refreshToken, secretKey);
    
    // 查找用户
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '用户不存在',
        timestamp: new Date().toISOString()
      });
    }
    
    // 生成新的JWT令牌
    const newToken = jwt.sign(
      { 
        id: user.id, 
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name
      },
      secretKey,
      { expiresIn: tokenExpiry }
    );
    
    // 生成新的刷新令牌
    const newRefreshToken = jwt.sign(
      { id: user.id },
      secretKey,
      { expiresIn: refreshTokenExpiry }
    );
    
    // 计算过期时间（毫秒）
    const expiresIn = parseInt(tokenExpiry) || 86400; // 默认24小时
    
    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn
      },
      message: '令牌刷新成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('令牌刷新失败:', error);
    res.status(401).json({
      success: false,
      data: null,
      message: '令牌刷新失败: ' + (error.name === 'TokenExpiredError' ? '刷新令牌已过期' : error.message),
      timestamp: new Date().toISOString()
    });
  }
});

// 注册新用户
router.post('/register', validateRequestBody, async (req, res) => {
  try {
    const { walletAddress, role, name, studentId } = req.body;
    
    if (!walletAddress || !role) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '钱包地址和角色不能为空',
        timestamp: new Date().toISOString()
      });
    }
    
    // 检查角色是否有效
    const validRoles = ['admin', 'teacher', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '无效的角色类型',
        timestamp: new Date().toISOString()
      });
    }

    // 如果是教师角色，检查该钱包地址是否已被设置为教师
    if (role === 'teacher') {
      const Teacher = (await import('../../models/Teacher.js')).default;
      const isTeacher = await Teacher.findOne({
        where: { walletAddress: walletAddress }
      });
      
      if (!isTeacher) {
        return res.status(403).json({
          success: false,
          data: null,
          message: '该钱包地址未被管理员设置为教师，无法注册教师角色',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      where: { walletAddress: walletAddress }
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        data: null,
        message: '该钱包地址已注册',
        timestamp: new Date().toISOString()
      });
    }
    
    // 创建新用户
    const user = await User.create({
      walletAddress,
      role,
      username: `user_${walletAddress.substring(0, 8)}`,
      name: name || `${role}_${walletAddress.substring(0, 8)}`,
      studentId: studentId || null,
      status: 'active'
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name
      },
      message: '注册成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: '注册失败: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 验证令牌
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '令牌不能为空',
        timestamp: new Date().toISOString()
      });
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, secretKey);
    
    res.status(200).json({
      success: true,
      data: {
        valid: true,
        user: {
          id: decoded.id,
          walletAddress: decoded.walletAddress,
          role: decoded.role,
          name: decoded.name
        }
      },
      message: '令牌有效',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      data: {
        valid: false
      },
      message: error.name === 'TokenExpiredError' ? '令牌已过期' : '无效的令牌',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;