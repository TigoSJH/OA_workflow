import React, { useState, useEffect } from 'react';
import './PurchaseDetail.css';
import { projectAPI } from '../services/api';

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
  const [invoiceDocuments, setInvoiceDocuments] = useState(project.invoiceDocuments || []);

  // 文件夹展开/折叠状态
  const [expandedFolders, setExpandedFolders] = useState({
    rdSection: false,
    engSection: false,
    myUploadSection: false,
    teamUploadsSection: false,
    purchaseSection: false,
    invoiceSection: false
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

  // 合并已提交和未提交的文件用于显示
  const allMyFiles = [
    ...submittedFiles.map(f => ({ ...f, isSubmitted: true })),
    ...myUploadFiles.map(f => ({ ...f, isSubmitted: false }))
  ];

  // 压缩图片
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

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    for (let file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        alert('只能上传图片或PDF文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过10MB限制`);
        return;
      }
    }

    try {
      setUploading(true);
      
      const filePromises = selectedFiles.map(file => {
        if (file.type.startsWith('image/')) {
          return compressImage(file);
        } else {
          return processFile(file);
        }
      });
      const newFiles = await Promise.all(filePromises);
      
      if (isPrimaryLeader) {
        // 主负责人直接添加到采购文档
        setPurchaseDocuments([...purchaseDocuments, ...newFiles]);
      } else {
        // 普通成员添加到待提交列表
        setMyUploadFiles([...myUploadFiles, ...newFiles]);
      }

      setUploading(false);
    } catch (error) {
      setUploading(false);
      console.error('文件处理失败:', error.message);
    }

    e.target.value = '';
  };

  // 处理发票选择
  const handleInvoiceSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    for (let file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        alert('只能上传图片或PDF文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过10MB限制`);
        return;
      }
    }

    try {
      setUploading(true);
      
      const filePromises = selectedFiles.map(file => {
        if (file.type.startsWith('image/')) {
          return compressImage(file);
        } else {
          return processFile(file);
        }
      });
      const newFiles = await Promise.all(filePromises);
      
      setInvoiceDocuments([...invoiceDocuments, ...newFiles]);
      setUploading(false);
    } catch (error) {
      setUploading(false);
      console.error('文件处理失败:', error.message);
    }

    e.target.value = '';
  };

  // 删除文件
  const handleDeleteFile = (index, isSubmitted, category = 'purchase') => {
    if (isSubmitted) {
      alert('已提交的文件无法删除，请联系主负责人');
      return;
    }
    
    if (window.confirm('确认删除这个文件吗？')) {
      if (isPrimaryLeader) {
        if (category === 'purchase') {
          const newDocs = purchaseDocuments.filter((_, i) => i !== index);
          setPurchaseDocuments(newDocs);
        } else {
          const newDocs = invoiceDocuments.filter((_, i) => i !== index);
          setInvoiceDocuments(newDocs);
        }
      } else {
        const newFiles = myUploadFiles.filter((_, i) => i !== index);
        setMyUploadFiles(newFiles);
      }
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
    try {
      setLoading(true);
      
      const response = await projectAPI.updateProject(project.id, {
        purchaseCompleted: true,
        purchaseCompletedTime: new Date().toISOString(),
        purchaseCompletedBy: user.displayName || user.username,
        purchaseDocuments: purchaseDocuments,
        invoiceDocuments: invoiceDocuments
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

  // 下载文件
  const handleDownloadFile = (fileData) => {
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
  };

  // 渲染文件夹
  const renderFileFolder = (folderName, displayName, files, icon = '📁', canDelete = false, deleteHandler = null, category = 'purchase') => {
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
                {files.map((file, index) => {
                  const isImage = file.type && file.type.startsWith('image/');
                  
                  return (
                    <div key={index} className="file-item-compact">
                      <div 
                        className="file-preview-compact"
                        onClick={() => {
                          if (isImage) {
                            setPreviewImage(file);
                            setShowImagePreview(true);
                          }
                        }}
                      >
                        <div className="file-icon-mini">{isImage ? '🖼️' : '📄'}</div>
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
                            {file.isSubmitted && <span className="submitted-badge"> · ✅已提交</span>}
                          </div>
                        </div>
                      </div>
                      <div className="file-actions-compact">
                        {isImage && (
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
                        )}
                        <button 
                          className="btn-action-compact btn-download"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file);
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
            '📊'
          )}

          {renderFileFolder(
            'engSection',
            '工程图纸',
            [...(project.engineeringDrawings || []), ...(project.engineeringDocuments || [])],
            '🛠️'
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
              
              {isPrimaryLeader && (
                <div className="upload-group">
                  <input
                    type="file"
                    multiple
                    onChange={handleInvoiceSelect}
                    id="invoice-upload"
                    style={{ display: 'none' }}
                    accept="image/*,.pdf"
                  />
                  <label htmlFor="invoice-upload" className="upload-button">
                    📤 上传发票图片
                  </label>
                  <div className="upload-hint-inline">
                    支持图片、PDF格式，单个最大10MB
                  </div>
                </div>
              )}
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
                handleDeleteFile
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
                          <div className="member-files-preview">
                            {pendingFiles.slice(0, 3).map((file, idx) => {
                              const isImage = file.type && file.type.startsWith('image/');
                              return (
                                <div key={idx} className="file-preview-thumb">
                                  {isImage ? (
                                    <img 
                                      src={file.url || file.data} 
                                      alt={file.name}
                                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                  ) : (
                                    <div style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '4px' }}>
                                      📄
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {pendingFiles.length > 3 && (
                              <div className="more-files">+{pendingFiles.length - 3}</div>
                            )}
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
            'purchase'
          )}
          
          {/* 主负责人：发票文档 */}
          {isPrimaryLeader && invoiceDocuments.length > 0 && renderFileFolder(
            'invoiceSection',
            '发票图片',
            invoiceDocuments,
            '🧾',
            true,
            (index) => handleDeleteFile(index, false, 'invoice'),
            'invoice'
          )}
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

