require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接数据库');

    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.error('未找到 admin 用户');
      process.exit(1);
    }

    admin.phone = undefined;
    admin.phoneVerified = false;
    await admin.save();

    console.log('✅ 已解绑 admin 的手机号，并设置 phoneVerified=false');
    process.exit(0);
  } catch (e) {
    console.error('❌ 解绑失败:', e);
    process.exit(1);
  }
}

main();


