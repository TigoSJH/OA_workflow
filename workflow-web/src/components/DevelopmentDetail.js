import React, { useState, useEffect } from 'react';
import './DevelopmentDetail.css';
import { projectAPI, fileAPI } from '../services/api';

const DevelopmentDetail = ({ project, user, onBack, onRefresh }) => {
  // 合并所有研发图纸到一个数组
  const [developmentDrawings, setDevelopmentDrawings] = useState([
    ...(project.folderScreenshots || []),
    ...(project.drawingImages || [])
  ]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSubmittingModal, setShowSubmittingModal] = useState(false);
  const [showIntegratingModal, setShowIntegratingModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!!project.developmentCompleted);

  // 计算剩余天数
  const calculateRemainingDays = () => {
    if (!project.timelines || !project.timelines.researcherTime) {
      return null;
    }

    // 优先使用研发开始时间；没有则回退到时间周期设置时间或批准时间
    const startTimeRaw = project.timelines.researcherStartTime || project.scheduleSetTime || project.approvalTime;
    if (!startTimeRaw) return null;

    const startTime = new Date(startTimeRaw);
    const now = new Date();
    const elapsedDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const remainingDays = project.timelines.researcherTime - elapsedDays;
    
    return remainingDays;
  };

  const remainingDays = calculateRemainingDays();
  
  // 判断当前用户是否为研发主负责人
  const isPrimaryLeader = user.isPrimaryLeader && 
                         user.primaryLeaderRoles && 
                         user.primaryLeaderRoles.includes('researcher');
  
  // 普通研发人员的临时上传文件（提交前）
  const [myUploadFiles, setMyUploadFiles] = useState([]);
  // 已提交的文件
  const [submittedFiles, setSubmittedFiles] = useState([]);
  
  // 文件夹展开/折叠状态
  const [expandedFolders, setExpandedFolders] = useState({
    rdSection: false, // 研发图纸文件夹
    myUploadSection: false, // 我的上传（普通成员）
    teamUploadsSection: false // 团队成员上传文件夹
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
    setDevelopmentDrawings([
      ...(project.folderScreenshots || []),
      ...(project.drawingImages || [])
    ]);
    setIsCompleted(!!project.developmentCompleted);
    
    // 如果是普通研发人员，加载之前上传的内容
    if (!isPrimaryLeader && project.teamMemberUploads) {
      console.log('=== 加载团队成员上传记录 ===');
      console.log('当前用户ID:', user._id || user.id);
      console.log('团队上传记录:', project.teamMemberUploads);
      
      const userId = String(user._id || user.id);
      const myPreviousUpload = project.teamMemberUploads.find(
        upload => {
          console.log('比对 uploaderId:', upload.uploaderId, '与用户ID:', userId);
          return String(upload.uploaderId) === userId;
        }
      );
      
      console.log('找到的上传记录:', myPreviousUpload);
      
      if (myPreviousUpload && myPreviousUpload.files) {
        console.log('设置已提交文件:', myPreviousUpload.files);
        setSubmittedFiles(myPreviousUpload.files);
      } else {
        console.log('未找到上传记录，清空已提交文件');
        setSubmittedFiles([]);
      }
    }
  }, [project, isPrimaryLeader, user._id, user.id]);

  // 页面卸载时清理未提交的文件
  useEffect(() => {
    return () => {
      // 组件卸载时，如果有未提交的文件，删除它们
      if (myUploadFiles.length > 0 && !isPrimaryLeader) {
        console.log('[研发] 页面退出，清理未提交文件:', myUploadFiles.length, '个');
        myUploadFiles.forEach(async (file) => {
          if (file.filename) {
            try {
              await fileAPI.deleteFile('development', project.id, file.filename, project.projectName);
              console.log('[研发] 已清理F盘文件:', file.filename);
            } catch (error) {
              console.error('[研发] 清理文件失败:', file.filename, error);
            }
          }
        });
      }
    };
  }, [myUploadFiles, isPrimaryLeader, project.id, project.projectName]);

  // 合并已提交和未提交的文件用于显示，添加状态标记
  const allMyFiles = [
    ...submittedFiles.map(file => ({ ...file, status: 'submitted' })),
    ...myUploadFiles.map(file => ({ ...file, status: 'pending' }))
  ];

  // 文件上传辅助函数 - 上传到文件系统
  const uploadFilesToServer = async (files) => {
    try {
      const response = await fileAPI.uploadMultipleFiles(
        files,
        project.id,
        project.projectName,
        'development'
      );
      return response.files;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  };

  // 普通研发人员上传文件（先存到本地状态）
  const handleTeamMemberUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    // 验证文件 - 只允许图片
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        alert('只能上传图片文件（JPG、PNG、GIF、WebP）');
        return;
      }
      // 检查文件大小（最大20MB）
      if (file.size > 20 * 1024 * 1024) {
        alert(`图片 ${file.name} 超过20MB限制`);
        return;
      }
    }

    try {
      setUploading(true);
      
      // 直接保存文件对象到本地状态（不压缩）
      const fileObjects = selectedFiles.map(file => ({
        file: file,  // 保存原始文件对象
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        uploadTime: new Date().toISOString(),
        uploadBy: user.displayName || user.username,
        preview: URL.createObjectURL(file)  // 创建临时预览URL
      }));
      
      setMyUploadFiles(prev => [...prev, ...fileObjects]);
      
      console.log('图片已添加，请确认后提交给主负责人');
    } catch (error) {
      console.error('上传失败：', error.message);
      alert('上传失败：' + error.message);
    } finally {
      setUploading(false);
    }
  };
  
  // 删除我上传的图片（提交前）
  const handleDeleteMyUpload = async (index) => {
    const fileToDelete = myUploadFiles[index];
    
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
      
      // 删除F盘上的文件
      if (fileToDelete.filename) {
        await fileAPI.deleteFile('development', project.id, fileToDelete.filename, project.projectName);
        console.log('[研发] 已删除F盘文件:', fileToDelete.filename);
      }
      
      // 删除本地state
      setMyUploadFiles(prev => prev.filter((_, i) => i !== index));
      
      // 1秒后移除提示
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);
    } catch (error) {
      console.error('[研发] 删除文件失败:', error);
      alert('删除失败：' + error.message);
    }
  };
  
  // 确认提交给主负责人
  const handleSubmitToLeader = async () => {
    if (myUploadFiles.length === 0) {
      alert('请先上传图片');
      return;
    }
    
    try {
      setShowSubmittingModal(true);
      
      // 1. 先上传文件到文件系统
      const files = myUploadFiles.map(item => item.file);
      const uploadedFiles = await uploadFilesToServer(files);
      
      // 2. 然后提交文件信息给主负责人
      await projectAPI.uploadTeamMemberFiles(project.id, uploadedFiles);
      
      // 1秒后返回首页
      setTimeout(() => {
        setShowSubmittingModal(false);
        // 清空本地未提交的文件
        setMyUploadFiles([]);
        onBack(); // 返回项目开发首页
      }, 1000);
    } catch (error) {
      console.error('提交失败：', error.message);
      setShowSubmittingModal(false);
      alert('提交失败：' + error.message);
    }
  };

  // 整合团队成员的图纸（主负责人）
  const handleIntegrateMemberFiles = async (memberUpload) => {
    try {
      setShowIntegratingModal(true);
      
      // 只整合待整合的文件
      const pendingFiles = memberUpload.files.filter(file => 
        !file.integratedAt // 未整合的文件
      );
      
      if (pendingFiles.length === 0) {
        setShowIntegratingModal(false);
        alert('没有待整合的文件');
        return;
      }
      
      // 整合到研发图纸中
      const newDrawings = [...developmentDrawings, ...pendingFiles];
      
      // 保存到数据库
      await projectAPI.updateProject(project.id, {
        folderScreenshots: newDrawings,
        drawingImages: []
      });
      
      // 标记这些文件为已整合
      const updatedFiles = memberUpload.files.map(file => ({
        ...file,
        integratedAt: file.integratedAt || new Date().toISOString(),
        integratedBy: file.integratedBy || (user.displayName || user.username)
      }));
      
      // 更新团队成员上传记录
      await projectAPI.updateTeamMemberUploadStatus(
        project.id, 
        memberUpload.uploaderId,
        updatedFiles
      );
      
      // 立即更新本地状态
      setDevelopmentDrawings(newDrawings);
      
      // 1秒后刷新当前项目数据
      setTimeout(async () => {
        setShowIntegratingModal(false);
        // 刷新项目数据（不刷新整个页面）
        if (onRefresh) {
          await onRefresh();
        }
      }, 1000);
      
    } catch (error) {
      console.error('整合失败：', error.message);
      setShowIntegratingModal(false);
      alert('整合失败：' + error.message);
    }
  };

  // 处理研发图纸上传（合并后的单一入口）- 仅主负责人使用
  const handleDevelopmentDrawingSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    // 验证文件 - 只允许图片
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        console.warn('只能上传图片文件（JPG、PNG、GIF、WebP）');
        return;
      }
      // 检查文件大小（最大20MB）
      if (file.size > 20 * 1024 * 1024) {
        console.warn(`图片 ${file.name} 超过20MB限制`);
        return;
      }
    }

    try {
      setUploading(true);
      
      // 上传文件到文件系统
      const uploadedFiles = await uploadFilesToServer(selectedFiles);
      
      // 合并到现有文件列表
      const updatedFiles = [...developmentDrawings, ...uploadedFiles];
      setDevelopmentDrawings(updatedFiles);
      
      // 保存到数据库（只存路径信息）
      await projectAPI.updateProject(project.id, {
        folderScreenshots: updatedFiles,
        drawingImages: []
      });

      console.log('研发图纸上传成功，已保存到F盘');
    } catch (error) {
      console.error('上传失败：', error.message);
      alert('上传失败：' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 删除研发图纸
  const handleDeleteDevelopmentDrawing = async (index) => {
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
      
      setLoading(true);
      const fileToDelete = developmentDrawings[index];
      const updatedFiles = developmentDrawings.filter((_, i) => i !== index);
      
      // 删除服务器上的文件
      if (fileToDelete.filename) {
        await fileAPI.deleteFile('development', project.id, fileToDelete.filename, project.projectName);
      }
      
      // 更新数据库
      await projectAPI.updateProject(project.id, {
        folderScreenshots: updatedFiles,
        drawingImages: []
      });
      
      // 更新本地状态
      setDevelopmentDrawings(updatedFiles);
      console.log('图片已删除');
      
      // 1秒后移除提示
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);
    } catch (error) {
      console.error('删除失败：', error.message);
      alert('删除失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理图片预览
  const handleImagePreview = async (imageData) => {
    try {
      // 如果是新文件系统（有filename），使用fetch获取并转换为blob URL
      if (imageData.filename) {
        console.log('[研发预览] filename:', imageData.filename);
        const viewUrl = fileAPI.viewFile('development', project.id, imageData.filename, project.projectName);
        console.log('[研发预览] 请求URL:', viewUrl);
        
        const response = await fetch(viewUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('[研发预览] 响应状态:', response.status);
        
        if (!response.ok) {
          throw new Error(`无法加载图片 (HTTP ${response.status})`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('[研发预览] Blob URL创建成功');
        
        setPreviewImage({ ...imageData, preview: blobUrl, url: blobUrl, data: blobUrl });
      } else {
        // 兼容旧的Base64数据
        setPreviewImage(imageData);
      }
      setShowImagePreview(true);
    } catch (error) {
      console.error('[研发预览] 失败:', error);
      alert('预览失败：' + error.message);
    }
  };

  // 关闭图片预览
  const handleClosePreview = () => {
    setShowImagePreview(false);
    setPreviewImage(null);
  };

  // 下载图片
  const handleDownloadImage = async (imageData) => {
    try {
      // 如果是新文件系统（有filename），使用API下载
      if (imageData.filename) {
        await fileAPI.downloadFile('development', project.id, imageData.filename, project.projectName);
      } else if (imageData.preview) {
        // 兼容旧的Base64数据
        const link = document.createElement('a');
        link.href = imageData.preview;
        link.download = imageData.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.warn('该图片无法下载');
      }
    } catch (error) {
      console.error('下载失败：', error);
      alert('下载失败：' + error.message);
    }
  };

  // 渲染可折叠文件夹
  const renderFileFolder = (title, icon, folderKey, files, readOnly = false, onDelete = null) => {
    const isExpanded = expandedFolders[folderKey];
    const fileCount = files?.length || 0;

    // 批量下载处理函数
    const handleDownloadAll = async (e) => {
      e.stopPropagation(); // 阻止点击事件冒泡到父元素
      if (fileCount === 0) return;
      
      try {
        console.log('[批量下载] 开始下载:', { stage: 'development', title, fileCount });
        await fileAPI.downloadZip('development', project.id, project.projectName, title);
        console.log('[批量下载] 下载成功');
      } catch (error) {
        console.error('[批量下载] 下载失败:', error);
        alert('批量下载失败：' + error.message);
      }
    };

    return (
      <div className="file-folder-container subfolder">
        <div 
          className={`folder-header ${isExpanded ? 'expanded' : ''}`}
          onClick={() => toggleFolder(folderKey)}
        >
          <div className="folder-left">
            <span className="folder-arrow">{isExpanded ? '📂' : '📁'}</span>
            <span className="folder-icon">{icon}</span>
            <span className="folder-title">{title}</span>
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
            {fileCount > 0 ? (
              <div className="file-list-simple">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="file-item-simple"
                    onClick={() => handleImagePreview(file)}
                  >
                    <div className="file-info-simple">
                      <div className="file-name-simple">
                        {file.status === 'submitted' && <span style={{ color: '#52c41a', marginRight: '5px', fontSize: '12px' }}>✅</span>}
                        {file.status === 'pending' && <span style={{ color: '#faad14', marginRight: '5px', fontSize: '12px' }}>⏳</span>}
                        {file.name}
                      </div>
                      <div className="file-meta-simple">
                        {file.size} · {new Date(file.uploadTime).toLocaleString('zh-CN', { 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        {file.uploadBy && ` · ${file.uploadBy}`}
                      </div>
                    </div>
                    <div className="file-actions-simple">
                      <button 
                        className="btn-action-simple btn-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImagePreview(file);
                        }}
                        title="预览"
                      >
                        👁️ 预览
                      </button>
                      <button 
                        className="btn-action-simple btn-download"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(file);
                        }}
                        title="下载"
                      >
                        ⬇️ 下载
                      </button>
                      {!readOnly && onDelete && file.status !== 'submitted' && (
                        <button 
                          className="btn-action-simple btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(index);
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
            ) : (
              <div className="empty-folder">
                <span className="empty-icon">📭</span>
                <span>暂无文件</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 渲染分组文件夹（一级文件夹，包含子文件夹）
  const renderGroupFolder = (title, icon, folderKey, totalFiles, children) => {
    const isExpanded = expandedFolders[folderKey];

    return (
      <div className="file-folder-container group-folder">
        <div 
          className={`folder-header ${isExpanded ? 'expanded' : ''}`}
          onClick={() => toggleFolder(folderKey)}
        >
          <div className="folder-left">
            <span className="folder-arrow">{isExpanded ? '📂' : '📁'}</span>
            <span className="folder-icon">{icon}</span>
            <span className="folder-title">{title}</span>
            <span className="file-count">({totalFiles} 个文件)</span>
          </div>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>

        {isExpanded && (
          <div className="folder-content nested-folders">
            {children}
          </div>
        )}
      </div>
    );
  };

  // 推进到下一阶段（技术出图）
  const handlePushToNextStage = async () => {
    if (developmentDrawings.length === 0) {
      alert('请至少上传一个图片后再推进到下一阶段');
      return;
    }

    try {
      setLoading(true);
      
      // 保存到数据库
      await projectAPI.updateProject(project.id, {
        developmentCompleted: true,
        developmentCompletedTime: new Date().toISOString(),
        developmentCompletedBy: user.displayName || user.username,
        folderScreenshots: developmentDrawings,
        drawingImages: []
      });

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
      console.error('推送失败：', error.message);
      alert('推送失败：' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="development-detail-container">
      {/* Loading覆盖层 */}
      {(loading || uploading) && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <img
              src="/loading.png"
              alt="loading"
              className="loading-image"
            />
            <p>{uploading ? '上传中...' : '处理中...'}</p>
          </div>
        </div>
      )}

      {/* 顶部导航 */}
      <div className="development-detail-header">
        <button className="back-button" onClick={onBack}>
          ← 
        </button>
        <h2 className="detail-title">研发设计</h2>
      </div>

      <div className="development-detail-content">
        {/* 项目基本信息 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">
              {project.projectType === 'research' ? '🔬' : '📄'}
            </span>
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
              {/* 研发周期信息 */}
              {project.timelines && project.timelines.researcherTime > 0 && (
                <>
                  <div className="info-item">
                    <span className="info-label">📅 研发周期</span>
                    <span className="info-value highlight-time">{project.timelines.researcherTime} 天</span>
                  </div>
                  {remainingDays !== null && (
                    <div className="info-item">
                      <span className="info-label">⏰ 剩余时间</span>
                      <span className={`info-value ${remainingDays <= 3 && remainingDays >= 0 ? 'urgent-time' : remainingDays < 0 ? 'overdue-time' : 'normal-time'}`}>
                        {remainingDays >= 0 ? `${remainingDays} 天` : `超期 ${Math.abs(remainingDays)} 天`}
                      </span>
                    </div>
                  )}
                </>
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

          {/* 上传区域（未完成时显示） */}
          {!isCompleted && (
            <div className="upload-actions-area">
              {isPrimaryLeader ? (
                // 主负责人：上传和整合
                <>
                  <div className="upload-group">
                    <input
                      type="file"
                      multiple
                      onChange={handleDevelopmentDrawingSelect}
                      id="development-drawing-upload"
                      style={{ display: 'none' }}
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    />
                    <label htmlFor="development-drawing-upload" className="upload-button-inline primary-leader">
                      👑 上传研发图纸（主负责人）
                    </label>
                  </div>
                  <p className="upload-hint-inline">
                    您是研发主负责人，可以整合团队成员上传的图纸并统一推送
                  </p>
                </>
              ) : (
                // 普通研发人员：提交给主负责人
                <>
                  <div className="upload-group">
                    <input
                      type="file"
                      multiple
                      onChange={handleTeamMemberUpload}
                      id="team-member-upload"
                      style={{ display: 'none' }}
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    />
                    <label htmlFor="team-member-upload" className="upload-button-inline team-member">
                      📤 上传我负责的部分
                    </label>
                  </div>
                  <p className="upload-hint-inline">
                    您上传的图纸将提交给研发主负责人，由主负责人统一整合后推送
                  </p>
                </>
              )}
            </div>
          )}

          {/* 主负责人：显示整合后的研发图纸 */}
          {isPrimaryLeader && developmentDrawings.length > 0 && renderFileFolder(
            '研发图纸', 
            '📐', 
            'rdSection', 
            developmentDrawings,
            isCompleted,
            handleDeleteDevelopmentDrawing
          )}
          
          {/* 普通研发人员：显示自己上传的图纸文件夹 */}
          {!isPrimaryLeader && allMyFiles.length > 0 && (
            <div className="my-upload-section">
              {renderFileFolder(
                `我的研发图纸 (已提交: ${submittedFiles.length}, 待提交: ${myUploadFiles.length})`, 
                '📐', 
                'myUploadSection', 
                allMyFiles,
                false,
                (index) => {
                  // 只能删除待提交的文件
                  const pendingStartIndex = submittedFiles.length;
                  if (index >= pendingStartIndex) {
                    handleDeleteMyUpload(index - pendingStartIndex);
                  }
                }
              )}
              
              {/* 提交按钮 - 只有待提交文件时显示 */}
              {myUploadFiles.length > 0 && (
                <div className="submit-to-leader-section">
                  <button 
                    className="btn-submit-to-leader" 
                    onClick={handleSubmitToLeader}
                    disabled={loading}
                  >
                    {loading ? '提交中...' : `✅ 确认提交给主负责人 (${myUploadFiles.length} 个新文件)`}
                  </button>
                  <p className="submit-hint">
                    请确认图纸无误后再提交，提交后由主负责人统一整合并推送给工程师
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* 团队成员上传区域 - 只有主负责人可见 */}
          {isPrimaryLeader && project.teamMemberUploads && project.teamMemberUploads.length > 0 && (() => {
            // 分离待整合和已整合的成员
            const pendingMembers = project.teamMemberUploads.filter(upload => 
              upload.files.some(file => !file.integratedAt)
            );
            const integratedMembers = project.teamMemberUploads.filter(upload => 
              upload.files.every(file => file.integratedAt)
            );
            
            return (
              <div className="team-uploads-section">
                {/* 待整合的成员 */}
                {pendingMembers.length > 0 && (
                  <>
                    <div className="team-uploads-header">
                      <h4 className="team-uploads-title">👥 团队成员上传的图纸（待整合）</h4>
                      <span className="team-uploads-count">
                        {pendingMembers.length} 个成员待整合
                      </span>
                    </div>
                    
                    {pendingMembers.map((memberUpload, index) => {
                      const pendingFiles = memberUpload.files.filter(file => !file.integratedAt);
                      const integratedFiles = memberUpload.files.filter(file => file.integratedAt);
                      
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
                          
                          {/* 只显示待整合的文件 - 列表形式 */}
                          <div className="member-files-list">
                            {pendingFiles.map((file, fileIndex) => (
                              <div 
                                key={fileIndex} 
                                className="member-file-item-compact"
                                onClick={() => handleImagePreview(file)}
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
                                    handleImagePreview(file);
                                  }}
                                  title="预览"
                                >
                                  👁️
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          {integratedFiles.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#52c41a', marginTop: '8px' }}>
                              ✅ 已整合 {integratedFiles.length} 个文件
                            </div>
                          )}
                          
                          <div className="member-upload-actions">
                            <button 
                              className="btn-integrate"
                              onClick={() => handleIntegrateMemberFiles(memberUpload)}
                            >
                              ✅ 整合到研发图纸 ({pendingFiles.length} 个)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                
                {/* 已整合的成员（收起状态） */}
                {integratedMembers.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ 
                      padding: '10px 15px', 
                      background: '#f0f9ff', 
                      borderRadius: '8px',
                      color: '#52c41a',
                      fontSize: '14px'
                    }}>
                      ✅ 已整合 {integratedMembers.length} 个成员的图纸
                      （{integratedMembers.map(m => m.uploaderName).join('、')}）
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* 推送按钮 - 只有主负责人可以推送 */}
        {!isCompleted && isPrimaryLeader && (
          <div className="push-section">
            <button className="btn-push-bottom" onClick={handlePushToNextStage}>
              ➡️ 推送到出图阶段
            </button>
          </div>
        )}

        {/* 开发状态 */}
        {isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">✅</span>
              <h3 className="section-title">开发状态</h3>
            </div>
            <div className="completion-info">
              <div className="status-item">
                <span className="status-label">完成状态：</span>
                <span className="status-text status-completed">✅ 已完成研发设计</span>
              </div>
              <div className="status-item">
                <span className="status-label">完成时间：</span>
                <span className="status-text">
                  {new Date(project.developmentCompletedTime).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">负责人：</span>
                <span className="status-text">{project.developmentCompletedBy}</span>
              </div>
              <div className="completion-notice">
                <p>✨ 此项目已推送到技术出图阶段，工程师正在处理中...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 成功提示模态框 */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon">✅</div>
            <h2 className="success-title">推送成功！</h2>
            <p className="success-message">项目已成功推送到出图阶段</p>
            <div className="success-loading">
              <div className="success-spinner"></div>
              <p>正在返回首页...</p>
            </div>
          </div>
        </div>
      )}

      {/* 提交中浮窗 */}
      {showSubmittingModal && (
        <div className="success-modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon">📤</div>
            <h2 className="success-title">正在提交</h2>
            <p className="success-message">正在提交给研发主负责人...</p>
            <div className="success-loading">
              <div className="success-spinner"></div>
            </div>
          </div>
        </div>
      )}

      {/* 整合中浮窗 */}
      {showIntegratingModal && (
        <div className="success-modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon">🔄</div>
            <h2 className="success-title">正在整合</h2>
            <p className="success-message">正在整合团队成员的图纸到研发图纸中...</p>
            <div className="success-loading">
              <div className="success-spinner"></div>
            </div>
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      {showImagePreview && previewImage && (
        <div className="image-preview-modal" onClick={handleClosePreview}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>图片预览</h3>
              <button className="close-preview-btn" onClick={handleClosePreview}>
                ✕
              </button>
            </div>
            <div className="preview-body">
              {previewImage.preview ? (
                <img 
                  src={previewImage.preview} 
                  alt={previewImage.name}
                  className="preview-image"
                />
              ) : (
                <div className="no-preview">
                  <p>无法预览该图片</p>
                  <p className="preview-filename">{previewImage.name}</p>
                </div>
              )}
            </div>
            <div className="preview-footer">
              <div className="preview-info">
                <p><strong>文件名：</strong>{previewImage.name}</p>
                <p><strong>大小：</strong>{previewImage.size}</p>
                <p><strong>上传时间：</strong>{new Date(previewImage.uploadTime).toLocaleString('zh-CN')}</p>
                {previewImage.uploadBy && <p><strong>上传人：</strong>{previewImage.uploadBy}</p>}
              </div>
              {previewImage.preview && (
                <button 
                  className="btn-download-preview"
                  onClick={() => handleDownloadImage(previewImage)}
                >
                  ⬇️ 下载图片
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevelopmentDetail;
