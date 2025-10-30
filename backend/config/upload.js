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
      const stage = (req.query.stage || req.body.stage || 'other').toString().trim();
      const projectId = (req.query.projectId || req.body.projectId || 'temp').toString().trim();
      const projectName = (req.query.projectName || req.body.projectName || '').toString();
      
      // 清理项目名称，移除不允许的文件名字符
      const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
      
      // 老规则：使用 项目ID_项目名称（若无项目名称则仅用项目ID）
      const folderName = safeName ? `${projectId}_${safeName}` : projectId;
      
      let uploadPath;
      
      // 特殊处理 warehouseIn 阶段
      if (stage === 'warehouseIn') {
        const warehouseType = (req.query.warehouseType || req.body.warehouseType || 'first').toString().trim(); // first or second
        const componentType = (req.query.componentType || req.body.componentType || '').toString().trim(); // purchase or processing
        
        // 构建路径: F:\OA_Files\warehouseIn\{projectId_projectName}\第一次入库\ 或 第二次入库\
        const warehouseFolder = warehouseType === 'first' ? '第一次入库' : '第二次入库';
        
        if (warehouseType === 'first' && componentType) {
          // 第一次入库需要再分零部件和加工件
          const subFolder = componentType === 'purchase' ? '零部件' : '加工件';
          uploadPath = path.join(BASE_UPLOAD_PATH, stage, folderName, warehouseFolder, subFolder);
        } else {
          // 第二次入库直接放在 第二次入库 文件夹下
          uploadPath = path.join(BASE_UPLOAD_PATH, stage, folderName, warehouseFolder);
        }
        
        console.log('[upload.destination][warehouseIn]', { 
          stage, projectId, projectName, folderName, 
          warehouseType, componentType, uploadPath 
        });
      } else {
        // 其他阶段使用原来的逻辑
        uploadPath = path.join(BASE_UPLOAD_PATH, stage, folderName);
        console.log('[upload.destination][other-stage]', { stage, projectId, projectName, folderName, uploadPath });
      }
      
      // 确保目录存在
      ensureDirExists(uploadPath);

      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 获取原始文件名
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      // 获取目标文件夹路径
      const stage = req.query.stage || req.body.stage || 'other';
      const projectId = req.query.projectId || req.body.projectId || 'temp';
      const projectName = req.query.projectName || req.body.projectName || '';
      const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
      const folderName = safeName ? `${projectId}_${safeName}` : projectId;
      const uploadPath = path.join(BASE_UPLOAD_PATH, stage, folderName);
      
      // 老规则：使用 时间戳_原始文件名，确保唯一
      const timestamp = Date.now();
      const finalName = `${timestamp}_${originalName}`;
      console.log('[upload.filename][old-rule]', { originalName, finalName, folderPath: uploadPath });

      cb(null, finalName);
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

// 查找文件夹（优先新规则：项目名称；兼容旧规则：项目ID_项目名称、仅项目ID）
// 新增：支持 warehouseIn 阶段的特殊路径参数
const findFolderPath = (stage, projectId, projectName, options = {}) => {
  const fs = require('fs');
  const path = require('path');

  console.log('=== findFolderPath ===');
  console.log('stage:', stage);
  console.log('projectId:', projectId);
  console.log('projectName:', projectName);
  console.log('options:', options);

  const safeName = (projectName || '').replace(/[<>:"/\\|?*]/g, '_').trim();

  // 特殊处理 warehouseIn 阶段
  if (stage === 'warehouseIn') {
    const { warehouseType = 'first', componentType = '' } = options;
    const folderName = safeName ? `${projectId}_${safeName}` : projectId;
    const warehouseFolder = warehouseType === 'first' ? '第一次入库' : '第二次入库';
    
    let targetPath;
    if (warehouseType === 'first' && componentType) {
      const subFolder = componentType === 'purchase' ? '零部件' : '加工件';
      targetPath = path.join(BASE_UPLOAD_PATH, stage, folderName, warehouseFolder, subFolder);
    } else {
      targetPath = path.join(BASE_UPLOAD_PATH, stage, folderName, warehouseFolder);
    }
    
    console.log('✓ warehouseIn 特殊路径:', targetPath);
    return targetPath;
  }

  // 其他阶段使用原来的逻辑
  // 1) 新规则：只用项目名称
  if (safeName) {
    const newPath = path.join(BASE_UPLOAD_PATH, stage, safeName);
    if (fs.existsSync(newPath)) {
      console.log('✓ 使用新规则目录:', newPath);
      return newPath;
    }
    // 2) 旧规则：项目ID_项目名称
    const oldPath = path.join(BASE_UPLOAD_PATH, stage, `${projectId}_${safeName}`);
    if (fs.existsSync(oldPath)) {
      console.log('✓ 兼容旧规则目录:', oldPath);
      return oldPath;
    }
  }

  // 3) 兜底：仅项目ID
  const idPath = path.join(BASE_UPLOAD_PATH, stage, projectId || '');
  console.log('使用兜底目录:', idPath);
  return idPath;
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
  findFolderPath,
  BASE_UPLOAD_PATH
};

