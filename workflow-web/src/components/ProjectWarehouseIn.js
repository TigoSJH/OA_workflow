import React, { useState, useEffect } from 'react';
import './ProjectWarehouseIn.css';
import WarehouseInDetail from './WarehouseInDetail';
import NotificationModal from './NotificationModal';
import DeadlineWarningModal from './DeadlineWarningModal';
import RoleBadges from './RoleBadges';
import { projectAPI, notificationAPI } from '../services/api';

const ProjectWarehouseIn = ({ user, onLogout, activeRole, onRoleSwitch }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [pendingNotification, setPendingNotification] = useState(null);
  const [deadlineWarning, setDeadlineWarning] = useState(null); // 截止日期预警

  // 加载从加工推送过来的项目（加工 -> 入库）
  useEffect(() => {
    loadProjects();
  }, []);

  // 加载通知
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      try {
        const res = await notificationAPI.getNotifications({ 
          unreadOnly: true
        });
        // 过滤第一次和第二次入库的通知
        const list = (res.notifications || []).filter(n => 
          n.type === 'project_ready_for_warehousein' || 
          n.type === 'project_ready_for_warehousein_second'
        ).slice();
        
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
      // 获取加工已完成的项目
      const response = await projectAPI.getProjects({ status: 'approved' });
      // 过滤出需要入库的项目：
      // 1. 第一次入库：加工已完成 && 第一次入库未完成
      // 2. 第二次入库：调试已完成 && 第二次入库未完成
      const warehouseInProjects = (response.projects || []).filter(p => {
        const firstWarehouseIn = p.processingCompleted === true && !p.warehouseInCompleted;
        const secondWarehouseIn = p.testingCompleted === true && p.warehouseInCompleted === true && !p.warehouseInSecondCompleted;
        return firstWarehouseIn || secondWarehouseIn;
      });
      setProjects(warehouseInProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 入库阶段不再显示时间周期/剩余时间
  const calculateRemainingDays = () => null;

  // 检查截止日期预警
  useEffect(() => {
    checkDeadlines();
  }, [projects]);

  const checkDeadlines = () => {
    const today = new Date().toDateString();
    const lastCheck = localStorage.getItem('lastDeadlineCheckWarehouseIn');
    
    if (lastCheck === today) {
      return;
    }

    const urgentProjects = projects.filter(p => {
      if (p.warehouseInCompleted) return false;
      const remaining = calculateRemainingDays(p);
      return remaining !== null && remaining >= 0 && remaining <= 3;
    });

    if (urgentProjects.length > 0) {
      setDeadlineWarning({
        projects: urgentProjects,
        onClose: () => {
          localStorage.setItem('lastDeadlineCheckWarehouseIn', today);
          setDeadlineWarning(null);
        },
        onIgnore: () => {
          localStorage.setItem('lastDeadlineCheckWarehouseIn', today);
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
      return !project.warehouseInCompleted;
    } else if (activeTab === 'completed') {
      return project.warehouseInCompleted;
    }
    return true;
  });

  if (selectedProject) {
    return (
      <WarehouseInDetail
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
    <div className="warehousein-container">
      {/* 顶部导航栏 */}
      <div className="warehousein-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">📦</div>
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
            <div className="stat-value">{projects.filter(p => !p.warehouseInCompleted).length}</div>
            <div className="stat-label">待入库</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{projects.filter(p => p.warehouseInCompleted).length}</div>
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
          待入库 ({projects.filter(p => !p.warehouseInCompleted).length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          已完成 ({projects.filter(p => p.warehouseInCompleted).length})
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
            <p>等待加工完成后推送到入库阶段</p>
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
                      📦 入库项目
                    </div>
                    <span className={`status-badge status-${project.warehouseInCompleted ? 'completed' : 'pending'}`}>
                      {project.warehouseInCompleted ? '✅ 已完成' : '⏳ 待入库'}
                    </span>
                  </div>
                  <h3 className="project-title">{project.projectName}</h3>
                  <p className="project-description">{project.description}</p>
                  <div className="project-meta">
                    <span>💰 预算：{project.budget ? `${project.budget} 万` : '未设置'}</span>
                    <span>👤 申请人：{project.createdByName || '未知'}</span>
                    <span>📅 时间：{project.createTime ? new Date(project.createTime).toLocaleString('zh-CN') : '未知'}</span>
                  {/* 入库阶段不显示周期 */}
                  </div>
                  {!project.warehouseInCompleted && remainingDays !== null && (
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
          stageName="入库"
        />
      )}
    </div>
  );
};

export default ProjectWarehouseIn;

