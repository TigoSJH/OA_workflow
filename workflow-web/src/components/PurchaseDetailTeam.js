import React, { useState } from 'react';
import './PurchaseDetail.css';
import { fileAPI } from '../services/api';

const PurchaseDetailTeam = ({ project, user, onBack }) => {
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isCompleted] = useState(!!project.purchaseCompleted);

  // 计算剩余天数
  const calculateRemainingDays = () => {
    if (!project.timelines || !project.timelines.purchaserTime) {
      return null;
    }

    const startTimeRaw = project.timelines.purchaserStartTime || project.engineeringCompletedTime;
    if (!startTimeRaw) return null;

    const startTime = new Date(startTimeRaw);
    const now = new Date();
    const elapsedDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const remainingDays = project.timelines.purchaserTime - elapsedDays;
    
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

  // 图片预览
  const handleImagePreview = async (imageData, stage) => {
    try {
      if (!stage) {
        console.error('[采购预览] 缺少stage参数');
        alert('预览失败：缺少阶段信息');
        return;
      }

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
      console.error('[采购预览] 失败:', error);
      alert('预览失败：' + error.message);
    }
  };

  // 下载图片
  const handleDownloadImage = async (imageData, stage) => {
    try {
      if (!stage) {
        console.error('[采购下载] 缺少stage参数');
        alert('下载失败：缺少阶段信息');
        return;
      }

      if (imageData.filename) {
        await fileAPI.downloadFile(stage, project.id, imageData.filename, project.projectName);
      } else {
        const dataUrl = imageData.url || imageData.data || imageData.preview;
        if (!dataUrl) {
          console.warn('该文件无法下载');
          return;
        }
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = imageData.name || 'file';
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
  const renderFileFolder = (folderName, displayName, files, icon, stage) => {
    const isExpanded = expandedFolders[folderName];
    const fileCount = files ? files.length : 0;

    const handleDownloadAll = async (e) => {
      e.stopPropagation();
      if (fileCount === 0) return;
      
      try {
        await fileAPI.downloadZip(stage, project.id, project.projectName, displayName);
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
    <div className="purchase-detail-container">
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>
          ← 返回
        </button>
        <h2>📦 采购阶段 - {project.projectName}</h2>
      </div>

      <div className="detail-content">
        {/* 项目基本信息 */}
        <div className="info-card">
          <h3>项目信息</h3>
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
              <span className="info-label">📅 工程完成时间</span>
              <span className="info-value">
                {project.engineeringCompletedTime 
                  ? new Date(project.engineeringCompletedTime).toLocaleString('zh-CN')
                  : '未记录'}
              </span>
            </div>
          </div>
        </div>

        {/* 参考图纸 */}
        <div className="files-section">
          <h3>📂 参考图纸</h3>
          <div className="folders-container">
            {/* 研发图纸 */}
            {renderFileFolder(
              'rdSection',
              '研发图纸',
              project.developmentDrawings || [],
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

        {/* 操作提示 */}
        <div className="action-section">
          <div className="info-box">
            <p>📢 采购流程说明：</p>
            <ul>
              <li>请根据工程图纸完成零部件采购</li>
              <li>零部件图片将由库管在第一次入库时上传</li>
              <li>采购完成后请联系主负责人推送到下一阶段</li>
            </ul>
          </div>
        </div>

        {/* 完成状态 */}
        {isCompleted && (
          <div className="actions">
            <div className="completed-badge">
              ✅ 采购已完成
              {project.purchaseCompletedTime && (
                <span className="completed-time">
                  {new Date(project.purchaseCompletedTime).toLocaleString('zh-CN')}
                </span>
              )}
              {project.purchaseCompletedBy && (
                <span className="completed-by">
                  完成人：{project.purchaseCompletedBy}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 图片预览模态框 */}
      {showImagePreview && previewImage && (
        <div className="image-preview-modal" onClick={() => setShowImagePreview(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="btn-close-preview" onClick={() => setShowImagePreview(false)}>
              ✕
            </button>
            <img 
              src={previewImage.url || previewImage.data || previewImage.preview} 
              alt={previewImage.name} 
            />
            <div className="preview-info">
              <span className="preview-name">{previewImage.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseDetailTeam;
