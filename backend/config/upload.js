const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 基础存储路径
const BASE_UPLOAD_PATH = 'F:\\OA_Files';

// 确保文件夹存在
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      // 从请求中获取阶段类型
      const stage = req.query.stage || req.body.stage || 'other';
      const projectId = req.query.projectId || req.body.projectId || 'temp';
      const projectName = req.query.projectName || req.body.projectName || '';
      
      // 清理项目名称，移除不允许的文件名字符
      const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
      
      // 只使用项目名称作为文件夹名（如果没有项目名称才用projectId）
      const folderName = safeName || projectId;
      
      // 构建路径: F:\OA_Files\{stage}\{projectName}\
      const uploadPath = path.join(BASE_UPLOAD_PATH, stage, folderName);
      
      // 确保目录存在
      ensureDirExists(uploadPath);
      
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    try {
      // 生成唯一文件名: 时间戳_原始文件名
      const timestamp = Date.now();
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const uniqueName = `${timestamp}_${originalName}`;
      cb(null, uniqueName);
    } catch (error) {
      cb(error);
    }
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|pdf|doc|docx|xls|xlsx|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('不支持的文件类型！只支持图片、PDF、Office文档和压缩包。'));
  }
};

// 创建上传中间件
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB 限制
  },
  fileFilter: fileFilter
});

// 删除文件的辅助函数
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('删除文件失败:', err);
        reject(err);
      } else {
        console.log('文件已删除:', filePath);
        resolve();
      }
    });
  });
};

// 生成安全的文件夹名称（只使用项目名称）
const generateFolderName = (projectId, projectName) => {
  if (!projectName) return projectId;
  
  // 清理项目名称，移除不允许的文件名字符
  const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
  
  // 只返回项目名称
  return safeName || projectId;
};

// 删除整个项目文件夹
const deleteProjectFolder = (stage, projectId, projectName = '') => {
  return new Promise((resolve, reject) => {
    const folderName = generateFolderName(projectId, projectName);
    const folderPath = path.join(BASE_UPLOAD_PATH, stage, folderName);
    
    if (!fs.existsSync(folderPath)) {
      return resolve();
    }
    
    fs.rm(folderPath, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error('删除项目文件夹失败:', err);
        reject(err);
      } else {
        console.log('项目文件夹已删除:', folderPath);
        resolve();
      }
    });
  });
};

module.exports = {
  upload,
  deleteFile,
  deleteProjectFolder,
  generateFolderName,
  BASE_UPLOAD_PATH
};

