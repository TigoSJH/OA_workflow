require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// 创建 Express 应用
const app = express();

// 连接数据库
connectDB();

// 中间件
app.use(cors()); // 允许跨域
// 放宽请求体大小限制，避免较多元数据导致 413 或解析失败
app.use(express.json({ limit: '20mb' })); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true, limit: '20mb' })); // 解析 URL 编码的请求体

// 测试路由
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ 工业工作流管理系统 API 服务正在运行',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/newProjects')); // 使用新的项目路由
app.use('/api/old-projects', require('./routes/projects')); // 保留旧路由作为备份
app.use('/api/notifications', require('./routes/notifications'));
// app.use('/api/tasks', require('./routes/tasks'));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 服务器启动成功！`);
  console.log(`📡 运行在: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV}`);
  console.log(`⏰ 时间: ${new Date().toLocaleString('zh-CN')}\n`);
});

