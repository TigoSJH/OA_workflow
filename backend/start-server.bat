@echo off
echo 正在启动后端服务器...
cd /d "%~dp0"
set MONGODB_URI=mongodb://localhost:27017/workflow_db
set JWT_SECRET=your-secret-key-change-this-in-production
set PORT=3001
set NODE_ENV=development
set SMS_PROVIDER=aliyun
node server.js

