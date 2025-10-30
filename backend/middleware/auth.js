const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 验证 JWT Token
const auth = async (req, res, next) => {
  try {
    console.log('[AUTH] 请求路径:', req.method, req.path);
    
    // 从请求头获取 token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('[AUTH] ❌ 未提供token');
      return res.status(401).json({ error: '未提供认证令牌，请先登录' });
    }
    
    console.log('[AUTH] ✓ Token存在');
    
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('[AUTH] ❌ 用户不存在');
      return res.status(401).json({ error: '用户不存在' });
    }
    
    if (user.status !== 'approved') {
      console.log('[AUTH] ❌ 账号未激活');
      return res.status(403).json({ error: '账号未激活，请等待管理员审批' });
    }
    
    console.log('[AUTH] ✓ 认证成功，用户:', user.username);
    
    // 将用户信息附加到请求对象
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.log('[AUTH] ❌ 认证错误:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的认证令牌' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '认证令牌已过期，请重新登录' });
    }
    res.status(401).json({ error: '认证失败' });
  }
};

// 验证管理员权限
const adminAuth = async (req, res, next) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// 验证管理人员权限（包括admin和manager）
const managerAuth = async (req, res, next) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('manager')) {
    return res.status(403).json({ error: '需要管理人员权限' });
  }
  next();
};

module.exports = { auth, adminAuth, managerAuth };

