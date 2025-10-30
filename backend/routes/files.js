const express = require('express');
const router = express.Router();
const { upload, deleteFile, generateFolderName, findFolderPath, BASE_UPLOAD_PATH } = require('../config/upload');
const { auth } = require('../middleware/auth'); // 解构导入auth函数
const path = require('path');
const fs = require('fs');

// Multer错误处理中间件
const multerErrorHandler = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// 调试：健康检查
router.get('/ping', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 上传单个文件
router.post('/upload', auth, function(req, res, next) {
  upload.single('file')(req, res, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: '没有上传文件' });
      }

      // 返回文件信息
      const fileInfo = {
        name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
        filename: req.file.filename,
        path: req.file.path,
        relativePath: req.file.path.replace(BASE_UPLOAD_PATH, '').replace(/\\/g, '/'),
        size: (req.file.size / 1024).toFixed(2) + ' KB',
        mimetype: req.file.mimetype,
        uploadTime: new Date().toISOString(),
        uploadBy: req.user.displayName || req.user.username
      };

      res.json({
        success: true,
        file: fileInfo
      });
    } catch (error) {
      console.error('文件上传失败:', error);
      res.status(500).json({ error: '文件上传失败: ' + error.message });
    }
  });
});

// 批量上传文件
router.post('/upload-multiple', auth, function(req, res, next) {
  upload.array('files', 50)(req, res, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: '没有上传文件' });
      }

      // 返回所有文件信息
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

// 下载文件
router.get('/download/:stage/:projectId/:filename', auth, (req, res) => {
  try {
    const { stage, projectId, filename } = req.params;
    const projectName = req.query.projectName || '';
    const warehouseType = req.query.warehouseType || 'first';
    const componentType = req.query.componentType || '';
    
    // 使用findFolderPath查找实际文件夹路径
    const options = { warehouseType, componentType };
    const folderPath = findFolderPath(stage, projectId, projectName, options);
    const filePath = path.join(folderPath, filename);

    console.log('下载文件请求:', { stage, projectId, projectName, filename, warehouseType, componentType });
    console.log('文件路径:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('文件不存在:', filePath);
      return res.status(404).json({ error: '文件不存在' });
    }

    res.download(filePath, filename);
  } catch (error) {
    console.error('文件下载错误:', error);
    res.status(500).json({ error: '文件下载失败: ' + error.message });
  }
});

// 查看/预览文件
router.get('/view/:stage/:projectId/:filename', auth, (req, res) => {
  try {
    const { stage, projectId, filename } = req.params;
    const projectName = req.query.projectName || '';
    const warehouseType = req.query.warehouseType || 'first';
    const componentType = req.query.componentType || '';
    
    // 使用findFolderPath查找实际文件夹路径
    const options = { warehouseType, componentType };
    const folderPath = findFolderPath(stage, projectId, projectName, options);
    const filePath = path.join(folderPath, filename);

    console.log('预览文件请求:', { stage, projectId, projectName, filename, warehouseType, componentType });
    console.log('文件路径:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('文件不存在:', filePath);
      return res.status(404).json({ error: '文件不存在', path: filePath });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('文件查看错误:', error);
    res.status(500).json({ error: '文件查看失败: ' + error.message });
  }
});

// 删除文件
router.delete('/:stage/:projectId/:filename', auth, async (req, res) => {
  try {
    const { stage, projectId, filename } = req.params;
    const projectName = req.query.projectName || '';
    const warehouseType = req.query.warehouseType || 'first';
    const componentType = req.query.componentType || '';
    
    // 使用findFolderPath查找实际文件夹路径
    const options = { warehouseType, componentType };
    const folderPath = findFolderPath(stage, projectId, projectName, options);
    const filePath = path.join(folderPath, filename);

    console.log('删除文件请求:', { stage, projectId, projectName, filename, warehouseType, componentType });
    console.log('文件路径:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('文件不存在:', filePath);
      return res.status(404).json({ error: '文件不存在' });
    }

    await deleteFile(filePath);

    res.json({
      success: true,
      message: '文件已删除'
    });
  } catch (error) {
    console.error('文件删除错误:', error);
    res.status(500).json({ error: '文件删除失败: ' + error.message });
  }
});

// 获取文件列表
router.get('/list/:stage/:projectId', auth, (req, res) => {
  try {
    const { stage, projectId } = req.params;
    const projectName = req.query.projectName || '';
    const warehouseType = req.query.warehouseType || 'first';
    const componentType = req.query.componentType || '';
    
    // 使用findFolderPath查找实际文件夹路径
    const options = { warehouseType, componentType };
    const folderPath = findFolderPath(stage, projectId, projectName, options);

    if (!fs.existsSync(folderPath)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(folderPath).map(filename => {
      const filePath = path.join(folderPath, filename);
      const stats = fs.statSync(filePath);
      
      return {
        name: filename,
        filename: filename,
        path: filePath,
        relativePath: filePath.replace(BASE_UPLOAD_PATH, '').replace(/\\/g, '/'),
        size: (stats.size / 1024).toFixed(2) + ' KB',
        uploadTime: stats.mtime.toISOString()
      };
    });

    res.json({
      success: true,
      files: files
    });
  } catch (error) {
    console.error('获取文件列表错误:', error);
    res.status(500).json({ error: '获取文件列表失败: ' + error.message });
  }
});

module.exports = router;
