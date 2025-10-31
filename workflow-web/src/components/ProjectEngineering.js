import React, { useState, useEffect } from 'react';
import './ProjectEngineering.css';
import EngineeringDetail from './EngineeringDetail';
import NotificationModal from './NotificationModal';
import DeadlineWarningModal from './DeadlineWarningModal';
import RoleBadges from './RoleBadges';
import { projectAPI, notificationAPI } from '../services/api';

const ProjectEngineering = ({ user, onLogout, activeRole, onRoleSwitch }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [pendingNotification, setPendingNotification] = useState(null);
  const [deadlineWarning, setDeadlineWarning] = useState(null); // 截止日期预警

  // 加载从研发推送过来的项目
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
          type: 'project_ready_for_engineering'
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
      // 获取已批准且研发已完成的项目
      const response = await projectAPI.getProjects({ status: 'approved' });
      // 过滤出已设置时间周期且研发已完成的项目
      const engineeringProjects = (response.projects || []).filter(p => 
        p.timeScheduleSet === true && p.developmentCompleted === true
      );
      setProjects(engineeringProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算剩余天数
  const calculateRemainingDays = (project) => {
    if (!project.timelines || !project.timelines.engineerTime || !project.timelines.engineerStartTime) {
      return null;
    }

    const startTime = new Date(project.timelines.engineerStartTime);
    const now = new Date();
    const elapsedDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
    const remainingDays = project.timelines.engineerTime - elapsedDays;
    
    return remainingDays;
  };

  // 检查截止日期预警
  useEffect(() => {
    const checkDeadlines = () => {
      // 获取已经显示过预警的项目ID（存储在localStorage中）
      const dismissedWarnings = JSON.parse(localStorage.getItem('dismissedDeadlineWarnings') || '{}');
      
      // 只检查正在工程中的项目
      const projectsInEngineering = projects.filter(p => p.developmentCompleted && !p.engineeringCompleted);
      
      for (const project of projectsInEngineering) {
        const remainingDays = calculateRemainingDays(project);
        
        // 如果剩余天数<=3天且还未提交，且没有被忽略过
        if (remainingDays !== null && remainingDays <= 3 && remainingDays >= 0) {
          const warningKey = `${project.id}_eng_${Math.floor(remainingDays)}`;
          
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

  // 如果选中了项目，显示工程详情页
  if (selectedProject) {
    return (
      <EngineeringDetail
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

  // 统计数据
  const stats = {
    total: projects.length,
    pending: projects.filter(p => !p.engineeringCompleted).length,
    in_progress: 0, // 暂未使用
    completed: projects.filter(p => p.engineeringCompleted).length,
  };

  // 根据选中的tab过滤项目
  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return !project.engineeringCompleted;
    if (activeTab === 'in_progress') return false; // 暂未使用
    if (activeTab === 'completed') return project.engineeringCompleted;
    return true;
  });

  return (
    <div className="engineering-container">
      {/* 顶部导航栏 */}
      <div className="engineering-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">👷</div>
            <div className="user-details">
              <div className="user-name">
                {user.displayName || user.username}
                {user.isPrimaryLeader && user.primaryLeaderRoles && 
                 user.primaryLeaderRoles.includes('engineer') && (
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
          <button className="logout-btn" onClick={onLogout}>
            🚪 退出登录
          </button>
        </div>
      </div>

      <div className="engineering-content">
        <div className="title-bar">
          <h1 className="page-title">我的任务</h1>
        </div>

        {/* 统计卡片 */}
        <div className="engineering-stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">📊</div>
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">总任务数</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-icon">📁</div>
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">待处理</div>
          </div>
          <div className="stat-card stat-progress">
            <div className="stat-icon">🔧</div>
            <div className="stat-number">{stats.in_progress}</div>
            <div className="stat-label">进行中</div>
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
            全部 ({stats.total})
          </button>
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            待处理 ({stats.pending})
          </button>
          <button 
            className={`tab ${activeTab === 'in_progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('in_progress')}
          >
            进行中 ({stats.in_progress})
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            已完成 ({stats.completed})
          </button>
        </div>

        {/* 项目列表 */}
        <div className="project-list">
          {loading ? (
            <div className="loading-state">
              <img src="/loading.png" alt="loading" className="loading-image" />
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
                  <span className={`status-badge ${project.engineeringCompleted ? 'status-completed' : 'status-pending'}`}>
                    {project.engineeringCompleted ? '✅ 已完成工程' : '🛠️ 工程中'}
                  </span>
                </div>
                <h3 className="project-title">{project.projectName}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-meta">
                  <span>🎯 研发方向：{project.researchDirection || '未设置'}</span>
                  <span>💰 预算：{project.budget ? `${project.budget} 万` : '未设置'}</span>
                  <span>⏱️ 时长：{project.duration ? `${project.duration} 月` : '未设置'}</span>
                  <span className={`priority priority-${project.priority || 'normal'}`}>
                    {project.priority === 'high' ? '🔴 高优先级' : 
                     project.priority === 'urgent' ? '🟠 紧急' : '🟢 普通'}
                  </span>
                </div>
                {/* 显示剩余天数 */}
                {!project.engineeringCompleted && calculateRemainingDays(project) !== null && (
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
                {((project.engineeringDrawings?.length || 0) + (project.engineeringDocuments?.length || 0)) > 0 && (
                  <div className="file-count">
                    🛠️ 工程图纸：{(project.engineeringDrawings?.length || 0) + (project.engineeringDocuments?.length || 0)} 个文件
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无工程项目</p>
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
            
            // 找到对应的项目并打开
            const proj = projects.find(p => String(p.id) === String(n.projectId));
            if (proj) {
              setSelectedProject(proj);
              localStorage.setItem('suppressNotificationProjectId', String(n.projectId));
            } else {
              // 项目不存在或尚未下发
              alert('该项目尚未下发到工程阶段，请稍后查看');
              // 重新加载项目列表
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
            const warningKey = `${deadlineWarning.project.id}_eng_${Math.floor(deadlineWarning.remainingDays)}`;
            dismissedWarnings[warningKey] = new Date().toISOString();
            localStorage.setItem('dismissedDeadlineWarnings', JSON.stringify(dismissedWarnings));
            
            setDeadlineWarning(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectEngineering;

