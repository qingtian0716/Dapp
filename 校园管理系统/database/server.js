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

// API路由 - 批量创建学生信息
app.post('/api/student-info/batch', (req, res) => {
    const students = req.body.students;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ success: false, message: '无效的学生数据' });
    }
    
    // 使用事务确保数据一致性
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('获取数据库连接失败:', err);
            return res.status(500).json({ success: false, message: '数据库连接失败' });
        }
        
        connection.beginTransaction(err => {
            if (err) {
                connection.release();
                return res.status(500).json({ success: false, message: '开始事务失败' });
            }
            
            let successCount = 0;
            let errorCount = 0;
            let completedCount = 0;
            
            // 处理每个学生的数据
            students.forEach(student => {
                const { studentId, name, gender, className } = student;
                
                // 检查必要字段
                if (!studentId || !name || !gender || !className) {
                    errorCount++;
                    completedCount++;
                    
                    // 检查是否所有操作都已完成
                    if (completedCount === students.length) {
                        finishTransaction();
                    }
                    return;
                }
                
                // 插入或更新学生信息
                const query = `
                    INSERT INTO student_info (student_id, name, gender, class_name) 
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    name = VALUES(name), 
                    gender = VALUES(gender), 
                    class_name = VALUES(class_name)
                `;
                
                connection.query(query, [studentId, name, gender, className], (err) => {
                    completedCount++;
                    
                    if (err) {
                        console.error('插入学生信息失败:', err);
                        errorCount++;
                    } else {
                        successCount++;
                    }
                    
                    // 检查是否所有操作都已完成
                    if (completedCount === students.length) {
                        finishTransaction();
                    }
                });
            });
            
            // 完成事务
            function finishTransaction() {
                if (errorCount > 0) {
                    connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ 
                            success: false, 
                            message: `批量导入失败，${errorCount}/${students.length} 条记录出错` 
                        });
                    });
                } else {
                    connection.commit(err => {
                        if (err) {
                            connection.rollback(() => {
                                connection.release();
                                res.status(500).json({ success: false, message: '提交事务失败' });
                            });
                        } else {
                            connection.release();
                            res.json({ 
                                success: true, 
                                message: `成功导入 ${successCount} 条学生信息`, 
                                stats: { success: successCount, error: errorCount } 
                            });
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
                        // 尝试解析JSON数据
                        let subject_names;
                        let scores;
                        
                        try {
                            // 检查subject_names的类型
                            if (typeof student.subject_names === 'string') {
                                // 如果是字符串，尝试解析为JSON
                                subject_names = JSON.parse(student.subject_names);
                            } else {
                                // 如果已经是对象（如数组），直接使用
                                subject_names = student.subject_names;
                            }
                        } catch (e) {
                            // 如果解析失败，且是字符串，尝试将其作为逗号分隔的字符串处理
                            if (typeof student.subject_names === 'string') {
                                subject_names = student.subject_names.split(',').map(s => s.trim());
                            } else {
                                // 如果不是字符串且解析失败，使用空数组
                                subject_names = [];
                                console.error('无法解析科目名称:', student.subject_names);
                            }
                        }
                        
                        try {
                            // 检查scores的类型
                            if (typeof student.scores === 'string') {
                                // 如果是字符串，尝试解析为JSON
                                scores = JSON.parse(student.scores);
                            } else {
                                // 如果已经是对象（如数组），直接使用
                                scores = student.scores;
                            }
                        } catch (e) {
                            // 如果解析失败，且是字符串，尝试将其作为逗号分隔的字符串处理
                            if (typeof student.scores === 'string') {
                                scores = student.scores.split(',').map(s => parseInt(s.trim()));
                            } else {
                                // 如果不是字符串且解析失败，使用空数组
                                scores = [];
                                console.error('无法解析成绩:', student.scores);
                            }
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
                        console.error('解析数据失败:', parseError);
                        res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: '数据格式错误: ' + parseError.message
                        });
                    }
                }
            );
        });
    });
});

// API路由 - 创建/更新单个学生成绩
// 修改单个学生成绩录入API
app.post('/api/students/single', (req, res) => {
    const { studentId, subjectNames, scores } = req.body;

    if (!studentId || !subjectNames || !scores || !Array.isArray(subjectNames) || !Array.isArray(scores) || subjectNames.length !== scores.length) {
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

            // 先检查是否存在该学生的记录
            connection.query(
                'SELECT * FROM students WHERE student_id = ?',
                [studentId],
                (err, rows) => {
                    if (err) {
                        console.error('查询学生数据失败:', err);
                        connection.release();
                        return res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: err.message
                        });
                    }

                    const subjectNamesJSON = JSON.stringify(subjectNames);
                    const scoresJSON = JSON.stringify(scores);

                    if (rows.length === 0) {
                        // 如果不存在，创建新记录
                        connection.query(
                            'INSERT INTO students (student_id, subject_names, scores) VALUES (?, ?, ?)',
                            [studentId, subjectNamesJSON, scoresJSON],
                            (err) => {
                                connection.release();
                                if (err) {
                                    console.error('创建学生成绩记录失败:', err);
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
                    } else {
                        // 如果存在，更新记录
                        connection.query(
                            'UPDATE students SET subject_names = ?, scores = ? WHERE student_id = ?',
                            [subjectNamesJSON, scoresJSON, studentId],
                            (err) => {
                                connection.release();
                                if (err) {
                                    console.error('更新学生成绩记录失败:', err);
                                    return res.status(500).json({
                                        success: false,
                                        message: '服务器错误',
                                        error: err.message
                                    });
                                }
                                res.json({
                                    success: true,
                                    message: '学生成绩更新成功'
                                });
                            }
                        );
                    }
                }
            );
        });
    });
});

// 添加新的API路由 - 按姓名和班级查询的 API
app.get('/api/student-info/name/:name', (req, res) => {
    const { name } = req.params;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: '请提供学生姓名'
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

                    if (rows.length === 0) {
                        return res.json({
                            success: false,
                            message: '未找到该姓名的学生信息'
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

// 添加新的API路由 - 按班级查询API
app.get('/api/student-info/class/:className', (req, res) => {
    const { className } = req.params;

    if (!className) {
        return res.status(400).json({
            success: false,
            message: '无效的班级名称'
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
                'SELECT * FROM student_info WHERE class_name LIKE ? ORDER BY student_id',
                [`%${className}%`],
                (err, rows) => {
                    connection.release();

                    if (err) {
                        console.error('查询班级学生信息失败:', err);
                        return res.status(500).json({
                            success: false,
                            message: '服务器错误',
                            error: err.message
                        });
                    }

                    if (rows.length === 0) {
                        return res.json({
                            success: false,
                            message: '未找到该班级的学生信息'
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

// 添加新的API路由 - 批量保存学生成绩
app.post('/api/students/batch', (req, res) => {
    const batchData = req.body;

    if (!Array.isArray(batchData) || batchData.length === 0) {
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

            let successCount = 0;
            let errorCount = 0;
            let processedCount = 0;

            // 逐个处理学生成绩数据
            batchData.forEach(data => {
                const { studentId, subjectNames, scores } = data;

                if (!studentId || !Array.isArray(subjectNames) || !Array.isArray(scores) || subjectNames.length !== scores.length) {
                    errorCount++;
                    processedCount++;
                    checkCompletion();
                    return;
                }

                // 将数组转换为JSON字符串
                const subjectNamesJson = JSON.stringify(subjectNames);
                const scoresJson = JSON.stringify(scores);

                // 使用REPLACE INTO来插入或更新记录
                connection.query(
                    'REPLACE INTO students (student_id, subject_names, scores) VALUES (?, ?, ?)',
                    [studentId, subjectNamesJson, scoresJson],
                    (err) => {
                        if (err) {
                            console.error(`保存学生ID ${studentId} 的成绩失败:`, err);
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
                if (processedCount === batchData.length) {
                    connection.release();
                    res.json({
                        success: true,
                        message: `批量导入成功，成功: ${successCount}, 失败: ${errorCount}`,
                        details: {
                            total: batchData.length,
                            success: successCount,
                            error: errorCount
                        }
                    });
                }
            }
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