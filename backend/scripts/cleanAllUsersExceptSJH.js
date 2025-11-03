require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_system');
    console.log('✅ 已连接数据库');

    // 查找所有用户
    const allUsers = await User.find({});
    console.log(`\n当前数据库中共有 ${allUsers.length} 个用户\n`);
    
    // 显示将要保留的用户
    const keepUser = await User.findOne({ displayName: '沈嘉杭' });
    if (keepUser) {
      console.log('✅ 将保留用户：');
      console.log(`   用户名: ${keepUser.username}`);
      console.log(`   显示名: ${keepUser.displayName}`);
      console.log(`   角色: ${keepUser.roles.join(', ')}`);
      console.log(`   是否主负责人: ${keepUser.isPrimaryLeader ? '是' : '否'}`);
      console.log('');
    } else {
      console.log('❌ 未找到"沈嘉杭"用户！');
      process.exit(1);
    }

    // 删除除"沈嘉杭"以外的所有用户
    const deleteResult = await User.deleteMany({ 
      displayName: { $ne: '沈嘉杭' } 
    });
    
    console.log(`✅ 已删除 ${deleteResult.deletedCount} 个用户\n`);
    
    // 确认剩余用户
    const remainingUsers = await User.find({});
    console.log('剩余用户：');
    remainingUsers.forEach(u => {
      console.log(`  - ${u.username} (${u.displayName})`);
    });
    
    console.log('\n✅ 清理完成！');
    process.exit(0);
  } catch (e) {
    console.error('❌ 操作失败:', e);
    process.exit(1);
  }
}

main();

