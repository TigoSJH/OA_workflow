require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 职位映射
const roleMap = {
  'warehouse_in': '入库人员',
  'warehouse_out': '出库人员'
};

// 要创建的库管用户
const usersToCreate = [
  // 入库人员
  {
    username: 'ruku1',
    password: '123456',
    displayName: '入库人员1',
    roles: ['warehouse_in'],
    isPrimaryLeader: true,
    primaryLeaderRoles: ['warehouse_in']
  },
  {
    username: 'ruku2',
    password: '123456',
    displayName: '入库人员2',
    roles: ['warehouse_in'],
    isPrimaryLeader: false
  },
  
  // 出库人员
  {
    username: 'chuku1',
    password: '123456',
    displayName: '出库人员1',
    roles: ['warehouse_out'],
    isPrimaryLeader: true,
    primaryLeaderRoles: ['warehouse_out']
  },
  {
    username: 'chuku2',
    password: '123456',
    displayName: '出库人员2',
    roles: ['warehouse_out'],
    isPrimaryLeader: false
  }
];

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_system');
    console.log('✅ 已连接数据库\n');

    console.log('开始创建库管用户...\n');
    
    let successCount = 0;
    let failCount = 0;

    for (const userData of usersToCreate) {
      try {
        // 检查用户是否已存在
        const existingUser = await User.findOne({ username: userData.username });
        if (existingUser) {
          console.log(`⚠️  用户 ${userData.username} (${userData.displayName}) 已存在，跳过`);
          failCount++;
          continue;
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // 创建用户
        const user = new User({
          username: userData.username,
          password: hashedPassword,
          displayName: userData.displayName,
          roles: userData.roles,
          status: 'approved',
          isPrimaryLeader: userData.isPrimaryLeader || false,
          primaryLeaderRoles: userData.primaryLeaderRoles || [],
          createTime: new Date()
        });

        await user.save();
        
        const leaderStatus = userData.isPrimaryLeader 
          ? `✨ 主负责人 (${userData.primaryLeaderRoles.map(r => roleMap[r]).join('、')})`
          : '普通成员';
        
        console.log(`✅ ${userData.username} (${userData.displayName}) - ${userData.roles.map(r => roleMap[r]).join('、')} - ${leaderStatus}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ 创建用户 ${userData.username} 失败:`, error.message);
        failCount++;
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ 成功创建: ${successCount} 个库管用户`);
    if (failCount > 0) {
      console.log(`❌ 失败/跳过: ${failCount} 个用户`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 显示所有用户
    const allUsers = await User.find({}).sort({ createTime: 1 });
    console.log(`数据库中现有 ${allUsers.length} 个用户：\n`);
    
    const roleDisplayMap = {
      'admin': '管理员',
      'manager': '管理人员',
      'researcher': '研发人员',
      'engineer': '工程师',
      'purchaser': '采购人员',
      'processor': '加工人员',
      'assembler': '装配工',
      'tester': '调试人员',
      'warehouse_in': '入库人员',
      'warehouse_out': '出库人员'
    };
    
    allUsers.forEach((user, index) => {
      const leaderBadge = user.isPrimaryLeader ? '👑' : '  ';
      const leaderInfo = user.isPrimaryLeader 
        ? ` (主负责人: ${user.primaryLeaderRoles.map(r => roleDisplayMap[r] || r).join('、')})`
        : '';
      console.log(`${leaderBadge} ${index + 1}. ${user.username.padEnd(15)} - ${user.displayName.padEnd(12)} - ${user.roles.map(r => roleDisplayMap[r] || r).join('、')}${leaderInfo}`);
    });

    console.log('\n✅ 库管用户创建完成！');
    console.log('所有新用户的默认密码都是: 123456\n');

    process.exit(0);
    
  } catch (e) {
    console.error('❌ 操作失败:', e);
    process.exit(1);
  }
}

main();

