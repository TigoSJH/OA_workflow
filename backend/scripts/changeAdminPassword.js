require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const changeAdminPassword = async () => {
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
    
    console.log('📋 修改前:');
    console.log(`用户名: ${admin.username}`);
    console.log(`显示名: ${admin.displayName}`);
    console.log('原密码: [已加密，不显示]\n');
    
    // 修改密码为 111111
    admin.password = '111111';
    
    // 保存时会自动触发 pre('save') 中间件来加密密码
    await admin.save();
    
    console.log('✅ 密码修改成功！\n');
    console.log('📋 修改后:');
    console.log(`用户名: ${admin.username}`);
    console.log('新密码: 111111');
    console.log('密码已加密存储到数据库\n');
    
    console.log('🎉 admin 密码已成功修改为 111111');
    console.log('💡 现在可以使用新密码登录了！');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 修改密码失败:', error);
    process.exit(1);
  }
};

changeAdminPassword();
