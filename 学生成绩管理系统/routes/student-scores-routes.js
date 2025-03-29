const express = require('express');
const router = express.Router();
const { pool } = require('../db-init');

// 获取所有学生成绩
router.get('/', (req, res) => {
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
                'SELECT * FROM students',
                (err, rows) => {
                    connection.release();

                    if (err) {
                        console.error('查询学生成绩失败:', err);
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

// 获取单个学生成绩
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
                'SELECT * FROM students WHERE student_id = ?',
                [studentId],
                (err, rows) => {
                    connection.release();

                    if (err) {
                        console.error('查询学生成绩失败:', err);
                        return res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: err.message
                        });
                    }

                    if (rows.length === 0) {
                        return res.json({
                            success: false,
                            message: '未找到该学号的成绩信息'
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

// 创建/更新学生成绩
router.post('/', (req, res) => {
    const { studentId, subjectNames, scores } = req.body;

    if (!studentId || !subjectNames || !scores) {
        return res.status(400).json({
            success: false,
            message: '缺少必要的成绩信息'
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
                'REPLACE INTO students (student_id, subject_names, scores) VALUES (?, ?, ?)',
                [studentId, JSON.stringify(subjectNames), JSON.stringify(scores)],
                (err) => {
                    connection.release();

                    if (err) {
                        console.error('保存学生成绩失败:', err);
                        return res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: err.message
                        });
                    }

                    res.json({
                        success: true,
                        message: '学生成绩保存成功'
                    });
                }
            );
        });
    });
});

module.exports = router;