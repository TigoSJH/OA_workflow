import React, { useState, useEffect } from 'react';
import './PurchaseDetail.css';
import { projectAPI, fileAPI } from '../services/api';

const PurchaseDetailTeam = ({ project, user, onBack }) => {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSubmittingModal, setShowSubmittingModal] = useState(false);
  const [showIntegratingModal, setShowIntegratingModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!!project.purchaseCompleted);

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
  
  // 判断当前用户是否为采购主负责人
  const isPrimaryLeader = user.isPrimaryLeader && 
                         user.primaryLeaderRoles && 
                         user.primaryLeaderRoles.includes('purchaser');
  
  // 普通采购人员的临时上传文件（提交前）
  const [myUploadFiles, setMyUploadFiles] = useState([]);
  // 已提交的文件
  const [submittedFiles, setSubmittedFiles] = useState([]);
  
  // 主负责人整合后的采购文档
  const [purchaseDocuments, setPurchaseDocuments] = useState(project.purchaseDocuments || []);

  // 文件夹展开/折叠状态
  const [expandedFolders, setExpandedFolders] = useState({
    rdSection: false,
    engSection: false,
    myUploadSection: false,
    teamUploadsSection: false,
    purchaseSection: false
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
    setIsCompleted(!!project.purchaseCompleted);
    
    // 如果是普通采购人员，加载之前上传的内容
    if (!isPrimaryLeader && project.teamMemberPurchaseUploads) {
      const userId = String(user._id || user.id);
      const myPreviousUpload = project.teamMemberPurchaseUploads.find(
        upload => String(upload.uploaderId) === userId
      );
      
      if (myPreviousUpload && myPreviousUpload.files) {
        setSubmittedFiles(myPreviousUpload.files);
      } else {
        setSubmittedFiles([]);
      }
    }
  }, [project, isPrimaryLeader, user._id, user.id]);

  // 页面卸载时清理未提交的文件
  useEffect(() => {
    return () => {
      // 组件卸载时，如果有未提交的文件，删除它们
      if (myUploadFiles.length > 0 && !isPrimaryLeader) {
        console.log('[采购] 页面退出，清理未提交文件:', myUploadFiles.length, '个');
        myUploadFiles.forEach(async (file) => {
          if (file.filename) {
            try {
              await fileAPI.deleteFile('purchase', project.id, file.filename, project.projectName);
              console.log('[采购] 已清理F盘文件:', file.filename);
            } catch (error) {
              console.error('[采购] 清理文件失败:', file.filename, error);
            }
          }
        });
      }
    };
  }, [myUploadFiles, isPrimaryLeader, project.id, project.projectName]);

  // 合并已提交和未提交的文件用于显示
  const allMyFiles = [
    ...submittedFiles.map(f => ({ ...f, isSubmitted: true })),
    ...myUploadFiles.map(f => ({ ...f, isSubmitted: false }))
  ];

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

  // 压缩图片（已弃用，改用文件系统上传）
  const compressImage = (file, maxWidth = 1920, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            const compressedReader = new FileReader();
            compressedReader.onloadend = () => {
              resolve({
                name: file.name,
                data: compressedReader.result,
                url: compressedReader.result,
                size: (blob.size / 1024).toFixed(2) + ' KB',
                type: 'image/jpeg',
                uploadTime: new Date().toISOString(),
                uploadBy: user.displayName || user.username
              });
            };
            compressedReader.readAsDataURL(blob);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 处理文档/图片文件
  const processFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          name: file.name,
          data: e.target.result,
          url: e.target.result,
          size: (file.size / 1024).toFixed(2) + ' KB',
          type: file.type,
          uploadTime: new Date().toISOString(),
          uploadBy: user.displayName || user.username
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 处理文件选择（采购清单）
  const handlePurchaseDocumentSelect = async (e) => {
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
      
      // 上传文件到文件系统
      const uploadedFiles = await uploadFilesToServer(selectedFiles);
      
      if (isPrimaryLeader) {
        // 主负责人直接添加到采购文档
        const updatedFiles = [...purchaseDocuments, ...uploadedFiles];
        setPurchaseDocuments(updatedFiles);
        
        // 保存到数据库
        try {
          await projectAPI.updateProject(project.id, {
            purchaseDocuments: updatedFiles
          });
        } catch (dbError) {
          // 数据库保存失败，删除已上传的文件
          console.error('数据库保存失败，清理文件:', dbError);
          for (const file of uploadedFiles) {
            try {
              await fileAPI.deleteFile('purchase', project.id, file.filename, project.projectName);
            } catch (delError) {
              console.error('清理文件失败:', delError);
            }
          }
          throw new Error('保存失败：' + dbError.message);
        }
      } else {
        // 普通成员添加到待提交列表（文件已上传到服务器）
        setMyUploadFiles([...myUploadFiles, ...uploadedFiles]);
      }

      setUploading(false);
    } catch (error) {
      setUploading(false);
      console.error('文件处理失败:', error.message);
      alert('上传失败：' + error.message);
    }

    e.target.value = '';
  };

  // 发票上传已取消（仅保留采购清单）

  // 删除文件
  const handleDeleteFile = async (index, isSubmitted, category = 'purchase') => {
    if (isSubmitted) {
      alert('已提交的文件无法删除，请联系主负责人');
      return;
    }
    
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
      
      if (isPrimaryLeader) {
        const fileToDelete = purchaseDocuments[index];
        const newDocs = purchaseDocuments.filter((_, i) => i !== index);
        
        // 先更新数据库
        await projectAPI.updateProject(project.id, {
          purchaseDocuments: newDocs
        });
        
        // 数据库更新成功后，删除文件系统中的文件
        if (fileToDelete.filename) {
          await fileAPI.deleteFile('purchase', project.id, fileToDelete.filename, project.projectName);
        }
        
        setPurchaseDocuments(newDocs);
      } else {
        const fileToDelete = myUploadFiles[index];
        const newFiles = myUploadFiles.filter((_, i) => i !== index);
        
        // 删除文件系统中的文件（普通成员未提交的文件）
        if (fileToDelete.filename) {
          await fileAPI.deleteFile('purchase', project.id, fileToDelete.filename, project.projectName);
        }
        
        setMyUploadFiles(newFiles);
      }
      
      // 1秒后移除提示
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败：' + error.message);
    }
  };

  // 普通成员提交给主负责人
  const handleSubmitToLeader = async () => {
    if (myUploadFiles.length === 0) {
      alert('请先上传文件');
      return;
    }
    
    try {
      setShowSubmittingModal(true);
      
      // 调用团队成员上传API，传递purchaser角色
      await projectAPI.uploadTeamMemberFiles(project.id, myUploadFiles, 'purchaser');
      
      // 1秒后返回首页
      setTimeout(() => {
        setShowSubmittingModal(false);
        setMyUploadFiles([]);
        onBack();
      }, 1000);
    } catch (error) {
      console.error('提交失败：', error.message);
      setShowSubmittingModal(false);
      alert('提交失败：' + error.message);
    }
  };

  // 整合团队成员的文件（主负责人）
  const handleIntegrateMemberFiles = async (memberUpload) => {
    try {
      setShowIntegratingModal(true);
      
      const pendingFiles = memberUpload.files.filter(file => !file.integratedAt);
      
      if (pendingFiles.length === 0) {
        setShowIntegratingModal(false);
        alert('没有待整合的文件');
        return;
      }
      
      // 整合到采购文档中
      const newDocs = [...purchaseDocuments, ...pendingFiles];
      
      // 保存到数据库
      await projectAPI.updateProject(project.id, {
        purchaseDocuments: newDocs
      });
      
      // 标记这些文件为已整合
      const updatedFiles = memberUpload.files.map(file => ({
        ...file,
        integratedAt: file.integratedAt || new Date().toISOString(),
        integratedBy: file.integratedBy || (user.displayName || user.username)
      }));
      
      // 更新团队成员上传记录，传递purchaser角色
      await projectAPI.updateTeamMemberUploadStatus(
        project.id, 
        memberUpload.uploaderId,
        updatedFiles,
        'purchaser'
      );
      
      // 立即更新本地状态
      setPurchaseDocuments(newDocs);
      
      // 1秒后刷新
      setTimeout(() => {
        setShowIntegratingModal(false);
        onBack();
      }, 1000);
      
    } catch (error) {
      console.error('整合失败:', error.message);
      setShowIntegratingModal(false);
      alert('整合失败：' + error.message);
    }
  };

  // 推送到下一阶段（仅主负责人）
  const handlePushToNextStage = async () => {
    if (purchaseDocuments.length === 0) {
      alert('请至少上传一个文件后再推进到下一阶段');
      return;
    }
    
    try {
      setLoading(true);
      
      // 1. 先复制文件从 purchase 到 processing
      console.log('[推送] 开始复制文件到加工阶段...');
      const copyResult = await fileAPI.copyToStage(
        project.id,
        project.projectName,
        purchaseDocuments,
        'purchase',
        'processing'
      );
      console.log('[推送] 文件复制结果:', copyResult);
      
      // 2. 保存到数据库
      const response = await projectAPI.updateProject(project.id, {
        purchaseCompleted: true,
        purchaseCompletedTime: new Date().toISOString(),
        purchaseCompletedBy: user.displayName || user.username,
        purchaseDocuments: purchaseDocuments
      });

      console.log('推送成功:', response);
      setLoading(false);
      setShowSuccessModal(true);
      setIsCompleted(true);
      
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
  const handleImagePreview = async (imageData, stage = 'purchase') => {
    try {
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
        // 保留文件信息，但使用 blob URL
        setPreviewImage({
          ...imageData,
          url: blobUrl,
          data: blobUrl,
          preview: blobUrl
        });
      } else {
        // 兼容旧的Base64数据
        setPreviewImage(imageData);
      }
      setShowImagePreview(true);
    } catch (error) {
      console.error('[采购预览] 失败:', error);
      alert('预览失败：' + error.message);
    }
  };

  // 下载文件
  const handleDownloadFile = async (fileData, stage = 'purchase') => {
    try {
      if (fileData.filename) {
        await fileAPI.downloadFile(stage, project.id, fileData.filename, project.projectName);
      } else {
        // 兼容旧的Base64数据
        const dataUrl = fileData.url || fileData.data || fileData.preview;
        if (!dataUrl) {
          console.warn('该文件无法下载');
          return;
        }
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileData.name || 'file';
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
  const renderFileFolder = (folderName, displayName, files, icon = '📁', canDelete = false, deleteHandler = null, category = 'purchase', stage = 'purchase') => {
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
                {files.map((file, index) => {
                  // 采购阶段默认都是图片，所以即使没有 type 字段也当作图片处理
                  const isImage = !file.type || file.type.startsWith('image/');
                  
                  return (
                    <div 
                      key={index} 
                      className="file-item-simple"
                      onClick={() => {
                        if (isImage) {
                          handleImagePreview(file, stage);
                        }
                      }}
                    >
                      <div className="file-info-simple">
                        <div className="file-name-simple">
                          {file.name}
                          {file.isSubmitted && <span className="submitted-badge"> · ✅已提交</span>}
                        </div>
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
                        {isImage && (
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
                        )}
                        <button 
                          className="btn-action-simple btn-download"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file, stage);
                          }}
                          title="下载"
                        >
                          ⬇️
                        </button>
                        {canDelete && !isCompleted && deleteHandler && !file.isSubmitted && (
                          <button 
                            className="btn-action-compact btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHandler(index, file.isSubmitted, category);
                            }}
                            title="删除"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

        {/* 图纸文件 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📁</span>
            <h3 className="section-title">图纸文件</h3>
          </div>

          {renderFileFolder(
            'rdSection',
            '研发图纸',
            project.developmentDrawings && project.developmentDrawings.length > 0
              ? project.developmentDrawings
              : ([...(project.folderScreenshots || []), ...(project.drawingImages || [])]),
            '📊',
            false,
            null,
            'purchase',
            'development'
          )}

          {renderFileFolder(
            'engSection',
            '工程图纸',
            [...(project.engineeringDrawings || []), ...(project.engineeringDocuments || [])],
            '🛠️',
            false,
            null,
            'purchase',
            'engineering'
          )}
        </div>

        {/* 采购文档 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📝</span>
            <h3 className="section-title">采购清单</h3>
          </div>

          {/* 上传区域 */}
          {!isCompleted && (
            <div className="upload-actions-area two-columns">
              <div className="upload-group">
                <input
                  type="file"
                  multiple
                  onChange={handlePurchaseDocumentSelect}
                  id="purchase-upload"
                  style={{ display: 'none' }}
                  accept="image/*,.pdf"
                />
                <label htmlFor="purchase-upload" className="upload-button">
                  📤 {isPrimaryLeader ? '上传采购清单（主负责人）' : '上传采购清单'}
                </label>
                <div className="upload-hint-inline">
                  支持图片、PDF格式，单个最大10MB
                </div>
              </div>
            </div>
          )}

          {/* 普通成员：我的上传 */}
          {!isPrimaryLeader && allMyFiles.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              {renderFileFolder(
                'myUploadSection',
                '我的上传',
                allMyFiles,
                '📤',
                true,
                handleDeleteFile,
                'purchase',
                'purchase'
              )}
              
              {!isCompleted && myUploadFiles.length > 0 && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button
                    className="btn-push-bottom"
                    onClick={handleSubmitToLeader}
                    disabled={loading}
                  >
                    {loading ? '提交中...' : `✅ 确认提交给主负责人 (${myUploadFiles.length} 个新文件)`}
                  </button>
                  <p className="submit-hint">
                    请确认文件无误后再提交，提交后由主负责人统一整合并推送
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* 主负责人：团队成员上传区域 */}
          {isPrimaryLeader && project.teamMemberPurchaseUploads && project.teamMemberPurchaseUploads.length > 0 && (() => {
            const pendingMembers = project.teamMemberPurchaseUploads.filter(upload => 
              upload.files.some(file => !file.integratedAt)
            );
            const integratedMembers = project.teamMemberPurchaseUploads.filter(upload => 
              upload.files.every(file => file.integratedAt)
            );
            
            return (
              <div className="team-uploads-section">
                {pendingMembers.length > 0 && (
                  <>
                    <div className="team-uploads-header">
                      <h4 className="team-uploads-title">👥 团队成员上传的文件（待整合）</h4>
                      <span className="team-uploads-count">
                        {pendingMembers.length} 个成员待整合
                      </span>
                    </div>
                    
                    {pendingMembers.map((memberUpload, index) => {
                      const pendingFiles = memberUpload.files.filter(file => !file.integratedAt);
                      
                      return (
                        <div key={index} className="member-upload-card">
                          <div className="member-upload-header">
                            <div className="member-info">
                              <span className="member-icon">👤</span>
                              <span className="member-name">{memberUpload.uploaderName}</span>
                              <span className="upload-time">
                                {new Date(memberUpload.uploadTime).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            <span className="member-status pending">
                              ⏳ 待整合 ({pendingFiles.length} 个新文件)
                            </span>
                          </div>
                          
                          {/* 文件列表 */}
                          <div className="member-files-list">
                            {pendingFiles.map((file, fileIndex) => (
                              <div 
                                key={fileIndex} 
                                className="member-file-item-compact"
                                onClick={() => handleImagePreview(file, 'purchase')}
                                style={{ cursor: 'pointer' }}
                              >
                                <span className="file-icon">📄</span>
                                <div className="file-name-info">
                                  <span className="file-name">{file.name}</span>
                                  <span className="file-size">{file.size}</span>
                                </div>
                                <button 
                                  className="btn-preview-small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleImagePreview(file, 'purchase');
                                  }}
                                  title="预览"
                                >
                                  👁️
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <div className="member-actions">
                            <button
                              className="btn-integrate"
                              onClick={() => handleIntegrateMemberFiles(memberUpload)}
                            >
                              ✅ 整合到采购清单 ({pendingFiles.length} 个)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                
                {integratedMembers.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ 
                      padding: '10px 15px', 
                      background: '#f0f9ff', 
                      borderRadius: '8px',
                      color: '#52c41a',
                      fontSize: '14px'
                    }}>
                      ✅ 已整合 {integratedMembers.length} 个成员的文件
                      （{integratedMembers.map(m => m.uploaderName).join('、')}）
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 主负责人：已整合的采购文档 */}
          {isPrimaryLeader && purchaseDocuments.length > 0 && renderFileFolder(
            'purchaseSection',
            '采购清单（已整合）',
            purchaseDocuments,
            '📄',
            true,
            (index) => handleDeleteFile(index, false, 'purchase'),
            'purchase',
            'purchase'
          )}
          
          {/* 发票图片功能已取消 */}
        </div>

        {/* 推送按钮 - 只有主负责人可以推送 */}
        {!isCompleted && isPrimaryLeader && (
          <div className="push-section">
            <button className="btn-push-bottom" onClick={handlePushToNextStage}>
              ➡️ 推送到加工阶段
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
                <p>✨ 此项目已推送到加工阶段</p>
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
                <p><strong>大小：</strong>{previewImage.size}</p>
                {previewImage.uploadTime && (
                  <p><strong>上传时间：</strong>{new Date(previewImage.uploadTime).toLocaleString('zh-CN')}</p>
                )}
                {previewImage.uploadBy && <p><strong>上传人：</strong>{previewImage.uploadBy}</p>}
              </div>
              <button 
                className="btn-download-preview"
                onClick={() => handleDownloadFile(previewImage)}
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
            <div className="success-message">采购完成！</div>
            <div className="success-submessage">项目已推送到加工阶段</div>
          </div>
        </div>
      )}

      {/* 提交中模态框 */}
      {showSubmittingModal && (
        <div className="success-modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon">📤</div>
            <div className="success-message">提交成功！</div>
            <div className="success-submessage">已提交给主负责人</div>
          </div>
        </div>
      )}

      {/* 整合中模态框 */}
      {showIntegratingModal && (
        <div className="success-modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon">✅</div>
            <div className="success-message">整合成功！</div>
            <div className="success-submessage">已整合团队成员上传的文件</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseDetailTeam;

