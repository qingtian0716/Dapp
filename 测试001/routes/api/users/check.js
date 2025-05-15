const express = require('express');
const router = express.Router();
const User = require('../../../models/User');

// 检查钱包地址是否存在
router.get('/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const user = await User.findOne({
            where: { walletAddress }
        });
        res.json({ exists: !!user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;