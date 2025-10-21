require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  try {
    const phone = process.argv[2];
    if (!phone) {
      console.error('用法: node scripts/cleanUsers.js <phoneNumber>');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接数据库');

    const users = await User.find({ phone });
    console.log(`找到使用手机号 ${phone} 的用户 ${users.length} 个`);
    for (const u of users) {
      if (u.username !== 'admin') {
        await User.deleteOne({ _id: u._id });
        console.log(`已删除用户 ${u.username} (${u._id})`);
      } else {
        console.log('跳过 admin');
      }
    }
    console.log('完成');
    process.exit(0);
  } catch (e) {
    console.error('失败:', e);
    process.exit(1);
  }
}

main();
