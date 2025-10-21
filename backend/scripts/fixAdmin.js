require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const fixAdmin = async () => {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 查找 admin 用户
    const admin = await User.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('❌ 找不到 admin 用户');
      process.exit(1);
    }
    
    console.log('📋 修复前:');
    console.log(`用户名: ${admin.username}`);
    console.log(`角色: ${admin.roles.join(', ') || '无'}`);
    console.log(`状态: ${admin.status}\n`);
    
    // 修复 admin 用户
    admin.roles = ['admin'];
    admin.status = 'approved';
    admin.approveTime = new Date();
    
    await admin.save();
    
    console.log('✅ 修复成功！\n');
    console.log('📋 修复后:');
    console.log(`用户名: ${admin.username}`);
    console.log(`角色: ${admin.roles.join(', ')}`);
    console.log(`状态: ${admin.status}\n`);
    
    console.log('🎉 admin 用户已修复，现在可以正常使用管理员功能了！');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
};

fixAdmin();

