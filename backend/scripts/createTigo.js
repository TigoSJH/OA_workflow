// 简单脚本：在 MongoDB 中创建多角色用户 tigo
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

async function createTigo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 加密密码
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // 删除现有的 tigo 用户（如果存在）
    await User.deleteOne({ username: 'tigo' });
    
    // 创建新用户
    const tigo = new User({
      username: 'tigo',
      password: hashedPassword,
      displayName: 'Tigo',
      email: 'tigo@company.com',
      phone: '13800138000',
      roles: ['manager', 'researcher'], // 多角色：管理 + 研发
      status: 'approved',
      createTime: new Date()
    });

    await tigo.save();
    console.log('✅ 用户 tigo 创建成功！');
    console.log('   用户名: tigo');
    console.log('   密码: 123456');
    console.log('   角色: manager + researcher');
    
  } catch (error) {
    console.error('❌ 创建失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTigo();
