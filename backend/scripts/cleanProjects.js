const mongoose = require('mongoose');
const Project = require('../models/Project');

// 数据库连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow';

async function cleanProjects() {
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');

    // 删除所有项目
    const result = await Project.deleteMany({});
    console.log(`✅ 已删除 ${result.deletedCount} 个立项`);

    // 显示剩余项目数
    const count = await Project.countDocuments();
    console.log(`📊 当前立项数量: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

cleanProjects();


