// 给所有项目添加 purchaseComponents 和 processingComponents 字段
const mongoose = require('mongoose');
require('dotenv').config();

const Project = require('../models/Project');

async function addWarehouseComponentsFields() {
  try {
    // 连接数据库
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/workflow';
    await mongoose.connect(dbUri);
    console.log('✓ 数据库连接成功');

    // 查找所有没有 purchaseComponents 或 processingComponents 字段的项目
    const projectsToUpdate = await Project.find({
      $or: [
        { purchaseComponents: { $exists: false } },
        { processingComponents: { $exists: false } }
      ]
    });

    console.log(`找到 ${projectsToUpdate.length} 个需要更新的项目`);

    if (projectsToUpdate.length === 0) {
      console.log('所有项目都已有这两个字段');
      process.exit(0);
    }

    // 批量更新
    for (const project of projectsToUpdate) {
      if (!project.purchaseComponents) {
        project.purchaseComponents = [];
      }
      if (!project.processingComponents) {
        project.processingComponents = [];
      }
      await project.save();
      console.log(`✓ 更新项目: ${project.projectName} (ID: ${project._id})`);
    }

    console.log('\n=====================================');
    console.log(`✅ 成功更新 ${projectsToUpdate.length} 个项目`);
    console.log('所有项目现在都有 purchaseComponents 和 processingComponents 字段');
    console.log('=====================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  }
}

addWarehouseComponentsFields();

