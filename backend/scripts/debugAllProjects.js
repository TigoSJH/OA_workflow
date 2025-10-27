require('dotenv').config();
const mongoose = require('mongoose');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_db')
  .then(async () => {
    console.log('✅ 数据库连接成功\n');
    
    // 使用动态模型，避免字段限制
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false, collection: 'projects' }));
    
    // 查询所有项目
    const projects = await Project.find({}).lean();
    
    console.log(`📊 数据库中共有 ${projects.length} 个项目\n`);
    
    if (projects.length === 0) {
      console.log('❌ 数据库为空，请先创建项目！\n');
      process.exit(0);
    }
    
    console.log('=' .repeat(120));
    
    for (const p of projects) {
      console.log(`\n项目名称: ${p.projectName}`);
      console.log(`项目ID: ${p._id}`);
      console.log(`状态: ${p.status} ${p.status === 'pending' ? '(待批准⚠️)' : p.status === 'approved' ? '(已批准✅)' : ''}`);
      console.log(`创建时间: ${p.createdAt ? new Date(p.createdAt).toLocaleString('zh-CN') : '未知'}`);
      console.log('-'.repeat(120));
      
      // 流程状态
      console.log('流程进度:');
      console.log(`  研发完成: ${p.developmentCompleted ? '✅' : '❌'}`);
      console.log(`  工程完成: ${p.engineeringCompleted ? '✅' : '❌'}`);
      console.log(`  采购完成: ${p.purchaseCompleted ? '✅' : '❌'}`);
      console.log(`  加工完成: ${p.processingCompleted ? '✅' : '❌'}`);
      console.log(`  第一次入库: ${p.warehouseInCompleted ? '✅' : '❌'} ${p.warehouseInCompletedBy ? `(by ${p.warehouseInCompletedBy})` : ''}`);
      console.log(`  第一次出库: ${p.warehouseOutCompleted ? '✅' : '❌'} ${p.warehouseOutCompletedBy ? `(by ${p.warehouseOutCompletedBy})` : ''}`);
      console.log(`  装配完成: ${p.assemblyCompleted ? '✅' : '❌'}`);
      console.log(`  调试完成: ${p.testingCompleted ? '✅' : '❌'}`);
      console.log(`  第二次入库: ${p.warehouseInSecondCompleted ? '✅' : '❌'} ${p.warehouseInSecondCompletedBy ? `(by ${p.warehouseInSecondCompletedBy})` : ''}`);
      console.log(`  第二次出库: ${p.warehouseOutSecondCompleted ? '✅' : '❌'} ${p.warehouseOutSecondCompletedBy ? `(by ${p.warehouseOutSecondCompletedBy})` : ''}`);
      console.log(`  已归档: ${p.archived ? '✅' : '❌'}`);
      
      console.log('\n当前应该在哪个页面:');
      
      if (p.status === 'pending') {
        console.log('  ⚠️  项目待批准，需要管理员批准后才能开始流程');
      } else if (p.status === 'approved') {
        // 判断当前阶段
        if (!p.developmentCompleted) {
          console.log('  📋 研发阶段');
        } else if (!p.engineeringCompleted) {
          console.log('  🛠️  工程阶段');
        } else if (!p.purchaseCompleted) {
          console.log('  🛒 采购阶段');
        } else if (!p.processingCompleted) {
          console.log('  ⚙️  加工阶段');
        } else if (!p.warehouseInCompleted) {
          console.log('  📦 入库页面（第一次入库 - 零件入库）⭐');
        } else if (!p.warehouseOutCompleted) {
          console.log('  📤 出库页面（第一次出库 - 领料）⭐');
        } else if (!p.assemblyCompleted) {
          console.log('  🔧 装配阶段');
        } else if (!p.testingCompleted) {
          console.log('  🔬 调试阶段');
        } else if (!p.warehouseInSecondCompleted) {
          console.log('  📦 入库页面（第二次入库 - 整机入库）⭐⭐');
        } else if (!p.warehouseOutSecondCompleted) {
          console.log('  📤 出库页面（第二次出库 - 整机出库确认）⭐⭐');
        } else if (!p.archived) {
          console.log('  📁 归档阶段');
        } else {
          console.log('  ✅ 项目已完成');
        }
      }
      
      console.log('=' .repeat(120));
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  });

