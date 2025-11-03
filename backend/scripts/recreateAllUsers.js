require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 职位映射
const roleMap = {
  'manager': '管理人员',
  'researcher': '研发人员',
  'engineer': '工程师',
  'purchaser': '采购人员',
  'processor': '加工人员',
  'assembler': '装配工',
  'tester': '调试人员',
  'warehouse': '库管人员'
};

// 要创建的用户列表
const usersToCreate = [
  // 研发人员
  {
    username: 'yanfa1',
    password: '123456',
    displayName: '研发人员1',
    roles: ['researcher'],
    isPrimaryLeader: true,
    primaryLeaderRoles: ['researcher']
  },
  {
    username: 'yanfa2',
    password: '123456',
    displayName: '研发人员2',
    roles: ['researcher'],
    isPrimaryLeader: false
  },
  
  // 工程人员
  {
    username: 'gongcheng1',
    password: '123456',
    displayName: '工程人员1',
    roles: ['engineer'],
    isPrimaryLeader: true,
    primaryLeaderRoles: ['engineer']
  },
  {
    username: 'gongcheng2',
    password: '123456',
    displayName: '工程人员2',
    roles: ['engineer'],
    isPrimaryLeader: false
  },
  
  // 采购人员
  {
    username: 'caigou1',
    password: '123456',
    displayName: '采购人员1',
    roles: ['purchaser'],
    isPrimaryLeader: true,
    primaryLeaderRoles: ['purchaser']
  },
  {
    username: 'caigou2',
    password: '123456',
    displayName: '采购人员2',
    roles: ['purchaser'],
    isPrimaryLeader: false
  },
  
  // 加工人员
  {
    username: 'jiagong1',
    password: '123456',
    displayName: '加工人员1',
    roles: ['processor'],
    isPrimaryLeader: true,
    primaryLeaderRoles: ['processor']
  },
  {
    username: 'jiagong2',
    password: '123456',
    displayName: '加工人员2',
    roles: ['processor'],
    isPrimaryLeader: false
  },
  
  // 装配人员
  {
    username: 'zhuangpei1',
    password: '123456',
    displayName: '装配人员1',
    roles: ['assembler'],
    isPrimaryLeader: true,
    primaryLeaderRoles: ['assembler']
  },
  {
    username: 'zhuangpei2',
    password: '123456',
    displayName: '装配人员2',
    roles: ['assembler'],
    isPrimaryLeader: false
  },
  
  // 调试人员
  {
    username: 'tiaoshi1',
    password: '123456',
    displayName: '调试人员1',
    roles: ['tester'],
    isPrimaryLeader: true,
    primaryLeaderRoles: ['tester']
  },
  {
    username: 'tiaoshi2',
    password: '123456',
    displayName: '调试人员2',
    roles: ['tester'],
    isPrimaryLeader: false
  },
  
  // 库管人员
  {
    username: 'kuguan1',
    password: '123456',
    displayName: '库管人员1',
    roles: ['warehouse'],
    isPrimaryLeader: true,
    primaryLeaderRoles: ['warehouse']
  },
  {
    username: 'kuguan2',
    password: '123456',
    displayName: '库管人员2',
    roles: ['warehouse'],
    isPrimaryLeader: false
  }
];

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_system');
    console.log('✅ 已连接数据库\n');

    console.log('开始创建用户...\n');
    
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
    console.log(`✅ 成功创建: ${successCount} 个用户`);
    if (failCount > 0) {
      console.log(`❌ 失败/跳过: ${failCount} 个用户`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 显示所有用户
    const allUsers = await User.find({}).sort({ createTime: 1 });
    console.log(`数据库中现有 ${allUsers.length} 个用户：\n`);
    
    allUsers.forEach((user, index) => {
      const leaderBadge = user.isPrimaryLeader ? '👑' : '  ';
      const leaderInfo = user.isPrimaryLeader 
        ? ` (主负责人: ${user.primaryLeaderRoles.map(r => roleMap[r] || r).join('、')})`
        : '';
      console.log(`${leaderBadge} ${index + 1}. ${user.username} - ${user.displayName} - ${user.roles.map(r => roleMap[r] || r).join('、')}${leaderInfo}`);
    });

    console.log('\n✅ 所有操作完成！');
    process.exit(0);
    
  } catch (e) {
    console.error('❌ 操作失败:', e);
    process.exit(1);
  }
}

main();

