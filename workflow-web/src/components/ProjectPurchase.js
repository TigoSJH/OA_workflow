import React, { useState, useEffect } from 'react';
import './ProjectPurchase.css';
import PurchaseDetailTeam from './PurchaseDetailTeam';
import NotificationModal from './NotificationModal';
import DeadlineWarningModal from './DeadlineWarningModal';
import RoleBadges from './RoleBadges';
import { projectAPI, notificationAPI } from '../services/api';

const ProjectPurchase = ({ user, onLogout, activeRole, onRoleSwitch }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [pendingNotification, setPendingNotification] = useState(null);
  const [deadlineWarning, setDeadlineWarning] = useState(null); // 截止日期预警

  // 加载从工程推送过来的项目
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
          type: 'project_ready_for_purchase'
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
      // 获取工程已完成的项目
      const response = await projectAPI.getProjects({ status: 'approved' });
      // 过滤出工程已完成的项目
      const purchaseProjects = (response.projects || []).filter(p => 
        p.engineeringCompleted === true
      );
      setProjects(purchaseProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算剩余天数
  const calculateRemainingDays = (project) => {
    if (!project.timelines || !project.timelines.purchaserTime) {
      return null;
    }

    // 优先使用采购开始时间；没有则回退到工程完成时间
    const startTimeRaw = project.timelines.purchaserStartTime || project.engineeringCompletedTime;
    if (!startTimeRaw) return null;

    const startTime = new Date(startTimeRaw);
    const now = new Date();
    const elapsedDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const remainingDays = project.timelines.purchaserTime - elapsedDays;
    
    return remainingDays;
  };

  // 检查截止日期预警
  useEffect(() => {
    const checkDeadlines = () => {
      // 获取已经显示过预警的项目ID（存储在localStorage中）
      const dismissedWarnings = JSON.parse(localStorage.getItem('dismissedDeadlineWarnings') || '{}');
      
      // 只检查正在采购中的项目
      const projectsInPurchase = projects.filter(p => p.engineeringCompleted && !p.purchaseCompleted);
      
      for (const project of projectsInPurchase) {
        const remainingDays = calculateRemainingDays(project);
        
        // 如果剩余天数<=3天且还未提交，且没有被忽略过
        if (remainingDays !== null && remainingDays <= 3 && remainingDays >= 0) {
          const warningKey = `${project.id}_purchase_${Math.floor(remainingDays)}`;
          
          // 如果这个警告没有被忽略过，显示预警
          if (!dismissedWarnings[warningKey]) {
            setDeadlineWarning({
              project,
              remainingDays
            });
            return; // 一次只显示一个预警
          }
        }
      }
    };

    if (projects.length > 0) {
      checkDeadlines();
      // 每小时检查一次
      const intervalId = setInterval(checkDeadlines, 60 * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [projects]);

  // 统计数据
  const stats = {
    total: projects.length,
    pending: projects.filter(p => !p.purchaseCompleted).length,
    completed: projects.filter(p => p.purchaseCompleted).length,
  };

  // 如果选中了项目，显示采购详情页
  if (selectedProject) {
    return (
      <PurchaseDetailTeam
        project={selectedProject}
        user={user}
        onBack={() => {
          setSelectedProject(null);
          // 立即重新加载项目列表以获取最新状态
          loadProjects();
        }}
      />
    );
  }

  // 根据选中的tab过滤项目
  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return !project.purchaseCompleted;
    if (activeTab === 'completed') return project.purchaseCompleted;
    return true;
  });

  return (
    <div className="purchase-container">
      {/* 顶部导航栏 */}
      <div className="purchase-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">🛒</div>
            <div className="user-details">
              <div className="user-name">
                {user.displayName || user.username}
                {user.isPrimaryLeader && user.primaryLeaderRoles && 
                 user.primaryLeaderRoles.includes('purchaser') && (
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
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">全部项目</div>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">待采购</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
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
          全部 ({stats.total})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          待采购 ({stats.pending})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          已完成 ({stats.completed})
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
            <p>等待工程师推送项目到采购阶段</p>
          </div>
        ) : (
          <div className="project-grid">
            {filteredProjects.map((project) => (
              <div 
                key={project.id} 
                className="project-card"
                onClick={() => setSelectedProject(project)}
                style={{ cursor: 'pointer' }}
              >
                <div className="project-header">
                  <div className="project-type">
                    🛒 采购项目
                  </div>
                  <span className={`status-badge status-${project.purchaseCompleted ? 'completed' : 'pending'}`}>
                    {project.purchaseCompleted ? '✅ 已完成' : '⏳ 待采购'}
                  </span>
                </div>
                <h3 className="project-title">{project.projectName}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-meta">
                  <span>💰 预算：{project.budget ? `${project.budget} 万` : '未设置'}</span>
                  <span>👤 申请人：{project.createdByName || '未知'}</span>
                  <span>📅 时间：{project.createTime ? new Date(project.createTime).toLocaleString('zh-CN') : '未知'}</span>
                  <span>⏰ 时长：{project.duration ? `${project.duration} 月` : '未设置'}</span>
                </div>
                {!project.purchaseCompleted && calculateRemainingDays(project) !== null && (
                  <div className={`remaining-days ${calculateRemainingDays(project) <= 3 ? 'urgent' : ''}`}>
                    ⏰ 剩余 {calculateRemainingDays(project)} 日完成
                    {calculateRemainingDays(project) <= 3 && calculateRemainingDays(project) >= 0 && (
                      <span className="urgent-badge">紧急</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 通知弹窗 */}
      <NotificationModal
        notification={pendingNotification}
        onView={async (n) => {
          try {
            await notificationAPI.markAsRead(n._id);
          } catch {}
          setPendingNotification(null);
          
          // 找到对应的项目并打开详情页
          const proj = projects.find(p => String(p.id) === String(n.projectId));
          if (proj) {
            // 项目已下发，打开详情页
            localStorage.setItem('suppressNotificationProjectId', String(n.projectId));
            setSelectedProject(proj);
          } else {
            // 项目不存在或尚未下发，重新加载项目列表
            console.log('项目尚未下发到采购阶段');
            loadProjects();
          }
        }}
        onDismiss={async (n) => {
          try {
            await notificationAPI.markAsRead(n._id);
          } catch {}
          setPendingNotification(null);
        }}
      />

      {/* 截止日期预警 */}
      <DeadlineWarningModal
        warning={deadlineWarning}
        onOpenProject={(project) => {
          setDeadlineWarning(null);
          setSelectedProject(project);
        }}
        onDismiss={(warningKey) => {
          const dismissedWarnings = JSON.parse(localStorage.getItem('dismissedDeadlineWarnings') || '{}');
          dismissedWarnings[warningKey] = true;
          localStorage.setItem('dismissedDeadlineWarnings', JSON.stringify(dismissedWarnings));
          setDeadlineWarning(null);
        }}
      />
    </div>
  );
};

export default ProjectPurchase;

