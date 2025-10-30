@echo off
chcp 65001 >nul
color 0A
title OA系统 - 启动所有服务

echo ========================================
echo    OA 工作流管理系统 - 服务启动器
echo ========================================
echo.

echo 正在启动所有服务，请稍候...
echo.

:: 1. 启动后端服务
echo [1/3] 启动后端服务 (端口 3001)...
cd /d E:\workflow-web-main\workflow-web-main\backend
start "OA后端服务 - Port 3001" cmd /k "title OA后端服务 & color 0E & echo 后端服务已启动... & echo. & node server.js"
timeout /t 3 /nobreak >nul

:: 2. 启动前端服务
echo [2/3] 启动前端服务 (端口 3000)...
cd /d E:\workflow-web-main\workflow-web-main\workflow-web
start "OA前端服务 - Port 3000" cmd /k "title OA前端服务 & color 0B & echo 前端服务已启动... & echo. & npm start"
timeout /t 5 /nobreak >nul

:: 3. 启动 Cloudflare Tunnel
echo [3/3] 启动 Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "title Cloudflare Tunnel & color 0D & echo Cloudflare Tunnel已启动... & echo. & cloudflared tunnel run"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo ✅ 所有服务已启动完成！
echo ========================================
echo.
echo 服务信息：
echo   后端 API: http://localhost:3001
echo   前端界面: http://localhost:3000
echo   线上访问: https://oa.jjkjoa.top
echo   API访问:  https://api.jjkjoa.top
echo.
echo ⚠️  注意：
echo   - 请保持所有窗口打开
echo   - 关闭任何一个窗口将停止对应服务
echo   - 使用 Ctrl+C 可以停止服务
echo.
echo ========================================
echo 按任意键打开浏览器访问系统...
pause >nul

:: 打开浏览器
start https://oa.jjkjoa.top

echo.
echo 浏览器已打开，您可以关闭此窗口。
timeout /t 3

