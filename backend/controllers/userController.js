const User = require('../models/User');

// 获取所有用户
exports.getAllUsers = async (req, res) => {
  try {
    const { status, role } = req.query;
    
    // 构建查询条件
    let query = {};
    if (status) query.status = status;
    if (role) query.roles = role;
    
    const users = await User.find(query).select('-password').sort({ createTime: -1 });
    
    res.json({
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        status: user.status,
        approver: user.approver,
        approveTime: user.approveTime,
        createTime: user.createTime,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
};

// 获取单个用户
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        status: user.status,
        approver: user.approver,
        approveTime: user.approveTime,
        createTime: user.createTime
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

// 创建用户（管理员）
exports.createUser = async (req, res) => {
  try {
    const { username, password, displayName, email, phone, roles } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }
    
    if (username.length < 3) {
      return res.status(400).json({ error: '用户名至少3个字符' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6个字符' });
    }
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 创建用户
    const user = new User({
      username,
      password,
      displayName: displayName || username,
      email,
      phone,
      roles: roles || [],
      status: 'approved', // 管理员创建的用户直接批准
      approver: req.user.username,
      approveTime: new Date()
    });
    
    await user.save();
    
    res.status(201).json({
      message: '用户创建成功',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        status: user.status
      }
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    res.status(500).json({ error: '创建用户失败' });
  }
};

// 更新用户信息
exports.updateUser = async (req, res) => {
  try {
    const { displayName, email, phone, roles, status } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 不允许修改admin用户的角色和状态
    if (user.username === 'admin' && (roles || status)) {
      return res.status(403).json({ error: '不能修改管理员的角色和状态' });
    }
    
    // 更新字段
    if (displayName !== undefined) user.displayName = displayName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (roles !== undefined) user.roles = roles;
    if (status !== undefined) user.status = status;
    
    await user.save();
    
    res.json({
      message: '用户信息更新成功',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        status: user.status
      }
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
};

// 批准用户
exports.approveUser = async (req, res) => {
  try {
    const { roles } = req.body;
    
    if (!roles || roles.length === 0) {
      return res.status(400).json({ error: '请指定用户角色' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.status === 'approved') {
      // 对于已批准用户，仅更新角色
      user.roles = roles;
    } else {
      // 对于待审批用户，更新状态和角色
      user.status = 'approved';
      user.roles = roles;
      user.approver = req.user.username;
      user.approveTime = new Date();
    }
    
    await user.save();
    
    res.json({
      message: '用户已批准',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles,
        status: user.status
      }
    });
  } catch (error) {
    console.error('批准用户错误:', error);
    res.status(500).json({ error: '批准用户失败' });
  }
};

// 拒绝用户
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    user.status = 'rejected';
    user.approver = req.user.username;
    user.approveTime = new Date();
    
    await user.save();
    
    res.json({
      message: '用户已拒绝',
      user: {
        id: user._id,
        username: user.username,
        status: user.status
      }
    });
  } catch (error) {
    console.error('拒绝用户错误:', error);
    res.status(500).json({ error: '拒绝用户失败' });
  }
};

// 重置用户密码
exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少6个字符' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: '密码重置成功' });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ error: '重置密码失败' });
  }
};

// 删除用户
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 不允许删除admin用户
    if (user.username === 'admin') {
      return res.status(403).json({ error: '不能删除管理员账号' });
    }
    
    // 级联删除：删除该用户创建的所有项目
    const Project = require('../models/Project');
    const deletedProjects = await Project.deleteMany({ createdBy: req.params.id });
    
    // 删除用户
    await User.findByIdAndDelete(req.params.id);
    
    console.log(`删除用户 ${user.username}，同时删除了 ${deletedProjects.deletedCount} 个相关项目`);
    
    res.json({ 
      message: `用户已删除，同时删除了 ${deletedProjects.deletedCount} 个相关项目`,
      deletedProjectsCount: deletedProjects.deletedCount
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
};

// 获取用户统计信息
exports.getUserStats = async (req, res) => {
  try {
    const total = await User.countDocuments();
    const pending = await User.countDocuments({ status: 'pending' });
    const approved = await User.countDocuments({ status: 'approved' });
    const rejected = await User.countDocuments({ status: 'rejected' });
    
    res.json({
      stats: {
        total,
        pending,
        approved,
        rejected
      }
    });
  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
};

// 设置主负责人
exports.setPrimaryLeader = async (req, res) => {
  try {
    const { userId, roles } = req.body;
    
    if (!userId || !roles || roles.length === 0) {
      return res.status(400).json({ error: '请提供用户ID和角色' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 验证角色是否有效
    const validRoles = ['manager', 'researcher', 'engineer', 'purchaser', 'processor', 'assembler', 'tester', 'warehouse_in', 'warehouse_out'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    
    if (invalidRoles.length > 0) {
      return res.status(400).json({ error: '包含无效的角色' });
    }
    
    // 验证用户是否拥有这些角色
    const userRoles = user.roles || [];
    const missingRoles = roles.filter(role => !userRoles.includes(role));
    
    if (missingRoles.length > 0) {
      return res.status(400).json({ error: `用户不具有以下角色：${missingRoles.join(', ')}` });
    }
    
    // 移除其他用户在这些角色上的主负责人标识
    for (const role of roles) {
      await User.updateMany(
        { primaryLeaderRoles: role, _id: { $ne: userId } },
        { $pull: { primaryLeaderRoles: role } }
      );
    }
    
    // 设置当前用户为主负责人
    user.isPrimaryLeader = true;
    user.primaryLeaderRoles = [...new Set([...user.primaryLeaderRoles, ...roles])];
    
    await user.save();
    
    res.json({
      message: '主负责人设置成功',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        isPrimaryLeader: user.isPrimaryLeader,
        primaryLeaderRoles: user.primaryLeaderRoles
      }
    });
  } catch (error) {
    console.error('设置主负责人错误:', error);
    res.status(500).json({ error: '设置主负责人失败' });
  }
};

// 移除主负责人
exports.removePrimaryLeader = async (req, res) => {
  try {
    const { userId, roles } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: '请提供用户ID' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (roles && roles.length > 0) {
      // 移除特定角色的主负责人
      user.primaryLeaderRoles = user.primaryLeaderRoles.filter(role => !roles.includes(role));
    } else {
      // 移除所有主负责人角色
      user.primaryLeaderRoles = [];
    }
    
    // 如果没有任何主负责人角色，则设置isPrimaryLeader为false
    if (user.primaryLeaderRoles.length === 0) {
      user.isPrimaryLeader = false;
    }
    
    await user.save();
    
    res.json({
      message: '主负责人移除成功',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        isPrimaryLeader: user.isPrimaryLeader,
        primaryLeaderRoles: user.primaryLeaderRoles
      }
    });
  } catch (error) {
    console.error('移除主负责人错误:', error);
    res.status(500).json({ error: '移除主负责人失败' });
  }
};

// 获取所有主负责人
exports.getPrimaryLeaders = async (req, res) => {
  try {
    const leaders = await User.find({ isPrimaryLeader: true }).select('-password');
    
    res.json({
      leaders: leaders.map(leader => ({
        id: leader._id,
        username: leader.username,
        displayName: leader.displayName,
        roles: leader.roles,
        primaryLeaderRoles: leader.primaryLeaderRoles
      }))
    });
  } catch (error) {
    console.error('获取主负责人列表错误:', error);
    res.status(500).json({ error: '获取主负责人列表失败' });
  }
};

// 获取可分配角色列表
exports.getAssignableRoles = async (req, res) => {
  try {
    const validRoles = ['manager', 'researcher', 'engineer', 'purchaser', 'processor', 'assembler', 'tester', 'warehouse_in', 'warehouse_out'];
    res.json({ roles: validRoles });
  } catch (error) {
    console.error('获取可分配角色列表失败:', error);
    res.status(500).json({ error: '获取可分配角色列表失败' });
  }
};

