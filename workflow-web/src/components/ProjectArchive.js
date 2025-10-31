import React, { useState, useEffect } from 'react';
import './ProjectArchive.css';
import RoleBadges from './RoleBadges';
import NotificationModal from './NotificationModal';
import { projectAPI, notificationAPI } from '../services/api';

const ProjectArchive = ({ user, onLogout, onBackToHome, onProjectSelect, activeRole, onRoleSwitch }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all: 全部, unarchived: 待归档, archived: 已归档
  const [pendingNotification, setPendingNotification] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  // 加载通知
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      try {
        const res = await notificationAPI.getNotifications({ 
          unreadOnly: true,
          type: 'project_ready_for_archive'
        });
        const list = (res.notifications || []).slice();
        
        // 过滤掉已经被抑制的通知，并验证项目确实已经下发
        const suppressId = localStorage.getItem('suppressNotificationProjectId');
        const filtered = list.filter(n => {
          const pid = String(n.projectId || '');
          // 过滤掉已抑制的通知
          if (suppressId && pid === String(suppressId)) return false;
          
          // 验证项目是否在可见列表中（已下发）
          const projectExists = projects.some(p => String(p.id) === pid);
          if (!projectExists) {
            console.log(`通知对应的项目 ${pid} 尚未下发，暂不显示通知`);
            return false;
          }
          
          return true;
        });
        
        console.log('[归档] 过滤后的通知:', filtered.length, '条');
        if (filtered.length > 0) {
          setPendingNotification(filtered[0]);
        }
      } catch (err) {
        console.error('[归档] 获取通知失败:', err);
      }
    };
    
    if (projects.length > 0) {
      fetchNotifications();
    }
  }, [projects, user]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getProjects({ status: 'approved' });
      
      // 只显示第二次出库完成的项目（等待归档）
      const completedProjects = (response.projects || []).filter(p => 
        p.warehouseOutSecondCompleted === true
      );
      setProjects(completedProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 统计数据
  const stats = {
    all: projects.length,
    unarchived: projects.filter(p => !p.archived).length,
    archived: projects.filter(p => p.archived).length
  };

  // 过滤项目
  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unarchived') return !project.archived;
    if (activeTab === 'archived') return project.archived;
    return true;
  });

  // 处理通知
  const handleNotificationClick = async (projectId) => {
    console.log('[归档] 点击通知，查看项目:', projectId);
    // 标记通知已读
    if (pendingNotification && pendingNotification._id) {
      try {
        await notificationAPI.markAsRead(pendingNotification._id);
        console.log('[归档] 通知已标记为已读');
      } catch (err) {
        console.error('[归档] 标记通知失败:', err);
      }
    }
    setPendingNotification(null);
    // 切换到待归档标签
    setActiveTab('unarchived');
    // 跳转到项目详情
    onProjectSelect(projectId);
  };

  const handleNotificationClose = async () => {
    console.log('[归档] 关闭通知');
    // 标记通知已读
    if (pendingNotification && pendingNotification._id) {
      try {
        await notificationAPI.markAsRead(pendingNotification._id);
        console.log('[归档] 通知已标记为已读');
      } catch (err) {
        console.error('[归档] 标记通知失败:', err);
      }
    }
    setPendingNotification(null);
  };

  return (
    <div className="archive-container">
      {/* 顶部导航栏 */}
      <div className="archive-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">📁</div>
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
      <div className="archive-content">
        <h1 className="page-title">项目归档管理</h1>

        {/* 统计卡片 */}
        <div className="stats-grid">
          <div className="stat-card stat-all">
            <div className="stat-icon">📊</div>
            <div className="stat-number">{stats.all}</div>
            <div className="stat-label">全部项目</div>
          </div>
          <div className="stat-card stat-unarchived">
            <div className="stat-icon">📥</div>
            <div className="stat-number">{stats.unarchived}</div>
            <div className="stat-label">待归档</div>
          </div>
          <div className="stat-card stat-archived">
            <div className="stat-icon">✅</div>
            <div className="stat-number">{stats.archived}</div>
            <div className="stat-label">已归档</div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            📊 全部项目 ({stats.all})
          </button>
          <button 
            className={`tab ${activeTab === 'unarchived' ? 'active' : ''}`}
            onClick={() => setActiveTab('unarchived')}
          >
            📥 待归档 ({stats.unarchived})
          </button>
          <button 
            className={`tab ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
          >
            ✅ 已归档 ({stats.archived})
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
                  <div className={`status-badge ${project.archived ? 'status-archived' : 'status-pending'}`}>
                    {project.archived ? '✅ 已归档' : '📥 待归档'}
                  </div>
                </div>
                <h3 className="project-title">{project.projectName}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-meta">
                  <span>💰 预算：{project.budget ? `${project.budget} 万` : '未设置'}</span>
                  <span>👤 申请人：{project.createdByName || '未知'}</span>
                  <span>📅 出库完成：{project.warehouseOutCompletedTime ? new Date(project.warehouseOutCompletedTime).toLocaleDateString('zh-CN') : '未知'}</span>
                  <span className={`priority priority-${project.priority || 'normal'}`}>
                    {project.priority === 'high' ? '🔴 高优先级' : 
                     project.priority === 'urgent' ? '🟠 紧急' : '🟢 普通'}
                  </span>
                </div>
                {project.archived && project.archivedBy && (
                  <div className="archive-info">
                    <span>📁 归档人：{project.archivedBy}</span>
                    <span>📅 归档时间：{project.archivedTime ? new Date(project.archivedTime).toLocaleDateString('zh-CN') : '未知'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 通知弹窗 */}
      {pendingNotification && (
        <NotificationModal
          notification={pendingNotification}
          onView={(notif) => handleNotificationClick(notif.projectId)}
          onDismiss={() => handleNotificationClose()}
        />
      )}
    </div>
  );
};

export default ProjectArchive;

