require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_system');
    console.log('✅ 已连接数据库\n');

    // 查找所有admin账号
    const adminUsers = await User.find({ username: 'admin' });
    
    if (adminUsers.length === 0) {
      console.error('❌ 未找到admin账号');
      process.exit(1);
    }

    if (adminUsers.length > 1) {
      console.warn(`⚠️  发现 ${adminUsers.length} 个admin账号，这可能导致登录问题！\n`);
    }

    const testPassword = 'QWERtyui222@';

    for (let i = 0; i < adminUsers.length; i++) {
      const admin = adminUsers[i];
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Admin账号 #${i + 1}:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   ID: ${admin._id}`);
      console.log(`   用户名: ${admin.username}`);
      console.log(`   显示名: ${admin.displayName}`);
      console.log(`   手机号: ${admin.phone || '无'}`);
      console.log(`   状态: ${admin.status}`);
      console.log(`   角色: ${admin.roles.join(', ')}`);
      console.log(`   密码哈希: ${admin.password ? admin.password.substring(0, 20) + '...' : '无密码'}`);
      console.log('');

      if (admin.password) {
        // 测试密码
        const isMatch = await bcrypt.compare(testPassword, admin.password);
        console.log(`   测试密码 "${testPassword}": ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);
        
        // 也测试其他可能的密码
        const testPasswords = ['QWER', 'QWERtyui222@', 'QWERtyui222'];
        for (const pwd of testPasswords) {
          if (pwd !== testPassword) {
            const match = await bcrypt.compare(pwd, admin.password);
            if (match) {
              console.log(`   ⚠️  发现匹配的密码: "${pwd}"`);
            }
          }
        }
      } else {
        console.log('   ⚠️  该账号没有设置密码！');
      }
      console.log('');
    }

    // 如果只有一个admin账号，尝试直接验证
    if (adminUsers.length === 1) {
      const admin = adminUsers[0];
      if (admin.password) {
        const isMatch = await bcrypt.compare(testPassword, admin.password);
        if (isMatch) {
          console.log('✅ 密码验证成功！如果登录仍然失败，可能是后端服务未重启。');
        } else {
          console.log('❌ 密码验证失败！数据库中存储的密码哈希与 "QWERtyui222@" 不匹配。');
          console.log('   建议：重新运行 resetUsersWithRealNames.js 脚本重置密码。');
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

main();

