const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB 连接字符串
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow';

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

async function createUser() {
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 已连接到 MongoDB');

    // 从命令行获取参数
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.log('\n使用方法: node createUserWithRoles.js <用户名> <密码> <职位1> [职位2] [职位3] ...\n');
      console.log('可用职位:');
      Object.keys(roleMap).forEach(role => {
        console.log(`  - ${role}: ${roleMap[role]}`);
      });
      console.log('\n示例:');
      console.log('  node createUserWithRoles.js engineer1 123456 engineer');
      console.log('  node createUserWithRoles.js purchaser1 123456 purchaser');
      console.log('  node createUserWithRoles.js processor1 123456 processor');
      console.log('  node createUserWithRoles.js warehouse1 123456 warehouse');
      console.log('  node createUserWithRoles.js multi_user 123456 engineer purchaser\n');
      process.exit(0);
    }

    const username = args[0];
    const password = args[1];
    const roles = args.slice(2);

    // 验证职位
    const invalidRoles = roles.filter(role => !roleMap[role]);
    if (invalidRoles.length > 0) {
      console.error(`❌ 无效的职位: ${invalidRoles.join(', ')}`);
      console.log('\n可用职位:');
      Object.keys(roleMap).forEach(role => {
        console.log(`  - ${role}: ${roleMap[role]}`);
      });
      process.exit(1);
    }

    // 检查用户是否存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.error(`❌ 用户 "${username}" 已存在`);
      process.exit(1);
    }

    // 创建用户
    const displayName = roles.map(role => roleMap[role]).join('、');
    const user = new User({
      username,
      password,
      displayName,
      roles,
      status: 'approved' // 直接批准
    });

    await user.save();
    
    console.log('\n✅ 用户创建成功！');
    console.log('-------------------');
    console.log(`用户名: ${username}`);
    console.log(`显示名称: ${displayName}`);
    console.log(`职位: ${roles.map(role => roleMap[role]).join('、')}`);
    console.log(`状态: 已批准`);
    console.log('-------------------\n');

  } catch (error) {
    console.error('❌ 创建用户失败:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 已断开 MongoDB 连接');
  }
}

createUser();




