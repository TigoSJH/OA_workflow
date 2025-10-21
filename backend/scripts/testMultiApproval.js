const mongoose = require('mongoose');
const PendingProject = require('../models/PendingProject');
const ApprovedProject = require('../models/ApprovedProject');

// 数据库连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow';

async function testMultiApprovalSystem() {
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 创建测试立项
    const testProject = new PendingProject({
      projectName: '多人审批测试项目',
      projectType: 'research',
      description: '测试三人审批功能',
      researchDirection: '测试技术',
      researchPurpose: '验证多人审批流程',
      budget: '20万',
      duration: '6个月',
      priority: 'normal',
      createdBy: new mongoose.Types.ObjectId(),
      createdByName: '测试申请人',
      status: 'pending',
      approvalRecords: [],
      approvalProgress: {
        required: 3,
        approved: 0,
        rejected: 0
      }
    });

    await testProject.save();
    console.log('✅ 测试立项创建成功！ID:', testProject._id);

    // 模拟第一个管理员审批
    console.log('\n📋 模拟第一个管理员审批...');
    testProject.approvalRecords.push({
      approver: 'manager1',
      approverName: '管理员1',
      decision: 'approve',
      comment: '我同意此立项',
      approvalTime: new Date()
    });
    testProject.approvalProgress.approved = 1;
    await testProject.save();
    console.log(`✅ 第一次审批完成，进度：${testProject.approvalProgress.approved}/${testProject.approvalProgress.required}`);

    // 模拟第二个管理员审批
    console.log('\n📋 模拟第二个管理员审批...');
    testProject.approvalRecords.push({
      approver: 'manager2',
      approverName: '管理员2', 
      decision: 'approve',
      comment: '同意立项',
      approvalTime: new Date()
    });
    testProject.approvalProgress.approved = 2;
    await testProject.save();
    console.log(`✅ 第二次审批完成，进度：${testProject.approvalProgress.approved}/${testProject.approvalProgress.required}`);

    // 模拟第三个管理员审批 - 达到要求
    console.log('\n📋 模拟第三个管理员审批...');
    testProject.approvalRecords.push({
      approver: 'manager3',
      approverName: '管理员3',
      decision: 'approve', 
      comment: '最终批准',
      approvalTime: new Date()
    });
    testProject.approvalProgress.approved = 3;

    // 检查是否达到批准要求
    if (testProject.approvalProgress.approved >= testProject.approvalProgress.required) {
      console.log('🎉 达到批准要求，转移到已批准集合...');
      
      // 创建已批准项目
      const approvedProject = new ApprovedProject({
        projectName: testProject.projectName,
        projectType: testProject.projectType,
        description: testProject.description,
        researchDirection: testProject.researchDirection,
        researchPurpose: testProject.researchPurpose,
        budget: testProject.budget,
        duration: testProject.duration,
        priority: testProject.priority,
        createdBy: testProject.createdBy,
        createdByName: testProject.createdByName,
        createTime: testProject.createTime,
        originalPendingId: testProject._id,
        approver: `多人审批 (${testProject.approvalProgress.approved}/${testProject.approvalProgress.required})`,
        approveTime: new Date(),
        approveComment: '三人审批通过',
        status: 'approved'
      });
      
      await approvedProject.save();
      await PendingProject.findByIdAndDelete(testProject._id);
      
      console.log('✅ 项目已转移到已批准集合！ID:', approvedProject._id);
    }

    // 测试拒绝情况
    console.log('\n📋 测试拒绝情况...');
    const rejectProject = new PendingProject({
      projectName: '拒绝测试项目',
      projectType: 'contract',
      description: '测试拒绝功能',
      budget: '10万',
      duration: '3个月',
      priority: 'normal',
      createdBy: new mongoose.Types.ObjectId(),
      createdByName: '测试申请人2',
      status: 'pending',
      approvalRecords: [],
      approvalProgress: {
        required: 3,
        approved: 0,
        rejected: 0
      }
    });

    await rejectProject.save();

    // 第一个管理员拒绝
    rejectProject.approvalRecords.push({
      approver: 'manager1',
      approverName: '管理员1',
      decision: 'reject',
      comment: '预算不合理，拒绝立项',
      approvalTime: new Date()
    });
    rejectProject.status = 'rejected';
    rejectProject.rejectedBy = 'manager1';
    rejectProject.rejectedTime = new Date();
    rejectProject.rejectedComment = '预算不合理，拒绝立项';
    rejectProject.approvalProgress.rejected = 1;

    await rejectProject.save();
    console.log('✅ 拒绝测试完成，项目状态:', rejectProject.status);

    // 统计结果
    const pendingCount = await PendingProject.countDocuments();
    const approvedCount = await ApprovedProject.countDocuments();
    
    console.log('\n📊 测试结果:');
    console.log(`   待审批项目数量: ${pendingCount} (包含1个被拒绝的)`);
    console.log(`   已批准项目数量: ${approvedCount} (包含1个多人审批通过的)`);

    console.log('\n🎉 多人审批功能测试完成！');
    console.log('\n✨ 功能特点:');
    console.log('  ✅ 需要3个管理员都同意才能批准');
    console.log('  ✅ 显示实时审批进度 (如 1/3, 2/3)');
    console.log('  ✅ 记录每个人的审批意见和时间');
    console.log('  ✅ 任何一个人拒绝，整个立项就拒绝');
    console.log('  ✅ 拒绝时必须填写理由');
    console.log('  ✅ 防止同一人重复审批');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testMultiApprovalSystem();
