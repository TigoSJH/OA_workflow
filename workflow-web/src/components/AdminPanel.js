import React, { useState, useEffect } from 'react';
import './AdminPanel.css';
import UserManagement from './UserManagement';
import RoleBadges from './RoleBadges';
import { userAPI } from '../services/api';

const AdminPanel = ({ user, onLogout, activeRole, onRoleSwitch }) => {
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showPrimaryLeaderManagement, setShowPrimaryLeaderManagement] = useState(false);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 主负责人管理相关状态
  const [users, setUsers] = useState([]);
  const [primaryLeaders, setPrimaryLeaders] = useState([]);

  // 加载待审批用户数
  useEffect(() => {
    loadPendingUsersCount();
    loadUsersAndLeaders();
  }, []);

  const loadPendingUsersCount = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUserStats();
      setPendingUsersCount(response.stats.pending);
    } catch (error) {
      console.error('加载待审批用户数失败:', error);
    } finally {
      setTimeout(() => setLoading(false), 300); // 300ms 后隐藏 loading
    }
  };

  // 加载用户和主负责人列表
  const loadUsersAndLeaders = async () => {
    try {
      const usersResponse = await userAPI.getUsers({ status: 'approved' });
      setUsers(usersResponse.users || []);
      
      const leadersResponse = await userAPI.getPrimaryLeaders();
      setPrimaryLeaders(leadersResponse.leaders || []);
    } catch (error) {
      console.error('加载用户和主负责人列表失败:', error);
    }
  };

  // 设置主负责人
  const handleSetPrimaryLeader = async (userId, roles) => {
    try {
      setLoading(true);
      await userAPI.setPrimaryLeader(userId, roles);
      alert('主负责人设置成功！');
      await loadUsersAndLeaders();
    } catch (error) {
      console.error('设置主负责人失败:', error);
      alert(error.response?.data?.error || '设置主负责人失败');
    } finally {
      setLoading(false);
    }
  };

  // 移除主负责人
  const handleRemovePrimaryLeader = async (userId, roles) => {
    try {
      setLoading(true);
      await userAPI.removePrimaryLeader(userId, roles);
      alert('主负责人移除成功！');
      await loadUsersAndLeaders();
    } catch (error) {
      console.error('移除主负责人失败:', error);
      alert(error.response?.data?.error || '移除主负责人失败');
    } finally {
      setLoading(false);
    }
  };

  // 所有工程人员（从后端加载已批准的相关角色用户）
  const [engineers, setEngineers] = useState([]);

  useEffect(() => {
    const loadEngineers = async () => {
      try {
        const response = await userAPI.getUsers({ status: 'approved' });
        const workerRoles = new Set(['operator', 'assembler', 'tester', 'purchaser', 'processor', 'warehouse_in', 'warehouse_out', 'engineer']);
        const list = (response.users || [])
          .filter(u => Array.isArray(u.roles) && u.roles.some(r => workerRoles.has(r)))
          .map(u => ({ id: u.username, name: `${u.displayName || u.username} - ${u.roles.join('/')}`, role: u.roles[0] || '' }));
        setEngineers(list);
      } catch (e) {
        console.error('加载工程人员失败:', e.message);
        setEngineers([]);
      }
    };
    loadEngineers();
  }, []);

  // 所有任务（管理员视图）- 清空，根据数据库重新填写
  const [allTasks, setAllTasks] = useState([]);


  const handleReassignTask = (taskId) => {
    const newAssignee = prompt('请输入新的负责人（machine1/assembler1/tester1）：');
    if (newAssignee) {
      const engineer = engineers.find(e => e.id === newAssignee);
      if (engineer) {
        setAllTasks(allTasks.map(task => 
          task.id === taskId 
            ? { ...task, assignee: newAssignee, assigneeName: engineer.name }
            : task
        ));
        alert('重新分配成功！');
      } else {
        alert('用户不存在！');
      }
    }
  };

  const stats = {
    total: allTasks.length,
    pending: allTasks.filter(t => t.status === 'pending').length,
    in_progress: allTasks.filter(t => t.status === 'in_progress').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
  };

  // 如果显示用户管理页面
  if (showUserManagement) {
    return (
      <UserManagement
        user={user}
        onBack={() => {
          setShowUserManagement(false);
          // 返回时重新加载待审批用户数（因为可能有变化）
          setTimeout(() => {
            loadPendingUsersCount();
          }, 100);
        }}
      />
    );
  }

  // 如果显示主负责人管理页面
  if (showPrimaryLeaderManagement) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => setShowPrimaryLeaderManagement(false)}>
              ← 返回
            </button>
            <h2 style={{ marginLeft: '20px' }}>主负责人管理</h2>
          </div>
        </div>
        <div className="admin-content">
          <div className="section-card">
            <h3 className="section-title">当前主负责人</h3>
            <div className="primary-leaders-list">
              {primaryLeaders.length > 0 ? (
                primaryLeaders.map(leader => (
                  <div key={leader.id} className="leader-card">
                    <div className="leader-info">
                      <div className="leader-name-block">
                        <div className="leader-display-name">{leader.displayName || leader.username}</div>
                        <div className="leader-username">账号：{leader.username}</div>
                      </div>
                      <div className="leader-roles">
                        负责角色：{leader.primaryLeaderRoles.map(role => {
                          const roleMap = {
                            manager: '项目管理',
                            researcher: '研发',
                            engineer: '工程',
                            purchaser: '采购',
                            processor: '加工',
                            assembler: '装配',
                            tester: '调试',
                            warehouse_in: '入库管理',
                            warehouse_out: '出库管理'
                          };
                          return roleMap[role] || role;
                        }).join('、')}
                      </div>
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => {
                        if (window.confirm('确定要移除此主负责人吗？')) {
                          handleRemovePrimaryLeader(leader.id, leader.primaryLeaderRoles);
                        }
                      }}
                    >
                      移除
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>暂无主负责人</p>
                </div>
              )}
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title">设置主负责人（按岗位）</h3>
            {['manager', 'researcher', 'engineer', 'purchaser', 'processor', 'assembler', 'tester', 'warehouse_in', 'warehouse_out'].map(targetRole => {
              const roleMap = {
                manager: '项目管理',
                researcher: '研发',
                engineer: '工程',
                purchaser: '采购',
                processor: '加工',
                assembler: '装配',
                tester: '调试',
                warehouse_in: '入库管理',
                warehouse_out: '出库管理'
              };
              
              const roleUsers = users.filter(u => u.roles && u.roles.includes(targetRole));
              
              if (roleUsers.length === 0) return null;
              
              return (
                <div key={targetRole} className="role-section">
                  <h4 className="role-section-title">{roleMap[targetRole]}主负责人</h4>
                  <div className="users-grid">
                    {roleUsers.map(user => (
                      <div key={user.id} className="user-card">
                        <div className="user-info">
                          <div className="user-name-block">
                            <div className="user-display-name">{user.displayName || user.username}</div>
                            <div className="user-username">账号：{user.username}</div>
                          </div>
                          <div className="user-roles">
                            全部角色：{user.roles.map(role => roleMap[role] || role).join('、')}
                          </div>
                        </div>
                        <button 
                          className="set-leader-btn"
                          onClick={() => {
                            if (window.confirm(`确定将 ${user.displayName || user.username} 设为${roleMap[targetRole]}主负责人吗？`)) {
                              handleSetPrimaryLeader(user.id, [targetRole]);
                            }
                          }}
                        >
                          设为主负责人
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Loading 覆盖层 */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <img src="/loading.png" alt="loading" className="loading-image" />
            <p>更新数据中...</p>
          </div>
        </div>
      )}
      
      {/* 顶部导航栏 */}
      <div className="admin-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">👨‍💼</div>
            <div className="user-details">
              <div className="user-name">
                {user.displayName || user.username}
                {user.isPrimaryLeader && (
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
          <button 
            className="user-management-btn" 
            onClick={() => setShowUserManagement(true)}
          >
            👥 用户管理
            {pendingUsersCount > 0 && (
              <span className="pending-badge">{pendingUsersCount}</span>
            )}
          </button>
          <button 
            className="primary-leader-btn" 
            onClick={() => setShowPrimaryLeaderManagement(true)}
          >
            👑 主负责人设置
          </button>
          <button className="logout-btn" onClick={onLogout}>
            🚪 退出登录
          </button>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-title-bar">
          <h1 className="page-title">任务管理</h1>
        </div>

        {/* 统计卡片 */}
        <div className="stats-grid">
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

        {/* 工程人员列表 */}
        <div className="section-card">
          <h3 className="section-title">👥 工程人员</h3>
          <div className="engineers-grid">
            {engineers.length > 0 ? (
              engineers.map(engineer => {
                const tasksCount = allTasks.filter(t => t.assignee === engineer.id).length;
                return (
                  <div key={engineer.id} className="engineer-card">
                    <div className="engineer-icon">👤</div>
                    <div className="engineer-info">
                      <div className="engineer-name">{engineer.name}</div>
                      <div className="engineer-stats">当前任务：{tasksCount} 个</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>暂无工程人员数据</p>
                <p className="empty-hint">请根据数据库内容添加工程人员信息</p>
              </div>
            )}
          </div>
        </div>

        {/* 任务列表 */}
        <div className="section-card">
          <h3 className="section-title">📋 所有任务</h3>
          <div className="admin-task-list">
            {allTasks.length > 0 ? (
              allTasks.map(task => (
                <div key={task.id} className="admin-task-card">
                  <div className="task-main">
                    <div className="task-left">
                      <h4 className="task-title">{task.title}</h4>
                      <div className="task-meta">
                        <span className="task-project">📋 {task.project}</span>
                        <span className="task-id">#{task.taskId}</span>
                      </div>
                    </div>
                    <div className="task-right">
                      <span className={`status-badge status-${task.status}`}>
                        {task.statusText}
                      </span>
                    </div>
                  </div>
                  <div className="task-footer">
                    <div className="task-assignee-info">
                      <span>👤 {task.assigneeName}</span>
                      <span>📅 {task.deadline}</span>
                    </div>
                    <button 
                      className="reassign-btn"
                      onClick={() => handleReassignTask(task.id)}
                    >
                      🔄 重新分配
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>暂无任务数据</p>
                <p className="empty-hint">请根据数据库内容添加任务信息</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminPanel;

