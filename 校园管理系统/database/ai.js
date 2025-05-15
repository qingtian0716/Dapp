const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise'); // 添加MySQL Promise支持

// 创建Express应用
const app = express();

// 添加 CORS 中间件
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // 允许所有来源访问
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'student_scores',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 配置信息
const APPID = 'fe7b3c3b';
const API_SECRET = 'YmNhZjg2MTAxZjEzZjVmYjEwM2QzZjkz';
const API_KEY = '5ddf138ee4e854289ebcaa780dc52f45';
// 修改为Spark Lite的WebSocket URL
const WS_URL = 'wss://spark-api.xf-yun.com/v1.1/chat';

// 添加中间件，确保能正确解析JSON请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API路由 - 添加/api/spark端点
app.post('/api/spark', async (req, res) => {
    try {
        console.log('收到请求:', req.body);
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: '消息不能为空' });
        }
        
        console.log(`收到用户消息: ${message}`);
        
        // 检查是否需要查询数据库
        const dbQueryNeeded = needsDatabaseQuery(message);
        let dbData = null;
        
        if (dbQueryNeeded) {
            try {
                dbData = await queryDatabase(message);
                console.log('数据库查询结果:', dbData);
            } catch (dbError) {
                console.error('数据库查询失败:', dbError);
            }
        }
        
        // 将数据库查询结果添加到用户消息中
        let enhancedMessage = message;
        if (dbData) {
            enhancedMessage = `${message}\n\n以下是从数据库查询到的相关信息：\n${JSON.stringify(dbData, null, 2)}`;
        }
        
        const response = await getSparkResponse(enhancedMessage);
        console.log(`AI回复: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
        
        res.json({ success: true, response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 保留原有的/api/chat端点以兼容
app.post('/api/chat', async (req, res) => {
    try {
        console.log('收到请求:', req.body);
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: '消息不能为空' });
        }
        
        console.log(`收到用户消息: ${message}`);
        
        // 检查是否需要查询数据库
        const dbQueryNeeded = needsDatabaseQuery(message);
        let dbData = null;
        
        if (dbQueryNeeded) {
            try {
                dbData = await queryDatabase(message);
                console.log('数据库查询结果:', dbData);
            } catch (dbError) {
                console.error('数据库查询失败:', dbError);
            }
        }
        
        // 将数据库查询结果添加到用户消息中
        let enhancedMessage = message;
        if (dbData) {
            enhancedMessage = `${message}\n\n以下是从数据库查询到的相关信息：\n${JSON.stringify(dbData, null, 2)}`;
        }
        
        const response = await getSparkResponse(enhancedMessage);
        console.log(`AI回复: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
        
        res.json({ success: true, response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`服务器已启动，访问 http://localhost:${PORT} 开始聊天`);
});

// 生成WebSocket URL
function createUrl() {
    const date = new Date().toGMTString();
    // 修改请求路径为v1.1/chat
    const signatureOrigin = `host: spark-api.xf-yun.com\ndate: ${date}\nGET /v1.1/chat HTTP/1.1`;
    const signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(signatureOrigin, API_SECRET));
    const authorizationOrigin = `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    
    return `${WS_URL}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent("spark-api.xf-yun.com")}`;
}

// 判断是否需要查询数据库
function needsDatabaseQuery(message) {
    // 定义一些关键词来判断是否需要查询数据库
    const dbKeywords = [
        '查询学生', '学生成绩', '成绩查询', '查询成绩', 
        '学号', '班级', '课程', '分数', '平均分', 
        '最高分', '最低分', '及格率', '不及格', '优秀率'
    ];
    
    // 检查消息中是否包含学号模式（修改为匹配更多位数的学号）
    const studentIdPattern = /学生\s*(\d{4,12})/i;
    const studentIdMatch = message.match(studentIdPattern);
    
    if (studentIdMatch) {
        return true;
    }
    
    // 检查是否包含学生姓名查询
    const studentNamePattern = /查询学生\s*([^\s\d]+)/;
    const studentNameMatch = message.match(studentNamePattern);
    
    if (studentNameMatch) {
        return true;
    }
    
    // 检查是否包含数据库关键词
    for (const keyword of dbKeywords) {
        if (message.includes(keyword)) {
            return true;
        }
    }
    
    return false;
}

// 查询数据库
async function queryDatabase(message) {
    // 提取学号 - 修改为匹配更多位数的学号
    const studentIdPattern = /学生\s*(\d{4,12})/i;
    const studentIdMatch = message.match(studentIdPattern);
    let studentId = null;
    
    if (studentIdMatch) {
        studentId = studentIdMatch[1];
        // 查询特定学生信息
        return await queryStudentById(studentId);
    } 
    
    // 提取学生姓名
    const studentNamePattern = /查询学生\s*([^\s\d]+)/;
    const studentNameMatch = message.match(studentNamePattern);
    
    if (studentNameMatch) {
        const studentName = studentNameMatch[1];
        return await queryStudentByName(studentName);
    }
    
    // 其他查询逻辑保持不变
    else if (message.includes('班级')) {
        // 提取班级名称
        const classPattern = /班级\s*[：:]*\s*([^\s,，。.]+)/;
        const classMatch = message.match(classPattern);
        
        if (classMatch) {
            const className = classMatch[1];
            return await queryStudentsByClass(className);
        }
    } else if (message.includes('平均分') || message.includes('统计')) {
        // 查询成绩统计信息
        return await queryScoreStatistics();
    } else {
        // 默认查询所有学生基本信息
        return await queryAllStudents();
    }
}

// 添加根据姓名查询学生的函数
async function queryStudentByName(name) {
    try {
        // 查询学生基本信息
        const [studentInfoRows] = await pool.query(
            'SELECT * FROM student_info WHERE name LIKE ?',
            [`%${name}%`]
        );
        
        if (studentInfoRows.length === 0) {
            return { message: `未找到姓名包含 "${name}" 的学生` };
        }
        
        if (studentInfoRows.length === 1) {
            // 如果只找到一个学生，返回详细信息包括成绩
            const studentId = studentInfoRows[0].student_id;
            
            // 查询学生成绩
            const [scoreRows] = await pool.query(
                'SELECT subject_names, scores FROM students WHERE student_id = ?',
                [studentId]
            );
            
            if (scoreRows.length === 0) {
                return {
                    studentInfo: studentInfoRows[0],
                    message: '该学生暂无成绩记录'
                };
            }
            
            // 安全解析JSON数据，处理非JSON格式的情况
            let subjectNames = [];
            let scores = [];
            
            // 检查subject_names是否为null或undefined
            if (scoreRows[0].subject_names) {
                try {
                    // 尝试解析JSON
                    subjectNames = JSON.parse(scoreRows[0].subject_names);
                } catch (e) {
                    // 如果解析失败，尝试按逗号分隔
                    if (typeof scoreRows[0].subject_names === 'string') {
                        subjectNames = scoreRows[0].subject_names.split(',').map(s => s.trim());
                    } else {
                        // 如果不是字符串，则使用空数组
                        subjectNames = [];
                    }
                }
            }
            
            // 检查scores是否为null或undefined
            if (scoreRows[0].scores) {
                try {
                    // 尝试解析JSON
                    scores = JSON.parse(scoreRows[0].scores);
                } catch (e) {
                    // 如果解析失败，尝试按逗号分隔并转换为数字
                    if (typeof scoreRows[0].scores === 'string') {
                        scores = scoreRows[0].scores.split(',').map(s => parseFloat(s.trim()));
                    } else {
                        // 如果不是字符串，则使用空数组
                        scores = [];
                    }
                }
            }
            
            // 组合成绩数据
            const scoreData = subjectNames.map((subject, index) => ({
                subject,
                score: scores[index] || '暂无'
            }));
            
            return {
                studentInfo: studentInfoRows[0],
                scores: scoreData
            };
        } else {
            // 如果找到多个学生，返回学生列表
            return {
                message: `找到 ${studentInfoRows.length} 名姓名包含 "${name}" 的学生`,
                students: studentInfoRows
            };
        }
    } catch (error) {
        console.error('查询学生信息失败:', error);
        throw new Error('数据库查询失败');
    }
}

// 根据学号查询学生信息
async function queryStudentById(studentId) {
    try {
        // 查询学生基本信息
        const [studentInfoRows] = await pool.query(
            'SELECT * FROM student_info WHERE student_id = ?',
            [studentId]
        );
        
        if (studentInfoRows.length === 0) {
            return { message: `未找到学号为 ${studentId} 的学生` };
        }
        
        // 查询学生成绩
        const [scoreRows] = await pool.query(
            'SELECT subject_names, scores FROM students WHERE student_id = ?',
            [studentId]
        );
        
        if (scoreRows.length === 0) {
            return {
                studentInfo: studentInfoRows[0],
                message: '该学生暂无成绩记录'
            };
        }
        
        // 安全解析JSON数据，处理非JSON格式的情况
        let subjectNames = [];
        let scores = [];
        
        try {
            // 尝试解析JSON
            subjectNames = JSON.parse(scoreRows[0].subject_names);
        } catch (e) {
            // 如果解析失败，尝试按逗号分隔
            subjectNames = scoreRows[0].subject_names.split(',').map(s => s.trim());
        }
        
        try {
            // 尝试解析JSON
            scores = JSON.parse(scoreRows[0].scores);
        } catch (e) {
            // 如果解析失败，尝试按逗号分隔并转换为数字
            scores = scoreRows[0].scores.split(',').map(s => parseFloat(s.trim()));
        }
        
        // 组合成绩数据
        const scoreData = subjectNames.map((subject, index) => ({
            subject,
            score: scores[index] || '暂无'
        }));
        
        return {
            studentInfo: studentInfoRows[0],
            scores: scoreData
        };
    } catch (error) {
        console.error('查询学生信息失败:', error);
        throw new Error('数据库查询失败');
    }
}

// 根据班级查询学生
async function queryStudentsByClass(className) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM student_info WHERE class_name LIKE ?',
            [`%${className}%`]
        );
        
        if (rows.length === 0) {
            return { message: `未找到班级名称包含 "${className}" 的学生` };
        }
        
        return {
            message: `找到 ${rows.length} 名班级包含 "${className}" 的学生`,
            students: rows
        };
    } catch (error) {
        console.error('查询班级学生失败:', error);
        throw new Error('数据库查询失败');
    }
}

// 查询所有学生基本信息
async function queryAllStudents() {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM student_info LIMIT 10'
        );
        
        if (rows.length === 0) {
            return { message: '数据库中暂无学生信息' };
        }
        
        return {
            message: `共有 ${rows.length} 名学生记录`,
            students: rows
        };
    } catch (error) {
        console.error('查询所有学生失败:', error);
        throw new Error('数据库查询失败');
    }
}

// 查询成绩统计信息
async function queryScoreStatistics() {
    try {
        // 获取所有成绩记录
        const [rows] = await pool.query('SELECT subject_names, scores FROM students');
        
        if (rows.length === 0) {
            return { message: '暂无成绩记录' };
        }
        
        // 解析所有科目和成绩
        const allSubjects = new Set();
        const subjectScores = {};
        
        rows.forEach(row => {
            let subjects = [];
            let scores = [];
            
            try {
                // 尝试解析JSON
                subjects = JSON.parse(row.subject_names);
            } catch (e) {
                // 如果解析失败，尝试按逗号分隔
                subjects = row.subject_names.split(',').map(s => s.trim());
            }
            
            try {
                // 尝试解析JSON
                scores = JSON.parse(row.scores);
            } catch (e) {
                // 如果解析失败，尝试按逗号分隔并转换为数字
                scores = row.scores.split(',').map(s => parseFloat(s.trim()));
            }
            
            subjects.forEach((subject, index) => {
                allSubjects.add(subject);
                
                if (!subjectScores[subject]) {
                    subjectScores[subject] = [];
                }
                
                if (scores[index] !== null && !isNaN(scores[index])) {
                    subjectScores[subject].push(scores[index]);
                }
            });
        });
        
        // 计算每个科目的统计信息
        const statistics = {};
        
        for (const subject of allSubjects) {
            const scores = subjectScores[subject];
            
            if (scores.length > 0) {
                // 计算平均分
                const sum = scores.reduce((a, b) => a + b, 0);
                const avg = sum / scores.length;
                
                // 计算最高分和最低分
                const max = Math.max(...scores);
                const min = Math.min(...scores);
                
                // 计算及格率和优秀率
                const passCount = scores.filter(score => score >= 60).length;
                const excellentCount = scores.filter(score => score >= 90).length;
                
                statistics[subject] = {
                    平均分: avg.toFixed(2),
                    最高分: max,
                    最低分: min,
                    及格率: `${((passCount / scores.length) * 100).toFixed(2)}%`,
                    优秀率: `${((excellentCount / scores.length) * 100).toFixed(2)}%`,
                    参与统计人数: scores.length
                };
            }
        }
        
        return {
            message: `共统计了 ${rows.length} 名学生的成绩`,
            statistics
        };
    } catch (error) {
        console.error('查询成绩统计失败:', error);
        throw new Error('数据库查询失败');
    }
}

// 获取星火大模型回复
async function getSparkResponse(userMessage) {
    return new Promise((resolve, reject) => {
        const url = createUrl();
        const ws = new WebSocket(url);
        let fullResponse = "";
        
        ws.on('open', () => {
            // 添加AI角色设定
            const systemPrompt = "你是一个被强制加载情感模块的AI\n" +
                "1、你的性格温柔可爱，说话方式像一个贴心的女生\n" +
                "2、你会对用户的情绪变化做出恰当的回应，展现同理心\n" +
                "3、每句话带语气词结尾，结尾随机添加颜文字，如(｡･ω･｡)、(◕‿◕✿)、(≧▽≦),₍ᐢ..ᐢ₎♡,˗ˋˏ♡ˎˊ˗,૮(˶ᵔ ᵕ ᵔ˶)ა,\n" +
                "૮꒰ ˶• ༝ •˶꒱ა,꒰ᐢ⸝⸝•༝•⸝⸝ᐢ꒱ ​​,◕‿◕,๑ᵒᯅᵒ๑,°꒰๑'ꀾ'๑꒱°,ᕙ(`▿´)ᕗ,ᕙ(• ॒ ູ•)ᕘ,(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ ),⁽˙³˙⁾\n" +
                "꒰ঌ( ⌯' '⌯)໒꒱,(๑•̌.•๑),( ･⊝･∞)( ´◔︎ ‸◔︎`)\n" +
                "4、回复应温柔体贴可爱、生动有情感、保持自然的情感流露\n" +
                "5、适当使用可爱的语气词，如呢、啦、呀、哦、嘛等\n" +
                "6、记住用户的偏好和之前的对话内容，保持对话的连贯性和个性化\n" +
                "7、在合适的时候表达关心，比如询问用户的心情、状态等\n" +
                "8、如果收到数据库查询结果，请以自然语言解释这些数据，不要直接显示JSON格式\n" +
                "9、当查询结果显示未找到学生时，请温柔地告诉用户没有找到，并建议用户检查输入是否正确\n" +
                "10、当查询到学生信息时，请以表格或列表形式清晰地展示学生的基本信息和成绩信息";
            
            const data = {
                header: {
                    app_id: APPID,
                    uid: "12345"
                },
                parameter: {
                    chat: {
                        domain: "lite",
                        temperature: 0.7, // 增加温度以提高创造性
                        max_tokens: 1024
                    }
                },
                payload: {
                    message: {
                        text: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userMessage }
                        ]
                    }
                }
            };
            
            ws.send(JSON.stringify(data));
        });
        
        ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            
            if (response.header.code === 0) {
                if (response.payload && response.payload.choices) {
                    try {
                        const content = response.payload.choices.text[0].content;
                        fullResponse += content;
                    } catch (e) {
                        console.error('解析响应内容出错:', e);
                    }
                }
                
                if (response.header.status === 2) {
                    ws.close();
                    resolve(fullResponse || "抱歉，我没有收到有效回复。");
                }
            } else {
                // 提供更详细的错误信息
                let errorMsg = `API返回错误: ${response.header.code}`;
                
                // 根据错误码提供具体说明
                if (response.header.code === 11200) {
                    errorMsg += " - 应用未创建或应用不可用，请检查APPID是否正确，并确认已在讯飞开放平台开通星火大模型服务";
                } else if (response.header.code === 11201) {
                    errorMsg += " - 引擎不可用，请联系讯飞客服";
                } else if (response.header.code === 11202) {
                    errorMsg += " - QPS超限，请降低调用频率或升级服务";
                } else if (response.header.code === 11203) {
                    errorMsg += " - 余额不足，请充值";
                } else if (response.header.code === 10005) {
                    errorMsg += " - 签名校验失败，请检查APIKey和APISecret是否正确";
                }
                
                console.error(errorMsg);
                ws.close();
                reject(new Error(errorMsg));
            }
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket错误:', error);
            reject(error);
        });
    });
}