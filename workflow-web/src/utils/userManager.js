// 用户数据管理模块 - 使用 localStorage 模拟数据库

// 初始化数据库（只有admin账号）
const initDatabase = () => {
  const users = localStorage.getItem('users');
  if (!users) {
    const defaultUsers = [
      {
        id: 1,
        username: 'admin',
        password: '123456',
        roles: ['admin'],
        displayName: '系统管理员',
        status: 'approved', // approved: 已批准, pending: 待审批, rejected: 已拒绝
        email: '',
        phone: '',
        createTime: new Date().toISOString(),
        approveTime: new Date().toISOString(),
      }
    ];
    localStorage.setItem('users', JSON.stringify(defaultUsers));
    localStorage.setItem('userIdCounter', '2'); // 下一个用户ID
  }
};

// 获取所有用户
export const getAllUsers = () => {
  initDatabase();
  const users = localStorage.getItem('users');
  return JSON.parse(users) || [];
};

// 根据用户名获取用户
export const getUserByUsername = (username) => {
  const users = getAllUsers();
  return users.find(user => user.username === username);
};

// 注册新用户
export const registerUser = (userData) => {
  const users = getAllUsers();
  
  // 检查用户名是否已存在
  if (users.some(user => user.username === userData.username)) {
    return { success: false, message: '用户名已存在' };
  }
  
  // 获取下一个用户ID
  let idCounter = parseInt(localStorage.getItem('userIdCounter') || '2');
  
  // 创建新用户
  const newUser = {
    id: idCounter,
    username: userData.username,
    password: userData.password,
    email: userData.email || '',
    phone: userData.phone || '',
    displayName: userData.displayName || userData.username,
    roles: [], // 注册时没有角色，需要admin分配
    status: 'pending', // 待审批
    createTime: new Date().toISOString(),
    approveTime: null,
    approver: null,
  };
  
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('userIdCounter', (idCounter + 1).toString());
  
  return { success: true, message: '注册成功，等待管理员审批' };
};

// 登录验证
export const loginUser = (username, password) => {
  const user = getUserByUsername(username);
  
  if (!user) {
    return { success: false, message: '用户名或密码错误' };
  }
  
  if (user.password !== password) {
    return { success: false, message: '用户名或密码错误' };
  }
  
  if (user.status === 'pending') {
    return { success: false, message: '账号待审批，请等待管理员审核' };
  }
  
  if (user.status === 'rejected') {
    return { success: false, message: '账号已被拒绝，请联系管理员' };
  }
  
  // 登录成功，返回用户信息（不包含密码）
  const { password: _, ...userInfo } = user;
  return { 
    success: true, 
    user: {
      ...userInfo,
      role: user.roles[0] || 'user',
      hasMultipleRoles: user.roles.length > 1
    }
  };
};

// 更新用户信息（Admin使用）
export const updateUser = (userId, updates) => {
  const users = getAllUsers();
  const index = users.findIndex(user => user.id === userId);
  
  if (index === -1) {
    return { success: false, message: '用户不存在' };
  }
  
  users[index] = { ...users[index], ...updates };
  localStorage.setItem('users', JSON.stringify(users));
  
  return { success: true, message: '更新成功' };
};

// 批准用户（Admin使用）
export const approveUser = (userId, roles, approver) => {
  const users = getAllUsers();
  const index = users.findIndex(user => user.id === userId);
  
  if (index === -1) {
    return { success: false, message: '用户不存在' };
  }
  
  users[index].status = 'approved';
  users[index].roles = roles;
  users[index].approveTime = new Date().toISOString();
  users[index].approver = approver;
  
  localStorage.setItem('users', JSON.stringify(users));
  
  return { success: true, message: '用户已批准' };
};

// 拒绝用户（Admin使用）
export const rejectUser = (userId, approver) => {
  const users = getAllUsers();
  const index = users.findIndex(user => user.id === userId);
  
  if (index === -1) {
    return { success: false, message: '用户不存在' };
  }
  
  users[index].status = 'rejected';
  users[index].approveTime = new Date().toISOString();
  users[index].approver = approver;
  
  localStorage.setItem('users', JSON.stringify(users));
  
  return { success: true, message: '用户已拒绝' };
};

// 删除用户（Admin使用）
export const deleteUser = (userId) => {
  const users = getAllUsers();
  const filteredUsers = users.filter(user => user.id !== userId);
  
  if (filteredUsers.length === users.length) {
    return { success: false, message: '用户不存在' };
  }
  
  localStorage.setItem('users', JSON.stringify(filteredUsers));
  
  return { success: true, message: '用户已删除' };
};

// 获取待审批用户
export const getPendingUsers = () => {
  const users = getAllUsers();
  return users.filter(user => user.status === 'pending');
};

// 获取已批准用户
export const getApprovedUsers = () => {
  const users = getAllUsers();
  return users.filter(user => user.status === 'approved');
};

// 清空数据库（开发测试用）
export const clearDatabase = () => {
  localStorage.removeItem('users');
  localStorage.removeItem('userIdCounter');
  initDatabase();
};

// 初始化
initDatabase();



