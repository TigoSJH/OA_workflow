import React, { useState, useEffect } from 'react';
import './EngineeringDetail.css';
import { projectAPI, fileAPI } from '../services/api';

const EngineeringDetail = ({ project, user, onBack, onRefresh }) => {
  // 合并所有工程图纸到一个数组
  const [engineeringDrawings, setEngineeringDrawings] = useState([
    ...(project.engineeringDrawings || []),
    ...(project.engineeringDocuments || [])
  ]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSubmittingModal, setShowSubmittingModal] = useState(false);
  const [showIntegratingModal, setShowIntegratingModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!!project.engineeringCompleted);

  // 判断当前用户是否为工程主负责人
  const isPrimaryLeader = user.isPrimaryLeader && 
                         user.primaryLeaderRoles && 
                         user.primaryLeaderRoles.includes('engineer');
  
  // 普通工程师的临时上传文件（提交前）
  const [myUploadFiles, setMyUploadFiles] = useState([]);
  // 已提交的文件
  const [submittedFiles, setSubmittedFiles] = useState([]);

  // 计算剩余天数
  const calculateRemainingDays = () => {
    if (!project.timelines || !project.timelines.engineerTime) {
      return null;
    }

    // 优先使用工程开始时间；没有则回退到研发完成时间
    const startTimeRaw = project.timelines.engineerStartTime || project.developmentCompletedTime;
    if (!startTimeRaw) return null;

    const startTime = new Date(startTimeRaw);
    const now = new Date();
    const elapsedDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const remainingDays = project.timelines.engineerTime - elapsedDays;
    
    return remainingDays;
  };

  const remainingDays = calculateRemainingDays();
  
  // 文件夹展开/折叠状态
  const [expandedFolders, setExpandedFolders] = useState({
    rdSection: false, // 研发图纸文件夹
    engSection: false, // 工程图纸文件夹
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
    console.log('📦 项目数据更新, 工程图纸数:', (project.engineeringDrawings || []).length);
    console.log('📦 团队成员上传数:', (project.teamMemberEngineeringUploads || []).length);
    
    setEngineeringDrawings([
      ...(project.engineeringDrawings || []),
      ...(project.engineeringDocuments || [])
    ]);
    setIsCompleted(!!project.engineeringCompleted);
    
    // 如果是普通工程师，加载之前上传的内容
    if (!isPrimaryLeader && project.teamMemberEngineeringUploads) {
      const myPreviousUpload = project.teamMemberEngineeringUploads.find(
        upload => String(upload.uploaderId) === String(user._id || user.id)
      );
      if (myPreviousUpload && myPreviousUpload.files) {
        console.log('📥 加载已提交文件:', myPreviousUpload.files.length);
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
        console.log('[工程] 页面退出，清理未提交文件:', myUploadFiles.length, '个');
        myUploadFiles.forEach(async (file) => {
          if (file.filename) {
            try {
              await fileAPI.deleteFile('engineering', project.id, file.filename, project.projectName);
              console.log('[工程] 已清理F盘文件:', file.filename);
            } catch (error) {
              console.error('[工程] 清理文件失败:', file.filename, error);
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

  // 压缩图片
  // 文件上传辅助函数 - 上传到文件系统
  const uploadFilesToServer = async (files) => {
    try {
      const response = await fileAPI.uploadMultipleFiles(
        files,
        project.id,
        project.projectName,
        'engineering'
      );
      return response.files;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  };

  // 处理工程图纸上传（合并后的单一入口）
  const handleEngineeringDrawingSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        console.warn('只能上传图片文件（JPG、PNG、GIF、WebP）');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        console.warn(`图片 ${file.name} 超过20MB限制`);
        return;
      }
    }

    let uploadedFiles = null;
    try {
      setUploading(true);
      
      // 上传文件到文件系统
      uploadedFiles = await uploadFilesToServer(selectedFiles);
      
      // 合并到现有文件列表
      const updatedFiles = [...engineeringDrawings, ...uploadedFiles];
      
      // 保存到数据库（只存路径信息）
      await projectAPI.updateProject(project.id, {
        engineeringDrawings: updatedFiles,
        engineeringDocuments: []
      });

      // 只有成功保存到数据库后才更新本地状态
      setEngineeringDrawings(updatedFiles);
      console.log('工程图纸上传成功，已保存到F盘');
      console.log('上传的文件信息:', uploadedFiles);
    } catch (error) {
      console.error('上传失败：', error.message);
      
      // 如果保存到数据库失败且文件已经上传到服务器，需要清理这些文件
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log('保存失败，正在清理已上传的文件...');
        try {
          for (const file of uploadedFiles) {
            if (file.filename) {
              await fileAPI.deleteFile('engineering', project.id, file.filename, project.projectName);
            }
          }
          console.log('已清理上传的文件');
        } catch (cleanupError) {
          console.error('清理文件失败:', cleanupError);
        }
      }
      
      alert('上传失败：' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 删除工程图纸
  const handleDeleteEngineeringDrawing = async (index) => {
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
    
    const fileToDelete = engineeringDrawings[index];
    try {
      setLoading(true);
      
      // 1. 先从数据库中删除记录
      const updatedFiles = engineeringDrawings.filter((_, i) => i !== index);
      await projectAPI.updateProject(project.id, {
        engineeringDrawings: updatedFiles,
        engineeringDocuments: []
      });
      
      // 2. 然后删除F盘中的文件
      if (fileToDelete && fileToDelete.filename) {
        try {
          await fileAPI.deleteFile('engineering', project.id, fileToDelete.filename, project.projectName);
          console.log('已删除F盘中的文件:', fileToDelete.filename);
        } catch (fileDeleteError) {
          console.error('删除F盘文件失败:', fileDeleteError);
          // 文件删除失败但数据库已更新，记录错误但继续
        }
      }
      
      // 3. 更新本地状态
      setEngineeringDrawings(updatedFiles);
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

  // 团队成员上传（普通工程师）
  const handleTeamMemberUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      // 直接保存原始文件对象用于后续统一提交（不再压缩为Base64）
      const newFiles = selectedFiles.map(file => ({
        file,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        type: file.type,
        preview: URL.createObjectURL(file),
        uploadTime: new Date().toISOString(),
        uploadBy: user.displayName || user.username
      }));

      setMyUploadFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('上传失败：', error.message);
    } finally {
      setUploading(false);
    }
  };

  // 删除我的上传文件（普通工程师）
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
        await fileAPI.deleteFile('engineering', project.id, fileToDelete.filename, project.projectName);
        console.log('[工程] 已删除F盘文件:', fileToDelete.filename);
      }
      
      // 删除本地state
      setMyUploadFiles(prev => prev.filter((_, i) => i !== index));
      
      // 1秒后移除提示
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);
    } catch (error) {
      console.error('[工程] 删除文件失败:', error);
      alert('删除失败：' + error.message);
    }
  };
  
  // 确认提交给主负责人（普通工程师）
  const handleSubmitToLeader = async () => {
    if (myUploadFiles.length === 0) {
      alert('请先上传图片');
      return;
    }
    
    let uploadedFiles = null;
    try {
      setShowSubmittingModal(true);
      
      // 1. 先上传文件到文件系统
      const files = myUploadFiles.map(item => item.file);
      uploadedFiles = await uploadFilesToServer(files);
      
      // 2. 然后提交文件信息给主负责人
      await projectAPI.uploadTeamMemberEngineeringFiles(project.id, uploadedFiles);
      
      // 1秒后返回首页
      setTimeout(() => {
        setShowSubmittingModal(false);
        // 清空本地未提交的文件
        setMyUploadFiles([]);
        onBack(); // 返回项目工程首页
      }, 1000);
    } catch (error) {
      console.error('提交失败：', error.message);
      setShowSubmittingModal(false);
      
      // 如果提交失败且文件已经上传到服务器，需要清理这些文件
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log('提交失败，正在清理已上传的文件...');
        try {
          for (const file of uploadedFiles) {
            if (file.filename) {
              await fileAPI.deleteFile('engineering', project.id, file.filename, project.projectName);
            }
          }
          console.log('已清理上传的文件');
        } catch (cleanupError) {
          console.error('清理文件失败:', cleanupError);
        }
      }
      
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
      
      console.log('🔄 开始整合，待整合文件数:', pendingFiles.length);
      console.log('📊 当前工程图纸数:', engineeringDrawings.length);
      
      // 整合到工程图纸中
      const newDrawings = [...engineeringDrawings, ...pendingFiles];
      
      console.log('📊 整合后图纸总数:', newDrawings.length);
      
      // 保存到数据库
      await projectAPI.updateProject(project.id, {
        engineeringDrawings: newDrawings,
        engineeringDocuments: []
      });
      
      console.log('✅ 工程图纸已保存到数据库');
      
      // 标记这些文件为已整合
      const updatedFiles = memberUpload.files.map(file => ({
        ...file,
        integratedAt: file.integratedAt || new Date().toISOString(),
        integratedBy: file.integratedBy || (user.displayName || user.username)
      }));
      
      // 更新团队成员上传记录
      await projectAPI.updateTeamMemberEngineeringUploadStatus(
        project.id, 
        memberUpload.uploaderId,
        updatedFiles
      );
      
      console.log('✅ 团队成员上传状态已更新');
      
      // 立即更新本地状态
      setEngineeringDrawings(newDrawings);
      
      // 1秒后刷新当前项目数据
      setTimeout(async () => {
        setShowIntegratingModal(false);
        // 刷新项目数据（不刷新整个页面）
        if (onRefresh) {
          console.log('🔄 刷新项目数据...');
          await onRefresh();
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ 整合失败：', error.message);
      setShowIntegratingModal(false);
      alert('整合失败：' + error.message);
    }
  };

  // 处理图片预览
  const handleImagePreview = async (imageData, stage = 'engineering') => {
    console.log('准备预览图片:', imageData, 'stage:', stage);
    try {
      // 如果是新文件系统（有filename），使用fetch获取图片并转换为blob URL
      if (imageData.filename) {
        console.log('使用文件系统预览，filename:', imageData.filename, 'stage:', stage);
        const viewUrl = fileAPI.viewFile(stage, project.id, imageData.filename, project.projectName);
        console.log('预览URL:', viewUrl);
        const response = await fetch(viewUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('预览响应状态:', response.status);
        if (!response.ok) {
          throw new Error(`无法加载图片 (HTTP ${response.status})`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPreviewImage({ ...imageData, preview: blobUrl });
      } else {
        // 兼容旧的Base64数据或本地预览URL
        console.log('使用本地预览URL');
        setPreviewImage(imageData);
      }
      setShowImagePreview(true);
    } catch (error) {
      console.error('预览图片失败:', error);
      alert('无法预览图片: ' + error.message);
    }
  };

  // 关闭图片预览
  const handleClosePreview = () => {
    setShowImagePreview(false);
    setPreviewImage(null);
  };

  // 下载图片
  const handleDownloadImage = async (imageData, stage = 'engineering') => {
    try {
      // 如果是新文件系统（有filename），使用API下载
      if (imageData.filename) {
        console.log('[工程下载] stage:', stage, 'filename:', imageData.filename);
        await fileAPI.downloadFile(stage, project.id, imageData.filename, project.projectName);
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
  const renderFileFolder = (title, icon, folderKey, files, readOnly = false, onDelete = null, stage = 'engineering') => {
    const isExpanded = expandedFolders[folderKey];
    const fileCount = files?.length || 0;

    // 批量下载处理函数
    const handleDownloadAll = async (e) => {
      e.stopPropagation(); // 阻止点击事件冒泡到父元素
      if (fileCount === 0) return;
      
      try {
        console.log('[批量下载] 开始下载:', { stage, title, fileCount });
        await fileAPI.downloadZip(stage, project.id, project.projectName, title);
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
                    onClick={() => handleImagePreview(file, stage)}
                  >
                    <div className="file-info-simple">
                      <div className="file-name-simple">{file.name}</div>
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
                      {!readOnly && onDelete && (
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

  // 推进到下一阶段
  const handlePushToNextStage = async () => {
    if (engineeringDrawings.length === 0) {
      alert('请至少上传一个图片后再推进到下一阶段');
      return;
    }

    try {
      setLoading(true);
      
      // 保存到数据库
      await projectAPI.updateProject(project.id, {
        engineeringCompleted: true,
        engineeringCompletedTime: new Date().toISOString(),
        engineeringCompletedBy: user.displayName || user.username,
        engineeringDrawings: engineeringDrawings,
        engineeringDocuments: []
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
    <div className="engineering-detail-container">
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
      <div className="engineering-detail-header">
        <button className="back-button" onClick={onBack}>
          ← 
        </button>
        <h2 className="detail-title">工程设计</h2>
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
              {/* 工程周期信息 */}
              {project.timelines && project.timelines.engineerTime > 0 && (
                <>
                  <div className="info-item">
                    <span className="info-label">📅 工程周期</span>
                    <span className="info-value highlight-time">{project.timelines.engineerTime} 天</span>
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
                      onChange={handleEngineeringDrawingSelect}
                      id="engineering-drawing-upload"
                      style={{ display: 'none' }}
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    />
                    <label htmlFor="engineering-drawing-upload" className="upload-button-inline primary-leader">
                      👑 上传工程图纸（主负责人）
                    </label>
                  </div>
                  <p className="upload-hint-inline">
                    您是工程主负责人，可以整合团队成员上传的图纸并统一推送
                  </p>
                </>
              ) : (
                // 普通工程师：提交给主负责人
                <>
                  <div className="upload-group">
                    <input
                      type="file"
                      multiple
                      onChange={handleTeamMemberUpload}
                      id="team-member-engineering-upload"
                      style={{ display: 'none' }}
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    />
                    <label htmlFor="team-member-engineering-upload" className="upload-button-inline team-member">
                      📤 上传我负责的部分
                    </label>
                  </div>
                  <p className="upload-hint-inline">
                    您上传的图纸将提交给工程主负责人，由主负责人统一整合后推送
                  </p>
                </>
              )}
            </div>
          )}

          {/* 研发图纸 - 直接显示（只读） */}
          {((project.folderScreenshots?.length || 0) > 0 || (project.drawingImages?.length || 0) > 0) && renderFileFolder(
            '研发图纸', 
            '📐', 
            'rdSection', 
            [...(project.folderScreenshots || []), ...(project.drawingImages || [])],
            true,
            null,
            'development'
          )}

          {/* 主负责人：显示整合后的工程图纸 */}
          {isPrimaryLeader && engineeringDrawings.length > 0 && renderFileFolder(
            '工程图纸', 
            '🛠️', 
            'engSection', 
            engineeringDrawings, 
            isCompleted,
            handleDeleteEngineeringDrawing
          )}
          
          {/* 普通工程师：显示自己上传的图纸文件夹 */}
          {!isPrimaryLeader && allMyFiles.length > 0 && (
            <div className="my-upload-section">
              {renderFileFolder(
                `我的工程图纸 (已提交: ${submittedFiles.length}, 待提交: ${myUploadFiles.length})`, 
                '🛠️', 
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
                    请确认图纸无误后再提交，提交后由主负责人统一整合并推送
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* 团队成员上传区域 - 只有主负责人可见 */}
          {isPrimaryLeader && project.teamMemberEngineeringUploads && project.teamMemberEngineeringUploads.length > 0 && (() => {
            // 分离待整合和已整合的成员
            const pendingMembers = project.teamMemberEngineeringUploads.filter(upload => 
              upload.files.some(file => !file.integratedAt)
            );
            const integratedMembers = project.teamMemberEngineeringUploads.filter(upload => 
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
                                onClick={() => handleImagePreview(file, 'engineering')}
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
                                    handleImagePreview(file, 'engineering');
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
                              ✅ 整合到工程图纸 ({pendingFiles.length} 个)
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
              ➡️ 推送到下一阶段
            </button>
          </div>
        )}

        {/* 工程状态 */}
        {isCompleted && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">✅</span>
              <h3 className="section-title">工程状态</h3>
            </div>
            <div className="completion-info">
              <div className="status-item">
                <span className="status-label">完成状态：</span>
                <span className="status-text status-completed">✅ 已完成工程设计</span>
              </div>
              <div className="status-item">
                <span className="status-label">完成时间：</span>
                <span className="status-text">
                  {new Date(project.engineeringCompletedTime).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">负责人：</span>
                <span className="status-text">{project.engineeringCompletedBy}</span>
              </div>
              <div className="completion-notice">
                <p>✨ 此项目已推送到下一阶段...</p>
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
            <p className="success-message">项目已成功推送到下一阶段</p>
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
            <p className="success-message">正在提交给工程主负责人...</p>
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
            <p className="success-message">正在整合团队成员的图纸到工程图纸中...</p>
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

export default EngineeringDetail;

