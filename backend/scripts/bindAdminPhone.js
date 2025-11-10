require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// 从命令行参数获取手机号，如果没有则提示
const adminPhone = process.argv[2];

async function main() {
  try {
    if (!adminPhone) {
      console.error('❌ 请提供admin的手机号作为参数');
      console.log('使用方法: node scripts/bindAdminPhone.js <手机号>');
      console.log('示例: node scripts/bindAdminPhone.js 13967160330');
      process.exit(1);
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(adminPhone)) {
      console.error('❌ 手机号格式不正确，请输入11位中国大陆手机号');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_system');
    console.log('✅ 已连接数据库\n');

    // 查找admin账号
    const admin = await User.findOne({ username: 'admin' });
    
    if (!admin) {
      console.error('❌ 未找到admin账号，请先运行 resetUsersWithRealNames.js 创建admin账号');
      process.exit(1);
    }

    // 检查手机号是否已被其他用户使用
    const existingUser = await User.findOne({ 
      phone: adminPhone,
      _id: { $ne: admin._id }
    });

    if (existingUser) {
      console.error(`❌ 手机号 ${adminPhone} 已被用户 "${existingUser.displayName}" (${existingUser.username}) 使用`);
      process.exit(1);
    }

    // 绑定手机号
    admin.phone = adminPhone;
    admin.phoneVerified = true;
    await admin.save();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ admin账号手机号绑定成功！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   用户名: ${admin.username}`);
    console.log(`   显示名: ${admin.displayName}`);
    console.log(`   手机号: ${admin.phone}`);
    console.log(`   手机号已验证: ${admin.phoneVerified ? '是' : '否'}`);
    console.log(`   角色: ${admin.roles.join(', ')}`);
    console.log(`   状态: ${admin.status}\n`);
    console.log('📱 现在admin可以通过以下方式登录：');
    console.log('   1. 手机号 + 短信验证码（推荐）');
    console.log('   2. 用户名(admin) + 密码\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

main();
