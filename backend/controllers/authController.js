const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 生成 JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d' // 7天过期
  });
};

// 简易短信验证码存储（开发环境内存版）
const smsStore = new Map(); // key: phone, value: { codeHash, expiresAt, lastSendAt, sendCountHour }
const CODE_TTL_MS = (parseInt(process.env.SMS_CODE_TTL, 10) || 300) * 1000; // 默认5分钟

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function canSendNow(phone) {
  const info = smsStore.get(phone);
  const now = Date.now();
  if (!info) return true;
  // 60秒限流
  if (info.lastSendAt && now - info.lastSendAt < 60 * 1000) return false;
  // 每小时最多5次
  if (info.windowStart && now - info.windowStart > 60 * 60 * 1000) {
    info.windowStart = now;
    info.sendCountHour = 0;
  }
  return (info.sendCountHour || 0) < 5;
}

function recordSend(phone) {
  const now = Date.now();
  const info = smsStore.get(phone) || {};
  if (!info.windowStart || now - info.windowStart > 60 * 60 * 1000) {
    info.windowStart = now;
    info.sendCountHour = 0;
  }
  info.lastSendAt = now;
  info.sendCountHour = (info.sendCountHour || 0) + 1;
  smsStore.set(phone, info);
}

// 发送短信验证码（开发环境Mock：控制台输出）
exports.sendSmsCode = async (req, res) => {
  try {
    const { phoneNumber, scene } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: '请提供手机号' });
    }
    if (!canSendNow(phoneNumber)) {
      return res.status(429).json({ error: '发送过于频繁，请稍后再试' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const info = smsStore.get(phoneNumber) || {};
    info.codeHash = hashCode(code);
    info.expiresAt = Date.now() + CODE_TTL_MS;
    smsStore.set(phoneNumber, info);
    recordSend(phoneNumber);
    const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
    if (provider === 'aliyun') {
      try {
        const { sendSms } = require('../services/sms/aliyun');
        const templateCode = (scene === 'register'
          ? process.env.SMS_TEMPLATE_CODE_REGISTER
          : process.env.SMS_TEMPLATE_CODE_LOGIN) || process.env.SMS_TEMPLATE_CODE_LOGIN;
        await sendSms({
          phoneNumber,
          templateCode,
          params: { code }
        });
      } catch (e) {
        console.error('阿里云短信发送失败:', e.message || e);
        return res.status(500).json({ error: '短信发送失败，请稍后再试' });
      }
    } else {
      console.log(`[SMS MOCK] scene=${scene || 'login'} phone=${phoneNumber} code=${code}`);
    }
    res.json({ message: '验证码已发送' });
  } catch (error) {
    console.error('发送短信验证码错误:', error);
    res.status(500).json({ error: '发送验证码失败' });
  }
};

// 短信验证码登录（仅手机号+验证码）
exports.loginWithSms = async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ error: '请提供手机号和验证码' });
    }
    const info = smsStore.get(phoneNumber);
    if (!info || !info.codeHash || !info.expiresAt || Date.now() > info.expiresAt) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }
    if (info.codeHash !== hashCode(code)) {
      return res.status(400).json({ error: '验证码错误' });
    }

    // 查找或创建用户（如果希望仅已注册用户能登录，把这段改为只查找）
    let user = await User.findOne({ phone: phoneNumber });
    if (!user) {
      // 自动创建占位用户，状态为 pending，等待管理员审批
      user = new User({
        username: `u_${phoneNumber}`,
        displayName: phoneNumber,
        phone: phoneNumber,
        phoneVerified: true,
        roles: [],
        status: 'pending'
      });
      await user.save();
    } else if (!user.phoneVerified) {
      user.phoneVerified = true;
      await user.save();
    }

    // 清理一次验证码
    smsStore.delete(phoneNumber);

    // 待审批账号禁止登录，提示等待管理员批准
    if (user.status !== 'approved') {
      return res.status(403).json({ error: '账号待审批，请等待管理员批准' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        role: user.roles[0] || 'user',
        hasMultipleRoles: user.roles.length > 1,
        status: user.status,
        isPrimaryLeader: user.isPrimaryLeader || false,
        primaryLeaderRoles: user.primaryLeaderRoles || []
      }
    });
  } catch (error) {
    console.error('短信登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
};

// 短信注册（手机号+验证码，允许设置显示名）
exports.registerWithSms = async (req, res) => {
  try {
    const { phoneNumber, code, displayName } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ error: '请提供手机号和验证码' });
    }
    const info = smsStore.get(phoneNumber);
    if (!info || !info.codeHash || !info.expiresAt || Date.now() > info.expiresAt) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }
    if (info.codeHash !== hashCode(code)) {
      return res.status(400).json({ error: '验证码错误' });
    }

    // 已存在则直接返回提示（也可选择直接签发token）
    let existing = await User.findOne({ phone: phoneNumber });
    if (existing) {
      return res.status(200).json({ message: '手机号已注册，请直接登录' });
    }

    const user = new User({
      username: `u_${phoneNumber}`,
      displayName: displayName || phoneNumber,
      phone: phoneNumber,
      phoneVerified: true,
      roles: [],
      status: 'pending'
    });
    await user.save();

    // 清理验证码
    smsStore.delete(phoneNumber);

    res.status(201).json({
      message: '注册成功，请等待管理员审批',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        status: user.status
      }
    });
  } catch (error) {
    console.error('短信注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
};
// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }
    
    // 查找用户
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 验证密码
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 检查用户状态
    if (user.status === 'pending') {
      return res.status(403).json({ error: '账号待审批，请等待管理员审核' });
    }
    
    if (user.status === 'rejected') {
      return res.status(403).json({ error: '账号已被拒绝，请联系管理员' });
    }
    
    // 生成 token
    const token = generateToken(user._id);
    
    // 返回用户信息和 token
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        role: user.roles[0] || 'user',
        hasMultipleRoles: user.roles.length > 1,
        status: user.status,
        isPrimaryLeader: user.isPrimaryLeader || false,
        primaryLeaderRoles: user.primaryLeaderRoles || []
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
};

// 用户注册
exports.register = async (req, res) => {
  try {
    const { username, password, displayName, email, phone } = req.body;
    
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
    
    // 创建新用户
    const user = new User({
      username,
      password,
      displayName: displayName || username,
      email,
      phone,
      roles: [], // 注册时没有角色，需要管理员分配
      status: 'pending' // 待审批
    });
    
    await user.save();
    
    res.status(201).json({
      message: '注册成功，请等待管理员审批',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        status: user.status
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        email: req.user.email,
        phone: req.user.phone,
        roles: req.user.roles,
        role: req.user.roles[0] || 'user',
        hasMultipleRoles: req.user.roles.length > 1,
        status: req.user.status,
        isPrimaryLeader: req.user.isPrimaryLeader || false,
        primaryLeaderRoles: req.user.primaryLeaderRoles || []
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

// 修改密码
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请提供旧密码和新密码' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少6个字符' });
    }
    
    // 验证旧密码
    const isMatch = await req.user.comparePassword(oldPassword);
    
    if (!isMatch) {
      return res.status(401).json({ error: '旧密码错误' });
    }
    
    // 更新密码
    req.user.password = newPassword;
    await req.user.save();
    
    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
};

// 登出
exports.logout = async (req, res) => {
  try {
    // 在实际应用中，可以将 token 加入黑名单
    // 这里简单返回成功
    res.json({ message: '登出成功' });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({ error: '登出失败' });
  }
};

