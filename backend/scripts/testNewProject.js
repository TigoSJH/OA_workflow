const mongoose = require('mongoose');
const PendingProject = require('../models/PendingProject');
const ApprovedProject = require('../models/ApprovedProject');

// 数据库连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow';

async function testNewProjectSystem() {
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 检查集合状态
    const pendingCount = await PendingProject.countDocuments();
    const approvedCount = await ApprovedProject.countDocuments();
    
    console.log(`📊 当前状态:`);
    console.log(`   待审批项目数量: ${pendingCount}`);
    console.log(`   已批准项目数量: ${approvedCount}`);
    
    // 测试创建一个待审批项目
    const testProject = new PendingProject({
      projectName: '测试立项项目',
      projectType: 'research',
      description: '这是一个测试立项',
      researchDirection: '测试方向',
      researchPurpose: '测试用途',
      budget: '10万',
      duration: '3个月',
      priority: 'normal',
      createdBy: new mongoose.Types.ObjectId(), // 模拟用户ID
      createdByName: '测试用户',
      status: 'pending'
    });
    
    await testProject.save();
    console.log('✅ 测试项目创建成功！ID:', testProject._id);
    
    // 清理测试数据
    await PendingProject.findByIdAndDelete(testProject._id);
    console.log('✅ 测试数据已清理');
    
    console.log('\n🎉 新的立项系统测试通过！');
    console.log('\n📝 使用说明:');
    console.log('  1. 创建立项 → 保存到 pending_projects 集合');
    console.log('  2. 批准立项 → 转移到 approved_projects 集合');
    console.log('  3. 拒绝立项 → 保留在 pending_projects 集合，状态为 rejected');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testNewProjectSystem();

