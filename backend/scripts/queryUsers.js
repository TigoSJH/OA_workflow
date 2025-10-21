require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const queryUsers = async () => {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
    
    // 查询所有用户
    const users = await User.find();
    
    console.log(`📊 用户总数: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('暂无用户数据');
    } else {
      users.forEach((user, index) => {
        console.log(`--- 用户 ${index + 1} ---`);
        console.log(`ID: ${user._id}`);
        console.log(`用户名: ${user.username}`);
        console.log(`显示名: ${user.displayName}`);
        console.log(`邮箱: ${user.email || '未设置'}`);
        console.log(`电话: ${user.phone || '未设置'}`);
        console.log(`角色: ${user.roles.join(', ') || '无'}`);
        console.log(`状态: ${user.status}`);
        console.log(`创建时间: ${user.createTime}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
};

queryUsers();

