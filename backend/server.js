require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// 创建 Express 应用
const app = express();

// 连接数据库
connectDB();

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['https://oa.jjkjoa.top', 'http://localhost:3000'],
  credentials: true
})); // 允许跨域
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

const BASE_UPLOAD_PATH = process.env.UPLOAD_PATH || 'F:\\OA_Files';
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
        type: file.mimetype,  // 使用 type 而不是 mimetype，前端使用 file.type 判断
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
    
    // 使用与上传一致的文件夹命名规则：projectId_projectName
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
    const folderName = safeName ? `${projectId}_${safeName}` : projectId;
    
    const filePath = path.join(BASE_UPLOAD_PATH, stage, folderName, filename);
    
    console.log('[VIEW] 预览请求:', { stage, projectId, projectName, filename, folderName, filePath });
    
    if (!fs.existsSync(filePath)) {
      console.log('[VIEW] ❌ 文件不存在:', filePath);
      return res.status(404).json({ error: '文件不存在', path: filePath });
    }
    
    console.log('[VIEW] ✓ 文件存在，发送文件');
    res.sendFile(filePath);
  } catch (error) {
    console.error('[VIEW] ❌ 文件预览失败:', error);
    res.status(500).json({ error: '文件预览失败: ' + error.message });
  }
});

// 文件下载路由
app.get('/api/files/download/:stage/:projectId/:filename', auth, (req, res) => {
  try {
    const { stage, projectId, filename } = req.params;
    const projectName = req.query.projectName || '';
    
    // 使用与上传一致的文件夹命名规则：projectId_projectName
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
    const folderName = safeName ? `${projectId}_${safeName}` : projectId;
    
    const filePath = path.join(BASE_UPLOAD_PATH, stage, folderName, filename);
    
    console.log('[DOWNLOAD] 下载请求:', { stage, projectId, projectName, filename, folderName, filePath });
    
    if (!fs.existsSync(filePath)) {
      console.log('[DOWNLOAD] ❌ 文件不存在:', filePath);
      return res.status(404).json({ error: '文件不存在', path: filePath });
    }
    
    // 使用 download 方法，浏览器会弹出下载对话框
    const originalName = Buffer.from(filename.split('_').slice(1).join('_'), 'utf8').toString();
    console.log('[DOWNLOAD] ✓ 文件存在，开始下载');
    res.download(filePath, originalName || filename);
  } catch (error) {
    console.error('[DOWNLOAD] ❌ 文件下载失败:', error);
    res.status(500).json({ error: '文件下载失败: ' + error.message });
  }
});

// 批量下载文件夹内所有文件（打包为zip）
app.get('/api/files/download-zip/:stage/:projectId', auth, (req, res) => {
  try {
    const { stage, projectId } = req.params;
    const projectName = req.query.projectName || '';
    const folderName = req.query.folderName || ''; // 可选：指定要下载的文件夹名称（如"development"、"engineering"）
    
    // 使用与上传一致的文件夹命名规则：projectId_projectName
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
    const projectFolderName = safeName ? `${projectId}_${safeName}` : projectId;
    
    const folderPath = path.join(BASE_UPLOAD_PATH, stage, projectFolderName);
    
    console.log('[ZIP-DOWNLOAD] 打包下载请求:', { stage, projectId, projectName, folderName, projectFolderName, folderPath });
    
    if (!fs.existsSync(folderPath)) {
      console.log('[ZIP-DOWNLOAD] ❌ 文件夹不存在:', folderPath);
      return res.status(404).json({ error: '文件夹不存在', path: folderPath });
    }
    
    // 读取文件夹内的所有文件
    const files = fs.readdirSync(folderPath);
    if (files.length === 0) {
      console.log('[ZIP-DOWNLOAD] ⚠️ 文件夹为空');
      return res.status(404).json({ error: '文件夹为空，没有可下载的文件' });
    }
    
    console.log('[ZIP-DOWNLOAD] 找到文件:', files.length, '个');
    
    // 使用archiver创建zip
    const archiver = require('archiver');
    const archive = archiver('zip', {
      zlib: { level: 9 } // 压缩级别
    });
    
    // 设置响应头
    const zipFileName = `${folderName || stage}_${safeName || projectId}_${Date.now()}.zip`;
    res.attachment(zipFileName);
    res.setHeader('Content-Type', 'application/zip');
    
    // 将archive输出到响应
    archive.pipe(res);
    
    // 添加文件到zip
    files.forEach(filename => {
      const filePath = path.join(folderPath, filename);
      if (fs.statSync(filePath).isFile()) {
        // 使用原始文件名（去掉时间戳前缀）
        const originalName = filename.includes('_') 
          ? filename.split('_').slice(1).join('_') 
          : filename;
        archive.file(filePath, { name: originalName });
        console.log('[ZIP-DOWNLOAD] 添加文件:', originalName);
      }
    });
    
    // 完成打包
    archive.finalize();
    console.log('[ZIP-DOWNLOAD] ✓ 打包完成');
    
    archive.on('error', (err) => {
      console.error('[ZIP-DOWNLOAD] ❌ 打包失败:', err);
      res.status(500).json({ error: '打包失败: ' + err.message });
    });
    
  } catch (error) {
    console.error('[ZIP-DOWNLOAD] ❌ 批量下载失败:', error);
    res.status(500).json({ error: '批量下载失败: ' + error.message });
  }
});

// 删除文件路由
app.delete('/api/files/:stage/:projectId/:filename', auth, (req, res) => {
  try {
    const { stage, projectId, filename } = req.params;
    const projectName = req.query.projectName || '';
    
    // 使用与上传一致的文件夹命名规则：projectId_projectName
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
    const folderName = safeName ? `${projectId}_${safeName}` : projectId;
    
    const filePath = path.join(BASE_UPLOAD_PATH, stage, folderName, filename);
    
    console.log('[DELETE] 删除请求:', { stage, projectId, projectName, filename, folderName, filePath });
    
    if (!fs.existsSync(filePath)) {
      console.log('[DELETE] ⚠️ 文件不存在:', filePath);
      return res.status(404).json({ error: '文件不存在', path: filePath });
    }
    
    // 删除文件
    fs.unlinkSync(filePath);
    console.log('[DELETE] ✓ 文件已删除:', filePath);
    
    res.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    console.error('[DELETE] ❌ 文件删除失败:', error);
    res.status(500).json({ error: '文件删除失败: ' + error.message });
  }
});

// 复制文件到新阶段（推送时使用）
app.post('/api/files/copy-to-stage', auth, async (req, res) => {
  try {
    const { projectId, projectName, files, fromStage, toStage } = req.body;
    
    console.log('[COPY] 复制文件请求:', { projectId, projectName, fromStage, toStage, filesCount: files?.length });
    
    if (!files || files.length === 0) {
      return res.json({ success: true, message: '没有文件需要复制' });
    }
    
    const safeName = (projectName || '').replace(/[<>:"/\\|?*]/g, '_').trim();
    const folderName = safeName ? `${projectId}_${safeName}` : projectId;
    
    const fromPath = path.join(BASE_UPLOAD_PATH, fromStage, folderName);
    const toPath = path.join(BASE_UPLOAD_PATH, toStage, folderName);
    
    console.log('[COPY] 源目录:', fromPath);
    console.log('[COPY] 目标目录:', toPath);
    
    // 确保目标目录存在
    ensureDirExists(toPath);
    
    const copiedFiles = [];
    const errors = [];
    
    for (const file of files) {
      try {
        const sourceFile = path.join(fromPath, file.filename);
        const destFile = path.join(toPath, file.filename);
        
        if (!fs.existsSync(sourceFile)) {
          console.log('[COPY] ⚠️ 源文件不存在:', sourceFile);
          errors.push({ filename: file.filename, error: '源文件不存在' });
          continue;
        }
        
        // 复制文件
        fs.copyFileSync(sourceFile, destFile);
        console.log('[COPY] ✓ 已复制:', file.filename);
        copiedFiles.push(file.filename);
      } catch (err) {
        console.error('[COPY] ❌ 复制失败:', file.filename, err.message);
        errors.push({ filename: file.filename, error: err.message });
      }
    }
    
    console.log('[COPY] 完成! 成功:', copiedFiles.length, '失败:', errors.length);
    
    res.json({
      success: true,
      copiedCount: copiedFiles.length,
      totalCount: files.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[COPY] ❌ 复制文件错误:', error);
    res.status(500).json({ error: '复制文件失败: ' + error.message });
  }
});

// 合同文件上传（为每个项目创建单独文件夹）
const contractStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const projectId = req.query.projectId || '';
    const projectName = req.query.projectName || '';
    
    console.log('[合同存储] projectId:', projectId, 'projectName:', projectName);
    
    // 使用与图片相同的命名规则：projectId_projectName
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
    const folderName = safeName ? `${projectId}_${safeName}` : projectId;
    
    const contractsPath = path.join(BASE_UPLOAD_PATH, 'contracts', folderName);
    console.log('[合同存储] 目标路径:', contractsPath);
    
    ensureDirExists(contractsPath);
    cb(null, contractsPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const contractUpload = multer({
  storage: contractStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只支持PDF格式的合同文件'));
    }
  }
});

// 上传合同文件
app.post('/api/files/upload-contract', auth, contractUpload.single('contract'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
      path: req.file.path,
      size: (req.file.size / 1024 / 1024).toFixed(2) + ' MB',
      uploadTime: new Date().toISOString()
    };

    console.log('[合同上传] 成功:', fileInfo);
    res.json(fileInfo);
  } catch (error) {
    console.error('[合同上传] 失败:', error);
    res.status(500).json({ error: '合同上传失败: ' + error.message });
  }
});

// 预览合同文件
app.get('/api/files/view-contract/:projectId/:filename', auth, (req, res) => {
  try {
    const { projectId, filename } = req.params;
    const projectName = req.query.projectName || '';
    
    // 使用与图片相同的命名规则：projectId_projectName
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
    const folderName = safeName ? `${projectId}_${safeName}` : projectId;
    
    const filePath = path.join(BASE_UPLOAD_PATH, 'contracts', folderName, filename);
    
    console.log('[合同预览] 请求:', { projectId, projectName, filename, folderName, filePath });
    
    if (!fs.existsSync(filePath)) {
      console.log('[合同预览] ❌ 文件不存在:', filePath);
      return res.status(404).json({ error: '合同文件不存在' });
    }
    
    console.log('[合同预览] ✓ 发送文件');
    res.sendFile(filePath);
  } catch (error) {
    console.error('[合同预览] ❌ 失败:', error);
    res.status(500).json({ error: '合同预览失败: ' + error.message });
  }
});

// 下载合同文件
app.get('/api/files/download-contract/:projectId/:filename', auth, (req, res) => {
  try {
    const { projectId, filename } = req.params;
    const projectName = req.query.projectName || '';
    
    // 使用与图片相同的命名规则：projectId_projectName
    const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
    const folderName = safeName ? `${projectId}_${safeName}` : projectId;
    
    const filePath = path.join(BASE_UPLOAD_PATH, 'contracts', folderName, filename);
    
    console.log('[合同下载] 请求:', { projectId, projectName, filename, folderName, filePath });
    
    if (!fs.existsSync(filePath)) {
      console.log('[合同下载] ❌ 文件不存在:', filePath);
      return res.status(404).json({ error: '合同文件不存在' });
    }
    
    const originalName = Buffer.from(filename.split('_').slice(1).join('_'), 'utf8').toString();
    console.log('[合同下载] ✓ 开始下载');
    res.download(filePath, originalName || filename);
  } catch (error) {
    console.error('[合同下载] ❌ 失败:', error);
    res.status(500).json({ error: '合同下载失败: ' + error.message });
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

