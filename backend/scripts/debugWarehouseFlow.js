require('dotenv').config();
const mongoose = require('mongoose');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_db')
  .then(async () => {
    console.log('✅ 数据库连接成功\n');
    
    // 使用动态模型，避免字段限制
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false, collection: 'projects' }));
    
    // 查询所有项目，显示入库/出库状态
    const projects = await Project.find({ status: 'approved' }).lean();
    
    console.log('📊 所有已批准的项目状态：\n');
    console.log('=' .repeat(120));
    
    for (const p of projects) {
      console.log(`\n项目名称: ${p.projectName}`);
      console.log('-'.repeat(120));
      
      // 流程状态
      console.log('流程进度:');
      console.log(`  ✅ 加工完成: ${p.processingCompleted ? '是' : '否'}`);
      console.log(`  📦 第一次入库完成: ${p.warehouseInCompleted ? '是' : '否'} ${p.warehouseInCompletedTime ? `(${new Date(p.warehouseInCompletedTime).toLocaleString('zh-CN')})` : ''}`);
      console.log(`  📤 第一次出库完成: ${p.warehouseOutCompleted ? '是' : '否'} ${p.warehouseOutCompletedTime ? `(${new Date(p.warehouseOutCompletedTime).toLocaleString('zh-CN')})` : ''}`);
      console.log(`  🔧 装配完成: ${p.assemblyCompleted ? '是' : '否'}`);
      console.log(`  🔬 调试完成: ${p.testingCompleted ? '是' : '否'}`);
      console.log(`  📦 第二次入库完成: ${p.warehouseInSecondCompleted ? '是' : '否'} ${p.warehouseInSecondCompletedTime ? `(${new Date(p.warehouseInSecondCompletedTime).toLocaleString('zh-CN')})` : ''}`);
      console.log(`  📤 第二次出库完成: ${p.warehouseOutSecondCompleted ? '是' : '否'} ${p.warehouseOutSecondCompletedTime ? `(${new Date(p.warehouseOutSecondCompletedTime).toLocaleString('zh-CN')})` : ''}`);
      console.log(`  📁 已归档: ${p.archived ? '是' : '否'}`);
      
      // 判断应该显示在哪个页面
      console.log('\n应该显示的页面:');
      
      // 第一次入库：加工已完成 && 第一次入库未完成
      const firstWarehouseIn = p.processingCompleted === true && !p.warehouseInCompleted;
      if (firstWarehouseIn) {
        console.log('  ✅ 入库页面（第一次入库 - 零件入库）');
      }
      
      // 第一次出库：第一次入库已完成 && 第一次出库未完成
      const firstWarehouseOut = p.warehouseInCompleted === true && !p.warehouseOutCompleted;
      if (firstWarehouseOut) {
        console.log('  ✅ 出库页面（第一次出库 - 领料）');
      }
      
      // 装配：第一次出库已完成 && 装配未完成
      const assembly = p.warehouseOutCompleted === true && !p.assemblyCompleted;
      if (assembly) {
        console.log('  ✅ 装配页面');
      }
      
      // 调试：装配已完成 && 调试未完成
      const testing = p.assemblyCompleted === true && !p.testingCompleted;
      if (testing) {
        console.log('  ✅ 调试页面');
      }
      
      // 第二次入库：调试已完成 && 第二次入库未完成
      const secondWarehouseIn = p.testingCompleted === true && p.warehouseInCompleted === true && !p.warehouseInSecondCompleted;
      if (secondWarehouseIn) {
        console.log('  ✅ 入库页面（第二次入库 - 整机入库）⭐');
      }
      
      // 第二次出库：第二次入库已完成 && 第二次出库未完成
      const secondWarehouseOut = p.warehouseInSecondCompleted === true && p.warehouseOutCompleted === true && !p.warehouseOutSecondCompleted;
      if (secondWarehouseOut) {
        console.log('  ✅ 出库页面（第二次出库 - 整机出库确认）⭐');
      }
      
      // 归档：第二次出库已完成 && 未归档
      const archive = p.warehouseOutSecondCompleted === true && !p.archived;
      if (archive) {
        console.log('  ✅ 归档页面');
      }
      
      console.log('=' .repeat(120));
    }
    
    console.log(`\n\n共 ${projects.length} 个已批准的项目\n`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  });

