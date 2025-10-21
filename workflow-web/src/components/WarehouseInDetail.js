import React, { useState, useEffect } from 'react';
import './WarehouseInDetail.css';
import { projectAPI } from '../services/api';

const WarehouseInDetail = ({ project, user, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCompleted] = useState(!!project.warehouseInCompleted);
  const [expandedFolders, setExpandedFolders] = useState({});

  // 计算剩余天数
  const calculateRemainingDays = () => {
    if (!project.timelines || !project.timelines.warehouseTime) {
      return null;
    }

    const startTimeRaw = project.timelines.warehouseInStartTime || project.testingCompletedTime;
    if (!startTimeRaw) return null;

    const startTime = new Date(startTimeRaw);
    const now = new Date();
    const elapsedDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const remainingDays = project.timelines.warehouseTime - elapsedDays;
    
    return remainingDays;
  };

  const remainingDays = calculateRemainingDays();

  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // 推送到下一阶段（出库）
  const handlePushToNextStage = async () => {
    try {
      setLoading(true);
      
      const response = await projectAPI.updateProject(project.id, {
        warehouseInCompleted: true,
        warehouseInCompletedTime: new Date().toISOString(),
        warehouseInCompletedBy: user.displayName || user.username
      });

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
  const handleDownloadImage = (imageData) => {
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
  };

  // 渲染文件夹
  const renderFileFolder = (folderName, displayName, files, icon = '📁') => {
    const isExpanded = expandedFolders[folderName];
    const fileCount = files ? files.length : 0;

    return (
      <div className="file-folder">
        <div 
          className="folder-header" 
          onClick={() => toggleFolder(folderName)}
          style={{ cursor: 'pointer' }}
        >
          <span className="folder-icon">{isExpanded ? '📂' : icon}</span>
          <span className="folder-name">{displayName}</span>
          <span className="file-count">({fileCount} 个文件)</span>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
        
        {isExpanded && (
          <div className="folder-content">
            {fileCount === 0 ? (
              <div className="no-files">暂无文件</div>
            ) : (
              <div className="file-list-compact">
                {files.map((file, index) => (
                  <div key={index} className="file-item-compact">
                    <div 
                      className="file-preview-compact"
                      onClick={() => {
                        setPreviewImage(file);
                        setShowImagePreview(true);
                      }}
                    >
                      <div className="file-icon-mini">🖼️</div>
                      <div className="file-info-compact">
                        <div className="file-name-compact">{file.name}</div>
                        <div className="file-meta-compact">
                          {file.size} · {file.uploadTime ? new Date(file.uploadTime).toLocaleString('zh-CN', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : ''}
                          {file.uploadBy && ` · ${file.uploadBy}`}
                        </div>
                      </div>
                    </div>
                    <div className="file-actions-compact">
                      <button 
                        className="btn-action-compact btn-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(file);
                          setShowImagePreview(true);
                        }}
                        title="查看"
                      >
                        👁️
                      </button>
                      <button 
                        className="btn-action-compact btn-download"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(file);
                        }}
                        title="下载"
                      >
                        ⬇️
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
    <div className="warehousein-detail-container">
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
      <div className="warehousein-detail-header">
        <button className="back-button" onClick={onBack}>
          ← 
        </button>
        <h2 className="detail-title">入库管理</h2>
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
              {project.timelines && project.timelines.warehouseTime > 0 && (
                <div className="info-item">
                  <span className="info-label">⏰ 入库出库周期</span>
                  <span className="info-value highlight-time">{project.timelines.warehouseTime} 天</span>
                </div>
              )}
              {remainingDays !== null && (
                <div className="info-item">
                  <span className="info-label">⏳ 剩余时间</span>
                  <span className={`info-value ${remainingDays <= 3 && remainingDays >= 0 ? 'urgent-time' : remainingDays < 0 ? 'overdue-time' : 'normal-time'}`}>
                    {remainingDays >= 0 ? `${remainingDays} 天` : `超期 ${Math.abs(remainingDays)} 天`}
                  </span>
                </div>
              )}
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
            '📊'
          )}

          {renderFileFolder(
            'engSection',
            '工程图纸',
            [...(project.engineeringDrawings || []), ...(project.engineeringDocuments || [])],
            '🛠️'
          )}

          {renderFileFolder(
            'purchaseSection',
            '采购清单',
            project.purchaseDocuments || [],
            '🛒'
          )}

          {renderFileFolder(
            'invoiceSection',
            '发票图片',
            project.invoiceDocuments || [],
            '📄'
          )}

          {renderFileFolder(
            'processingSection',
            '加工图片',
            project.processingImages || [],
            '⚙️'
          )}
        </div>

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
                <span className="status-text status-completed">✅ 已完成入库工作</span>
              </div>
              <div className="status-item">
                <span className="status-label">完成时间：</span>
                <span className="status-text">
                  {new Date(project.warehouseInCompletedTime).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">操作人：</span>
                <span className="status-text">{project.warehouseInCompletedBy}</span>
              </div>
              <div className="completion-notice">
                <p>✨ 此项目已推送到出库阶段</p>
              </div>
            </div>
          </div>
        )}

        {/* 入库说明 */}
        {!isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">ℹ️</span>
              <h3 className="section-title">入库说明</h3>
            </div>
            <div className="warehousein-notice">
              <p>📦 入库管理员无需上传文件或图片</p>
              <p>✅ 完成入库工作后，点击下方按钮推送到出库阶段即可</p>
            </div>
          </div>
        )}

        {/* 推送按钮 */}
        {!isCompleted && (
          <div className="push-section">
            <button className="btn-push-bottom" onClick={handlePushToNextStage}>
              ✅ 入库完成，推送到出库阶段
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
            <div className="success-message">入库完成！</div>
            <div className="success-submessage">项目已推送到出库阶段</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseInDetail;

