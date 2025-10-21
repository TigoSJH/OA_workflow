const mongoose = require('mongoose');
const User = require('../models/User');

// 连接数据库
const dbURI = 'mongodb://localhost:27017/workflow_system';

mongoose.connect(dbURI)
  .then(() => {
    console.log('MongoDB 连接成功');
    return updateTigo();
  })
  .catch(err => {
    console.error('MongoDB 连接失败:', err);
    process.exit(1);
  });

async function updateTigo() {
  try {
    // 查找 tigo 用户
    const tigo = await User.findOne({ username: 'tigo' });
    
    if (!tigo) {
      console.log('❌ 未找到 tigo 用户');
      process.exit(1);
    }
    
    console.log('\n当前 tigo 账号信息:');
    console.log('  用户名:', tigo.username);
    console.log('  显示名:', tigo.displayName);
    console.log('  角色:', tigo.roles);
    console.log('  是否主负责人:', tigo.isPrimaryLeader);
    console.log('  主负责人角色:', tigo.primaryLeaderRoles);
    console.log('  状态:', tigo.status);
    
    // 更新为主负责人
    tigo.isPrimaryLeader = true;
    
    // 确保有 manager 角色
    if (!tigo.roles.includes('manager')) {
      tigo.roles.push('manager');
    }
    
    // 设置主负责人角色
    if (!tigo.primaryLeaderRoles) {
      tigo.primaryLeaderRoles = [];
    }
    if (!tigo.primaryLeaderRoles.includes('manager')) {
      tigo.primaryLeaderRoles.push('manager');
    }
    
    // 确保状态为已批准
    if (tigo.status !== 'approved') {
      tigo.status = 'approved';
    }
    
    await tigo.save();
    
    console.log('\n✅ 已成功将 tigo 设置为项目管理主负责人！');
    console.log('\n更新后的 tigo 账号信息:');
    console.log('  用户名:', tigo.username);
    console.log('  显示名:', tigo.displayName);
    console.log('  角色:', tigo.roles);
    console.log('  是否主负责人:', tigo.isPrimaryLeader);
    console.log('  主负责人角色:', tigo.primaryLeaderRoles);
    console.log('  状态:', tigo.status);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
}

