import React, { useState, useEffect } from 'react';
import './ArchiveDetail.css';
import { projectAPI } from '../services/api';

const ArchiveDetail = ({ projectId, user, onBack }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [archiveSummary, setArchiveSummary] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // 文件夹展开/折叠状态
  const [expandedFolders, setExpandedFolders] = useState({});

  // 辅助：格式化日期
  const formatDateTime = (dt) => {
    if (!dt) return '未知';
    try {
      return new Date(dt).toLocaleString('zh-CN');
    } catch {
      return '未知';
    }
  };

  // 辅助：耗时
  const formatDuration = (start, end) => {
    if (!start || !end) return '—';
    const ms = new Date(end) - new Date(start);
    if (isNaN(ms) || ms < 0) return '—';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} 天 ${hours} 小时`;
  };

  // 辅助：阶段开始时间（有则取 timelines.*StartTime，否则回退为上一个阶段完成时间）
  const getStageStartTime = (stageKey, p) => {
    const t = (p && p.timelines) || {};
    switch (stageKey) {
      case 'development':
        return t.researcherStartTime || p.approveTime || p.createTime;
      case 'engineering':
        return t.engineerStartTime || p.developmentCompletedTime || p.approveTime;
      case 'purchase':
        return t.purchaserStartTime || p.engineeringCompletedTime || p.developmentCompletedTime;
      case 'processing':
        return t.processorStartTime || p.purchaseCompletedTime || p.engineeringCompletedTime;
      case 'assembly':
        return t.assemblyStartTime || p.processingCompletedTime || p.purchaseCompletedTime;
      case 'testing':
        return t.testerStartTime || p.assemblyCompletedTime || p.processingCompletedTime;
      case 'warehouseIn':
        return t.warehouseInStartTime || p.testingCompletedTime || p.assemblyCompletedTime;
      case 'warehouseOut':
        return t.warehouseOutStartTime || p.warehouseInCompletedTime || p.testingCompletedTime;
      default:
        return undefined;
    }
  };

  // 加载项目数据
  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        const response = await projectAPI.getProject(projectId);
        setProject(response.project);
        setArchiveSummary(response.project.archiveSummary || '');
      } catch (error) {
        console.error('加载项目失败:', error);
        alert('加载项目失败');
        onBack();
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId, onBack]);

  if (!project) {
    return (
      <div className="archive-detail-container">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const isArchived = !!project.archived;

  // 切换文件夹展开状态
  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // 归档项目
  const handleArchiveProject = async () => {
    if (!archiveSummary.trim()) {
      alert('请填写归档总结');
      return;
    }

    try {
      setLoading(true);
      
      const response = await projectAPI.updateProject(project.id, {
        archived: true,
        archivedTime: new Date().toISOString(),
        archivedBy: user.displayName || user.username,
        archiveSummary: archiveSummary
      });

      console.log('归档成功:', response);
      setLoading(false);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
        onBack();
      }, 1000);
    } catch (error) {
      setLoading(false);
      console.error('归档失败:', error);
      alert('归档失败，请稍后重试');
    }
  };

  // 更新归档总结
  const handleUpdateSummary = async () => {
    try {
      setLoading(true);
      
      const response = await projectAPI.updateProject(project.id, {
        archiveSummary: archiveSummary
      });

      console.log('更新成功:', response);
      setLoading(false);
      setShowEditModal(false);
      alert('归档总结更新成功');
    } catch (error) {
      setLoading(false);
      console.error('更新失败:', error);
      alert('更新失败，请稍后重试');
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
          <span className="file-count">({fileCount})</span>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
        {isExpanded && (
          <div className="folder-content">
            {fileCount === 0 ? (
              <div className="no-files">暂无文件</div>
            ) : (
              <div className="file-list">
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{file.size}</span>
                      {file.uploadTime && (
                        <span className="file-time">
                          {new Date(file.uploadTime).toLocaleString('zh-CN')}
                        </span>
                      )}
                      {file.uploadBy && (
                        <span className="file-uploader">上传人：{file.uploadBy}</span>
                      )}
                    </div>
                    <div className="file-actions">
                      <button 
                        className="btn-view"
                        title="查看"
                        onClick={() => {
                          setPreviewImage(file);
                          setShowImagePreview(true);
                        }}
                      >
                        👁️
                      </button>
                      <button 
                        className="btn-download"
                        title="下载"
                        onClick={() => handleDownloadImage(file)}
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
    <div className="archive-detail-container">
      {/* 加载遮罩 */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>{isArchived ? '更新中...' : '归档中...'}</p>
        </div>
      )}

      {/* 成功弹窗 */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-icon">✅</div>
            <p className="success-message">归档成功！</p>
          </div>
        </div>
      )}

      {/* 编辑归档总结弹窗 */}
      {showEditModal && (
        <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>编辑归档总结</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <textarea
                className="summary-textarea"
                value={archiveSummary}
                onChange={(e) => setArchiveSummary(e.target.value)}
                placeholder="请输入项目归档总结..."
                rows={8}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleUpdateSummary}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 头部 */}
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>
          ← 返回
        </button>
        <h2 className="detail-title">
          {isArchived ? '📁 项目归档详情' : '📥 待归档项目'}
        </h2>
      </div>

      {/* 主内容区 */}
      <div className="detail-content">
        {/* 项目基本信息 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📋</span>
            <h3 className="section-title">项目基本信息</h3>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">📝 项目名称</span>
              <span className="info-value">{project.projectName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">🔖 项目类型</span>
              <span className="info-value">
                {project.projectType === 'research' ? '🔬 研发立项' : '📝 合同立项'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">💰 项目预算</span>
              <span className="info-value">{project.budget ? `${project.budget} 万` : '未设置'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">⏱️ 项目时长</span>
              <span className="info-value">{project.duration ? `${project.duration} 月` : '未设置'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">👤 申请人</span>
              <span className="info-value">{project.createdByName || '未知'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">📅 申请时间</span>
              <span className="info-value">
                {project.createTime ? new Date(project.createTime).toLocaleString('zh-CN') : '未知'}
              </span>
            </div>
          </div>
        </div>

        {/* 项目描述 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📄</span>
            <h3 className="section-title">项目描述</h3>
          </div>
          <div className="description-box">
            {project.description || '暂无描述'}
          </div>
        </div>

        {/* 项目完成情况 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">✅</span>
            <h3 className="section-title">项目完成情况</h3>
          </div>
          <div className="completion-timeline">
            {project.researchCompleted && (
              <div className="timeline-item completed">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-title">🔬 研发完成</div>
                  <div className="timeline-info">
                    <span>开始时间：{formatDateTime(getStageStartTime('development', project))}</span>
                    <span>完成时间：{formatDateTime(project.researchCompletedTime)}</span>
                    <span>耗时：{formatDuration(getStageStartTime('development', project), project.researchCompletedTime)}</span>
                    <span>完成人：{project.researchCompletedBy || '未知'}</span>
                  </div>
                </div>
              </div>
            )}
            {project.engineeringCompleted && (
              <div className="timeline-item completed">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-title">🛠️ 工程完成</div>
                  <div className="timeline-info">
                    <span>开始时间：{formatDateTime(getStageStartTime('engineering', project))}</span>
                    <span>完成时间：{formatDateTime(project.engineeringCompletedTime)}</span>
                    <span>耗时：{formatDuration(getStageStartTime('engineering', project), project.engineeringCompletedTime)}</span>
                    <span>完成人：{project.engineeringCompletedBy || '未知'}</span>
                  </div>
                </div>
              </div>
            )}
            {project.purchaseCompleted && (
              <div className="timeline-item completed">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-title">📦 采购完成</div>
                  <div className="timeline-info">
                    <span>开始时间：{formatDateTime(getStageStartTime('purchase', project))}</span>
                    <span>完成时间：{formatDateTime(project.purchaseCompletedTime)}</span>
                    <span>耗时：{formatDuration(getStageStartTime('purchase', project), project.purchaseCompletedTime)}</span>
                    <span>完成人：{project.purchaseCompletedBy || '未知'}</span>
                  </div>
                </div>
              </div>
            )}
            {project.processingCompleted && (
              <div className="timeline-item completed">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-title">⚙️ 加工完成</div>
                  <div className="timeline-info">
                    <span>开始时间：{formatDateTime(getStageStartTime('processing', project))}</span>
                    <span>完成时间：{formatDateTime(project.processingCompletedTime)}</span>
                    <span>耗时：{formatDuration(getStageStartTime('processing', project), project.processingCompletedTime)}</span>
                    <span>完成人：{project.processingCompletedBy || '未知'}</span>
                  </div>
                </div>
              </div>
            )}
            {project.assemblyCompleted && (
              <div className="timeline-item completed">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-title">🔩 装配完成</div>
                  <div className="timeline-info">
                    <span>开始时间：{formatDateTime(getStageStartTime('assembly', project))}</span>
                    <span>完成时间：{formatDateTime(project.assemblyCompletedTime)}</span>
                    <span>耗时：{formatDuration(getStageStartTime('assembly', project), project.assemblyCompletedTime)}</span>
                    <span>完成人：{project.assemblyCompletedBy || '未知'}</span>
                  </div>
                </div>
              </div>
            )}
            {project.testingCompleted && (
              <div className="timeline-item completed">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-title">🔧 调试完成</div>
                  <div className="timeline-info">
                    <span>开始时间：{formatDateTime(getStageStartTime('testing', project))}</span>
                    <span>完成时间：{formatDateTime(project.testingCompletedTime)}</span>
                    <span>耗时：{formatDuration(getStageStartTime('testing', project), project.testingCompletedTime)}</span>
                    <span>完成人：{project.testingCompletedBy || '未知'}</span>
                  </div>
                </div>
              </div>
            )}
            {project.warehouseInCompleted && (
              <div className="timeline-item completed">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-title">📦 入库完成</div>
                  <div className="timeline-info">
                    <span>开始时间：{formatDateTime(getStageStartTime('warehouseIn', project))}</span>
                    <span>完成时间：{formatDateTime(project.warehouseInCompletedTime)}</span>
                    <span>耗时：{formatDuration(getStageStartTime('warehouseIn', project), project.warehouseInCompletedTime)}</span>
                    <span>完成人：{project.warehouseInCompletedBy || '未知'}</span>
                  </div>
                </div>
              </div>
            )}
            {project.warehouseOutCompleted && (
              <div className="timeline-item completed">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-title">📤 出库完成</div>
                  <div className="timeline-info">
                    <span>开始时间：{formatDateTime(getStageStartTime('warehouseOut', project))}</span>
                    <span>完成时间：{formatDateTime(project.warehouseOutCompletedTime)}</span>
                    <span>耗时：{formatDuration(getStageStartTime('warehouseOut', project), project.warehouseOutCompletedTime)}</span>
                    <span>完成人：{project.warehouseOutCompletedBy || '未知'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 项目文件 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📁</span>
            <h3 className="section-title">项目文件</h3>
          </div>

          {renderFileFolder(
            'rdSection',
            '研发图纸',
            // 兼容老数据与新字段
            project.developmentDrawings && project.developmentDrawings.length > 0
              ? project.developmentDrawings
              : ([...(project.folderScreenshots || []), ...(project.drawingImages || [])]),
            '📐'
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
            '📦'
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

        {/* 归档总结 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">📝</span>
            <h3 className="section-title">归档总结</h3>
            {isArchived && (
              <button className="btn-edit-summary" onClick={() => setShowEditModal(true)}>
                ✏️ 编辑
              </button>
            )}
          </div>
          {isArchived ? (
            <div className="summary-display">
              {project.archiveSummary || '暂无归档总结'}
            </div>
          ) : (
            <div className="summary-input-section">
              <textarea
                className="summary-textarea"
                value={archiveSummary}
                onChange={(e) => setArchiveSummary(e.target.value)}
                placeholder="请输入项目归档总结，包括项目成果、遇到的问题、经验教训等..."
                rows={6}
              />
            </div>
          )}
        </div>

        {/* 归档信息 */}
        {isArchived && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">✅</span>
              <h3 className="section-title">归档信息</h3>
            </div>
            <div className="archive-status-box">
              <div className="archive-status-item">
                <span className="status-label">归档人：</span>
                <span className="status-value">{project.archivedBy || '未知'}</span>
              </div>
              <div className="archive-status-item">
                <span className="status-label">归档时间：</span>
                <span className="status-value">
                  {project.archivedTime ? new Date(project.archivedTime).toLocaleString('zh-CN') : '未知'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 归档按钮 */}
        {!isArchived && (
          <div className="archive-section">
            <button className="btn-archive" onClick={handleArchiveProject}>
              ✅ 确认归档
            </button>
          </div>
        )}
      </div>

      {/* 图片预览弹窗 */}
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
    </div>
  );
};

export default ArchiveDetail;

