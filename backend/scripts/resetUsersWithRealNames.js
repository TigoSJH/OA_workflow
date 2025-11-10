require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Notification = require('../models/Notification');

// 要创建的真实用户列表（手机号作为用户名，不分配角色）
const usersToCreate = [
  { name: '黄志成', phone: '13388601060' },
  { name: '贾裕晨', phone: '18069763475' },
  { name: '沈月丰', phone: '18257228752' },
  { name: '农林富', phone: '18896389072' },
  { name: '宋保胜', phone: '13908768452' },
  { name: '马文斐', phone: '17326006922' },
  { name: '柏海霞', phone: '18786390344' },
  { name: '朱琳洁', phone: '15167176943' },
  { name: '董建星', phone: '18757223946' },
  { name: '吴玉燕', phone: '18367836881' }
];

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_system');
    console.log('✅ 已连接数据库\n');

    // ==================== 第一步：清理用户 ====================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('第一步：清理现有用户（保留"沈嘉杭"）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 查找所有用户
    const allUsers = await User.find({});
    console.log(`当前数据库中共有 ${allUsers.length} 个用户\n`);
    
    // 显示将要保留的用户
    const keepUser = await User.findOne({ displayName: '沈嘉杭' });
    if (keepUser) {
      console.log('✅ 将保留用户：');
      console.log(`   用户名: ${keepUser.username}`);
      console.log(`   显示名: ${keepUser.displayName}`);
      console.log(`   手机号: ${keepUser.phone || '未绑定'}`);
      console.log(`   角色: ${keepUser.roles.join(', ') || '无'}`);
      console.log('');
    } else {
      console.log('⚠️  未找到"沈嘉杭"用户，将继续操作...\n');
    }

    // 删除除"沈嘉杭"以外的所有用户
    const deleteResult = await User.deleteMany({ 
      displayName: { $ne: '沈嘉杭' } 
    });
    
    console.log(`✅ 已删除 ${deleteResult.deletedCount} 个用户\n`);

    // ==================== 第二步：清理测试通知 ====================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('第二步：清理所有通知');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const notificationDeleteResult = await Notification.deleteMany({});
    console.log(`✅ 已删除 ${notificationDeleteResult.deletedCount} 条通知\n`);

    // ==================== 第三步：创建新用户 ====================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('第三步：创建新用户（暂不分配角色）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    let successCount = 0;
    let failCount = 0;

    for (const userData of usersToCreate) {
      try {
        // 使用手机号作为用户名
        const username = `u_${userData.phone}`;
        
        // 检查用户是否已存在
        const existingUser = await User.findOne({ 
          $or: [
            { username: username },
            { phone: userData.phone }
          ]
        });
        
        if (existingUser) {
          console.log(`⚠️  用户 ${userData.name} (${userData.phone}) 已存在，跳过`);
          failCount++;
          continue;
        }

        // 加密密码（默认密码：123456）
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        // 创建用户（不分配角色，状态为pending等待审批）
        const user = new User({
          username: username,
          password: hashedPassword,
          displayName: userData.name,
          phone: userData.phone,
          roles: [], // 不分配任何角色
          status: 'pending', // 待审批状态，需要管理员分配角色后批准
          isPrimaryLeader: false,
          primaryLeaderRoles: [],
          createTime: new Date()
        });

        await user.save();
        
        console.log(`✅ ${userData.name.padEnd(8)} - 手机号: ${userData.phone} - 用户名: ${username} - 状态: 待审批`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ 创建用户 ${userData.name} 失败:`, error.message);
        failCount++;
      }
    }

    // =========== 新增：创建admin超级管理员账号 ===========
    // admin账号使用用户名+密码登录，不需要手机号
    const adminExisting = await User.findOne({ username: 'admin' });
    if (!adminExisting) {
      try {
        const hashedAdminPassword = await bcrypt.hash('QWERtyui222@', 10);
        const adminUser = new User({
          username: 'admin',
          password: hashedAdminPassword,
          displayName: '管理员',
          phone: '', // admin不需要手机号
          phoneVerified: false,
          roles: ['admin'],
          status: 'approved',
          isPrimaryLeader: true,
          createTime: new Date()
        });
        await adminUser.save();
        console.log('✅ 已成功创建 admin 超级管理员账户');
        console.log('   用户名: admin');
        console.log('   密码: QWERtyui222@');
        console.log('   登录方式: 用户名 + 密码（不需要手机号）');
        successCount++;
      } catch (e) {
        console.error('❌ 创建 admin 账户失败: ', e.message);
        failCount++;
      }
    } else {
      // 更新admin账号：重置密码，确保不绑定手机号
      try {
        const hashedForceAdminPassword = await bcrypt.hash('QWERtyui222@', 10);
        adminExisting.password = hashedForceAdminPassword;
        // 确保admin不绑定手机号（如果之前有绑定，清除它）
        adminExisting.phone = '';
        adminExisting.phoneVerified = false;
        await adminExisting.save();
        console.log('✅ 已更新admin账号');
        console.log('   用户名: admin');
        console.log('   密码: QWERtyui222@');
        console.log('   登录方式: 用户名 + 密码（不需要手机号）');
      } catch (e) {
        console.error('❌ 更新admin账号失败:', e.message);
      }
    }

    // ==================== 第四步：显示结果 ====================
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`第四步：操作总结`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    console.log(`✅ 成功创建: ${successCount} 个用户`);
    if (failCount > 0) {
      console.log(`❌ 失败/跳过: ${failCount} 个用户`);
    }

    // 显示所有用户
    const finalUsers = await User.find({}).sort({ createTime: 1 });
    console.log(`\n数据库中现有 ${finalUsers.length} 个用户：\n`);
    
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
    
    finalUsers.forEach((user, index) => {
      const statusBadge = user.status === 'approved' ? '✅' : '⏳';
      const leaderBadge = user.isPrimaryLeader ? '👑' : '  ';
      const rolesDisplay = user.roles.length > 0 
        ? user.roles.map(r => roleDisplayMap[r] || r).join('、')
        : '未分配角色';
      const statusDisplay = user.status === 'approved' ? '已批准' : '待审批';
      
      console.log(`${statusBadge}${leaderBadge} ${(index + 1).toString().padStart(2)}. ${user.displayName.padEnd(8)} - ${user.phone || '无手机号'.padEnd(11)} - ${rolesDisplay.padEnd(15)} - ${statusDisplay}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 所有操作完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📝 重要提醒：');
    console.log('   1. 【admin管理员账号】');
    console.log('      - 用户名: admin');
    console.log('      - 密码: QWERtyui222@');
    console.log('      - 登录方式: 用户名 + 密码（不需要手机号）');
    console.log('');
    console.log('   2. 【普通用户账号】');
    console.log('      - 登录方式: 手机号 + 短信验证码（不需要密码）');
    console.log('      - 用户名格式: u_手机号');
    console.log('      - 新用户状态为"待审批"，需要管理员登录后：');
    console.log('        * 进入用户管理页面');
    console.log('        * 为每个用户分配角色');
    console.log('        * 设置主负责人（如需要）');
    console.log('        * 批准用户\n');

    process.exit(0);
    
  } catch (e) {
    console.error('❌ 操作失败:', e);
    process.exit(1);
  }
}

main();

