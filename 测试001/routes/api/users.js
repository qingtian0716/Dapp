import express from 'express';
const router = express.Router();
import User from '../../models/User.js';

// 创建新用户
router.post('/', async (req, res) => {
    try {
        const { username, walletAddress, role, studentId, name } = req.body;
        const user = await User.create({
            username,
            walletAddress,
            role,
            studentId,
            name
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 获取所有用户
router.get('/', async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 根据钱包地址获取用户角色
router.get('/role/:walletAddress', async (req, res) => {
    try {
        const user = await User.findOne({
            where: { walletAddress: req.params.walletAddress }
        });
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        res.json({ role: user.role });
    } catch (error) {
        console.error('获取用户角色失败:', error);
        res.status(500).json({ message: '获取用户角色失败' });
    }
});

// 根据钱包地址获取用户
router.get('/:walletAddress', async (req, res) => {
    try {
        const user = await User.findOne({
            where: { 
                walletAddress: req.params.walletAddress,
                status: 'active'
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在或未激活' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ message: '获取用户信息失败' });
    }
});

// 更新用户信息
router.put('/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            await user.update(req.body);
            res.json(user);
        } else {
            res.status(404).json({ message: '用户不存在' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 删除用户
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            await user.destroy();
            res.json({ message: '用户已删除' });
        } else {
            res.status(404).json({ message: '用户不存在' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;