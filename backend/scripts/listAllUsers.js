const mongoose = require('mongoose');
const User = require('../models/User');

// 连接数据库
const dbURI = 'mongodb://localhost:27017/workflow_system';

mongoose.connect(dbURI)
  .then(() => {
    console.log('MongoDB 连接成功');
    return listUsers();
  })
  .catch(err => {
    console.error('MongoDB 连接失败:', err);
    process.exit(1);
  });

async function listUsers() {
  try {
    const users = await User.find({});
    
    console.log(`\n找到 ${users.length} 个用户:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}`);
      console.log(`   显示名: ${user.displayName || '未设置'}`);
      console.log(`   角色: ${user.roles.join(', ') || '无'}`);
      console.log(`   是否主负责人: ${user.isPrimaryLeader ? '是' : '否'}`);
      console.log(`   主负责人角色: ${user.primaryLeaderRoles?.join(', ') || '无'}`);
      console.log(`   状态: ${user.status}`);
      console.log('');
    });
    
    // 查找有 manager 角色的用户
    const managers = users.filter(u => u.roles.includes('manager'));
    console.log(`\n有 manager 角色的用户 (${managers.length} 个):`);
    managers.forEach(m => {
      console.log(`  - ${m.username} (主负责人: ${m.isPrimaryLeader ? '是' : '否'})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

