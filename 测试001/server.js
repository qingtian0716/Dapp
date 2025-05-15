// 服务器入口文件
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import serveStatic from 'serve-static';
import helmet from 'helmet';
import fs from 'fs';
import { fileURLToPath } from 'url';
// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入CORS配置
import corsOptions from './config/cors.js';

// 导入路由模块
import userRoutes from './routes/users.js';
import apiRoutes from './routes/api.js';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 8080;

// 定义API基础URL，供前端使用
global.API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;

// 创建日志目录
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 自定义请求日志记录函数
const logRequest = (req, res, next) => {
  const start = Date.now();
  const logEntry = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };
  
  // 请求完成后记录响应信息
  res.on('finish', () => {
    logEntry.status = res.statusCode;
    logEntry.duration = Date.now() - start;
    
    // 将日志写入文件
    fs.appendFile(
      path.join(logDir, 'access.log'),
      JSON.stringify(logEntry) + '\n',
      (err) => {
        if (err) console.error('写入日志失败:', err);
      }
    );
    
    // 开发环境下在控制台输出日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`${logEntry.method} ${logEntry.url} ${logEntry.status} ${logEntry.duration}ms`);
    }
  });
  
  next();
};

// 应用安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "http://localhost:3000", "ws://localhost:*", "http://127.0.0.1:*", "ws://127.0.0.1:*", "https://*.infura.io", "wss://*.infura.io"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'"]
    }
  }
}));

// 请求体解析中间件
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 应用CORS中间件
app.use(cors(corsOptions));

// 添加CORS预检请求处理
app.options('*', cors(corsOptions));

// 处理OPTIONS请求
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// 应用请求日志记录中间件
app.use(logRequest);

// 静态文件服务配置
const staticFileOptions = {
  index: ['index.html'],
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath);
    const contentTypes = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    if (contentTypes[ext]) {
      res.setHeader('Content-Type', contentTypes[ext]);
    }
       // 添加安全相关的响应头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
  },
  maxAge: '1d',
  index: false,
  dotfiles: 'ignore',
  etag: true,
  lastModified: true
};

// 配置HTML目录静态文件服务
app.use('/', serveStatic(path.join(__dirname, 'html'), {
  ...staticFileOptions,
  index: ['index.html']
}));

// 配置favicon.ico路由
app.use('/favicon.ico', serveStatic(path.join(__dirname, 'html', 'favicon.ico'), {
  ...staticFileOptions,
  maxAge: '1d'
}));

// 配置其他静态资源目录
app.use('/', serveStatic(path.join(__dirname), staticFileOptions));
app.use('/scripts', serveStatic(path.join(__dirname, 'scripts'), staticFileOptions));
app.use('/routes', serveStatic(path.join(__dirname, 'routes'), staticFileOptions));
app.use('/utils', serveStatic(path.join(__dirname, 'utils'), staticFileOptions));
app.use('/abi', serveStatic(path.join(__dirname, 'abi'), staticFileOptions));
app.use('/styles.css', serveStatic(path.join(__dirname, 'html', 'styles.css'), {
  ...staticFileOptions,
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// 全局请求限制
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // 生产环境限制更严格
  standardHeaders: true,
  legacyHeaders: false,
  message: '请求过于频繁，请稍后再试',
  skipSuccessfulRequests: false, // 成功的请求也计入限制
  keyGenerator: (req) => req.ip, // 使用IP地址作为限制键
  skip: (req) => process.env.NODE_ENV === 'development' // 开发环境跳过限制
});

// API特定的请求限制
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // 生产环境限制更严格
  standardHeaders: true,
  message: 'API请求过于频繁,请稍后再试',
  skip: (req) => process.env.NODE_ENV === 'development' // 开发环境跳过限制
});

// 应用全局请求限制
app.use(globalLimiter);

// 对API路由应用更严格的限制
app.use('/api', apiLimiter);

// 配置API路由
app.use('/api/auth', userRoutes);
app.use('/api', apiRoutes);

// JWT验证中间件
const authenticateJWT = (req, res, next) => {
  // Skip authentication for public routes
  const publicRoutes = ['/login', '/register', '/'];
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// 应用JWT验证中间件
app.use(authenticateJWT);

// 注册路由
app.use('/api', apiRoutes);
app.use('/users', userRoutes);

// 处理HTML页面请求
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'login.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'student.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'teacher.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'admin.html'));
});

app.get('/error', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'error.html'));
});

// 处理404错误
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'html', 'error.html'));
});

// 全局错误处理
app.use((err, req, res, next) => {
  // 记录错误详情到日志
  console.error('服务器错误:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // 根据错误类型返回不同的状态码和消息
  const errorTypes = {
    'UnauthorizedError': { status: 401, message: '未授权访问' },
    'ValidationError': { status: 400, message: '请求参数验证失败' },
    'CORSError': { status: 403, message: '不允许的跨域请求' },
    'SyntaxError': { status: 400, message: '无效的请求语法' },
    'TokenExpiredError': { status: 401, message: '认证令牌已过期' },
    'JsonWebTokenError': { status: 401, message: '无效的认证令牌' }
  };

  const errorInfo = errorTypes[err.name] || { status: 500, message: '服务器内部错误' };

  // 构建错误响应
  const errorResponse = {
    success: false,
    message: errorInfo.message,
    timestamp: new Date().toISOString()
  };

  // 在开发环境中添加详细错误信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(errorInfo.status).json(errorResponse);
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`服务器已启动，运行在 http://localhost:${PORT}`);
  console.log(`API基础URL: ${global.API_BASE_URL}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
});

// 优雅关闭服务器
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号,正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

export default app ;