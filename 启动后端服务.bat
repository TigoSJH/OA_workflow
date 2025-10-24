@echo off
chcp 65001 >nul
title 启动后端服务

echo ========================================
echo 🚀 正在启动解匠OA工作流程后端服务
echo ========================================
echo.

REM 1. 检查并启动 MongoDB
echo [1/3] 📦 检查 MongoDB 服务...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo MongoDB 未运行，正在启动...
    net start MongoDB
    if %errorlevel% equ 0 (
        echo ✅ MongoDB 启动成功
    ) else (
        echo ❌ MongoDB 启动失败，请检查服务
    )
) else (
    echo ✅ MongoDB 已在运行
)
echo.

REM 2. 启动后端服务
echo [2/3] 🔧 启动后端 Node.js 服务...
cd /d E:\workflow-web-main\workflow-web-main\backend
call pm2 start oa-backend 2>nul
if %errorlevel% equ 0 (
    echo ✅ 后端服务启动成功
) else (
    echo ℹ️ 后端服务可能已在运行
    call pm2 restart oa-backend
)
echo.

REM 3. 启动 Cloudflare Tunnel
echo [3/3] ☁️ 启动 Cloudflare Tunnel...
tasklist | find "cloudflared.exe" >nul
if %errorlevel% neq 0 (
    echo 正在启动 Cloudflare Tunnel...
    start "Cloudflare Tunnel" /min cloudflared tunnel run oa-backend
    timeout /t 3 /nobreak >nul
    echo ✅ Cloudflare Tunnel 启动成功
) else (
    echo ✅ Cloudflare Tunnel 已在运行
)
echo.

echo ========================================
echo ✅ 所有服务启动完成！
echo ========================================
echo.
echo 🌐 前端访问地址: https://oa.jjkjoa.top
echo 🔧 后端API地址: https://api.jjkjoa.top
echo.
echo 💡 提示：
echo    - 查看后端状态: pm2 status
echo    - 查看后端日志: pm2 logs oa-backend
echo    - 停止所有服务: 运行"停止后端服务.bat"
echo.
echo 按任意键关闭此窗口...
pause >nul


