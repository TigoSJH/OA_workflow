import React from 'react';
import './RoleBadges.css';

const RoleBadges = ({ user, activeRole, onRoleSwitch }) => {
  if (!user || !user.roles || user.roles.length === 0) {
    return null;
  }

  // 角色映射：数据库角色 -> 显示名称和对应的页面角色
  const roleMapping = {
    'admin': { name: '系统管理', pageRole: 'admin' },
    'manager': { name: '管理', pageRole: 'manager_initiation' },
    'researcher': { name: '研发', pageRole: 'researcher_initiation' },
    'engineer': { name: '工程', pageRole: 'engineer' },
    'purchaser': { name: '采购', pageRole: 'purchaser' },
    'processor': { name: '加工', pageRole: 'processor' },
    'assembler': { name: '装配', pageRole: 'assembler' },
    'tester': { name: '调试', pageRole: 'tester' },
    'warehouse_in': { name: '入库', pageRole: 'warehouse_in' },
    'warehouse_out': { name: '出库', pageRole: 'warehouse_out' }
  };

  // 生成可切换的角色列表
  const availableRoles = [];
  
  user.roles.forEach(role => {
    const mapping = roleMapping[role];
    if (mapping) {
      availableRoles.push(mapping);
    }
  });

  // 如果只有一个角色，不显示切换功能
  if (availableRoles.length === 1) {
    return (
      <div className="role-badges-container">
        <span className="role-badge active">{availableRoles[0].name}</span>
      </div>
    );
  }

  return (
    <div className="role-badges-container">
      {availableRoles.map((roleInfo, index) => (
        <button
          key={index}
          className={`role-badge ${activeRole === roleInfo.pageRole || (activeRole === 'researcher_development' && roleInfo.pageRole === 'researcher_initiation') ? 'active' : ''}`}
          onClick={() => onRoleSwitch && onRoleSwitch(roleInfo.pageRole)}
          title={`切换到${roleInfo.name}`}
        >
          {roleInfo.name}
        </button>
      ))}
    </div>
  );
};

export default RoleBadges;

