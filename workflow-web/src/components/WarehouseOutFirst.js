import React, { useState, useEffect } from 'react';
import './ProjectWarehouseOut.css';
import WarehouseOutDetail from './WarehouseOutDetail';
import NotificationModal from './NotificationModal';
import RoleBadges from './RoleBadges';
import { projectAPI, notificationAPI } from '../services/api';

const WarehouseOutFirst = ({ user, onLogout, activeRole, onRoleSwitch, onSwitchToSecond }) => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' 或 'completed'
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [pendingNotification, setPendingNotification] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      try {
        const res = await notificationAPI.getNotifications({ 
          unreadOnly: true
        });
        const list = (res.notifications || []).filter(n => 
          n.type === 'project_ready_for_warehouseout'
        ).slice();
        
        const suppressId = localStorage.getItem('suppressNotificationProjectId');
        const filtered = list.filter(n => {
          const pid = String(n.projectId || '');
          if (suppressId && pid === String(suppressId)) return false;
          
          const projectExists = projects.some(p => String(p.id) === pid);
          if (!projectExists) {
            return false;
          }
          
          return true;
        });
        
        if (filtered.length > 0) {
          setPendingNotification(filtered[0]);
        } else {
          setPendingNotification(null);
          if (suppressId) localStorage.removeItem('suppressNotificationProjectId');
        }
      } catch (e) {
        console.error('获取通知失败:', e.message);
      }
    };
    
    if (projects.length >= 0) {
      fetchNotifications();
    }
  }, [user, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getProjects({ status: 'approved' });
      setProjects(response.projects || []);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据标签页过滤项目
  const getFilteredProjects = () => {
    if (activeTab === 'pending') {
      // 待领料出库：第一次入库已完成 && 第一次出库未完成
      return projects.filter(p => 
        p.warehouseInCompleted === true && !p.warehouseOutCompleted
      );
    } else {
      // 领料出库完成：第一次出库已完成
      return projects.filter(p => 
        p.warehouseOutCompleted === true
      );
    }
  };

  const filteredProjects = getFilteredProjects();

  // 统计数据
  const stats = {
    pending: projects.filter(p => p.warehouseInCompleted === true && !p.warehouseOutCompleted).length,
    completed: projects.filter(p => p.warehouseOutCompleted === true).length
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    loadProjects();
  };

  const handleCloseNotification = () => {
    setPendingNotification(null);
  };

  const handleOpenProject = async (projectId) => {
    if (pendingNotification) {
      try {
        await notificationAPI.markAsRead(pendingNotification.id);
        console.log('已标记通知为已读');
      } catch (e) {
        console.error('标记通知已读失败:', e);
      }
    }

    const project = projects.find(p => String(p.id) === String(projectId));
    if (project) {
      setSelectedProject(project);
      setPendingNotification(null);
    }
  };

  const handleSuppressNotification = async () => {
    if (!pendingNotification) return;
    
    try {
      await notificationAPI.markAsRead(pendingNotification.id);
      
      const projectId = pendingNotification.projectId;
      localStorage.setItem('suppressNotificationProjectId', String(projectId));
      
      setPendingNotification(null);
      console.log('已抑制通知');
    } catch (e) {
      console.error('抑制通知失败:', e);
    }
  };

  if (selectedProject) {
    return (
      <WarehouseOutDetail
        project={selectedProject}
        user={user}
        onBack={handleBackToList}
        onLogout={onLogout}
        activeRole={activeRole}
        onRoleSwitch={onRoleSwitch}
      />
    );
  }

  return (
    <div className="warehouse-out-container">
      {/* 通知弹窗 */}
      {pendingNotification && (
        <NotificationModal
          notification={pendingNotification}
          onClose={handleCloseNotification}
          onOpenProject={handleOpenProject}
          onSuppress={handleSuppressNotification}
        />
      )}

      {/* 顶部导航栏 */}
      <div className="warehouse-out-header">
        <div className="user-info-section">
          <div className="user-avatar">📤</div>
          <div className="user-details">
            <div className="user-name">{user.displayName || user.username}</div>
            <RoleBadges 
              user={user} 
              activeRole={activeRole} 
              onRoleSwitch={onRoleSwitch} 
            />
          </div>
        </div>
        <div className="header-actions">
          <button className="action-btn switch-btn" onClick={onSwitchToSecond}>
            <span className="btn-icon">🏭</span>
            <span className="btn-text">第二次出库</span>
          </button>
          <button className="action-btn logout-btn" onClick={onLogout}>
            <span className="btn-icon">🚪</span>
            <span className="btn-text">退出登录</span>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="warehouse-out-content">
        <h1 className="page-title">出库管理（领料出库）</h1>

        {/* 统计卡片 */}
        <div className="stats-container">
          <div className="stat-card highlight">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">待领料出库</div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">领料出库完成</div>
            </div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ 待领料出库 ({stats.pending})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            ✅ 领料出库完成 ({stats.completed})
          </button>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="loading-message">加载中...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>
              {activeTab === 'pending' 
                ? '暂无待出库项目' 
                : '暂无已完成记录'}
            </p>
          </div>
        ) : (
          <div className="project-list">
            {filteredProjects.map(project => (
              <div 
                key={project.id} 
                className="project-card"
                onClick={() => handleProjectClick(project)}
              >
                <div className="project-header">
                  <div className="project-type-badge">
                    {project.projectType === 'research' ? '🔬 研发立项' : '📝 合同立项'}
                  </div>
                  <div className={`status-badge ${activeTab === 'pending' ? 'status-pending' : 'status-completed'}`}>
                    {activeTab === 'pending' ? '⏳ 待出库' : '✅ 已完成'}
                  </div>
                </div>
                <h3 className="project-title">{project.projectName}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-meta">
                  <span>📅 创建时间：{new Date(project.createTime).toLocaleDateString()}</span>
                  {project.warehouseOutCompletedBy && (
                    <span>👤 出库人：{project.warehouseOutCompletedBy}</span>
                  )}
                  {project.warehouseOutCompletedTime && (
                    <span>🕒 完成时间：{new Date(project.warehouseOutCompletedTime).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseOutFirst;

