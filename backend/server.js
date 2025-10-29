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

// 临时内联文件上传路由用于调试
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('./middleware/auth');

const BASE_UPLOAD_PATH = 'F:\\OA_Files';
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const stage = req.query.stage || req.body.stage || 'other';
    const projectId = req.query.projectId || req.body.projectId || 'temp';
    const projectName = req.query.projectName || req.body.projectName || '';
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
    const folderName = safeName ? `${projectId}_${safeName}` : projectId;
    const uploadPath = path.join(BASE_UPLOAD_PATH, stage, folderName);
    ensureDirExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|pdf|doc|docx|xls|xlsx|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

app.get('/api/files/ping', (req, res) => {
  res.json({ ok: true, message: '文件路由正常', time: new Date().toISOString() });
});

app.post('/api/files/upload-multiple', auth, function(req, res, next) {
  upload.array('files', 50)(req, res, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: '没有上传文件' });
      }

      const filesInfo = req.files.map(file => ({
        name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        filename: file.filename,
        path: file.path,
        relativePath: file.path.replace(BASE_UPLOAD_PATH, '').replace(/\\/g, '/'),
        size: (file.size / 1024).toFixed(2) + ' KB',
        mimetype: file.mimetype,
        uploadTime: new Date().toISOString(),
        uploadBy: req.user.displayName || req.user.username
      }));

      res.json({
        success: true,
        files: filesInfo,
        count: filesInfo.length
      });
    } catch (error) {
      console.error('批量文件上传失败:', error);
      res.status(500).json({ error: '批量文件上传失败: ' + error.message });
    }
  });
});

// 文件预览路由
app.get('/api/files/view/:stage/:projectId/:filename', auth, (req, res) => {
  try {
    const { stage, projectId, filename } = req.params;
    const projectName = req.query.projectName || '';
    
    // 只使用项目名称作为文件夹名
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim() || projectId;
    
    const filePath = path.join(BASE_UPLOAD_PATH, stage, safeName, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('文件预览失败:', error);
    res.status(500).json({ error: '文件预览失败: ' + error.message });
  }
});

// 文件下载路由
app.get('/api/files/download/:stage/:projectId/:filename', auth, (req, res) => {
  try {
    const { stage, projectId, filename } = req.params;
    const projectName = req.query.projectName || '';
    
    // 只使用项目名称作为文件夹名
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim() || projectId;
    
    const filePath = path.join(BASE_UPLOAD_PATH, stage, safeName, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 使用 download 方法，浏览器会弹出下载对话框
    const originalName = Buffer.from(filename.split('_').slice(1).join('_'), 'utf8').toString();
    res.download(filePath, originalName || filename);
  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({ error: '文件下载失败: ' + error.message });
  }
});

// app.use('/api/files', require('./routes/files')); // 文件上传下载路由 - 临时禁用，使用上面内联版本
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

