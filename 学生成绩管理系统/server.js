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





// 导入路由
const studentScoresRouter = require('./routes/student-scores-routes');
const studentInfoRouter = require('./routes/student-info-routes');

app.use('/api/students', studentScoresRouter);
app.use('/api/student-info', studentInfoRouter);









// 初始化数据库
initDatabase();

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动，监听端口 ${PORT}`);
    console.log(`API地址: http://localhost:${PORT}`);
});