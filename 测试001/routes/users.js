// 用户相关路由
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const router = express.Router();
dotenv.config();

// 设置JWT密钥
const secretKey = process.env.JwtSecretKey || 'blockchain_education_system_secret_key';

// 用户登录
router.post('/login', (req, res) => {
  try {
    // 获取请求参数
    const { username, password, role } = req.body;
    
    // 验证请求参数
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的登录信息',
        timestamp: new Date().toISOString()
      });
    }

    // 生成JWT Token，包含用户角色和钱包地址信息
    const token = jwt.sign(
      { 
        username,
        role,
        walletAddress: req.body.walletAddress, // 添加钱包地址
        timestamp: Date.now()
      },
      secretKey,
      { expiresIn: '2h' }
    );
    
    // 设置响应头
    res.set({
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache'
    });

    // 返回成功响应，包含钱包地址
    res.status(200).json({
      status: 200,
      message: '登录成功',
      token: token,
      username,
      role,
      walletAddress: req.body.walletAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('登录处理错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      timestamp: new Date().toISOString()
    });
  }
});

// 用户注册
router.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  
  if (username && password && role) {
    // 模拟用户注册成功
    res.json({
      status: 200,
      message: '注册成功'
    });
  } else {
    res.status(400).json({
      status: 400,
      message: '注册失败，请提供完整信息'
    });
  }
});

export default router;
