const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

async function createMultiRoleUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');

    // 检查是否已存在 tigo 用户
    const existingUser = await User.findOne({ username: 'tigo' });
    if (existingUser) {
      console.log('用户 tigo 已存在，正在更新...');
      
      // 更新现有用户为多角色
      existingUser.roles = ['manager', 'researcher'];
      existingUser.status = 'approved';
      await existingUser.save();
      
      console.log('用户 tigo 已更新为多角色用户（管理+研发）');
    } else {
      // 创建新的多角色用户
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const newUser = new User({
        username: 'tigo',
        password: hashedPassword,
        email: 'tigo@company.com',
        roles: ['manager', 'researcher'], // 多角色：管理+研发
        status: 'approved',
        department: '技术部',
        position: '项目经理/研发工程师',
        phone: '13800138000',
        createdAt: new Date(),
        approvedAt: new Date()
      });

      await newUser.save();
      console.log('多角色用户 tigo 创建成功！');
      console.log('用户名: tigo');
      console.log('密码: 123456');
      console.log('角色: 管理员 + 研发人员');
    }

  } catch (error) {
    console.error('创建用户失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

createMultiRoleUser();
