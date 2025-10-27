import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import { userAPI } from '../services/api';

const UserManagement = ({ user, onBack }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  // 可用角色列表
  const availableRoles = [
    { value: 'manager', label: '管理人员', icon: '👔' },
    { value: 'researcher', label: '研发人员', icon: '🔬' },
    { value: 'engineer', label: '工程师', icon: '👷' },
    { value: 'purchaser', label: '采购人员', icon: '🛒' },
    { value: 'processor', label: '加工人员', icon: '⚒️' },
    { value: 'assembler', label: '装配工', icon: '🔧' },
    { value: 'tester', label: '调试人员', icon: '🧪' },
    { value: 'warehouse_in', label: '入库管理员', icon: '📥' },
    { value: 'warehouse_out', label: '出库管理员', icon: '📤' },
  ];

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // 根据 tab 加载不同状态的用户
      const params = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      
      const response = await userAPI.getUsers(params);
      // 过滤掉 admin 用户
      const filteredUsers = response.users.filter(u => u.username !== 'admin');
      setUsers(filteredUsers);
    } catch (error) {
      console.error('加载用户列表失败:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await userAPI.getUserStats();
      setStats({
        total: response.stats.total - 1, // 不计 admin
        pending: response.stats.pending,
        approved: response.stats.approved - 1, // 不计 admin
        rejected: response.stats.rejected
      });
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  const handleApprove = (userId) => {
    const targetUser = users.find(u => u.id === userId);
    setSelectedUser(targetUser);
    setSelectedRoles([]);
    setShowRoleModal(true);
  };

  const confirmApprove = async () => {
    if (selectedRoles.length === 0) {
      console.warn('请至少选择一个职位');
      return;
    }

    try {
      setLoading(true);
      // 如果是待审批用户，调用批准接口
      if (selectedUser.status === 'pending') {
        await userAPI.approveUser(selectedUser.id, selectedRoles);
      } else {
        // 如果是已批准用户，调用更新接口
        await userAPI.updateUser(selectedUser.id, { roles: selectedRoles });
      }
      
      console.log('用户职位已更新');
      setShowRoleModal(false);
      setSelectedUser(null);
      setSelectedRoles([]);
      loadUsers();
      loadStats();
    } catch (error) {
      console.error('操作失败:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (userId) => {
    try {
      setLoading(true);
      await userAPI.rejectUser(userId);
      console.log('已拒绝该用户');
      loadUsers();
      loadStats();
    } catch (error) {
      console.error('操作失败:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    const confirmMessage = `⚠️  危险操作警告！\n\n确认删除用户 "${username}" 吗？\n\n删除后将会：\n• 从数据库中永久删除该用户\n• 删除该用户创建的所有项目\n• 此操作不可恢复\n\n请输入 "DELETE" 确认删除`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput === 'DELETE') {
      try {
        setLoading(true);
        const response = await userAPI.deleteUser(userId);
        console.log('删除成功:', response.message || '用户已删除');
        loadUsers();
        loadStats();
      } catch (error) {
        console.error('删除失败：', error.message);
      } finally {
        setLoading(false);
      }
    } else if (userInput !== null) {
      console.warn('输入不正确，删除操作已取消');
    }
  };

  const handleRoleToggle = (roleValue) => {
    if (selectedRoles.includes(roleValue)) {
      setSelectedRoles(selectedRoles.filter(r => r !== roleValue));
    } else {
      setSelectedRoles([...selectedRoles, roleValue]);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="user-management-container">
      {/* 顶部导航 */}
      <div className="user-management-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <h2 className="header-title">用户管理</h2>
        <div className="header-spacer"></div>
      </div>

      <div className="user-management-content">
        {/* 统计卡片 */}
        <div className="stats-grid-user">
          <div className="stat-card stat-total">
            <div className="stat-icon">👥</div>
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">总用户数</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">待审批</div>
          </div>
          <div className="stat-card stat-approved">
            <div className="stat-icon">✅</div>
            <div className="stat-number">{stats.approved}</div>
            <div className="stat-label">已批准</div>
          </div>
          <div className="stat-card stat-rejected">
            <div className="stat-icon">❌</div>
            <div className="stat-number">{stats.rejected}</div>
            <div className="stat-label">已拒绝</div>
          </div>
        </div>

        {/* Tab切换 */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            待审批 ({stats.pending})
          </button>
          <button 
            className={`tab ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            已批准
          </button>
          <button 
            className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            已拒绝
          </button>
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            全部
          </button>
        </div>

        {/* 用户列表 */}
        <div className="user-list">
          {users.map(u => (
            <div key={u.id} className="user-card">
              <div className="user-info-section">
                <div className="user-avatar-large">👤</div>
                <div className="user-details">
                  <h3 className="user-name">{u.displayName || u.username}</h3>
                  <div className="user-meta">
                    <span>🆔 {u.username}</span>
                    {u.email && <span>📧 {u.email}</span>}
                    {u.phone && <span>📱 {u.phone}</span>}
                  </div>
                  <div className="user-meta">
                    <span>📅 注册: {formatDate(u.createTime)}</span>
                  </div>
                  {u.roles && u.roles.length > 0 && (
                    <div className="user-roles">
                      {u.roles.map(role => {
                        const roleInfo = availableRoles.find(r => r.value === role);
                        return (
                          <span key={role} className="role-badge">
                            {roleInfo ? roleInfo.icon : ''} {roleInfo ? roleInfo.label : role}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="user-actions">
                <span className={`status-badge-user status-${u.status}`}>
                  {u.status === 'pending' && '⏳ 待审批'}
                  {u.status === 'approved' && '✅ 已批准'}
                  {u.status === 'rejected' && '❌ 已拒绝'}
                </span>
                
                {u.status === 'pending' && (
                  <div className="action-buttons">
                    <button 
                      className="btn-approve-user"
                      onClick={() => handleApprove(u.id)}
                    >
                      ✅ 批准
                    </button>
                    <button 
                      className="btn-reject-user"
                      onClick={() => handleReject(u.id)}
                    >
                      ❌ 拒绝
                    </button>
                  </div>
                )}
                
                {u.status === 'approved' && (
                  <div className="action-buttons">
                    <button 
                      className="btn-edit-roles"
                      onClick={() => {
                        setSelectedUser(u);
                        setSelectedRoles(u.roles || []);
                        setShowRoleModal(true);
                      }}
                    >
                      🔄 修改职位
                    </button>
                    <button 
                      className="btn-delete-user"
                      onClick={() => handleDeleteUser(u.id, u.username)}
                    >
                      🗑️ 删除
                    </button>
                  </div>
                )}
                
                {u.status === 'rejected' && (
                  <button 
                    className="btn-delete-user"
                    onClick={() => handleDeleteUser(u.id, u.username)}
                  >
                    🗑️ 删除
                  </button>
                )}
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无用户</p>
            </div>
          )}
        </div>
      </div>

      {/* 角色分配弹窗 */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>为 {selectedUser.displayName || selectedUser.username} 分配职位</h3>
            <p className="modal-subtitle">可以选择多个职位</p>
            
            <div className="roles-selection">
              {availableRoles.map(role => (
                <div 
                  key={role.value}
                  className={`role-option ${selectedRoles.includes(role.value) ? 'selected' : ''}`}
                  onClick={() => handleRoleToggle(role.value)}
                >
                  <span className="role-icon">{role.icon}</span>
                  <span className="role-label">{role.label}</span>
                  <span className="role-check">
                    {selectedRoles.includes(role.value) ? '✓' : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="selected-roles-preview">
              <strong>已选职位：</strong>
              {selectedRoles.length === 0 ? (
                <span style={{color: '#999'}}>未选择</span>
              ) : (
                selectedRoles.map(roleValue => {
                  const roleInfo = availableRoles.find(r => r.value === roleValue);
                  return (
                    <span key={roleValue} className="preview-badge">
                      {roleInfo.icon} {roleInfo.label}
                    </span>
                  );
                })
              )}
            </div>

            <div className="modal-buttons">
              <button onClick={() => setShowRoleModal(false)}>取消</button>
              <button className="primary" onClick={confirmApprove}>
                确认分配
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;



