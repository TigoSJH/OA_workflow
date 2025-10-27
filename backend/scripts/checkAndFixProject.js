require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_db')
  .then(async () => {
    console.log('✅ 数据库连接成功\n');
    
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false, collection: 'projects' }));
    
    const project = await Project.findOne({ projectName: '测试项目-工作流程验证' }).lean();
    
    if (!project) {
      console.log('❌ 未找到项目\n');
      process.exit(1);
    }
    
    console.log('📊 项目完整状态：\n');
    console.log('项目名称:', project.projectName);
    console.log('项目ID:', project._id);
    console.log('\n所有字段：');
    console.log('warehouseInCompleted:', project.warehouseInCompleted);
    console.log('warehouseInCompletedTime:', project.warehouseInCompletedTime);
    console.log('warehouseInCompletedBy:', project.warehouseInCompletedBy);
    console.log('warehouseOutCompleted:', project.warehouseOutCompleted);
    console.log('warehouseOutCompletedTime:', project.warehouseOutCompletedTime);
    console.log('warehouseOutCompletedBy:', project.warehouseOutCompletedBy);
    console.log('warehouseInSecondCompleted:', project.warehouseInSecondCompleted);
    console.log('warehouseInSecondCompletedTime:', project.warehouseInSecondCompletedTime);
    console.log('warehouseInSecondCompletedBy:', project.warehouseInSecondCompletedBy);
    console.log('warehouseOutSecondCompleted:', project.warehouseOutSecondCompleted);
    console.log('warehouseOutSecondCompletedTime:', project.warehouseOutSecondCompletedTime);
    console.log('warehouseOutSecondCompletedBy:', project.warehouseOutSecondCompletedBy);
    
    console.log('\n\n🔧 现在修复项目状态...\n');
    
    // 直接更新数据库
    const result = await Project.updateOne(
      { _id: project._id },
      {
        $set: {
          warehouseInSecondCompleted: true,
          warehouseInSecondCompletedTime: new Date(),
          warehouseInSecondCompletedBy: '测试用户'
        }
      }
    );
    
    console.log('更新结果:', result);
    
    // 再次查询确认
    const updated = await Project.findOne({ _id: project._id }).lean();
    console.log('\n✅ 更新后的状态：');
    console.log('warehouseInSecondCompleted:', updated.warehouseInSecondCompleted);
    console.log('warehouseInSecondCompletedTime:', updated.warehouseInSecondCompletedTime);
    console.log('warehouseInSecondCompletedBy:', updated.warehouseInSecondCompletedBy);
    
    console.log('\n📤 现在项目应该显示在"整机出库"标签页\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 错误:', err);
    process.exit(1);
  });

