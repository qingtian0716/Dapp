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
    // 创建连接
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

                // 创建学生信息表
                connection.query(`
                    CREATE TABLE IF NOT EXISTS student_info (
                        student_id INT PRIMARY KEY,
                        name VARCHAR(50) NOT NULL,
                        gender ENUM('男', '女') NOT NULL,
                        class_name VARCHAR(50) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `, (err) => {
                    if (err) {
                        console.error('创建学生信息表失败:', err);
                        connection.release();
                        return;
                    }

                    // 创建成绩表（修改原有表结构）
                    connection.query(`
                        CREATE TABLE IF NOT EXISTS students (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            student_id INT NOT NULL,
                            subject_names JSON NOT NULL,
                            scores JSON NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            UNIQUE KEY unique_student_id (student_id),
                            FOREIGN KEY (student_id) REFERENCES student_info(student_id)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    `, (err) => {
                        if (err) {
                            console.error('创建成绩表失败:', err);
                        } else {
                            console.log('数据库和表初始化成功');
                        }
                        connection.release();
                    });
                });
            });
        });
    });
}

// 添加新的API路由 - 创建/更新学生信息
app.post('/api/student-info', (req, res) => {
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

// 添加新的API路由 - 获取学生信息
app.get('/api/student-info/:studentId', (req, res) => {
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
                        const subject_names = JSON.parse(student.subject_names);
                        const scores = JSON.parse(student.scores);

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

// API路由 - 创建/更新单个学生成绩
app.post('/api/students/single', (req, res) => {
    const { studentId, subjectNames, scores } = req.body;

    if (!studentId || !Array.isArray(subjectNames) || !Array.isArray(scores)) {
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

            const subjectNamesJson = JSON.stringify(subjectNames);
            const scoresJson = JSON.stringify(scores);

            connection.query(
                'REPLACE INTO students (student_id, subject_names, scores) VALUES (?, ?, ?)',
                [studentId, subjectNamesJson, scoresJson],
                (err) => {
                    connection.release();

                    if (err) {
                        console.error('保存学生数据失败:', err);
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

// 按姓名查询学生信息
app.get('/api/student-info/name/:name', (req, res) => {
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
app.get('/api/student-info/class/:className', (req, res) => {
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

// 初始化数据库
initDatabase();

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动，监听端口 ${PORT}`);
    console.log(`API地址: http://localhost:${PORT}`);
});