import React, { useState, useEffect } from 'react';
import './ProjectWarehouseIn.css';
import WarehouseInDetail from './WarehouseInDetail';
import NotificationModal from './NotificationModal';
import RoleBadges from './RoleBadges';
import { projectAPI, notificationAPI } from '../services/api';

const WarehouseInSecond = ({ user, onLogout, activeRole, onRoleSwitch, onSwitchToFirst }) => {
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
          n.type === 'project_ready_for_warehousein_second'
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
      // 待整机入库：调试已完成 && 第一次入库已完成 && 第二次入库未完成
      return projects.filter(p => 
        p.testingCompleted === true && 
        p.warehouseInCompleted === true && 
        !p.warehouseInSecondCompleted
      );
    } else {
      // 整机入库完成：第二次入库已完成
      return projects.filter(p => 
        p.warehouseInSecondCompleted === true
      );
    }
  };

  const filteredProjects = getFilteredProjects();

  // 统计数据
  const stats = {
    pending: projects.filter(p => 
      p.testingCompleted === true && 
      p.warehouseInCompleted === true && 
      !p.warehouseInSecondCompleted
    ).length,
    completed: projects.filter(p => p.warehouseInSecondCompleted === true).length
  };

  const handleProjectClick = async (project) => {
    try {
      // 重新获取完整的项目数据（包括 purchaseComponents 和 processingComponents）
      const response = await projectAPI.getProjectById(project.id);
      setSelectedProject(response.project);
    } catch (error) {
      console.error('获取项目详情失败:', error);
      // 如果获取失败，还是使用列表中的数据
      setSelectedProject(project);
    }
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
      <WarehouseInDetail
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
    <div className="warehouse-in-container">
      {/* 通知弹窗 */}
      {pendingNotification && (
        <NotificationModal
          notification={pendingNotification}
          onView={async (n) => {
            try {
              await notificationAPI.markAsRead(n._id || n.id);
            } catch {}
            setPendingNotification(null);
            const project = projects.find(p => String(p.id) === String(n.projectId));
            if (project) {
              setSelectedProject(project);
            }
          }}
          onDismiss={handleSuppressNotification}
        />
      )}

      {/* 顶部导航栏 */}
      <div className="warehouse-in-header">
        <div className="user-info-section">
          <div className="user-avatar">🏭</div>
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
          <button className="action-btn switch-btn" onClick={onSwitchToFirst}>
            <span className="btn-icon">📦</span>
            <span className="btn-text">第一次入库</span>
          </button>
          <button className="action-btn logout-btn" onClick={onLogout}>
            <span className="btn-icon">🚪</span>
            <span className="btn-text">退出登录</span>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="warehouse-in-content">
        <h1 className="page-title">入库管理（整机入库）</h1>

        {/* 统计卡片 */}
        <div className="stats-container">
          <div className="stat-card highlight">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">待整机入库</div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">整机入库完成</div>
            </div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ 待整机入库 ({stats.pending})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            ✅ 整机入库完成 ({stats.completed})
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
                ? '暂无待入库项目' 
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
                    {activeTab === 'pending' ? '⏳ 待入库' : '✅ 已完成'}
                  </div>
                </div>
                <h3 className="project-title">{project.projectName}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-meta">
                  <span>📅 创建时间：{new Date(project.createTime).toLocaleDateString()}</span>
                  {project.researchBudget && (
                    <span>💰 预算：{project.researchBudget} 万</span>
                  )}
                  {project.budget && (
                    <span>💰 预算：{project.budget} 万</span>
                  )}
                  {project.researchDuration && (
                    <span>⏱️ 时长：{project.researchDuration} 月</span>
                  )}
                  {project.duration && (
                    <span>⏱️ 时长：{project.duration} 月</span>
                  )}
                  {project.warehouseInSecondCompletedBy && (
                    <span>👤 入库人：{project.warehouseInSecondCompletedBy}</span>
                  )}
                  {project.warehouseInSecondCompletedTime && (
                    <span>🕒 完成时间：{new Date(project.warehouseInSecondCompletedTime).toLocaleString()}</span>
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

export default WarehouseInSecond;

