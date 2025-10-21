const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}`);
    console.log(`📊 数据库名称: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    process.exit(1); // 退出进程
  }
};

module.exports = connectDB;

