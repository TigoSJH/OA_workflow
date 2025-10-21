import React, { useState, useEffect } from 'react';
import './ProjectScheduleManagement.css';
import RoleBadges from './RoleBadges';
import { apiService } from '../services/api';

const ProjectScheduleManagement = ({ user, onLogout, onBackToHome, onProjectSelect, activeRole, onRoleSwitch }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending: 待安排, scheduled: 已安排, completed: 已完成

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/projects');
      
      // 只显示已批准的项目
      const approvedProjects = response.projects.filter(p => p.category === 'approved');
      setProjects(approvedProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 统计数据
  const stats = {
    pending: projects.filter(p => !p.timeScheduleSet).length,
    scheduled: projects.filter(p => p.timeScheduleSet && !p.completed).length,
    completed: projects.filter(p => p.completed).length
  };

  // 过滤项目
  const filteredProjects = projects.filter(project => {
    if (activeTab === 'pending') return !project.timeScheduleSet;
    if (activeTab === 'scheduled') return project.timeScheduleSet && !project.completed;
    if (activeTab === 'completed') return project.completed;
    return true;
  });

  return (
    <div className="schedule-management-container">
      {/* 顶部导航栏 */}
      <div className="schedule-management-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">👨‍💼</div>
            <div className="user-details">
              <div className="user-name">
                {user.displayName || user.username}
                {user.isPrimaryLeader && user.primaryLeaderRoles && 
                 user.primaryLeaderRoles.includes('manager') && (
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
          <button className="back-home-btn" onClick={onBackToHome}>
            ← 返回首页
          </button>
          <button className="logout-btn" onClick={onLogout}>
            🚪 退出登录
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="schedule-management-content">
        <h1 className="page-title">项目周期安排管理</h1>

        {/* 统计卡片 */}
        <div className="stats-grid">
          <div className="stat-card stat-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{stats.pending}</div>
              <div className="stat-label">待安排</div>
            </div>
          </div>
          <div className="stat-card stat-scheduled">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.scheduled}</div>
              <div className="stat-label">已安排</div>
            </div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.completed}</div>
              <div className="stat-label">已完成</div>
            </div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ 待安排 ({stats.pending})
          </button>
          <button 
            className={`tab ${activeTab === 'scheduled' ? 'active' : ''}`}
            onClick={() => setActiveTab('scheduled')}
          >
            📅 已安排 ({stats.scheduled})
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            ✅ 已完成 ({stats.completed})
          </button>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="loading-message">加载中...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>暂无项目</p>
          </div>
        ) : (
          <div className="project-list">
            {filteredProjects.map(project => (
              <div key={project.id} className="project-card" onClick={() => onProjectSelect(project.id)}>
                <div className="project-header">
                  <div className="project-type-badge">
                    {project.projectType === 'research' ? '🔬 研发立项' : '📝 合同立项'}
                  </div>
                  <div className={`status-badge ${
                    !project.timeScheduleSet ? 'status-pending' : 
                    project.completed ? 'status-completed' : 'status-scheduled'
                  }`}>
                    {!project.timeScheduleSet ? '⏳ 待安排' : 
                     project.completed ? '✅ 已完成' : '📅 已安排'}
                  </div>
                </div>
                <h3 className="project-title">{project.projectName}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-meta">
                  <span>创建人：{project.createdByName}</span>
                  <span>优先级：
                    <span className={`priority priority-${project.priority}`}>
                      {project.priority === 'high' ? '🔴 高' : 
                       project.priority === 'medium' ? '🟡 中' : '🟢 低'}
                    </span>
                  </span>
                  {project.timeScheduleSet && (
                    <span>安排人：{project.timeScheduleSetBy}</span>
                  )}
                </div>
                {project.timeScheduleSet && project.timelines && (
                  <div className="timeline-summary">
                    <div className="timeline-item">
                      <span className="timeline-label">研发：</span>
                      <span className="timeline-value">{project.timelines.researcherTime || 0}天</span>
                    </div>
                    <div className="timeline-item">
                      <span className="timeline-label">工程：</span>
                      <span className="timeline-value">{project.timelines.engineerTime || 0}天</span>
                    </div>
                    <div className="timeline-item">
                      <span className="timeline-label">采购：</span>
                      <span className="timeline-value">{project.timelines.purchaserTime || 0}天</span>
                    </div>
                    <div className="timeline-item">
                      <span className="timeline-label">加工：</span>
                      <span className="timeline-value">{project.timelines.processorTime || 0}天</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectScheduleManagement;

