// CORS配置文件
import dotenv from 'dotenv';
dotenv.config();

// 从环境变量获取允许的域名列表，如果未配置则使用默认值
const defaultOrigins = [
  'http://127.0.0.1:5500', 'http://localhost:5500',
  'http://127.0.0.1:5501', 'http://localhost:5501',
  'http://127.0.0.1:8080', 'http://localhost:8080',
  'http://127.0.0.1:3000', 'http://localhost:3000',
  'http://127.0.0.1:5173', 'http://localhost:5173'
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : defaultOrigins;

// CORS配置选项
const corsOptions = {
  origin: function(origin, callback) {
    // 开发环境或未提供origin时允许访问
    if (process.env.NODE_ENV === 'development' || !origin) {
      return callback(null, true);
    }
    
    // 检查origin是否在允许列表中
    if (allowedOrigins.some(allowedOrigin => {
      // 支持通配符匹配，如 *.example.com
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    })) {
      callback(null, true);
    } else {
      callback(new Error(`域名 ${origin} 不在允许访问的列表中`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200
};

export default corsOptions;