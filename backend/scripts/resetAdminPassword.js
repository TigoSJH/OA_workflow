require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const NEW_PASSWORD = 'QWERtyui222@';

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_system');
    console.log('✅ 已连接数据库\n');

    // 查找admin账号
    const admin = await User.findOne({ username: 'admin' });
    
    if (!admin) {
      console.error('❌ 未找到admin账号');
      process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('当前admin账号信息：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ID: ${admin._id}`);
    console.log(`   用户名: ${admin.username}`);
    console.log(`   显示名: ${admin.displayName}`);
    console.log(`   手机号: ${admin.phone || '无'}`);
    console.log(`   状态: ${admin.status}`);
    console.log(`   角色: ${admin.roles.join(', ')}`);
    console.log(`   旧密码哈希: ${admin.password ? admin.password.substring(0, 30) + '...' : '无'}`);
    console.log('');

    // 生成新密码哈希
    console.log('正在重置密码...');
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    
    // 使用 updateOne 直接更新数据库，绕过 pre-save hook（避免双重哈希）
    await User.updateOne(
      { _id: admin._id },
      {
        $set: {
          password: hashedPassword,
          phone: '',
          phoneVerified: false
        }
      }
    );
    
    // 重新获取更新后的admin对象用于验证
    const updatedAdmin = await User.findById(admin._id);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 密码重置成功！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   用户名: ${updatedAdmin.username}`);
    console.log(`   新密码: ${NEW_PASSWORD}`);
    console.log(`   新密码哈希: ${updatedAdmin.password.substring(0, 30)}...`);
    console.log('');

    // 验证新密码
    const isMatch = await bcrypt.compare(NEW_PASSWORD, updatedAdmin.password);
    if (isMatch) {
      console.log('✅ 密码验证成功！');
      console.log('');
      console.log('📝 重要提示：');
      console.log('   1. 请确保后端服务已完全重启');
      console.log('   2. 如果仍然无法登录，请：');
      console.log('      - 关闭所有node.exe进程（任务管理器）');
      console.log('      - 重新启动后端服务');
      console.log('      - 清除浏览器缓存或使用无痕模式');
    } else {
      console.log('❌ 密码验证失败！这不应该发生，请检查代码。');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

