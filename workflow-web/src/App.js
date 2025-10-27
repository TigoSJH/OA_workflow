import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import ProjectEngineering from './components/ProjectEngineering';
import ProjectPurchase from './components/ProjectPurchase';
import ProjectProcessing from './components/ProjectProcessing';
import ProjectAssembly from './components/ProjectAssembly';
import ProjectTesting from './components/ProjectTesting';
import WarehouseInFirst from './components/WarehouseInFirst';
import WarehouseInSecond from './components/WarehouseInSecond';
import WarehouseOutFirst from './components/WarehouseOutFirst';
import WarehouseOutSecond from './components/WarehouseOutSecond';
import AdminPanel from './components/AdminPanel';
import ProjectInitiation from './components/ProjectInitiation';
import ProjectDevelopment from './components/ProjectDevelopment';
import ProjectSchedule from './components/ProjectSchedule';
import ProjectScheduleManagement from './components/ProjectScheduleManagement';
import ProjectArchive from './components/ProjectArchive';
import ArchiveDetail from './components/ArchiveDetail';
import { authAPI, notificationAPI } from './services/api';
import NotificationModal from './components/NotificationModal';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState(null); // 当前激活的角色
  const [openProjectId, setOpenProjectId] = useState(null);
  const [pendingNotification, setPendingNotification] = useState(null);
  const [warehouseInPage, setWarehouseInPage] = useState('first'); // 'first' 或 'second'
  const [warehouseOutPage, setWarehouseOutPage] = useState('first'); // 'first' 或 'second'

  // 页面加载时检查是否有 token，如果有则自动恢复登录状态
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // 调用后端获取当前用户信息
          const response = await authAPI.getCurrentUser();
          const userData = response.user;
          setUser(userData);
          
          // 设置默认激活角色
          if (userData.roles && userData.roles.length > 0) {
            if (userData.roles.includes('admin')) {
              setActiveRole('admin');
            } else if (userData.roles.includes('manager')) {
              setActiveRole('manager_initiation');
            } else if (userData.roles.includes('researcher')) {
              setActiveRole('researcher_initiation');
            } else if (userData.roles.includes('engineer')) {
              setActiveRole('engineer');
            } else {
              setActiveRole(userData.roles[0]);
            }
          }
          
          setShowLogin(false);
        } catch (error) {
          // token 无效或过期，清除并显示登录页
          console.error('自动登录失败:', error);
          localStorage.removeItem('token');
          setShowLogin(true);
        }
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // 登录后拉取管理员的未读通知（排除创建者本人、且过滤已批准项目）
  // 并且每隔10秒轮询一次，确保能及时收到新通知
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user || !user.roles) return;
      try {
        // 获取所有类型的通知
        const res = await notificationAPI.getNotifications({ 
          unreadOnly: true
        });
        const list = (res.notifications || []).slice();
        const pendingLocalOpen = localStorage.getItem('openProjectId');
        const suppressId = localStorage.getItem('suppressNotificationProjectId');
        
        // 优先显示需要安排时间周期的通知（仅管理员）
        const scheduleNotifications = list.filter(n => 
          n.type === 'project_needs_schedule' && n.requiresAction && user.roles.includes('manager')
        );
        
        // 项目下发通知（研发、工程等角色）
        const projectAssignedNotifications = list.filter(n => 
          n.type === 'project_assigned'
        );
        
        const newProjectNotifications = list.filter(n => {
          if (n.type !== 'new_project') return false;
          if (!user.roles.includes('manager')) return false; // 只有管理员看立项通知
          const pid = String(n.projectId || '');
          if (pendingLocalOpen && pid === String(pendingLocalOpen)) return false;
          if (suppressId && pid === String(suppressId)) return false; // 刚批准后的抑制
          return true;
        });
        
        // 归档提醒（项目已完成，需管理主负责人归档）
        const archiveNotifications = list.filter(n => 
          n.type === 'project_ready_for_archive' && n.requiresAction && user.roles.includes('manager')
        );

        // 优先级：归档提醒 > 时间安排 > 立项 > 下发
        if (archiveNotifications.length > 0) {
          setPendingNotification(archiveNotifications[0]);
        } else if (scheduleNotifications.length > 0) {
          setPendingNotification(scheduleNotifications[0]);
        } else if (newProjectNotifications.length > 0) {
          setPendingNotification(newProjectNotifications[0]);
        } else if (projectAssignedNotifications.length > 0) {
          setPendingNotification(projectAssignedNotifications[0]);
        } else {
          setPendingNotification(null);
          // 清理一次性抑制键
          if (suppressId) localStorage.removeItem('suppressNotificationProjectId');
        }
      } catch (e) {
        console.error('获取通知失败:', e.message);
      }
    };
    
    // 立即执行一次
    fetchNotifications();
    
    // 设置定时轮询（每10秒）- 所有用户都可以接收通知
    let intervalId;
    if (user && user.roles) {
      intervalId = setInterval(fetchNotifications, 10000); // 每10秒轮询一次
    }
    
    // 清理函数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user]);

  const handleLogin = (userData) => {
    try {
      localStorage.removeItem('openProjectId');
      localStorage.removeItem('suppressNotificationProjectId');
    } catch (e) {}
    setUser(userData);
    
    // 设置默认激活角色（优先级：admin > manager > researcher > engineer > warehouse_in > warehouse_out）
    if (userData.roles && userData.roles.length > 0) {
      if (userData.roles.includes('admin')) {
        setActiveRole('admin');
      } else if (userData.roles.includes('manager')) {
        setActiveRole('manager_initiation');
      } else if (userData.roles.includes('researcher')) {
        setActiveRole('researcher_initiation');
      } else if (userData.roles.includes('engineer')) {
        setActiveRole('engineer');
      } else if (userData.roles.includes('warehouse_in')) {
        setActiveRole('warehouse_in'); // 入库管理员默认显示入库页面
      } else if (userData.roles.includes('warehouse_out')) {
        setActiveRole('warehouse_out'); // 出库管理员默认显示出库页面
      } else {
        setActiveRole(userData.roles[0]);
      }
    }
    
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleLogout = () => {
    // 清除 token 和用户数据
    localStorage.removeItem('token');
    setUser(null);
    setShowLogin(true);
    setShowRegister(false);
  };

  const handleShowRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
  };

  const handleBackToLogin = () => {
    setShowLogin(true);
    setShowRegister(false);
  };

  // 角色切换处理
  const handleRoleSwitch = (role) => {
    setActiveRole(role);
  };

  // 获取角色显示名称
  const getRoleDisplayName = (role) => {
    const roleMap = {
      'admin': '系统管理',
      'manager_initiation': 'OA立项管理',
      'researcher_initiation': '项目立项',
      'researcher_development': '项目研发',
      'engineer': '工程管理'
    };
    return roleMap[role] || role;
  };

  // 根据激活的角色显示对应页面
  const renderMainContent = () => {
    if (!activeRole) return null;

    // 系统管理员
    if (activeRole === 'admin') {
      return (
        <AdminPanel 
          user={user} 
          onLogout={handleLogout}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }
    
    // 管理人员 - OA立项管理
    if (activeRole === 'manager_initiation') {
      return (
        <ProjectInitiation 
          user={user} 
          onLogout={handleLogout}
          openProjectId={openProjectId}
          onProjectOpened={() => setOpenProjectId(null)}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
          onSwitchToScheduleManagement={() => setActiveRole('manager_schedule_list')}
          onSwitchToArchive={() => setActiveRole('manager_archive')}
        />
      );
    }
    
    // 管理人员 - 项目周期安排列表
    if (activeRole === 'manager_schedule_list') {
      return (
        <ProjectScheduleManagement 
          user={user} 
          onLogout={handleLogout}
          onBackToHome={() => setActiveRole('manager_initiation')}
          onProjectSelect={(projectId) => {
            setOpenProjectId(projectId);
            setActiveRole('manager_schedule');
          }}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }
    
    // 管理人员 - 项目时间周期设置
    if (activeRole === 'manager_schedule') {
      return (
        <ProjectSchedule 
          user={user} 
          onLogout={handleLogout}
          projectId={openProjectId}
          onComplete={() => {
            setOpenProjectId(null);
            setActiveRole('manager_schedule_list');
          }}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }

    // 管理人员 - 项目归档列表
    if (activeRole === 'manager_archive') {
      return (
        <ProjectArchive 
          user={user} 
          onLogout={handleLogout}
          onBackToHome={() => setActiveRole('manager_initiation')}
          onProjectSelect={(projectId) => {
            setOpenProjectId(projectId);
            setActiveRole('manager_archive_detail');
          }}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }

    // 管理人员 - 归档详情
    if (activeRole === 'manager_archive_detail' && openProjectId) {
      return (
        <ArchiveDetail 
          user={user} 
          projectId={openProjectId}
          onBack={() => {
            setOpenProjectId(null);
            setActiveRole('manager_archive');
          }}
        />
      );
    }
    
    // 研发人员 - 项目立项
    if (activeRole === 'researcher_initiation') {
      return (
        <ProjectInitiation 
          user={user} 
          onLogout={handleLogout}
          onSwitchToDevelopment={() => setActiveRole('researcher_development')}
          openProjectId={openProjectId}
          onProjectOpened={() => setOpenProjectId(null)}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }
    
    // 研发人员 - 项目研发
    if (activeRole === 'researcher_development') {
      return (
        <ProjectDevelopment 
          user={user} 
          onLogout={handleLogout}
          onSwitchToInitiation={() => setActiveRole('researcher_initiation')}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }
    
    // 工程人员
    if (activeRole === 'engineer') {
      return (
        <ProjectEngineering 
          user={user} 
          onLogout={handleLogout}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }

    // 采购人员
    if (activeRole === 'purchaser') {
      return (
        <ProjectPurchase 
          user={user} 
          onLogout={handleLogout}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }

    // 加工师傅
    if (activeRole === 'processor') {
      return (
        <ProjectProcessing 
          user={user} 
          onLogout={handleLogout}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }

    // 装配人员
    if (activeRole === 'assembler') {
      return (
        <ProjectAssembly 
          user={user} 
          onLogout={handleLogout}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }

    // 调试人员
    if (activeRole === 'tester') {
      return (
        <ProjectTesting 
          user={user} 
          onLogout={handleLogout}
          activeRole={activeRole}
          onRoleSwitch={handleRoleSwitch}
        />
      );
    }

    // 入库管理员
    if (activeRole === 'warehouse_in') {
      if (warehouseInPage === 'first') {
        return (
          <WarehouseInFirst 
            user={user} 
            onLogout={handleLogout}
            activeRole={activeRole}
            onRoleSwitch={handleRoleSwitch}
            onSwitchToSecond={() => setWarehouseInPage('second')}
          />
        );
      } else {
        return (
          <WarehouseInSecond 
            user={user} 
            onLogout={handleLogout}
            activeRole={activeRole}
            onRoleSwitch={handleRoleSwitch}
            onSwitchToFirst={() => setWarehouseInPage('first')}
          />
        );
      }
    }

    // 出库管理员
    if (activeRole === 'warehouse_out') {
      if (warehouseOutPage === 'first') {
        return (
          <WarehouseOutFirst 
            user={user} 
            onLogout={handleLogout}
            activeRole={activeRole}
            onRoleSwitch={handleRoleSwitch}
            onSwitchToSecond={() => setWarehouseOutPage('second')}
          />
        );
      } else {
        return (
          <WarehouseOutSecond 
            user={user} 
            onLogout={handleLogout}
            activeRole={activeRole}
            onRoleSwitch={handleRoleSwitch}
            onSwitchToFirst={() => setWarehouseOutPage('first')}
          />
        );
      }
    }
    
    // 其他情况
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: '20px'
      }}>
        <h2>欢迎，{user.displayName || user.username}</h2>
        <p>您的专属工作页面正在开发中...</p>
        <button 
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '8px',
            border: '1px solid #ccc',
            background: '#f5f5f5'
          }}
        >
          退出登录
        </button>
      </div>
    );
  };

  // 显示加载状态
  if (loading) {
    return (
      <div className="App" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div className="App">
      {pendingNotification && (
        <NotificationModal
          notification={pendingNotification}
          onView={async (n) => {
            try {
              await notificationAPI.markAsRead(n._id);
            } catch {}
            setPendingNotification(null);
            
            // 根据通知类型跳转到不同页面
            if (n.type === 'project_needs_schedule') {
              // 立项批准后，需要主负责人设置时间周期
              try { localStorage.setItem('scheduleProjectId', n.projectId); } catch (e) {}
              setOpenProjectId(n.projectId);
              setActiveRole('manager_schedule');
            } else if (n.type === 'project_assigned') {
              // 项目已下发，跳转到对应角色的工作页面
              if (user && user.roles && user.roles.includes('researcher')) {
                setActiveRole('researcher_development');
              } else if (user && user.roles && user.roles.includes('engineer')) {
                setActiveRole('engineer');
              }
              // 其他角色暂时不跳转，只标记为已读
            } else if (n.type === 'project_ready_for_archive') {
              // 项目完成，提示管理主负责人归档
              try { localStorage.setItem('openProjectId', n.projectId); } catch (e) {}
              setOpenProjectId(n.projectId);
              setActiveRole('manager_archive_detail');
            } else {
              // 跳到立项页面并打开对应项目
              try { localStorage.setItem('openProjectId', n.projectId); } catch (e) {}
              setOpenProjectId(n.projectId);
              if (user && user.roles && user.roles.includes('researcher')) {
                setActiveRole('researcher_initiation');
              } else if (user && user.roles && user.roles.includes('manager')) {
                setActiveRole('manager_initiation');
              }
            }
          }}
          onDismiss={async (n) => {
            try {
              await notificationAPI.markAsRead(n._id);
            } catch {}
            setPendingNotification(null);
            // 留在主页面
          }}
        />
      )}
      {showRegister ? (
        <Register 
          onBackToLogin={handleBackToLogin}
          onRegisterSuccess={handleBackToLogin}
        />
      ) : showLogin ? (
        <Login 
          onLogin={handleLogin}
          onShowRegister={handleShowRegister}
        />
      ) : (
        renderMainContent()
      )}
    </div>
  );
}

export default App;