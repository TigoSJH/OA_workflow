import React, { useState, useEffect } from 'react';
import './ProjectDevelopment.css';
import DevelopmentDetail from './DevelopmentDetail';
import NotificationModal from './NotificationModal';
import DeadlineWarningModal from './DeadlineWarningModal';
import RoleBadges from './RoleBadges';
import { projectAPI, notificationAPI } from '../services/api';

const ProjectDevelopment = ({ user, onLogout, onSwitchToInitiation, activeRole, onRoleSwitch }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('in_development');
  const [pendingNotification, setPendingNotification] = useState(null);
  const [deadlineWarning, setDeadlineWarning] = useState(null); // 截止日期预警

  // 加载已批准的项目
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
          type: 'project_started'
        });
        const list = (res.notifications || []).slice();
        
        // 过滤掉已经被抑制的通知
        const suppressId = localStorage.getItem('suppressNotificationProjectId');
        const filtered = list.filter(n => {
          const pid = String(n.projectId || '');
          if (suppressId && pid === String(suppressId)) return false;
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
    
    fetchNotifications();
  }, [user]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // 获取已批准的项目
      const response = await projectAPI.getProjects({ status: 'approved' });
      // 只显示已设置时间周期的项目
      const scheduledProjects = (response.projects || []).filter(p => p.timeScheduleSet === true);
      setProjects(scheduledProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算剩余天数
  const calculateRemainingDays = (project) => {
    if (!project.timelines || !project.timelines.researcherTime || !project.timelines.researcherStartTime) {
      return null;
    }

    const startTime = new Date(project.timelines.researcherStartTime);
    const now = new Date();
    const elapsedDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const remainingDays = project.timelines.researcherTime - elapsedDays;
    
    return remainingDays;
  };

  // 检查截止日期预警
  useEffect(() => {
    const checkDeadlines = () => {
      // 获取已经显示过预警的项目ID（存储在localStorage中）
      const dismissedWarnings = JSON.parse(localStorage.getItem('dismissedDeadlineWarnings') || '{}');
      
      // 只检查正在开发中的项目
      const projectsInDevelopment = projects.filter(p => p.status === 'approved' && !p.developmentCompleted);
      
      for (const project of projectsInDevelopment) {
        const remainingDays = calculateRemainingDays(project);
        
        // 如果剩余天数<=3天且还未提交，且没有被忽略过
        if (remainingDays !== null && remainingDays <= 3 && remainingDays >= 0) {
          const warningKey = `${project.id}_${Math.floor(remainingDays)}`;
          
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

  // 如果选中了项目，显示开发详情页
  if (selectedProject) {
    return (
      <DevelopmentDetail
        project={selectedProject}
        user={user}
        onBack={() => {
          setSelectedProject(null);
          // 立即重新加载项目列表以获取最新状态
          loadProjects();
        }}
        onRefresh={async () => {
          // 重新获取当前项目的最新数据
          try {
            const response = await projectAPI.getProjects({ status: 'approved' });
            const updatedProject = response.projects.find(p => 
              String(p.id) === String(selectedProject.id)
            );
            if (updatedProject) {
              console.log('✅ 项目数据已刷新');
              setSelectedProject(updatedProject);
            } else {
              console.warn('⚠️ 未找到项目');
            }
          } catch (error) {
            console.error('刷新项目数据失败:', error);
          }
        }}
      />
    );
  }

  // 根据tab筛选项目
  const filteredProjects = projects.filter(project => {
    if (activeTab === 'in_development') {
      // 正在开发：已批准但还未推送到出图阶段
      return project.status === 'approved' && !project.developmentCompleted;
    } else if (activeTab === 'completed') {
      // 已完成：已推送到出图阶段
      return project.developmentCompleted === true;
    }
    return true;
  });

  const stats = {
    total: projects.length,
    inDevelopment: projects.filter(p => p.status === 'approved' && !p.developmentCompleted).length,
    completed: projects.filter(p => p.developmentCompleted === true).length
  };

  return (
    <div className="development-container">
      {/* 顶部导航栏 */}
      <div className="development-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">👨‍💼</div>
            <div className="user-details">
              <div className="user-name">
                {user.displayName || user.username}
                {user.isPrimaryLeader && user.primaryLeaderRoles && 
                 user.primaryLeaderRoles.includes('researcher') && (
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
          {onSwitchToInitiation && (
            <button className="back-to-initiation-btn" onClick={onSwitchToInitiation}>
              ← 返回项目管理
            </button>
          )}
          <button className="logout-btn" onClick={onLogout}>
            🚪 退出登录
          </button>
        </div>
      </div>

      <div className="development-content">
        <div className="title-bar">
          <h1 className="page-title">项目开发</h1>
        </div>

        {/* 统计卡片 */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">📊</div>
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">全部项目</div>
          </div>
          <div className="stat-card stat-development">
            <div className="stat-icon">🔧</div>
            <div className="stat-number">{stats.inDevelopment}</div>
            <div className="stat-label">开发中</div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-icon">✅</div>
            <div className="stat-number">{stats.completed}</div>
            <div className="stat-label">已完成</div>
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
            className={`tab ${activeTab === 'in_development' ? 'active' : ''}`}
            onClick={() => setActiveTab('in_development')}
          >
            开发中
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            已完成
          </button>
        </div>

        {/* 项目列表 */}
        <div className="project-list">
          {loading ? (
            <div className="loading-state">
              <img src="/images/loading.png" alt="loading" className="loading-image" />
              <p>加载中...</p>
            </div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map(project => (
              <div 
                key={project.id} 
                className="project-card"
                onClick={() => setSelectedProject(project)}
                style={{ cursor: 'pointer' }}
              >
                <div className="project-header">
                  <div className="project-type">
                    {project.projectType === 'research' ? '🔬 研发项目' : '📄 合同项目'}
                  </div>
                  <span className={`status-badge ${project.developmentCompleted ? 'status-completed' : 'status-development'}`}>
                    {project.developmentCompleted ? '✅ 已完成开发' : '🔧 开发中'}
                  </span>
                </div>
                <h3 className="project-title">{project.projectName}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-meta">
                  <span>🎯 研发方向：{project.researchDirection || '未设置'}</span>
                  <span>💰 预算：{project.budget ? `${project.budget} 万` : '未设置'}</span>
                  <span>⏱️ 时长：{project.duration ? `${project.duration} 月` : '未设置'}</span>
                </div>
                {/* 显示剩余天数 */}
                {!project.developmentCompleted && calculateRemainingDays(project) !== null && (
                  <div className={`remaining-days ${calculateRemainingDays(project) <= 3 ? 'urgent' : ''}`}>
                    ⏰ 剩余 {calculateRemainingDays(project)} 日完成
                    {calculateRemainingDays(project) <= 3 && calculateRemainingDays(project) >= 0 && (
                      <span className="urgent-badge">紧急</span>
                    )}
                  </div>
                )}
                {((project.folderScreenshots?.length || 0) + (project.drawingImages?.length || 0)) > 0 && (
                  <div className="file-count">
                    📐 研发图纸：{(project.folderScreenshots?.length || 0) + (project.drawingImages?.length || 0)} 个文件
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无开发项目</p>
            </div>
          )}
        </div>
      </div>

      {/* 通知弹窗 */}
      {pendingNotification && (
        <NotificationModal
          notification={pendingNotification}
          onView={async (n) => {
            try {
              await notificationAPI.markAsRead(n._id);
            } catch {}
            setPendingNotification(null);
            
            // 查找对应的项目并打开详情
            const targetProject = projects.find(p => String(p.id) === String(n.projectId));
            if (targetProject) {
              setSelectedProject(targetProject);
            }
          }}
          onDismiss={async (n) => {
            try {
              await notificationAPI.markAsRead(n._id);
            } catch {}
            setPendingNotification(null);
          }}
        />
      )}

      {/* 截止日期预警弹窗 */}
      {deadlineWarning && (
        <DeadlineWarningModal
          project={deadlineWarning.project}
          remainingDays={deadlineWarning.remainingDays}
          onOpen={() => {
            // 立即打开项目
            setSelectedProject(deadlineWarning.project);
            setDeadlineWarning(null);
          }}
          onDismiss={() => {
            // 记录已忽略的预警（当天不再显示）
            const dismissedWarnings = JSON.parse(localStorage.getItem('dismissedDeadlineWarnings') || '{}');
            const warningKey = `${deadlineWarning.project.id}_${Math.floor(deadlineWarning.remainingDays)}`;
            dismissedWarnings[warningKey] = new Date().toISOString();
            localStorage.setItem('dismissedDeadlineWarnings', JSON.stringify(dismissedWarnings));
            
            setDeadlineWarning(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectDevelopment;
