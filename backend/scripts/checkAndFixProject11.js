// 检查并修复项目11
const mongoose = require('mongoose');
require('dotenv').config();

const Project = require('../models/Project');

async function checkAndFixProject11() {
  try {
    // 连接数据库
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/workflow';
    await mongoose.connect(dbUri);
    console.log('✓ 数据库连接成功\n');

    // 查找项目名称为 "11" 的项目
    const projects = await Project.find({ projectName: '11' });
    
    if (projects.length === 0) {
      console.log('❌ 找不到项目名为 "11" 的项目');
      
      // 列出所有项目
      const allProjects = await Project.find().select('projectName _id').limit(20);
      console.log('\n前20个项目列表：');
      allProjects.forEach(p => {
        console.log(`  - ${p.projectName} (ID: ${p._id})`);
      });
      
      process.exit(1);
    }

    console.log(`找到 ${projects.length} 个名为 "11" 的项目\n`);

    for (const project of projects) {
      console.log('=====================================');
      console.log(`项目名称: ${project.projectName}`);
      console.log(`项目ID: ${project._id}`);
      console.log(`项目类型: ${project.projectType}`);
      console.log(`研发方向: ${project.researchDirection || '未设置'}`);
      console.log(`是否已入库: ${project.warehouseInCompleted ? '是' : '否'}`);
      console.log(`purchaseComponents: ${project.purchaseComponents ? `[${project.purchaseComponents.length} 个文件]` : 'undefined'}`);
      console.log(`processingComponents: ${project.processingComponents ? `[${project.processingComponents.length} 个文件]` : 'undefined'}`);
      console.log('=====================================\n');

      // 更新项目，添加缺失的字段
      const updateFields = {};
      let needUpdate = false;

      if (!project.purchaseComponents) {
        updateFields.purchaseComponents = [];
        needUpdate = true;
        console.log('→ 将添加 purchaseComponents 字段');
      }

      if (!project.processingComponents) {
        updateFields.processingComponents = [];
        needUpdate = true;
        console.log('→ 将添加 processingComponents 字段');
      }

      if (needUpdate) {
        await Project.updateOne(
          { _id: project._id },
          { $set: updateFields }
        );
        console.log('✅ 已更新项目\n');
      } else {
        console.log('✓ 项目已有这两个字段，无需更新\n');
      }
    }

    console.log('=====================================');
    console.log('✅ 检查和修复完成');
    console.log('请刷新浏览器页面查看效果');
    console.log('=====================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  }
}

checkAndFixProject11();

