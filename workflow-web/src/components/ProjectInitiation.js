import React, { useState, useEffect } from 'react';
import './ProjectInitiation.css';
import ProjectDetail from './ProjectDetail';
import RoleBadges from './RoleBadges';
import { projectAPI } from '../services/api';

const ProjectInitiation = ({ user, onLogout, onSwitchToDevelopment, onSwitchToScheduleManagement, onSwitchToArchive, openProjectId, onProjectOpened, activeRole, onRoleSwitch }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  
  // 确定当前角色
  const currentRole = activeRole === 'researcher_initiation' ? 'researcher' : 'manager';

  const [newProject, setNewProject] = useState({
    type: 'research', // research: 研发立项, contract: 合同立项
    projectName: '',
    description: '',
    // 研发立项字段
    researcher: user.displayName,
    researchDirection: '',
    researchPurpose: '',
    // 通用字段
    budget: '',
    duration: '',
    priority: 'normal',
  });

  // 项目数据
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 加载项目数据
  useEffect(() => {
    loadProjects();
  }, []);

  // 如果存在需要直接打开的项目ID，自动选中（仅在当前为主页面时触发）
  useEffect(() => {
    const openId = localStorage.getItem('openProjectId');
    if (!openId || projects.length === 0) return;
    const found = projects.find(p => String(p.id) === String(openId));
    if (found) {
      setSelectedProject(found);
      localStorage.removeItem('openProjectId');
    }
  }, [projects]);

  // 监听从 App.js 传来的 openProjectId prop（点击通知"立即查看"时触发）
  useEffect(() => {
    if (!openProjectId || projects.length === 0) return;
    const found = projects.find(p => String(p.id) === String(openProjectId));
    if (found) {
      setSelectedProject(found);
      // 清除 localStorage 和 App.js 的状态
      try {
        localStorage.removeItem('openProjectId');
      } catch (e) {}
      if (onProjectOpened) {
        onProjectOpened(); // 通知 App.js 清除 openProjectId 状态
      }
    }
  }, [openProjectId, projects, onProjectOpened]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await projectAPI.getProjects();
      setProjects(response.projects || []);
    } catch (error) {
      setError(error.message || '加载项目数据失败');
      console.error('加载项目数据错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: projects.length,
    pending: projects.filter(p => p.status === 'pending').length,
    approved: projects.filter(p => p.status === 'approved').length,
    rejected: projects.filter(p => p.status === 'rejected').length,
  };

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return project.status === 'pending';
    if (activeTab === 'approved') return project.status === 'approved';
    if (activeTab === 'rejected') return project.status === 'rejected';
    return true;
  });

  const handleCreateProject = async () => {
    if (!newProject.projectName || !newProject.description) {
      console.warn('请填写项目名称和描述');
      return;
    }

    // 研发立项的必填项验证
    if (newProject.type === 'research') {
      if (!newProject.researchDirection || !newProject.researchPurpose) {
        console.warn('请填写研发方向和研发用途');
        return;
      }
    }

    try {
      setLoading(true);
      
      const projectData = {
        projectName: newProject.projectName,
        projectType: newProject.type,
        description: newProject.description,
        budget: newProject.budget,
        duration: newProject.duration,
        priority: newProject.priority,
        // 研发立项字段
        researchDirection: newProject.researchDirection,
        researchPurpose: newProject.researchPurpose,
        researchBudget: newProject.budget,
        researchDuration: newProject.duration,
        // 合同立项字段
        contractAmount: newProject.budget,
        contractDuration: newProject.duration,
      };

      await projectAPI.createProject(projectData);
      
      setShowCreateForm(false);
      setNewProject({
        type: 'research',
        projectName: '',
        description: '',
        researcher: user.displayName,
        researchDirection: '',
        researchPurpose: '',
        budget: '',
        duration: '',
        priority: 'normal',
      });
      
      console.log('立项申请已提交');
      loadProjects(); // 重新加载项目列表
    } catch (error) {
      console.error('提交立项申请失败:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (projectId) => {
    try {
      setLoading(true);
      await projectAPI.approveProject(projectId, 'approve');
      console.log('已批准立项');
      loadProjects(); // 重新加载项目列表
    } catch (error) {
      console.error('审批失败:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (projectId) => {
    try {
      setLoading(true);
      await projectAPI.approveProject(projectId, 'reject');
      console.log('已拒绝立项');
      loadProjects(); // 重新加载项目列表
    } catch (error) {
      console.error('审批失败:', error.message);
    } finally {
      setLoading(false);
    }
  };


  // 如果选中了立项，显示详情页
  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        user={user}
        onBack={() => {
          setSelectedProject(null);
          // 返回时重新加载项目列表（因为可能有变化）
          setTimeout(() => {
            loadProjects();
          }, 100);
        }}
        onUpdate={(updatedProject) => {
          setProjects(projects.map(p => 
            p.id === updatedProject.id ? updatedProject : p
          ));
          setSelectedProject(null);
          // 更新后重新加载项目列表确保数据同步
          setTimeout(() => {
            loadProjects();
          }, 100);
        }}
      />
    );
  }

  return (
    <div className="initiation-container">
      {/* 顶部导航栏 */}
      <div className="initiation-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">👨‍💼</div>
            <div className="user-details">
              <div className="user-name">
                {user.displayName || user.username}
                {user.isPrimaryLeader && user.primaryLeaderRoles && 
                 user.primaryLeaderRoles.includes(currentRole) && (
                  <span className="primary-leader-badge">（主负责人）</span>
                )}
              </div>
              <RoleBadges 
                user={user} 
                activeRole={activeRole} 
                onRoleSwitch={onRoleSwitch} 
              />
            </div>
          </div>
        </div>
        <div className="header-right">
          {currentRole === 'researcher' && onSwitchToDevelopment && (
            <button className="switch-view-btn" onClick={onSwitchToDevelopment}>
              🔧 项目开发
            </button>
          )}
          {currentRole === 'manager' && user.isPrimaryLeader && 
           user.primaryLeaderRoles && user.primaryLeaderRoles.includes('manager') && 
           onSwitchToScheduleManagement && (
            <button className="schedule-management-btn" onClick={onSwitchToScheduleManagement}>
              📅 周期管理
            </button>
          )}
          {currentRole === 'manager' && user.isPrimaryLeader && 
           user.primaryLeaderRoles && user.primaryLeaderRoles.includes('manager') && 
           onSwitchToArchive && (
            <button className="archive-management-btn" onClick={onSwitchToArchive}>
              📁 归档管理
            </button>
          )}
          <button className="create-btn" onClick={() => setShowCreateForm(true)}>
            {currentRole === 'researcher' ? '➕ 新建研发项目' : '➕ 新建立项'}
          </button>
          <button className="logout-btn" onClick={onLogout}>
            🚪 退出登录
          </button>
        </div>
      </div>

      <div className="initiation-content">
        <div className="title-bar">
          <h1 className="page-title">
            {currentRole === 'researcher' ? '项目研发管理' : 'OA立项管理'}
          </h1>
        </div>

        {/* 统计卡片 */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">📊</div>
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">
              {currentRole === 'researcher' ? '全部项目' : '全部立项'}
            </div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">
              {currentRole === 'researcher' ? '待评估' : '待审批'}
            </div>
          </div>
          <div className="stat-card stat-approved">
            <div className="stat-icon">✅</div>
            <div className="stat-number">{stats.approved}</div>
            <div className="stat-label">
              {currentRole === 'researcher' ? '已立项' : '已批准'}
            </div>
          </div>
          <div className="stat-card stat-rejected">
            <div className="stat-icon">❌</div>
            <div className="stat-number">{stats.rejected}</div>
            <div className="stat-label">
              {currentRole === 'researcher' ? '已驳回' : '已拒绝'}
            </div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            全部
          </button>
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            {currentRole === 'researcher' ? '待评估' : '待审批'}
          </button>
          <button 
            className={`tab ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            {currentRole === 'researcher' ? '已立项' : '已批准'}
          </button>
          <button 
            className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            {currentRole === 'researcher' ? '已驳回' : '已拒绝'}
          </button>
        </div>

        {/* 立项列表 */}
        <div className="project-list">
          {filteredProjects.map(project => (
            <div 
              key={project.id} 
              className="project-card"
              onClick={() => setSelectedProject(project)}
              style={{ cursor: 'pointer' }}
            >
              <div className="project-header">
                <div className="project-type">
                  {project.projectType === 'research' 
                    ? (currentRole === 'researcher' ? '🔬 研发项目' : '🔬 研发立项')
                    : (currentRole === 'researcher' ? '📄 合同项目' : '📄 合同立项')
                  }
                </div>
                <span className={`status-badge status-${project.status}`}>
                  {project.status === 'pending' && (
                    <>
                      {currentRole === 'researcher' ? '⏳ 待评估' : '⏳ 待审批'}
                      {project.approvalProgress && (
                        <span className="progress-text">
                          {' '}({project.approvalProgress.approved}/{project.approvalProgress.required})
                        </span>
                      )}
                    </>
                  )}
                  {project.status === 'approved' && (currentRole === 'researcher' ? '✅ 已立项' : '✅ 已批准')}
                  {project.status === 'rejected' && (currentRole === 'researcher' ? '❌ 已驳回' : '❌ 已拒绝')}
                  {project.status === 'in_progress' && '🔄 进行中'}
                  {project.status === 'completed' && '✅ 已完成'}
                </span>
              </div>
              <h3 className="project-title">{project.projectName}</h3>
              <p className="project-description">{project.description}</p>
              <div className="project-meta">
                <span>💰 预算：{project.budget ? `${project.budget} 万` : '未设置'}</span>
                <span>👤 申请人：{project.createdByName}</span>
                <span>📅 时间：{new Date(project.createTime).toLocaleString('zh-CN')}</span>
                <span className={`priority priority-${project.priority}`}>
                  {project.priority === 'high' ? '🔴 高优先级' : 
                   project.priority === 'urgent' ? '🟠 紧急' : '🟢 普通'}
                </span>
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无立项申请</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建立项弹窗 */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>新建立项申请</h3>
            <div className="form-group">
              <label>立项类型 *</label>
              <select
                value={newProject.type}
                onChange={(e) => setNewProject({...newProject, type: e.target.value})}
              >
                <option value="research">🔬 研发立项</option>
                <option value="contract">📄 合同立项</option>
              </select>
            </div>
            <div className="form-group">
              <label>项目名称 *</label>
              <input
                type="text"
                value={newProject.projectName}
                onChange={(e) => setNewProject({...newProject, projectName: e.target.value})}
                placeholder="请输入项目名称"
              />
            </div>
            <div className="form-group">
              <label>项目描述 *</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                placeholder="请详细描述项目内容、目标和预期成果"
                rows={4}
              />
            </div>

            {/* 研发立项特有字段 */}
            {newProject.type === 'research' && (
              <>
                <div className="form-group">
                  <label>研发人 *</label>
                  <input
                    type="text"
                    value={newProject.researcher}
                    onChange={(e) => setNewProject({...newProject, researcher: e.target.value})}
                    placeholder="请输入研发负责人"
                  />
                </div>
                <div className="form-group">
                  <label>研发方向 *</label>
                  <input
                    type="text"
                    value={newProject.researchDirection}
                    onChange={(e) => setNewProject({...newProject, researchDirection: e.target.value})}
                    placeholder="如：智能制造、自动化控制等"
                  />
                </div>
                <div className="form-group">
                  <label>研发用途 *</label>
                  <textarea
                    value={newProject.researchPurpose}
                    onChange={(e) => setNewProject({...newProject, researchPurpose: e.target.value})}
                    placeholder="请描述研发目的、预期应用场景和效益"
                    rows={3}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>研发经费</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        value={newProject.budget}
                        onChange={(e) => setNewProject({...newProject, budget: e.target.value})}
                        placeholder="如：50"
                        min="0"
                        step="0.1"
                      />
                      <span className="unit-label">万</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>研发时间</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        value={newProject.duration}
                        onChange={(e) => setNewProject({...newProject, duration: e.target.value})}
                        placeholder="如：6"
                        min="0"
                        step="1"
                      />
                      <span className="unit-label">月</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 合同立项特有字段 */}
            {newProject.type === 'contract' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>项目预算</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        value={newProject.budget}
                        onChange={(e) => setNewProject({...newProject, budget: e.target.value})}
                        placeholder="如：200"
                        min="0"
                        step="0.1"
                      />
                      <span className="unit-label">万</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>项目时间</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        value={newProject.duration}
                        onChange={(e) => setNewProject({...newProject, duration: e.target.value})}
                        placeholder="如：3"
                        min="0"
                        step="1"
                      />
                      <span className="unit-label">月</span>
                    </div>
                  </div>
                </div>
                <div className="form-notice">
                  <span className="notice-icon">ℹ️</span>
                  <span className="notice-text">
                    合同PDF文档可在立项批准后，在详情页中上传
                  </span>
                </div>
              </>
            )}

            <div className="form-group">
              <label>优先级</label>
              <select
                value={newProject.priority}
                onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
              >
                <option value="normal">普通</option>
                <option value="high">高优先级</option>
              </select>
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowCreateForm(false)}>取消</button>
              <button className="primary" onClick={handleCreateProject}>提交申请</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectInitiation;

