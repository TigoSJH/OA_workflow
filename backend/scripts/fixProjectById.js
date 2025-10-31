// 通过ID检查并修复项目
const mongoose = require('mongoose');
require('dotenv').config();

const Project = require('../models/Project');
const ApprovedProject = require('../models/ApprovedProject');

async function fixProjectById() {
  try {
    // 从命令行参数获取项目ID
    const projectId = process.argv[2] || '690412156ec9a145334ed42e';
    
    console.log(`正在查找项目 ID: ${projectId}\n`);

    // 连接数据库
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/workflow';
    await mongoose.connect(dbUri);
    console.log('✓ 数据库连接成功\n');

    // 先在 Project 表中查找
    let project = await Project.findById(projectId);
    let tableName = 'Project';

    // 如果找不到，在 ApprovedProject 表中查找
    if (!project) {
      project = await ApprovedProject.findById(projectId);
      tableName = 'ApprovedProject';
    }

    if (!project) {
      console.log('❌ 找不到该项目\n');
      
      // 列出所有项目
      const allProjects = await Project.find().select('projectName _id').limit(10);
      const allApprovedProjects = await ApprovedProject.find().select('projectName _id').limit(10);
      
      console.log('Project 表中的项目：');
      allProjects.forEach(p => {
        console.log(`  - ${p.projectName} (ID: ${p._id})`);
      });
      
      console.log('\nApprovedProject 表中的项目：');
      allApprovedProjects.forEach(p => {
        console.log(`  - ${p.projectName} (ID: ${p._id})`);
      });
      
      process.exit(1);
    }

    console.log('=====================================');
    console.log(`✓ 找到项目 (在 ${tableName} 表中)`);
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
      const Model = tableName === 'Project' ? Project : ApprovedProject;
      await Model.updateOne(
        { _id: project._id },
        { $set: updateFields }
      );
      console.log('✅ 已更新项目\n');
    } else {
      console.log('✓ 项目已有这两个字段，无需更新\n');
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

fixProjectById();

