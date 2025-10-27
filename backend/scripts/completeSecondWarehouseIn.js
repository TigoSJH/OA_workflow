require('dotenv').config();
const mongoose = require('mongoose');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_db')
  .then(async () => {
    console.log('✅ 数据库连接成功\n');
    
    // 使用动态模型
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false, collection: 'projects' }));
    
    // 查找测试项目
    const project = await Project.findOne({ projectName: '测试项目-工作流程验证' });
    
    if (!project) {
      console.log('❌ 未找到测试项目\n');
      process.exit(1);
    }
    
    console.log('📦 找到项目:', project.projectName);
    console.log('当前状态:');
    console.log('  第一次入库:', project.warehouseInCompleted ? '✅' : '❌');
    console.log('  第一次出库:', project.warehouseOutCompleted ? '✅' : '❌');
    console.log('  装配完成:', project.assemblyCompleted ? '✅' : '❌');
    console.log('  调试完成:', project.testingCompleted ? '✅' : '❌');
    console.log('  第二次入库:', project.warehouseInSecondCompleted ? '✅' : '❌');
    console.log('  第二次出库:', project.warehouseOutSecondCompleted ? '✅' : '❌');
    console.log();
    
    // 完成第二次入库
    project.warehouseInSecondCompleted = true;
    project.warehouseInSecondCompletedTime = new Date();
    project.warehouseInSecondCompletedBy = '测试用户';
    
    await project.save();
    
    console.log('✅ 第二次入库已完成！');
    console.log('更新后状态:');
    console.log('  第二次入库: ✅ (by 测试用户)');
    console.log('  完成时间:', new Date().toLocaleString('zh-CN'));
    console.log();
    console.log('📤 此项目现在应该显示在"出库页面"的"整机出库"标签页\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  });

