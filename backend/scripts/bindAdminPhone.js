require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  try {
    const phone = process.argv[2];
    if (!phone) {
      console.error('用法: node scripts/bindAdminPhone.js <phoneNumber>');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接数据库');

    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.error('未找到 admin 用户，请先运行 initAdmin.js');
      process.exit(1);
    }

    admin.phone = phone;
    admin.phoneVerified = true;
    if (!admin.status || admin.status === 'pending') {
      admin.status = 'approved';
      admin.approveTime = new Date();
    }

    await admin.save();
    console.log(`✅ 已为 admin 绑定手机号 ${phone} 并标记已验证，可用短信登录`);
    process.exit(0);
  } catch (e) {
    console.error('❌ 绑定失败:', e);
    process.exit(1);
  }
}

main();


