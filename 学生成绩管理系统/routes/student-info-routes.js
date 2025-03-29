const express = require('express');
const router = express.Router();
const { pool } = require('../db-init');

// 创建/更新学生信息
router.post('/', (req, res) => {
    const { studentId, name, gender, className } = req.body;

    if (!studentId || !name || !gender || !className) {
        return res.status(400).json({
            success: false,
            message: '缺少必要的学生信息'
        });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('数据库连接失败:', err);
            return res.status(500).json({
                success: false,
                message: '服务器错误',
                error: err.message
            });
        }

        connection.query('USE student_scores', (err) => {
            if (err) {
                console.error('选择数据库失败:', err);
                connection.release();
                return res.status(500).json({
                    success: false,
                    message: '服务器错误',
                    error: err.message
                });
            }

            connection.query(
                'REPLACE INTO student_info (student_id, name, gender, class_name) VALUES (?, ?, ?, ?)',
                [studentId, name, gender, className],
                (err) => {
                    connection.release();

                    if (err) {
                        console.error('保存学生信息失败:', err);
                        return res.status(500).json({
                            success: false,
                            message: '服务器错误',
                        error: err.message
                    });
                }

                res.json({
                    success: true,
                    message: '学生信息保存成功'
                });
            }
        );
    });
});
});

// 获取学生信息
router.get('/:studentId', (req, res) => {
    const { studentId } = req.params;

    if (!studentId || isNaN(parseInt(studentId))) {
        return res.status(400).json({
            success: false,
            message: '无效的学号'
        });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('数据库连接失败:', err);
            return res.status(500).json({
                success: false,
                message: '服务器错误',
                error: err.message
            });
        }

        connection.query('USE student_scores', (err) => {
            if (err) {
                console.error('选择数据库失败:', err);
                connection.release();
                return res.status(500).json({
                    success: false,
                    message: '服务器错误',
                    error: err.message
                });
            }

            connection.query(
                'SELECT * FROM student_info WHERE student_id = ?',
                [studentId],
                (err, rows) => {
                    connection.release();

                    if (err) {
                        console.error('查询学生信息失败:', err);
                        return res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: err.message
                        });
                    }

                    if (rows.length === 0) {
                        return res.json({
                            success: false,
                            message: '未找到该学号的学生信息'
                        });
                    }

                    res.json({
                        success: true,
                        data: rows[0]
                    });
                }
            );
        });
    });
});

// 按姓名查询学生信息
router.get('/name/:name', (req, res) => {
    const { name } = req.params;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('数据库连接失败:', err);
            return res.status(500).json({
                success: false,
                message: '服务器错误',
                error: err.message
            });
        }

        connection.query('USE student_scores', (err) => {
            if (err) {
                console.error('选择数据库失败:', err);
                connection.release();
                return res.status(500).json({
                    success: false,
                    message: '服务器错误',
                    error: err.message
                });
            }

            connection.query(
                'SELECT * FROM student_info WHERE name LIKE ?',
                [`%${name}%`],
                (err, rows) => {
                    connection.release();

                    if (err) {
                        console.error('查询学生信息失败:', err);
                        return res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: err.message
                        });
                    }

                    res.json({
                        success: true,
                        data: rows
                    });
                }
            );
        });
    });
});

// 按班级查询学生信息
router.get('/class/:className', (req, res) => {
    const { className } = req.params;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('数据库连接失败:', err);
            return res.status(500).json({
                success: false,
                message: '服务器错误',
                error: err.message
            });
        }

        connection.query('USE student_scores', (err) => {
            if (err) {
                console.error('选择数据库失败:', err);
                connection.release();
                return res.status(500).json({
                    success: false,
                    message: '服务器错误',
                    error: err.message
                });
            }

            connection.query(
                'SELECT * FROM student_info WHERE class_name LIKE ? ORDER BY student_id',
                [`%${className}%`],
                (err, rows) => {
                    connection.release();

                    if (err) {
                        console.error('查询学生信息失败:', err);
                        return res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: err.message
                        });
                    }

                    res.json({
                        success: true,
                        data: rows
                    });
                }
            );
        });
    });
});

module.exports = router;