// MySQL数据库连接配置
module.exports = {
  host: 'localhost',
  user: 'root',         
  password: '123456', 
  database: 'mysql',    
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}; 