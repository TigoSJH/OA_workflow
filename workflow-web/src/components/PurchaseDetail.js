import React, { useState, useEffect } from 'react';
import './PurchaseDetail.css';
import { projectAPI, fileAPI } from '../services/api';
import { smartCompressMultiple } from '../utils/imageCompressor';

const PurchaseDetail = ({ project, user, onBack }) => {
  // 采购清单与发票图片
  const [purchaseDocuments, setPurchaseDocuments] = useState(project.purchaseDocuments || []);
  const [invoiceDocuments, setInvoiceDocuments] = useState(project.invoiceDocuments || []);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!!project.purchaseCompleted);

  // 计算剩余天数
  const calculateRemainingDays = () => {
    if (!project.timelines || !project.timelines.purchaserTime) {
      return null;
    }

    // 优先使用采购开始时间；没有则回退到工程完成时间
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
    rdSection: false, // 研发图纸文件夹
    engSection: false, // 工程图纸文件夹
    purchaseSection: false // 采购清单文件夹
  });

  // 切换文件夹展开状态
  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // 当 project 变化时，更新状态
  useEffect(() => {
    setPurchaseDocuments(project.purchaseDocuments || []);
    setInvoiceDocuments(project.invoiceDocuments || []);
    setIsCompleted(!!project.purchaseCompleted);
  }, [project]);

  // 压缩图片
  // 文件上传辅助函数 - 上传到文件系统
  const uploadFilesToServer = async (files) => {
    try {
      const response = await fileAPI.uploadMultipleFiles(
        files,
        project.id,
        project.projectName,
        'purchase'
      );
      return response.files;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  };

  // 处理上传（通用）
  const handleUploadCommon = async (e, targetSetter, currentList) => {
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
      
      console.log(`[采购上传] 准备上传 ${selectedFiles.length} 个文件，正在压缩...`);
      
      // 智能压缩图片（只压缩大于1MB的图片）
      const compressedFiles = await smartCompressMultiple(selectedFiles, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        threshold: 1  // 超过1MB才压缩
      });
      
      console.log('[采购上传] 压缩完成，开始上传到服务器...');
      
      // 上传文件到文件系统
      const uploadedFiles = await uploadFilesToServer(compressedFiles);
      const updatedFiles = [...currentList, ...uploadedFiles];
      targetSetter(updatedFiles);

      setUploading(false);
      console.log('[采购上传] 文件上传成功，已保存到F盘');
    } catch (error) {
      setUploading(false);
      console.error('[采购上传] 图片处理失败:', error.message);
      alert('上传失败：' + error.message);
    }

    e.target.value = '';
  };

  // 处理采购清单上传
  const handlePurchaseDocumentSelect = async (e) => {
    await handleUploadCommon(e, setPurchaseDocuments, purchaseDocuments);
  };

  // 处理发票图片上传
  const handleInvoiceDocumentSelect = async (e) => {
    await handleUploadCommon(e, setInvoiceDocuments, invoiceDocuments);
  };

  // 删除采购清单图片
  const handleDeletePurchaseDocument = async (index) => {
    try {
      // 显示删除中提示
      const toast = document.createElement('div');
      toast.textContent = '🗑️ 正在删除...';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.2s ease-in-out;
      `;
      document.body.appendChild(toast);
      
      const fileToDelete = purchaseDocuments[index];
      const newDocs = purchaseDocuments.filter((_, i) => i !== index);
      
      // 删除服务器上的文件
      if (fileToDelete.filename) {
        await fileAPI.deleteFile('purchase', project.id, fileToDelete.filename, project.projectName);
      }
      
      // 更新数据库
      await projectAPI.updateProject(project.id, {
        purchaseDocuments: newDocs,
        invoiceDocuments: invoiceDocuments
      });
      
      // 更新本地状态
      setPurchaseDocuments(newDocs);
      
      // 1秒后移除提示
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败：' + error.message);
    }
  };

  // 删除发票图片
  const handleDeleteInvoiceDocument = async (index) => {
    try {
      // 显示删除中提示
      const toast = document.createElement('div');
      toast.textContent = '🗑️ 正在删除...';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.2s ease-in-out;
      `;
      document.body.appendChild(toast);
      
      const fileToDelete = invoiceDocuments[index];
      const newDocs = invoiceDocuments.filter((_, i) => i !== index);
      
      // 删除服务器上的文件
      if (fileToDelete.filename) {
        await fileAPI.deleteFile('purchase', project.id, fileToDelete.filename, project.projectName);
      }
      
      // 更新数据库
      await projectAPI.updateProject(project.id, {
        purchaseDocuments: purchaseDocuments,
        invoiceDocuments: newDocs
      });
      
      // 更新本地状态
      setInvoiceDocuments(newDocs);
      
      // 1秒后移除提示
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败：' + error.message);
    }
  };

  // 推送到下一阶段
  const handlePushToNextStage = async () => {
    // 没有任何采购相关图片时，直接显示推送浮窗（不再阻止）
    try {
      setLoading(true);
      
      console.log('开始推送到下一阶段，采购清单:', purchaseDocuments.length, '发票:', invoiceDocuments.length);
      
      // 保存到数据库
      const response = await projectAPI.updateProject(project.id, {
        purchaseCompleted: true,
        purchaseCompletedTime: new Date().toISOString(),
        purchaseCompletedBy: user.displayName || user.username,
        purchaseDocuments: purchaseDocuments,
        invoiceDocuments: invoiceDocuments
      });

      console.log('推送成功:', response);
      setLoading(false);
      
      // 显示成功提示并更新本地完成状态，立刻锁定上传区域
      setShowSuccessModal(true);
      setIsCompleted(true);
      
      // 1秒后返回首页并刷新列表
      setTimeout(() => {
        setShowSuccessModal(false);
        // 先返回，让父组件重新加载项目列表
        onBack();
      }, 1000);
    } catch (error) {
      setLoading(false);
      console.error('推进下一阶段失败:', error);
    }
  };

  // 处理图片预览（支持指定stage）
  const handleImagePreview = async (imageData, stage = 'purchase') => {
    try {
      // 如果是新文件系统（有filename），使用fetch获取并转换为blob URL
      if (imageData.filename) {
        console.log('[采购预览] stage:', stage, 'filename:', imageData.filename);
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
        setPreviewImage(blobUrl);
      } else {
        // 兼容旧的Base64数据
        const dataUrl = imageData.url || imageData.data || imageData.preview;
        setPreviewImage(dataUrl);
      }
      setShowImagePreview(true);
    } catch (error) {
      console.error('[采购预览] 失败:', error);
      alert('预览失败：' + error.message);
    }
  };

  // 下载图片（支持指定stage）
  const handleDownloadImage = async (imageData, stage = 'purchase') => {
    try {
      // 如果是新文件系统（有filename），使用API下载
      if (imageData.filename) {
        await fileAPI.downloadFile(stage, project.id, imageData.filename, project.projectName);
      } else {
        // 兼容旧的Base64数据
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

  // 渲染文件夹（通用，支持指定stage）
  const renderFileFolder = (folderName, displayName, files, icon = '📁', canDelete = false, stage = 'purchase') => {
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
                      {canDelete && !isCompleted && (
                        <button 
                          className="btn-action-simple btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePurchaseDocument(index);
                          }}
                          title="删除"
                        >
                          🗑️
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

  // 渲染采购清单分组（顶层 + 两个子文件夹）
  const renderPurchaseGroup = () => {
    const groupCount = (purchaseDocuments?.length || 0) + (invoiceDocuments?.length || 0);
    if (groupCount === 0) return null; // 未上传前不显示

    const isExpanded = expandedFolders['purchaseSection'];
    return (
      <div className="file-folder">
        <div
          className="folder-header"
          onClick={() => toggleFolder('purchaseSection')}
          style={{ cursor: 'pointer' }}
        >
          <span className="folder-icon">{isExpanded ? '📂' : '🗂️'}</span>
          <span className="folder-name">采购清单</span>
          <span className="file-count">({groupCount} 个文件)</span>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
        {isExpanded && (
          <div className="folder-content">
            {renderFileFolder('purchaseListSub', '采购清单图片', purchaseDocuments, '📃', true, 'purchase')}
            {renderFileFolder('invoiceListSub', '发票图片', invoiceDocuments, '🧾', true, 'purchase')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="purchase-detail-container">
      {/* Loading覆盖层 */}
      {(loading || uploading) && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <img src="/loading.png" alt="Loading" className="loading-image" />
            <p>{loading ? '处理中...' : '上传中...'}</p>
          </div>
        </div>
      )}

      {/* 顶部导航 */}
      <div className="purchase-detail-header">
        <button className="back-button" onClick={onBack}>
          ← 
        </button>
        <h2 className="detail-title">采购管理</h2>
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
              {project.timelines && project.timelines.purchaserTime > 0 && (
                <div className="info-item">
                  <span className="info-label">⏰ 采购周期</span>
                  <span className="info-value highlight-time">{project.timelines.purchaserTime} 天</span>
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

        {/* 图纸文件 - 统一顶层文件夹 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📁</span>
            <h3 className="section-title">图纸文件</h3>
          </div>

          {/* 研发图纸文件夹 */}
          {renderFileFolder(
            'rdSection',
            '研发图纸',
            // 兼容老数据（folderScreenshots/drawingImages）与新字段（developmentDrawings）
            project.developmentDrawings && project.developmentDrawings.length > 0
              ? project.developmentDrawings
              : ([...(project.folderScreenshots || []), ...(project.drawingImages || [])]),
            '📊',
            false,
            'development'
          )}

          {/* 工程图纸文件夹 */}
          {renderFileFolder(
            'engSection',
            '工程图纸',
            [...(project.engineeringDrawings || []), ...(project.engineeringDocuments || [])],
            '🛠️',
            false,
            'engineering'
          )}
        </div>

        {/* 采购清单 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📝</span>
            <h3 className="section-title">采购清单</h3>
          </div>

          {/* 上传区域（未完成时显示） */}
          {!isCompleted && (
            <div className="upload-actions-area two-columns">
              <div className="upload-group">
                <input
                  type="file"
                  multiple
                  onChange={handlePurchaseDocumentSelect}
                  id="purchase-document-upload"
                  style={{ display: 'none' }}
                  accept="image/*"
                />
                <label htmlFor="purchase-document-upload" className="upload-button">
                  📤 上传采购清单图片
                </label>
                <div className="upload-hint-inline">
                  支持JPG、PNG、GIF、WebP格式，单张最大5MB
                </div>
              </div>

              <div className="upload-group">
                <input
                  type="file"
                  multiple
                  onChange={handleInvoiceDocumentSelect}
                  id="invoice-document-upload"
                  style={{ display: 'none' }}
                  accept="image/*"
                />
                <label htmlFor="invoice-document-upload" className="upload-button secondary">
                  🧾 上传发票图片
                </label>
                <div className="upload-hint-inline">
                  支持JPG、PNG、GIF、WebP格式，单张最大5MB
                </div>
              </div>
            </div>
          )}

          {/* 采购清单分组：仅在有图片时显示 */}
          {renderPurchaseGroup()}
        </div>

        {/* 底部操作栏（未完成时才显示推送按钮） */}
        {!isCompleted && (
          <div className="footer-actions">
            <button className="btn-push-bottom" onClick={handlePushToNextStage}>
              ➡️ 推送到下一阶段
            </button>
          </div>
        )}

        {/* 采购状况 */}
        {isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">✅</span>
              <h3 className="section-title">采购状况</h3>
            </div>
            <div className="completion-info">
              <div className="status-item">
                <span className="status-label">完成状态：</span>
                <span className="status-text status-completed">✅ 已完成采购工作</span>
              </div>
              <div className="status-item">
                <span className="status-label">完成时间：</span>
                <span className="status-text">
                  {new Date(project.purchaseCompletedTime).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">负责人：</span>
                <span className="status-text">{project.purchaseCompletedBy}</span>
              </div>
              <div className="completion-notice">
                <p>✨ 此项目已推送到下一阶段...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 图片预览模态框 */}
      {showImagePreview && (
        <div className="image-modal-overlay" onClick={() => setShowImagePreview(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowImagePreview(false)}>
              ✕
            </button>
            <img src={previewImage} alt="预览" className="preview-image" />
          </div>
        </div>
      )}

      {/* 成功提示模态框 */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon">✅</div>
            <div className="success-message">采购完成！</div>
            <div className="success-submessage">项目已推送到下一阶段</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseDetail;
