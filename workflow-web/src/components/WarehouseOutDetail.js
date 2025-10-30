import React, { useState, useEffect } from 'react';
import './WarehouseOutDetail.css';
import { projectAPI, fileAPI } from '../services/api';

const WarehouseOutDetail = ({ project, user, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // 判断是第一次还是第二次出库
  const isSecondWarehouseOut = project.warehouseInSecondCompleted === true && project.warehouseOutCompleted === true;
  const [isCompleted] = useState(isSecondWarehouseOut ? !!project.warehouseOutSecondCompleted : !!project.warehouseOutCompleted);
  const [expandedFolders, setExpandedFolders] = useState({});

  // 出库阶段不再显示时间周期/剩余时间
  const remainingDays = null;

  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // 完成出库
  const handlePushToNextStage = async () => {
    try {
      setLoading(true);
      
      let updateData;
      if (isSecondWarehouseOut) {
        // 第二次出库（整机出库确认）
        updateData = {
          warehouseOutSecondCompleted: true,
          warehouseOutSecondCompletedTime: new Date().toISOString(),
          warehouseOutSecondCompletedBy: user.displayName || user.username
        };
      } else {
        // 第一次出库
        updateData = {
          warehouseOutCompleted: true,
          warehouseOutCompletedTime: new Date().toISOString(),
          warehouseOutCompletedBy: user.displayName || user.username
        };
      }
      
      const response = await projectAPI.updateProject(project.id, updateData);

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
    }
  };

  // 下载图片
  // 图片预览
  const handleImagePreview = async (imageData, stage = 'warehouseOut') => {
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
      console.error('[出库预览] 失败:', error);
      alert('预览失败：' + error.message);
    }
  };

  // 下载图片
  const handleDownloadImage = async (imageData, stage = 'warehouseOut') => {
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

  // 渲染文件夹
  const renderFileFolder = (folderName, displayName, files, icon = '📁', stage = 'warehouseOut') => {
    const isExpanded = expandedFolders[folderName];
    const fileCount = files ? files.length : 0;

    // 批量下载处理函数
    const handleDownloadAll = async (e) => {
      e.stopPropagation(); // 阻止点击事件冒泡到父元素
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
    <div className="warehouseout-detail-container">
      {/* Loading覆盖层 */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <img src="/loading.png" alt="Loading" className="loading-image" />
            <p>处理中...</p>
          </div>
        </div>
      )}

      {/* 顶部导航 */}
      <div className="warehouseout-detail-header">
        <button className="back-button" onClick={onBack}>
          ← 
        </button>
        <h2 className="detail-title">出库管理</h2>
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
              {/* 出库阶段不显示周期与剩余时间 */}
            </div>
            <div className="description-box">
              <h5>项目描述：</h5>
              <p>{project.description}</p>
            </div>
          </div>
        </div>

        {/* 图纸文件 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📁</span>
            <h3 className="section-title">项目文件</h3>
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

          {renderFileFolder(
            'purchaseSection',
            '采购清单',
            project.purchaseDocuments || [],
            '🛒',
            'purchase'
          )}

          {renderFileFolder(
            'processingSection',
            '加工图片',
            project.processingImages || [],
            '⚙️',
            'processing'
          )}
        </div>

        {/* 出库完成信息 */}
        {isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">✅</span>
              <h3 className="section-title">出库状况</h3>
            </div>
            <div className="completion-info">
              <div className="status-item">
                <span className="status-label">完成状态：</span>
                <span className="status-text status-completed">
                  ✅ 已完成{isSecondWarehouseOut ? '整机' : ''}出库工作
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">完成时间：</span>
                <span className="status-text">
                  {new Date(
                    isSecondWarehouseOut 
                      ? project.warehouseOutSecondCompletedTime 
                      : project.warehouseOutCompletedTime
                  ).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">操作人：</span>
                <span className="status-text">
                  {isSecondWarehouseOut 
                    ? project.warehouseOutSecondCompletedBy 
                    : project.warehouseOutCompletedBy}
                </span>
              </div>
              <div className="completion-notice">
                <p>{isSecondWarehouseOut ? '🎉 此项目已全部完成！' : '✨ 此项目已推送到装配阶段'}</p>
              </div>
            </div>
          </div>
        )}

        {/* 出库说明 */}
        {!isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">ℹ️</span>
              <h3 className="section-title">出库说明</h3>
            </div>
            <div className="warehouseout-notice">
              <p>📤 出库管理员无需上传文件或图片</p>
              {isSecondWarehouseOut ? (
                <p>✅ 完成整机出库确认后，点击下方按钮推送到项目归档</p>
              ) : (
                <p>✅ 完成出库工作后，点击下方按钮推送到装配阶段</p>
              )}
            </div>
          </div>
        )}

        {/* 推送按钮 */}
        {!isCompleted && (
          <div className="push-section">
            <button className="btn-push-bottom" onClick={handlePushToNextStage}>
              {isSecondWarehouseOut 
                ? '✅ 出库完成，转交给项目主管归档' 
                : '✅ 出库完成，推送到装配阶段'}
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
            <div className="success-message">{isSecondWarehouseOut ? '整机出库' : '出库'}完成！</div>
            <div className="success-submessage">
              {isSecondWarehouseOut ? '项目已全部完成' : '项目已推送到装配阶段'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseOutDetail;

