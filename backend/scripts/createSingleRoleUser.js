// 创建单角色测试用户
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 用户模型定义
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  displayName: String,
  email: String,
  phone: String,
  roles: [String],
  status: String,
  createTime: Date
});

const User = mongoose.model('User', userSchema);

async function createSingleRoleUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 加密密码
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // 删除现有的单角色测试用户（如果存在）
    await User.deleteOne({ username: 'researcher1' });
    
    // 创建单角色研发用户
    const researcher1 = new User({
      username: 'researcher1',
      password: hashedPassword,
      displayName: '研发工程师',
      email: 'researcher1@company.com',
      phone: '13800138001',
      roles: ['researcher'], // 单角色：只有研发
      status: 'approved',
      createTime: new Date()
    });

    await researcher1.save();
    console.log('✅ 单角色用户 researcher1 创建成功！');
    console.log('   用户名: researcher1');
    console.log('   密码: 123456');
    console.log('   角色: researcher（研发人员）');
    
  } catch (error) {
    console.error('❌ 创建失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createSingleRoleUser();
