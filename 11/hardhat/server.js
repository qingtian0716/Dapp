const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const dbConfig = require('./db-config');

// 创建Express应用
const app = express();
const PORT = 8080;

// 中间件设置
app.use(cors());
app.use(bodyParser.json());

// 创建MySQL连接池
const pool = mysql.createPool(dbConfig);

// 初始化数据库和表结构
function initDatabase() { 
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('初始化数据库失败:', err);
            return;
        }

        // 创建数据库
        connection.query('CREATE DATABASE IF NOT EXISTS student_scores CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', (err) => {
            if (err) {
                console.error('创建数据库失败:', err);
                connection.release();
                return;
            }

            // 使用该数据库
            connection.query('USE student_scores', (err) => {
                if (err) {
                    console.error('选择数据库失败:', err);
                    connection.release();
                    return;
                }

                // 创建学生表
                connection.query(`
                    CREATE TABLE IF NOT EXISTS students (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        student_id INT NOT NULL,
                        subject_names JSON NOT NULL,
                        scores JSON NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_student_id (student_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `, (err) => {
                    if (err) {
                        console.error('创建表失败:', err);
                    } else {
                        console.log('数据库和表初始化成功');
                    }

                    connection.release();
                });
            });
        });
    });
}

// API路由 - 批量创建学生成绩
app.post('/api/students/batch', (req, res) => {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({
            success: false,
            message: '无效的请求数据格式'
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

        // 使用student_scores数据库
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

            let successCount = 0;
            let errorCount = 0;
            let processedCount = 0;

            // 逐个处理学生数据
            students.forEach(student => {
                const { studentId, subjectNames, scores } = student;

                if (!studentId || !Array.isArray(subjectNames) || !Array.isArray(scores)) {
                    errorCount++;
                    processedCount++;
                    checkCompletion();
                    return;
                }

                // 确保数据以JSON字符串形式存储
                const subjectNamesJson = JSON.stringify(subjectNames);
                const scoresJson = JSON.stringify(scores);

                // 使用REPLACE INTO来插入或更新记录
                connection.query(
                    'REPLACE INTO students (student_id, subject_names, scores) VALUES (?, ?, ?)',
                    [studentId, subjectNamesJson, scoresJson],
                    (err) => {
                        if (err) {
                            console.error(`保存学生ID ${studentId} 的数据失败:`, err);
                            errorCount++;
                        } else {
                            successCount++;
                        }

                        processedCount++;
                        checkCompletion();
                    }
                );
            });

            // 检查是否所有记录都已处理完毕
            function checkCompletion() {
                if (processedCount === students.length) {
                    connection.release();
                    res.json({
                        success: true,
                        message: `已成功保存 ${successCount} 条记录，失败 ${errorCount} 条`,
                        stats: {
                            total: students.length,
                            success: successCount,
                            error: errorCount
                        }
                    });
                }
            }
        });
    });
});

// API路由 - 获取学生成绩
app.get('/api/students/:studentId', (req, res) => {
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

        // 使用student_scores数据库
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
                        console.error('查询学生数据失败:', err);
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

                    const student = rows[0];

                    try {
                        // 检查数据格式，确保只有有效的JSON字符串才会被解析
                        let subject_names = student.subject_names;
                        let scores = student.scores;
                        
                        // 如果是字符串且看起来像JSON数组，则尝试解析
                        if (typeof subject_names === 'string' && subject_names.trim().startsWith('[')) {
                            subject_names = JSON.parse(subject_names);
                        } else if (typeof subject_names === 'string' && subject_names.includes(',')) {
                            // 如果是普通的逗号分隔字符串，转换为数组
                            subject_names = subject_names.split(',');
                        } else if (!Array.isArray(subject_names)) {
                            throw new Error('无效的科目名称格式');
                        }
                        
                        // 同样处理scores
                        if (typeof scores === 'string' && scores.trim().startsWith('[')) {
                            scores = JSON.parse(scores);
                        } else if (typeof scores === 'string' && scores.includes(',')) {
                            // 如果是普通的逗号分隔字符串，转换为数组
                            scores = scores.split(',').map(s => parseInt(s.trim()));
                        } else if (!Array.isArray(scores)) {
                            throw new Error('无效的成绩格式');
                        }

                        res.json({
                            success: true,
                            data: {
                                student_id: student.student_id,
                                subject_names,
                                scores,
                                created_at: student.created_at,
                                updated_at: student.updated_at
                            }
                        });
                    } catch (parseError) {
                        console.error('解析JSON数据失败:', parseError);
                        res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: '数据格式错误'
                        });
                    }
                }
            );
        });
    });
});

// API路由 - 获取统计数据
app.get('/api/statistics', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('数据库连接失败:', err);
            return res.status(500).json({
                success: false,
                message: '服务器错误',
                error: err.message
            });
        }

        // 使用student_scores数据库
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

            // 获取总学生数
            connection.query('SELECT COUNT(*) as total_students FROM students', (err, countResults) => {
                if (err) {
                    console.error('查询学生数量失败:', err);
                    connection.release();
                    return res.status(500).json({
                        success: false,
                        message: '服务器错误',
                        error: err.message
                    });
                }

                const totalStudents = countResults[0].total_students;

                // 获取所有学生数据，用于计算各科平均分
                connection.query('SELECT subject_names, scores FROM students', (err, studentsData) => {
                    connection.release(); // 释放连接
                    
                    if (err) {
                        console.error('查询学生数据失败:', err);
                        return res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: err.message
                        });
                    }

                    // 处理科目和分数数据
                    const subjectStats = {};
                    const gradeDistribution = {
                        excellent: 0, // 优秀 (90-100)
                        good: 0,      // 良好 (80-89)
                        average: 0,   // 中等 (70-79)
                        pass: 0,      // 及格 (60-69)
                        fail: 0       // 不及格 (0-59)
                    };
                    
                    let totalScoresCount = 0;

                    // 遍历所有学生数据
                    studentsData.forEach(student => {
                        try {
                            // 检查数据格式，确保只有有效的JSON字符串才会被解析
                            let subjectNames = student.subject_names;
                            let scores = student.scores;
                            
                            // 如果是字符串且看起来像JSON数组，则尝试解析
                            if (typeof subjectNames === 'string' && subjectNames.trim().startsWith('[')) {
                                subjectNames = JSON.parse(subjectNames);
                            } else if (typeof subjectNames === 'string' && subjectNames.includes(',')) {
                                // 如果是普通的逗号分隔字符串，转换为数组
                                subjectNames = subjectNames.split(',');
                            } else if (!Array.isArray(subjectNames)) {
                                // 如果不是数组也不是字符串，跳过这条记录
                                console.warn('无效的科目名称格式:', subjectNames);
                                return;
                            }
                            
                            // 同样处理scores
                            if (typeof scores === 'string' && scores.trim().startsWith('[')) {
                                scores = JSON.parse(scores);
                            } else if (typeof scores === 'string' && scores.includes(',')) {
                                // 如果是普通的逗号分隔字符串，转换为数组
                                scores = scores.split(',').map(s => parseInt(s.trim()));
                            } else if (!Array.isArray(scores)) {
                                // 如果不是数组也不是字符串，跳过这条记录
                                console.warn('无效的成绩格式:', scores);
                                return;
                            }

                            // 处理每个科目的分数
                            for (let i = 0; i < subjectNames.length; i++) {
                                const subject = subjectNames[i];
                                const score = scores[i];

                                // 初始化科目统计数据
                                if (!subjectStats[subject]) {
                                    subjectStats[subject] = {
                                        totalScore: 0,
                                        count: 0,
                                        average: 0
                                    };
                                }

                                // 累加分数和计数
                                subjectStats[subject].totalScore += score;
                                subjectStats[subject].count += 1;

                                // 更新成绩分布
                                totalScoresCount++;
                                if (score >= 90) {
                                    gradeDistribution.excellent++;
                                } else if (score >= 80) {
                                    gradeDistribution.good++;
                                } else if (score >= 70) {
                                    gradeDistribution.average++;
                                } else if (score >= 60) {
                                    gradeDistribution.pass++;
                                } else {
                                    gradeDistribution.fail++;
                                }
                            }
                        } catch (parseError) {
                            console.error('解析JSON数据失败:', parseError);
                            return;
                        }
                    });

                    // 计算每个科目的平均分
                    for (const subject in subjectStats) {
                        if (subjectStats[subject].count > 0) {
                            subjectStats[subject].average = (
                                subjectStats[subject].totalScore / subjectStats[subject].count
                            ).toFixed(2);
                        }
                    }

                    // 计算分布百分比
                    const gradePercentage = {
                        excellent: totalScoresCount > 0 ? (gradeDistribution.excellent / totalScoresCount * 100).toFixed(2) : 0,
                        good: totalScoresCount > 0 ? (gradeDistribution.good / totalScoresCount * 100).toFixed(2) : 0,
                        average: totalScoresCount > 0 ? (gradeDistribution.average / totalScoresCount * 100).toFixed(2) : 0,
                        pass: totalScoresCount > 0 ? (gradeDistribution.pass / totalScoresCount * 100).toFixed(2) : 0,
                        fail: totalScoresCount > 0 ? (gradeDistribution.fail / totalScoresCount * 100).toFixed(2) : 0
                    };

                    // 返回统计数据
                    res.json({
                        success: true,
                        data: {
                            totalStudents,
                            subjectStats,
                            gradeDistribution,
                            gradePercentage,
                            totalScoresCount
                        }
                    });
                });
            });
        });
    });
});

// 初始化数据库
initDatabase();

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动，监听端口 ${PORT}`);
    console.log(`API地址: http://localhost:${PORT}`);
}); 