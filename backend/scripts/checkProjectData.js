require('dotenv').config();
const mongoose = require('mongoose');
const ApprovedProject = require('../models/ApprovedProject');

const checkData = async () => {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow');
    console.log('✅ 已连接到MongoDB');

    // 查询所有已批准项目
    const projects = await ApprovedProject.find();
    
    console.log(`\n📊 找到 ${projects.length} 个已批准项目\n`);
    
    projects.forEach((project, index) => {
      console.log(`\n===== 项目 ${index + 1} =====`);
      console.log(`ID: ${project._id}`);
      console.log(`项目名称: ${project.projectName}`);
      console.log(`状态: ${project.status}`);
      console.log(`研发完成: ${project.developmentCompleted ? '是' : '否'}`);
      console.log(`项目文件夹截图数量: ${project.folderScreenshots?.length || 0}`);
      console.log(`图纸图片数量: ${project.drawingImages?.length || 0}`);
      
      if (project.folderScreenshots && project.folderScreenshots.length > 0) {
        console.log('\n📁 项目文件夹截图:');
        project.folderScreenshots.forEach((file, i) => {
          console.log(`  ${i + 1}. ${file.name} (${file.size})`);
          console.log(`     上传时间: ${new Date(file.uploadTime).toLocaleString('zh-CN')}`);
          console.log(`     上传人: ${file.uploadBy}`);
        });
      }
      
      if (project.drawingImages && project.drawingImages.length > 0) {
        console.log('\n📐 图纸图片:');
        project.drawingImages.forEach((file, i) => {
          console.log(`  ${i + 1}. ${file.name} (${file.size})`);
          console.log(`     上传时间: ${new Date(file.uploadTime).toLocaleString('zh-CN')}`);
          console.log(`     上传人: ${file.uploadBy}`);
        });
      }
      
      console.log('================\n');
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 已断开数据库连接');
  }
};

checkData();




