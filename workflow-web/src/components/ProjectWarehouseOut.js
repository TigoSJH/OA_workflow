import React, { useState, useEffect } from 'react';
import './ProjectWarehouseOut.css';
import WarehouseOutDetail from './WarehouseOutDetail';
import NotificationModal from './NotificationModal';
import DeadlineWarningModal from './DeadlineWarningModal';
import RoleBadges from './RoleBadges';
import { projectAPI, notificationAPI } from '../services/api';

const ProjectWarehouseOut = ({ user, onLogout, activeRole, onRoleSwitch }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [pendingNotification, setPendingNotification] = useState(null);
  const [deadlineWarning, setDeadlineWarning] = useState(null); // 截止日期预警

  // 加载从入库推送过来的项目
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
          type: 'project_ready_for_warehouseout'
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
    
    // 项目加载完成后再检查通知
    if (projects.length >= 0) {
      fetchNotifications();
    }
  }, [user, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // 获取调试已完成的项目（调试 -> 出库）
      const response = await projectAPI.getProjects({ status: 'approved' });
      // 过滤出调试已完成的项目
      const warehouseOutProjects = (response.projects || []).filter(p => 
        p.testingCompleted === true
      );
      setProjects(warehouseOutProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 出库阶段不再显示时间周期/剩余时间
  const calculateRemainingDays = () => null;

  // 检查截止日期预警
  useEffect(() => {
    checkDeadlines();
  }, [projects]);

  const checkDeadlines = () => {
    const today = new Date().toDateString();
    const lastCheck = localStorage.getItem('lastDeadlineCheckWarehouseOut');
    
    if (lastCheck === today) {
      return;
    }

    const urgentProjects = projects.filter(p => {
      if (p.warehouseOutCompleted) return false;
      const remaining = calculateRemainingDays(p);
      return remaining !== null && remaining >= 0 && remaining <= 3;
    });

    if (urgentProjects.length > 0) {
      setDeadlineWarning({
        projects: urgentProjects,
        onClose: () => {
          localStorage.setItem('lastDeadlineCheckWarehouseOut', today);
          setDeadlineWarning(null);
        },
        onIgnore: () => {
          localStorage.setItem('lastDeadlineCheckWarehouseOut', today);
          setDeadlineWarning(null);
        }
      });
    }
  };

  const handleNotificationClick = async (notificationId, projectId) => {
    const project = projects.find(p => String(p.id) === String(projectId));
    if (project) {
      setSelectedProject(project);
      
      if (notificationId) {
        try {
          await notificationAPI.markAsRead(notificationId);
        } catch (error) {
          console.error('标记通知已读失败:', error);
        }
      }
      
      setPendingNotification(null);
      localStorage.removeItem('suppressNotificationProjectId');
    }
  };

  const handleIgnoreNotification = (projectId) => {
    localStorage.setItem('suppressNotificationProjectId', String(projectId));
    setPendingNotification(null);
  };

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'pending') {
      return !project.warehouseOutCompleted;
    } else if (activeTab === 'completed') {
      return project.warehouseOutCompleted;
    }
    return true;
  });

  if (selectedProject) {
    return (
      <WarehouseOutDetail
        project={selectedProject}
        user={user}
        onBack={() => {
          setSelectedProject(null);
          loadProjects();
        }}
      />
    );
  }

  return (
    <div className="warehouseout-container">
      {/* 顶部导航栏 */}
      <div className="warehouseout-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">📤</div>
            <div className="user-details">
              <div className="user-name">
                {user.displayName || user.username}
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
          <button className="btn-logout" onClick={onLogout}>
            🚪 退出登录
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{projects.length}</div>
            <div className="stat-label">全部项目</div>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{projects.filter(p => !p.warehouseOutCompleted).length}</div>
            <div className="stat-label">待出库</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{projects.filter(p => p.warehouseOutCompleted).length}</div>
            <div className="stat-label">已完成</div>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          全部 ({projects.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          待出库 ({projects.filter(p => !p.warehouseOutCompleted).length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          已完成 ({projects.filter(p => p.warehouseOutCompleted).length})
        </button>
      </div>

      {/* 项目列表 */}
      <div className="projects-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>暂无项目</h3>
            <p>等待调试完成后推送到出库阶段</p>
          </div>
        ) : (
          <div className="project-grid">
            {filteredProjects.map((project) => {
              const remainingDays = calculateRemainingDays(project);
              const isUrgent = remainingDays !== null && remainingDays >= 0 && remainingDays <= 3;
              
              return (
                <div 
                  key={project.id} 
                  className="project-card"
                  onClick={() => setSelectedProject(project)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="project-header">
                    <div className="project-type">
                      📤 出库项目
                    </div>
                    <span className={`status-badge status-${project.warehouseOutCompleted ? 'completed' : 'pending'}`}>
                      {project.warehouseOutCompleted ? '✅ 已完成' : '⏳ 待出库'}
                    </span>
                  </div>
                  <h3 className="project-title">{project.projectName}</h3>
                  <p className="project-description">{project.description}</p>
                  <div className="project-meta">
                    <span>💰 预算：{project.budget ? `${project.budget} 万` : '未设置'}</span>
                    <span>👤 申请人：{project.createdByName || '未知'}</span>
                    <span>📅 时间：{project.createTime ? new Date(project.createTime).toLocaleString('zh-CN') : '未知'}</span>
                  {/* 出库阶段不显示周期 */}
                  </div>
                  {!project.warehouseOutCompleted && remainingDays !== null && (
                    <div className={`remaining-days ${isUrgent ? 'urgent' : ''}`}>
                      ⏰ 剩余 {remainingDays >= 0 ? remainingDays : 0} 日完成
                      {isUrgent && remainingDays >= 0 && (
                        <span className="urgent-badge">紧急</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pendingNotification && (
        <NotificationModal
          notification={pendingNotification}
          onView={(n) => handleNotificationClick(n._id, n.projectId)}
          onDismiss={(n) => handleIgnoreNotification(n.projectId)}
        />
      )}

      {deadlineWarning && (
        <DeadlineWarningModal
          projects={deadlineWarning.projects}
          onClose={deadlineWarning.onClose}
          onViewProject={(project) => {
            setSelectedProject(project);
            deadlineWarning.onClose();
          }}
          stageName="出库"
        />
      )}
    </div>
  );
};

export default ProjectWarehouseOut;

