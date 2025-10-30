import React, { useState } from 'react';
import './ProjectDetail.css';
import { projectAPI, fileAPI } from '../services/api';

const ProjectDetail = ({ project, user, onBack, onUpdate }) => {
  const [feedback, setFeedback] = useState('');
  const [contractFile, setContractFile] = useState(project.contractFile || null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [editData, setEditData] = useState({
    projectName: project.projectName || '',
    description: project.description || '',
    researchDirection: project.researchDirection || '',
    researchPurpose: project.researchPurpose || '',
    budget: project.budget || '',
    duration: project.duration || '',
    priority: project.priority || 'normal'
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    
    // 验证文件类型：只允许PDF
    if (file && file.type !== 'application/pdf') {
      console.warn('只能上传PDF文件');
      return;
    }
    
    // 验证文件大小：最大10MB
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file && file.size > maxSize) {
      console.warn('PDF文件大小不能超过10MB');
      return;
    }
    
    if (file) {
      setContractFile({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        uploadTime: new Date().toLocaleString('zh-CN')
      });
      console.log('合同文件上传成功');
    }
  };

  const handleSubmitFeedback = () => {
    if (!feedback.trim()) {
      console.warn('请填写审批意见');
      return;
    }
    console.log('审批意见已提交');
    setFeedback('');
  };

  // 处理编辑保存
  const handleSaveEdit = async () => {
    if (!editData.projectName || !editData.description) {
      console.warn('项目名称和描述不能为空');
      return;
    }

    if (project.projectType === 'research') {
      if (!editData.researchDirection || !editData.researchPurpose) {
        console.warn('研发方向和研发用途不能为空');
        return;
      }
    }

    try {
      setLoading(true);
      await projectAPI.updateProject(project.id, editData);
      console.log('项目修改成功');
      setIsEditing(false);
      // 触发刷新
      if (onUpdate) {
        onUpdate({ ...project, ...editData });
      }
    } catch (error) {
      console.error('修改项目失败:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    const confirmMessage = `⚠️  危险操作警告！\n\n确认删除项目 "${project.projectName}" 吗？\n\n删除后将会：\n• 从数据库中永久删除该项目\n• 此操作不可恢复\n\n请输入 "DELETE" 确认删除`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput === 'DELETE') {
      try {
        setLoading(true);
        await projectAPI.deleteProject(project.id);
        console.log('项目已删除');
        onBack();
      } catch (error) {
        console.error('删除失败：', error.message);
      } finally {
        setLoading(false);
      }
    } else if (userInput !== null) {
      console.warn('输入不正确，删除操作已取消');
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditData({
      projectName: project.projectName || '',
      description: project.description || '',
      researchDirection: project.researchDirection || '',
      researchPurpose: project.researchPurpose || '',
      budget: project.budget || '',
      duration: project.duration || '',
      priority: project.priority || 'normal'
    });
    setIsEditing(false);
  };

  // 获取状态显示文本
  const getStatusText = (status) => {
    const statusMap = {
      'pending': '⏳ 待审批',
      'approved': '✅ 已批准', 
      'rejected': '❌ 已拒绝',
      'in_progress': '🔄 进行中',
      'completed': '✅ 已完成',
      'cancelled': '🚫 已取消'
    };
    return statusMap[status] || '❓ 未知状态';
  };

  // 处理批准操作
  const handleApprove = async () => {
    try {
      setLoading(true);
      await projectAPI.approveProject(project.id, 'approve');
      console.log('审批已提交');
      setLoading(false);
      
      // 显示大浮窗，0.8s 后返回首页，并抑制该项目的通知弹窗
      setShowToast(true);
      try {
        localStorage.setItem('suppressNotificationProjectId', String(project.id));
        // 清除 openProjectId，防止返回后又自动打开详情
        localStorage.removeItem('openProjectId');
      } catch (e) {}
      
      setTimeout(() => {
        console.log('浮窗时间到，准备返回首页');
        setShowToast(false);
        // 确保返回首页
        if (onBack) {
          console.log('调用 onBack 返回首页');
          onBack();
        } else {
          console.error('onBack 回调不存在');
        }
      }, 800);
    } catch (error) {
      console.error('审批失败：', error.message);
      setLoading(false);
    }
  };

  // 处理拒绝操作
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      console.warn('请填写拒绝理由');
      return;
    }
    
    try {
      setLoading(true);
      await projectAPI.approveProject(project.id, 'reject', rejectReason);
      console.log('拒绝意见已提交');
      setRejectReason('');
      setShowRejectModal(false);
      if (onUpdate) {
        onUpdate(project);
      }
      onBack();
    } catch (error) {
      console.error('操作失败：', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 检查当前用户是否已经审批过
  const hasUserApproved = () => {
    if (!project.approvalRecords) return false;
    return project.approvalRecords.some(record => record.approver === user.username);
  };

  // 获取审批进度文本
  const getApprovalProgressText = () => {
    if (!project.approvalProgress) return '';
    const { approved, required } = project.approvalProgress;
    return `${approved}/${required}`;
  };

  return (
    <div className="project-detail-container">
      {showToast && (
        <div className="approve-toast">✅ 批准成功</div>
      )}
      {/* Loading覆盖层 */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <img src="/loading.png" alt="loading" className="loading-image" />
            <p>处理中...</p>
          </div>
        </div>
      )}

      {/* 顶部导航 */}
      <div className="project-detail-header">
        <button className="back-button" onClick={onBack}>
          ← 
        </button>
        <h2 className="detail-title">立项详情</h2>
        <div className="header-right-actions">
          {user.roles && user.roles.includes('manager') && !isEditing && (
            <>
              <button className="btn-edit-project" onClick={() => setIsEditing(true)}>
                ✏️ 编辑
              </button>
              <button className="btn-delete-project" onClick={handleDelete}>
                🗑️ 删除
              </button>
            </>
          )}
        </div>
      </div>

      <div className="project-detail-content">
        {/* 基本信息 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">
              {project.projectType === 'research' ? '🔬' : '📄'}
            </span>
            <h3 className="section-title">
              {project.projectType === 'research' ? '研发立项信息' : '合同立项信息'}
            </h3>
          </div>
          <div className="project-basic-info">
            <h2 className="project-name">{project.projectName}</h2>
            <div className="project-type-badge">
              {project.projectType === 'research' ? '🔬 研发立项' : '📄 合同立项'}
            </div>
          </div>
        </div>

        {/* 研发立项详细信息 */}
        {project.projectType === 'research' && (
          <div className="detail-section">
            <div className="section-header">
              <span className="section-icon">📋</span>
              <h4 className="section-title">研发项目信息</h4>
            </div>
            <div className="section-content">
              {isEditing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>项目名称 *</label>
                    <input
                      type="text"
                      value={editData.projectName}
                      onChange={(e) => setEditData({ ...editData, projectName: e.target.value })}
                      placeholder="请输入项目名称"
                    />
                  </div>
                  <div className="form-group">
                    <label>🎯 研发方向 *</label>
                    <input
                      type="text"
                      value={editData.researchDirection}
                      onChange={(e) => setEditData({ ...editData, researchDirection: e.target.value })}
                      placeholder="如：智能制造、自动化控制等"
                    />
                  </div>
                  <div className="form-group">
                    <label>💡 研发用途 *</label>
                    <textarea
                      value={editData.researchPurpose}
                      onChange={(e) => setEditData({ ...editData, researchPurpose: e.target.value })}
                      placeholder="请描述研发目的、预期应用场景和效益"
                      rows={3}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>💰 研发经费</label>
                      <div className="input-with-unit">
                        <input
                          type="number"
                          value={editData.budget}
                          onChange={(e) => setEditData({ ...editData, budget: e.target.value })}
                          placeholder="如：50"
                          min="0"
                          step="0.1"
                        />
                        <span className="unit-label">万</span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>⏱️ 研发时间</label>
                      <div className="input-with-unit">
                        <input
                          type="number"
                          value={editData.duration}
                          onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
                          placeholder="如：6"
                          min="0"
                          step="1"
                        />
                        <span className="unit-label">月</span>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>项目描述 *</label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      placeholder="请详细描述项目内容、目标和预期成果"
                      rows={4}
                    />
                  </div>
                  <div className="form-group">
                    <label>优先级</label>
                    <select
                      value={editData.priority}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                    >
                      <option value="normal">普通</option>
                      <option value="high">高优先级</option>
                      <option value="urgent">紧急</option>
                    </select>
                  </div>
                  <div className="edit-actions">
                    <button className="btn-cancel" onClick={handleCancelEdit}>取消</button>
                    <button className="btn-save" onClick={handleSaveEdit}>保存修改</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">👨‍🔬 研发人</span>
                      <span className="info-value">{project.researcher || project.createdByName}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">🎯 研发方向</span>
                      <span className="info-value">{project.researchDirection || '智能制造'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">💡 研发用途</span>
                      <span className="info-value">{project.researchPurpose || project.description}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">💰 研发经费</span>
                      <span className="info-value">{project.budget} 万</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">⏱️ 研发时间</span>
                      <span className="info-value">{project.duration} 月</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">📅 申请时间</span>
                      <span className="info-value">{new Date(project.createTime).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                  <div className="description-box">
                    <h5>项目描述：</h5>
                    <p>{project.description}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 合同立项详细信息 */}
        {project.projectType === 'contract' && (
          <>
            <div className="detail-section">
              <div className="section-header">
                <span className="section-icon">📋</span>
                <h4 className="section-title">合同项目信息</h4>
              </div>
              <div className="section-content">
                {isEditing ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>项目名称 *</label>
                      <input
                        type="text"
                        value={editData.projectName}
                        onChange={(e) => setEditData({ ...editData, projectName: e.target.value })}
                        placeholder="请输入项目名称"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>💰 项目预算</label>
                        <input
                          type="text"
                          value={editData.budget}
                          onChange={(e) => setEditData({ ...editData, budget: e.target.value })}
                          placeholder="如：200万"
                        />
                      </div>
                      <div className="form-group">
                        <label>⏱️ 项目时间</label>
                        <input
                          type="text"
                          value={editData.duration}
                          onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
                          placeholder="如：3个月"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>项目描述 *</label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        placeholder="请详细描述项目内容、目标和预期成果"
                        rows={4}
                      />
                    </div>
                    <div className="form-group">
                      <label>优先级</label>
                      <select
                        value={editData.priority}
                        onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                      >
                        <option value="normal">普通</option>
                        <option value="high">高优先级</option>
                        <option value="urgent">紧急</option>
                      </select>
                    </div>
                    <div className="edit-actions">
                      <button className="btn-cancel" onClick={handleCancelEdit}>取消</button>
                      <button className="btn-save" onClick={handleSaveEdit}>保存修改</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">💰 项目预算</span>
                        <span className="info-value">{project.budget}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">⏱️ 项目时间</span>
                        <span className="info-value">{project.duration}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">👤 申请人</span>
                        <span className="info-value">{project.createdByName}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">📅 申请时间</span>
                        <span className="info-value">{new Date(project.createTime).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="description-box">
                      <h5>项目描述：</h5>
                      <p>{project.description}</p>
                    </div>
                    
                    {/* 合同文件显示 */}
                    {project.contractFile && (
                      <div className="contract-file-section" style={{
                        marginTop: '20px',
                        padding: '15px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <h5 style={{ marginBottom: '10px', color: '#334155' }}>📄 合同文件：</h5>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px',
                          background: 'white',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <span style={{ fontSize: '24px' }}>📑</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', color: '#1e293b' }}>
                              {project.contractFile.replace(/^\d+_/, '')}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              PDF文件
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                // 使用 fetch 获取文件（带token），然后创建 blob URL 打开
                                const viewUrl = fileAPI.viewContract(project.id, project.contractFile, project.projectName);
                                const response = await fetch(viewUrl, {
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                  }
                                });
                                
                                if (!response.ok) {
                                  throw new Error(`预览失败 (HTTP ${response.status})`);
                                }
                                
                                const blob = await response.blob();
                                const blobUrl = URL.createObjectURL(blob);
                                window.open(blobUrl, '_blank');
                                
                                // 延迟清理 blob URL，确保新窗口有时间加载
                                setTimeout(() => {
                                  URL.revokeObjectURL(blobUrl);
                                }, 100);
                              } catch (error) {
                                console.error('预览失败:', error);
                                alert('预览失败：' + error.message);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#2563eb'}
                            onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                          >
                            👁️ 预览
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await fileAPI.downloadContract(project.id, project.contractFile, project.projectName);
                              } catch (error) {
                                console.error('下载失败:', error);
                                alert('下载失败：' + error.message);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#059669'}
                            onMouseOut={(e) => e.target.style.background = '#10b981'}
                          >
                            ⬇️ 下载
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* 审批信息 */}
        <div className="detail-section">
          <div className="section-header">
            <span className="section-icon">✍️</span>
            <h4 className="section-title">审批信息</h4>
          </div>
          <div className="section-content">
            <div className="approval-status">
              <div className="status-item">
                <span className="status-label">当前状态：</span>
                <span className={`status-text status-${project.status}`}>
                  {getStatusText(project.status)}
                  {project.status === 'pending' && project.approvalProgress && (
                    <span className="progress-indicator">
                      {' '}({getApprovalProgressText()})
                    </span>
                  )}
                </span>
              </div>
              
              {/* 申请人信息 */}
              <div className="status-item">
                <span className="status-label">申请人：</span>
                <span className="status-text">{project.createdByName}</span>
              </div>
              
              {/* 申请时间 */}
              <div className="status-item">
                <span className="status-label">申请时间：</span>
                <span className="status-text">
                  {new Date(project.createTime).toLocaleString('zh-CN')}
                </span>
              </div>
              
              {/* 审批进度 - 仅当是待审批状态时显示 */}
              {project.status === 'pending' && project.approvalProgress && (
                <div className="status-item">
                  <span className="status-label">审批进度：</span>
                  <span className="status-text">
                    需要 {project.approvalProgress.required} 人审批，
                    已有 {project.approvalProgress.approved} 人批准
                    {project.approvalProgress.rejected > 0 && 
                      `，${project.approvalProgress.rejected} 人拒绝`
                    }
                  </span>
                </div>
              )}
            </div>

            {/* 审批记录列表 */}
            {project.approvalRecords && project.approvalRecords.length > 0 && (
              <div className="approval-records">
                <h5>审批记录：</h5>
                <div className="records-list">
                  {project.approvalRecords.map((record, index) => (
                    <div key={index} className="approval-record">
                      <div className="record-header">
                        <span className="record-approver">{record.approverName}</span>
                        <span className={`record-decision ${record.decision}`}>
                          {record.decision === 'approve' ? '✅ 同意' : '❌ 拒绝'}
                        </span>
                        <span className="record-time">
                          {new Date(record.approvalTime).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      {record.comment && (
                        <div className="record-comment">
                          <strong>意见：</strong>{record.comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 最终审批结果信息 */}
            {project.status === 'approved' && project.approver && (
              <div className="final-approval">
                <div className="status-item">
                  <span className="status-label">最终结果：</span>
                  <span className="status-text">{project.approver}</span>
                </div>
                {project.approveTime && (
                  <div className="status-item">
                    <span className="status-label">批准时间：</span>
                    <span className="status-text">
                      {new Date(project.approveTime).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 拒绝信息 - 仅当被拒绝时显示 */}
            {project.rejectedBy && (
              <div className="rejection-info">
                <div className="status-item">
                  <span className="status-label">拒绝人：</span>
                  <span className="status-text">{project.rejectedBy}</span>
                </div>
                {project.rejectedTime && (
                  <div className="status-item">
                    <span className="status-label">拒绝时间：</span>
                    <span className="status-text">
                      {new Date(project.rejectedTime).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
                {project.rejectedComment && (
                  <div className="status-item">
                    <span className="status-label">拒绝理由：</span>
                    <span className="status-text rejection-reason">{project.rejectedComment}</span>
                  </div>
                )}
              </div>
            )}
            
            {project.status === 'pending' && user.roles && user.roles.includes('manager') && hasUserApproved() && (
              <div className="already-approved">
                <div className="approved-notice">
                  ✅ 您已审批此项目，等待其他管理员审批
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      {project.status === 'pending' && user.roles && user.roles.includes('manager') && !hasUserApproved() && (
        <div className="detail-footer">
          <button 
            className="footer-btn btn-approve"
            onClick={handleApprove}
          >
            ✅ 批准立项
          </button>
          <button 
            className="footer-btn btn-reject"
            onClick={() => setShowRejectModal(true)}
          >
            ❌ 拒绝立项
          </button>
        </div>
      )}

      {/* 拒绝理由模态框 */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>拒绝立项</h3>
            <p>请填写拒绝理由（必填）：</p>
            <textarea
              className="reject-reason-textarea"
              placeholder="请详细说明拒绝此立项的原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div className="modal-buttons">
              <button onClick={() => setShowRejectModal(false)}>取消</button>
              <button 
                className="primary danger" 
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;

