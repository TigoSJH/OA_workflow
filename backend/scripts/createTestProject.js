require('dotenv').config();
const mongoose = require('mongoose');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_db')
  .then(async () => {
    console.log('✅ 数据库连接成功\n');
    
    // 使用动态模型
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false, collection: 'projects' }));
    
    // 创建一个测试项目（已完成调试，等待第二次入库）
    const testProject = {
      projectName: '测试项目-工作流程验证',
      projectType: 'research',
      description: '用于测试两次入库/出库流程',
      status: 'approved',
      
      // 研发阶段
      developmentCompleted: true,
      developmentCompletedTime: new Date(),
      developmentCompletedBy: '测试用户',
      
      // 工程阶段
      engineeringCompleted: true,
      engineeringCompletedTime: new Date(),
      engineeringCompletedBy: '工程师',
      
      // 采购阶段
      purchaseCompleted: true,
      purchaseCompletedTime: new Date(),
      purchaseCompletedBy: '采购员',
      
      // 加工阶段
      processingCompleted: true,
      processingCompletedTime: new Date(),
      processingCompletedBy: '加工员',
      
      // 第一次入库（零件入库）
      warehouseInCompleted: true,
      warehouseInCompletedTime: new Date(),
      warehouseInCompletedBy: '库管',
      
      // 第一次出库（领料）
      warehouseOutCompleted: true,
      warehouseOutCompletedTime: new Date(),
      warehouseOutCompletedBy: '库管',
      
      // 装配阶段
      assemblyCompleted: true,
      assemblyCompletedTime: new Date(),
      assemblyCompletedBy: '装配员',
      
      // 调试阶段
      testingCompleted: true,
      testingCompletedTime: new Date(),
      testingCompletedBy: '调试员',
      
      // 第二次入库和出库都未完成
      warehouseInSecondCompleted: false,
      warehouseOutSecondCompleted: false,
      archived: false,
      
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const created = await Project.create(testProject);
    
    console.log('✅ 测试项目创建成功！\n');
    console.log('项目信息:');
    console.log(`  ID: ${created._id}`);
    console.log(`  名称: ${created.projectName}`);
    console.log(`  状态: 已批准`);
    console.log('\n流程状态:');
    console.log('  ✅ 研发完成');
    console.log('  ✅ 工程完成');
    console.log('  ✅ 采购完成');
    console.log('  ✅ 加工完成');
    console.log('  ✅ 第一次入库完成');
    console.log('  ✅ 第一次出库完成');
    console.log('  ✅ 装配完成');
    console.log('  ✅ 调试完成');
    console.log('  ❌ 第二次入库（待处理）⭐');
    console.log('  ❌ 第二次出库');
    console.log('  ❌ 归档');
    console.log('\n📦 此项目现在应该显示在"入库页面"（第二次入库 - 整机入库）\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  });

