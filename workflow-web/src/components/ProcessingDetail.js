import React, { useState } from 'react';
import './ProcessingDetail.css';
import { projectAPI, fileAPI } from '../services/api';

const ProcessingDetail = ({ project, user, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCompleted] = useState(!!project.processingCompleted);

  // 计算剩余天数
  const calculateRemainingDays = () => {
    if (!project.timelines || !project.timelines.processorTime) {
      return null;
    }

    const startTimeRaw = project.timelines.processorStartTime || project.purchaseCompletedTime;
    if (!startTimeRaw) return null;

    const startTime = new Date(startTimeRaw);
    const now = new Date();
    const elapsedDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const remainingDays = project.timelines.processorTime - elapsedDays;
    
    return remainingDays;
  };

  const remainingDays = calculateRemainingDays();

  // 文件夹展开/折叠状态
  const [expandedFolders, setExpandedFolders] = useState({
    rdSection: false,
    engSection: false
  });

  // 切换文件夹展开状态
  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // 推送到下一阶段（第一次入库）
  const handlePushToNextStage = async () => {
    try {
      setLoading(true);
      
      const response = await projectAPI.updateProject(project.id, {
        processingCompleted: true,
        processingCompletedTime: new Date().toISOString(),
        processingCompletedBy: user.displayName || user.username
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

  // 图片预览
  const handleImagePreview = async (imageData, stage) => {
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
      console.error('[加工预览] 失败:', error);
      alert('预览失败：' + error.message);
    }
  };

  // 下载图片
  const handleDownloadImage = async (imageData, stage) => {
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
  const renderFileFolder = (folderName, displayName, files, icon = '📁', stage) => {
    const isExpanded = expandedFolders[folderName];
    const fileCount = files ? files.length : 0;

    // 批量下载处理函数
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
    <div className="processing-detail-container">
      <div className="processing-detail-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <h2 className="detail-title">⚙️ 加工阶段 - {project.projectName}</h2>
      </div>

      <div className="engineering-detail-content">
        {/* 项目基本信息 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📋</span>
            <h3 className="section-title">项目信息</h3>
          </div>
          <div className="project-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">🏷️ 项目名称</span>
              <span className="info-value">{project.projectName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">📋 项目类型</span>
              <span className="info-value">
                {project.projectType === 'research' ? '🔬 研发项目' : '📄 合同项目'}
              </span>
            </div>
            {remainingDays !== null && (
              <div className="info-item">
                <span className="info-label">⏰ 剩余时间</span>
                <span className={`info-value ${remainingDays < 0 ? 'overdue' : remainingDays <= 3 ? 'warning' : ''}`}>
                  {remainingDays < 0 ? `已超期 ${Math.abs(remainingDays)} 天` : `${remainingDays} 天`}
                </span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">📅 采购完成时间</span>
              <span className="info-value">
                {project.purchaseCompletedTime 
                  ? new Date(project.purchaseCompletedTime).toLocaleString('zh-CN')
                  : '未记录'}
              </span>
            </div>
          </div>
          </div>
        </div>

        {/* 参考图纸 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📂</span>
            <h3 className="section-title">参考图纸</h3>
          </div>
          <div className="folders-container">
            {/* 研发图纸 */}
            {renderFileFolder(
              'rdSection',
              '研发图纸',
              [...(project.folderScreenshots || []), ...(project.drawingImages || [])],
              '🔬',
              'development'
            )}

            {/* 工程图纸 */}
            {renderFileFolder(
              'engSection',
              '工程图纸',
              project.engineeringDrawings || [],
              '🛠️',
              'engineering'
            )}
          </div>
        </div>

        {/* 推送按钮 */}
        {!isCompleted && (
          <div className="push-section">
            <button
              className="btn-push-bottom"
              onClick={handlePushToNextStage}
              disabled={loading}
            >
              {loading ? '推送中...' : '✅ 完成加工，推送到第一次入库'}
            </button>
          </div>
        )}

        {/* 完成状态 */}
        {isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">✅</span>
              <h3 className="section-title">加工状况</h3>
            </div>
            <div className="completion-info">
              <div className="status-item">
                <span className="status-label">完成状态：</span>
                <span className="status-text status-completed">✅ 已完成加工工作</span>
              </div>
              {project.processingCompletedTime && (
                <div className="status-item">
                  <span className="status-label">完成时间：</span>
                  <span className="status-text">
                    {new Date(project.processingCompletedTime).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {project.processingCompletedBy && (
                <div className="status-item">
                  <span className="status-label">完成人：</span>
                  <span className="status-text">{project.processingCompletedBy}</span>
                </div>
              )}
              <div className="completion-notice">
                <p>✨ 此项目已推送到第一次入库阶段</p>
              </div>
            </div>
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
                {previewImage.size && <p><strong>大小：</strong>{previewImage.size}</p>}
                {previewImage.uploadTime && (
                  <p><strong>上传时间：</strong>{new Date(previewImage.uploadTime).toLocaleString('zh-CN')}</p>
                )}
                {previewImage.uploadBy && <p><strong>上传人：</strong>{previewImage.uploadBy}</p>}
              </div>
              <button 
                className="btn-download-preview"
                onClick={() => handleDownloadImage(previewImage, previewImage.stage || 'processing')}
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
            <div className="success-message">推送成功！</div>
            <p style={{ margin: '16px 0 0 0', color: '#718096', fontSize: '14px' }}>项目已推送到第一次入库阶段</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingDetail;
