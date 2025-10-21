require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const initAdmin = async () => {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 检查是否已存在 admin 用户
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('⚠️  admin 用户已存在，无需创建');
      process.exit(0);
    }
    
    // 创建 admin 用户
    const admin = new User({
      username: 'admin',
      password: '123456',
      displayName: '系统管理员',
      email: 'admin@example.com',
      phone: '',
      roles: ['admin'],
      status: 'approved',
      approveTime: new Date()
    });
    
    await admin.save();
    
    console.log('✅ 默认管理员账号创建成功！');
    console.log('👤 用户名: admin');
    console.log('🔒 密码: 123456');
    console.log('⚠️  请在生产环境中修改默认密码！');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建管理员失败:', error);
    process.exit(1);
  }
};

initAdmin();

