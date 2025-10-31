import React, { useState, useEffect } from 'react';
import './WarehouseInDetail.css';
import { projectAPI, fileAPI } from '../services/api';
import { smartCompressMultiple } from '../utils/imageCompressor';

const WarehouseInDetail = ({ project, user, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // 判断是第一次还是第二次入库
  const isSecondWarehouseIn = project.testingCompleted === true && project.warehouseInCompleted === true;
  // 直接从 project 计算，不使用 state（这样 project 更新时会自动更新）
  const isCompleted = isSecondWarehouseIn ? !!project.warehouseInSecondCompleted : !!project.warehouseInCompleted;
  const [expandedFolders, setExpandedFolders] = useState({});

  // 第一次入库需要上传的图片
  const [purchaseComponents, setPurchaseComponents] = useState(project.purchaseComponents || []);
  const [processingComponents, setProcessingComponents] = useState(project.processingComponents || []);
  
  // 第二次入库需要上传的整机图片
  const [machineImages, setMachineImages] = useState(project.machineImages || []);

  // 当 project 变化时，更新状态
  useEffect(() => {
    console.log('========== 入库图片调试信息 ==========');
    console.log('项目ID:', project.id);
    console.log('项目名称:', project.projectName);
    console.log('是否第二次入库:', isSecondWarehouseIn);
    console.log('是否已完成:', isCompleted);
    console.log('原始 project.purchaseComponents:', project.purchaseComponents);
    console.log('原始 project.processingComponents:', project.processingComponents);
    console.log('purchaseComponents 数量:', (project.purchaseComponents || []).length);
    console.log('processingComponents 数量:', (project.processingComponents || []).length);
    console.log('=====================================');
    
    setPurchaseComponents(project.purchaseComponents || []);
    setProcessingComponents(project.processingComponents || []);
    setMachineImages(project.machineImages || []);
  }, [project]);

  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // 文件上传辅助函数
  const uploadFilesToServer = async (files, stage) => {
    try {
      const response = await fileAPI.uploadMultipleFiles(
        files,
        project.id,
        project.projectName,
        stage
      );
      return response.files;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  };

  // 处理零部件图片上传
  const handlePurchaseComponentsSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        alert('只能上传图片文件（JPG、PNG、GIF、WebP）');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`图片 ${file.name} 超过20MB限制`);
        return;
      }
    }

    try {
      setUploading(true);
      
      console.log(`[入库上传] 准备上传 ${selectedFiles.length} 个零部件图片，正在压缩...`);
      
      // 智能压缩图片
      const compressedFiles = await smartCompressMultiple(selectedFiles, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        threshold: 1
      });
      
      console.log('[入库上传] 压缩完成，开始上传到服务器...');
      
      // 上传文件到文件系统
      const uploadedFiles = await uploadFilesToServer(compressedFiles, 'warehouseIn');
      const updatedFiles = [...purchaseComponents, ...uploadedFiles];
      setPurchaseComponents(updatedFiles);

      // 立即保存到数据库
      await projectAPI.updateProject(project.id, {
        purchaseComponents: updatedFiles
      });

      setUploading(false);
      console.log('[入库上传] 零部件图片上传并保存成功');
    } catch (error) {
      setUploading(false);
      console.error('[入库上传] 零部件图片处理失败:', error.message);
      alert('上传失败：' + error.message);
    }

    e.target.value = '';
  };

  // 处理加工件图片上传
  const handleProcessingComponentsSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        alert('只能上传图片文件（JPG、PNG、GIF、WebP）');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`图片 ${file.name} 超过20MB限制`);
        return;
      }
    }

    try {
      setUploading(true);
      
      console.log(`[入库上传] 准备上传 ${selectedFiles.length} 个加工件图片，正在压缩...`);
      
      // 智能压缩图片
      const compressedFiles = await smartCompressMultiple(selectedFiles, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        threshold: 1
      });
      
      console.log('[入库上传] 压缩完成，开始上传到服务器...');
      
      // 上传文件到文件系统
      const uploadedFiles = await uploadFilesToServer(compressedFiles, 'warehouseIn');
      const updatedFiles = [...processingComponents, ...uploadedFiles];
      setProcessingComponents(updatedFiles);

      // 立即保存到数据库
      await projectAPI.updateProject(project.id, {
        processingComponents: updatedFiles
      });

      setUploading(false);
      console.log('[入库上传] 加工件图片上传并保存成功');
    } catch (error) {
      setUploading(false);
      console.error('[入库上传] 加工件图片处理失败:', error.message);
      alert('上传失败：' + error.message);
    }

    e.target.value = '';
  };

  // 处理整机图片上传（第二次入库）
  const handleMachineImagesSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        alert('只能上传图片文件（JPG、PNG、GIF、WebP）');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`图片 ${file.name} 超过20MB限制`);
        return;
      }
    }

    try {
      setUploading(true);
      
      console.log(`[整机入库上传] 准备上传 ${selectedFiles.length} 个整机图片，正在压缩...`);
      
      // 智能压缩图片
      const compressedFiles = await smartCompressMultiple(selectedFiles, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        threshold: 1
      });
      
      console.log('[整机入库上传] 压缩完成，开始上传到服务器...');
      
      // 上传文件到文件系统
      const uploadedFiles = await uploadFilesToServer(compressedFiles, 'warehouseIn');
      const updatedFiles = [...machineImages, ...uploadedFiles];
      setMachineImages(updatedFiles);

      // 立即保存到数据库
      await projectAPI.updateProject(project.id, {
        machineImages: updatedFiles
      });

      setUploading(false);
      console.log('[整机入库上传] 整机图片上传并保存成功');
    } catch (error) {
      setUploading(false);
      console.error('[整机入库上传] 整机图片处理失败:', error.message);
      alert('上传失败：' + error.message);
    }

    e.target.value = '';
  };

  // 删除图片
  const handleDeleteImage = async (index, targetSetter, currentList, imageName, fieldName) => {
    try {
      const toast = document.createElement('div');
      toast.textContent = '🗑️ 正在删除...';
      toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85); color: white; padding: 12px 24px;
        border-radius: 8px; font-size: 16px; font-weight: 500; z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(toast);
      
      await fileAPI.deleteFile('warehouseIn', project.id, imageName, project.projectName);
      
      const updated = currentList.filter((_, i) => i !== index);
      targetSetter(updated);

      // 立即保存到数据库
      await projectAPI.updateProject(project.id, {
        [fieldName]: updated
      });

      toast.textContent = '✅ 删除成功';
      setTimeout(() => document.body.removeChild(toast), 1500);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败：' + error.message);
    }
  };

  // 提交图片到数据库
  const handleSubmitImages = async () => {
    if (!isSecondWarehouseIn && purchaseComponents.length === 0 && processingComponents.length === 0) {
      alert('请至少上传零部件图片或加工件图片');
      return;
    }

    try {
      setLoading(true);
      
      await projectAPI.updateProject(project.id, {
        purchaseComponents,
        processingComponents
      });

      console.log('图片提交成功');
      setLoading(false);
      
      const toast = document.createElement('div');
      toast.textContent = '✅ 图片保存成功';
      toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(16, 185, 129, 0.95); color: white; padding: 12px 24px;
        border-radius: 8px; font-size: 16px; font-weight: 500; z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    } catch (error) {
      setLoading(false);
      console.error('提交失败:', error);
      alert('提交失败：' + error.message);
    }
  };

  // 推送到下一阶段
  const handlePushToNextStage = async () => {
    // 第一次入库需要先检查是否上传了图片
    if (!isSecondWarehouseIn) {
      if (purchaseComponents.length === 0 && processingComponents.length === 0) {
        alert('请至少上传零部件图片或加工件图片后再推送');
        return;
      }
    }

    try {
      setLoading(true);
      
      let updateData;
      if (isSecondWarehouseIn) {
        // 第二次入库（整机入库）
        if (machineImages.length === 0) {
          alert('请先上传整机图片后再推送');
          setLoading(false);
          return;
        }
        updateData = {
          warehouseInSecondCompleted: true,
          warehouseInSecondCompletedTime: new Date().toISOString(),
          warehouseInSecondCompletedBy: user.displayName || user.username,
          machineImages: machineImages
        };
      } else {
        // 第一次入库
        console.log('========== 准备推送入库数据 ==========');
        console.log('purchaseComponents 数量:', purchaseComponents.length);
        console.log('purchaseComponents 内容:', purchaseComponents);
        console.log('processingComponents 数量:', processingComponents.length);
        console.log('processingComponents 内容:', processingComponents);
        console.log('=====================================');
        
        updateData = {
          warehouseInCompleted: true,
          warehouseInCompletedTime: new Date().toISOString(),
          warehouseInCompletedBy: user.displayName || user.username,
          purchaseComponents,
          processingComponents
        };
        
        console.log('完整的 updateData:', updateData);
      }
      
      const response = await projectAPI.updateProject(project.id, updateData);
      console.log('推送响应:', response);

      console.log('推送成功:', response);
      setLoading(false);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
        onBack();
      }, 1000);
    } catch (error) {
      setLoading(false);
      console.error('推送失败:', error);
      alert('推送失败：' + error.message);
    }
  };

  // 图片预览
  const handleImagePreview = async (imageData, stage = 'warehouseIn') => {
    try {
      if (imageData.filename) {
        const viewUrl = fileAPI.viewFile(stage, project.id, imageData.filename, project.projectName);
        const response = await fetch(viewUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`无法加载图片 (HTTP ${response.status})`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPreviewImage({ ...imageData, url: blobUrl, data: blobUrl, preview: blobUrl });
      } else {
        setPreviewImage(imageData);
      }
      setShowImagePreview(true);
    } catch (error) {
      console.error('[入库预览] 失败:', error);
      alert('预览失败：' + error.message);
    }
  };

  // 下载图片
  const handleDownloadImage = async (imageData, stage = 'warehouseIn') => {
    try {
      if (imageData.filename) {
        await fileAPI.downloadFile(stage, project.id, imageData.filename, project.projectName);
      } else {
        const dataUrl = imageData.url || imageData.data || imageData.preview;
        if (!dataUrl) {
          console.warn('该图片无法下载');
          return;
        }
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = imageData.name || 'image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('下载失败：', error);
      alert('下载失败：' + error.message);
    }
  };

  // 渲染文件夹（只读或可删除）
  const renderFileFolder = (folderName, displayName, files, icon = '📁', stage = 'warehouseIn', deleteHandler = null) => {
    console.log(`[renderFileFolder] ${displayName}:`, {
      folderName,
      files,
      fileCount: files ? files.length : 0,
      stage
    });
    
    const isExpanded = expandedFolders[folderName];
    const fileCount = files ? files.length : 0;

    const handleDownloadAll = async (e) => {
      e.stopPropagation();
      if (fileCount === 0) return;
      
      try {
        console.log('[批量下载] 开始下载:', { stage, displayName, fileCount });
        await fileAPI.downloadZip(stage, project.id, project.projectName, displayName);
        console.log('[批量下载] 下载成功');
      } catch (error) {
        console.error('[批量下载] 下载失败:', error);
        alert('批量下载失败：' + error.message);
      }
    };

    return (
      <div className="file-folder">
        <div 
          className="folder-header" 
          onClick={() => toggleFolder(folderName)}
          style={{ cursor: 'pointer' }}
        >
          <div className="folder-left">
            <span className="folder-icon">{isExpanded ? '📂' : icon}</span>
            <span className="folder-name">{displayName}</span>
            <span className="file-count">({fileCount} 个文件)</span>
          </div>
          <div className="folder-right">
            {fileCount > 0 && (
              <button 
                className="btn-download-all"
                onClick={handleDownloadAll}
                title="打包下载全部文件"
              >
                📦 下载全部
              </button>
            )}
            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>
        
        {isExpanded && (
          <div className="folder-content">
            {fileCount === 0 ? (
              <div className="no-files">暂无文件</div>
            ) : (
              <div className="file-list-simple">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="file-item-simple"
                    onClick={() => handleImagePreview(file, stage)}
                  >
                    <div className="file-info-simple">
                      <div className="file-name-simple">{file.name}</div>
                      <div className="file-meta-simple">
                        {file.size} · {file.uploadTime ? new Date(file.uploadTime).toLocaleString('zh-CN', { 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : ''}
                        {file.uploadBy && ` · ${file.uploadBy}`}
                      </div>
                    </div>
                    <div className="file-actions-simple">
                      <button 
                        className="btn-action-simple btn-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImagePreview(file, stage);
                        }}
                        title="预览"
                      >
                        👁️ 预览
                      </button>
                      <button 
                        className="btn-action-simple btn-download"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(file, stage);
                        }}
                        title="下载"
                      >
                        ⬇️ 下载
                      </button>
                      {deleteHandler && (
                        <button 
                          className="btn-action-simple btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHandler(index);
                          }}
                          title="删除"
                        >
                          🗑️ 删除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 渲染可上传的文件夹（第一次入库专用）
  const renderUploadableFolder = (folderName, displayName, files, icon, handleUpload, handleDelete) => {
    const isExpanded = expandedFolders[folderName];
    const fileCount = files ? files.length : 0;

    return (
      <div className="file-folder uploadable">
        <div 
          className="folder-header" 
          onClick={() => toggleFolder(folderName)}
          style={{ cursor: 'pointer' }}
        >
          <div className="folder-left">
            <span className="folder-icon">{isExpanded ? '📂' : icon}</span>
            <span className="folder-name">{displayName}</span>
            <span className="file-count">({fileCount} 个文件)</span>
          </div>
          <div className="folder-right">
            <label className="btn-upload-folder" onClick={(e) => e.stopPropagation()}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                style={{ display: 'none' }}
                disabled={uploading || isCompleted}
              />
              📸 上传图片
            </label>
            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>
        
        {isExpanded && (
          <div className="folder-content">
            {fileCount === 0 ? (
              <div className="no-files">暂无文件</div>
            ) : (
              <div className="file-list-simple">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="file-item-simple"
                    onClick={() => handleImagePreview(file, 'warehouseIn')}
                  >
                    <div className="file-info-simple">
                      <div className="file-name-simple">{file.name}</div>
                      <div className="file-meta-simple">
                        {file.size} · {file.uploadTime ? new Date(file.uploadTime).toLocaleString('zh-CN', { 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : ''}
                        {file.uploadBy && ` · ${file.uploadBy}`}
                      </div>
                    </div>
                    <div className="file-actions-simple">
                      <button 
                        className="btn-action-simple btn-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImagePreview(file, 'warehouseIn');
                        }}
                        title="预览"
                      >
                        👁️ 预览
                      </button>
                      <button 
                        className="btn-action-simple btn-download"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(file, 'warehouseIn');
                        }}
                        title="下载"
                      >
                        ⬇️ 下载
                      </button>
                      {!isCompleted && (
                        <button 
                          className="btn-action-simple btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(index);
                          }}
                          title="删除"
                        >
                          🗑️ 删除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="warehousein-detail-container">
      {/* Loading覆盖层 */}
      {(loading || uploading) && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <img src="/loading.png" alt="Loading" className="loading-image" />
            <p>{uploading ? '上传中...' : '处理中...'}</p>
          </div>
        </div>
      )}

      {/* 顶部导航 */}
      <div className="warehousein-detail-header">
        <button className="back-button" onClick={onBack}>
          ← 
        </button>
        <h2 className="detail-title">{isSecondWarehouseIn ? '第二次入库（整机入库）' : '第一次入库（零部件入库）'}</h2>
      </div>

      <div className="engineering-detail-content">
        {/* 项目基本信息 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📋</span>
            <h3 className="section-title">项目信息</h3>
          </div>
          <div className="project-info">
            <h2 className="project-name">{project.projectName}</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">🎯 研发方向</span>
                <span className="info-value">{project.researchDirection || '未设置'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">💡 研发用途</span>
                <span className="info-value">{project.researchPurpose || project.description}</span>
              </div>
              <div className="info-item">
                <span className="info-label">💰 预算</span>
                <span className="info-value">{project.budget ? `${project.budget} 万` : '未设置'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">⏱️ 项目时长</span>
                <span className="info-value">{project.duration ? `${project.duration} 月` : '未设置'}</span>
              </div>
            </div>
            <div className="description-box">
              <h5>项目描述：</h5>
              <p>{project.description}</p>
            </div>
          </div>
        </div>

        {/* 参考图纸 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📁</span>
            <h3 className="section-title">参考图纸</h3>
          </div>

          {renderFileFolder(
            'rdSection',
            '研发图纸',
            project.developmentDrawings && project.developmentDrawings.length > 0
              ? project.developmentDrawings
              : ([...(project.folderScreenshots || []), ...(project.drawingImages || [])]),
            '📊',
            'development'
          )}

          {renderFileFolder(
            'engSection',
            '工程图纸',
            [...(project.engineeringDrawings || []), ...(project.engineeringDocuments || [])],
            '🛠️',
            'engineering'
          )}
        </div>

        {/* 第一次入库：上传零部件和加工件图片 */}
        {!isSecondWarehouseIn && !isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">📸</span>
              <h3 className="section-title">入库图片上传</h3>
            </div>

            <div className="upload-grid">
              <div className="upload-column">
                <div className="upload-column-header">
                  <span className="upload-icon">📦</span>
                  <h4>零部件图片（采购）</h4>
                </div>
                <div className="upload-area-wrapper">
                  <label htmlFor="purchaseComponents-upload" className="upload-area">
                    <input
                      id="purchaseComponents-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePurchaseComponentsSelect}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-icon-large">📸</div>
                    <div className="upload-text">点击上传图片</div>
                    <div className="upload-hint">支持 JPG、PNG、GIF 等格式</div>
                  </label>
                </div>
              </div>

              <div className="upload-column">
                <div className="upload-column-header">
                  <span className="upload-icon">⚙️</span>
                  <h4>加工件图片（加工）</h4>
                </div>
                <div className="upload-area-wrapper">
                  <label htmlFor="processingComponents-upload" className="upload-area">
                    <input
                      id="processingComponents-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleProcessingComponentsSelect}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-icon-large">📸</div>
                    <div className="upload-text">点击上传图片</div>
                    <div className="upload-hint">支持 JPG、PNG、GIF 等格式</div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 第一次入库：已上传的图片文件夹（上传后显示） */}
        {!isSecondWarehouseIn && !isCompleted && (purchaseComponents.length > 0 || processingComponents.length > 0) && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">📂</span>
              <h3 className="section-title">已上传的图片</h3>
            </div>

            {purchaseComponents.length > 0 && renderFileFolder(
              'purchaseComponentsSection',
              '零部件图片（采购）',
              purchaseComponents,
              '📦',
              'warehouseIn',
              (index) => handleDeleteImage(index, setPurchaseComponents, purchaseComponents, purchaseComponents[index].filename, 'purchaseComponents')
            )}

            {processingComponents.length > 0 && renderFileFolder(
              'processingComponentsSection',
              '加工件图片（加工）',
              processingComponents,
              '⚙️',
              'warehouseIn',
              (index) => handleDeleteImage(index, setProcessingComponents, processingComponents, processingComponents[index].filename, 'processingComponents')
            )}
          </div>
        )}

        {/* 第一次入库：已上传的图片（只读） */}
        {!isSecondWarehouseIn && isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">📸</span>
              <h3 className="section-title">已上传的入库图片</h3>
            </div>

            {renderFileFolder(
              'purchaseComponentsSection',
              '零部件图片（采购）',
              purchaseComponents,
              '📦',
              'warehouseIn'
            )}

            {renderFileFolder(
              'processingComponentsSection',
              '加工件图片（加工）',
              processingComponents,
              '⚙️',
              'warehouseIn'
            )}
          </div>
        )}

        {/* 入库完成信息 */}
        {isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">✅</span>
              <h3 className="section-title">入库状况</h3>
            </div>
            <div className="completion-info">
              <div className="status-item">
                <span className="status-label">完成状态：</span>
                <span className="status-text status-completed">
                  ✅ 已完成{isSecondWarehouseIn ? '整机' : ''}入库工作
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">完成时间：</span>
                <span className="status-text">
                  {new Date(
                    isSecondWarehouseIn 
                      ? project.warehouseInSecondCompletedTime 
                      : project.warehouseInCompletedTime
                  ).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">操作人：</span>
                <span className="status-text">
                  {isSecondWarehouseIn 
                    ? project.warehouseInSecondCompletedBy 
                    : project.warehouseInCompletedBy}
                </span>
              </div>
              <div className="completion-notice">
                <p>✨ 此项目已推送到{isSecondWarehouseIn ? '出库确认' : '出库'}阶段</p>
              </div>
            </div>
          </div>
        )}

        {/* 第二次入库：显示第一次入库图片（只读） */}
        {isSecondWarehouseIn && !isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">📸</span>
              <h3 className="section-title">第一次入库图片（只读）</h3>
            </div>

            {renderFileFolder(
              'firstPurchaseComponentsSection',
              '零部件图片（采购）',
              purchaseComponents,
              '📦',
              'warehouseIn',
              null
            )}

            {renderFileFolder(
              'firstProcessingComponentsSection',
              '加工件图片（加工）',
              processingComponents,
              '⚙️',
              'warehouseIn',
              null
            )}
          </div>
        )}

        {/* 第二次入库：上传整机图片 */}
        {isSecondWarehouseIn && !isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">📸</span>
              <h3 className="section-title">整机图片上传</h3>
            </div>

            <div style={{ width: '100%' }}>
              <div className="upload-column-header" style={{ marginBottom: '16px' }}>
                <span className="upload-icon">🏭</span>
                <h4>整机实体图片</h4>
              </div>
              <input
                type="file"
                id="machine-images-upload"
                multiple
                accept="image/*"
                onChange={handleMachineImagesSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="machine-images-upload" className="upload-box" style={{ width: '100%', maxWidth: 'none' }}>
                <div className="upload-icon-large">📷</div>
                <div className="upload-text">点击上传整机图片</div>
                <div className="upload-hint">支持 JPG、PNG、GIF 等格式</div>
              </label>
            </div>
          </div>
        )}

        {/* 第二次入库：已上传的整机图片 */}
        {isSecondWarehouseIn && !isCompleted && machineImages.length > 0 && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">📂</span>
              <h3 className="section-title">已上传的整机图片</h3>
            </div>

            {renderFileFolder(
              'machineImagesSection',
              '整机图片',
              machineImages,
              '🏭',
              'warehouseIn',
              (index) => handleDeleteImage(index, setMachineImages, machineImages, machineImages[index].filename, 'machineImages')
            )}
          </div>
        )}

        {/* 第二次入库：已完成时显示所有图片（只读） */}
        {isSecondWarehouseIn && isCompleted && (
          <>
            <div className="detail-section">
              <div className="section-header">
                <span className="section-icon">📸</span>
                <h3 className="section-title">第一次入库图片</h3>
              </div>

              {renderFileFolder(
                'firstPurchaseComponentsSection',
                '零部件图片（采购）',
                purchaseComponents,
                '📦',
                'warehouseIn',
                null
              )}

              {renderFileFolder(
                'firstProcessingComponentsSection',
                '加工件图片（加工）',
                processingComponents,
                '⚙️',
                'warehouseIn',
                null
              )}
            </div>

            <div className="detail-section">
              <div className="section-header">
                <span className="section-icon">🏭</span>
                <h3 className="section-title">整机图片</h3>
              </div>

              {renderFileFolder(
                'machineImagesSection',
                '整机图片',
                machineImages || [],
                '🏭',
                'warehouseIn',
                null
              )}
            </div>
          </>
        )}

        {/* 推送按钮 */}
        {!isCompleted && (
          <div className="push-section">
            <button className="btn-push-bottom" onClick={handlePushToNextStage} disabled={loading || uploading}>
              {isSecondWarehouseIn 
                ? '✅ 整机入库完成，推送到出库确认阶段' 
                : '✅ 入库完成，推送到出库阶段'}
            </button>
          </div>
        )}
      </div>

      {/* 图片预览模态框 */}
      {showImagePreview && previewImage && (
        <div className="image-preview-modal" onClick={() => setShowImagePreview(false)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>图片预览</h3>
              <button className="close-preview-btn" onClick={() => setShowImagePreview(false)}>
                ✕
              </button>
            </div>
            <div className="preview-body">
              <img 
                src={previewImage.url || previewImage.data || previewImage.preview} 
                alt={previewImage.name}
                className="preview-image"
              />
            </div>
            <div className="preview-footer">
              <div className="preview-info">
                <p><strong>文件名：</strong>{previewImage.name}</p>
                <p><strong>大小：</strong>{previewImage.size}</p>
                {previewImage.uploadTime && (
                  <p><strong>上传时间：</strong>{new Date(previewImage.uploadTime).toLocaleString('zh-CN')}</p>
                )}
                {previewImage.uploadBy && <p><strong>上传人：</strong>{previewImage.uploadBy}</p>}
              </div>
              <button 
                className="btn-download-preview"
                onClick={() => handleDownloadImage(previewImage)}
              >
                ⬇️ 下载图片
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成功提示模态框 */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon">✅</div>
            <div className="success-message">{isSecondWarehouseIn ? '整机入库' : '入库'}完成！</div>
            <div className="success-submessage">
              项目已推送到{isSecondWarehouseIn ? '出库确认' : '出库'}阶段
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseInDetail;
