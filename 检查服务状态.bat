@echo off
chcp 65001 >nul
title 检查服务状态

echo ========================================
echo 🔍 解匠OA工作流程 - 服务状态检查
echo ========================================
echo.

REM 1. 检查 MongoDB
echo [1/3] 📦 MongoDB 状态:
sc query MongoDB | find "STATE" | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo     ✅ 运行中
) else (
    echo     ❌ 未运行
)
echo.

REM 2. 检查后端服务
echo [2/3] 🔧 后端 Node.js 服务状态:
cd /d E:\workflow-web-main\workflow-web-main\backend
call pm2 status oa-backend
echo.

REM 3. 检查 Cloudflare Tunnel
echo [3/3] ☁️ Cloudflare Tunnel 状态:
tasklist | find "cloudflared.exe" >nul
if %errorlevel% equ 0 (
    echo     ✅ 运行中
) else (
    echo     ❌ 未运行
)
echo.

REM 4. 测试后端 API
echo [测试] 🌐 测试后端 API 连接:
powershell -Command "(Invoke-WebRequest -Uri http://localhost:3001 -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue).Content" 2>nul
if %errorlevel% equ 0 (
    echo     ✅ 后端 API 响应正常
) else (
    echo     ❌ 后端 API 无响应
)
echo.

echo ========================================
echo 检查完成！
echo ========================================
echo.
echo 🌐 访问地址:
echo    前端: https://oa.jjkjoa.top
echo    后端: https://api.jjkjoa.top
echo.
pause


