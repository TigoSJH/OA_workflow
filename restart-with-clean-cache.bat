@echo off
chcp 65001 >nul
color 0E
title OA系统 - 清除缓存并重启

echo ========================================
echo    清除缓存并重启所有服务
echo ========================================
echo.

echo [1/5] 停止所有服务...
echo.

:: 停止占用端口 3001 的进程（后端）
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: 停止占用端口 3000 的进程（前端）
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: 停止 cloudflared 进程
taskkill /IM cloudflared.exe /F >nul 2>&1

echo ✅ 所有服务已停止
echo.

echo [2/5] 清除前端缓存...
cd /d E:\workflow-web-main\workflow-web-main\workflow-web

:: 删除 node_modules/.cache 目录
if exist node_modules\.cache (
    echo 正在删除 node_modules\.cache ...
    rd /s /q node_modules\.cache
    echo ✅ 已删除缓存目录
) else (
    echo ℹ️  缓存目录不存在，跳过
)

echo.
echo [3/5] 启动后端服务...
cd /d E:\workflow-web-main\workflow-web-main\backend
start "OA后端服务" cmd /k "title OA后端服务 & color 0E & node server.js"
timeout /t 3 /nobreak >nul

echo.
echo [4/5] 启动前端服务（清除缓存）...
cd /d E:\workflow-web-main\workflow-web-main\workflow-web
start "OA前端服务" cmd /k "title OA前端服务 & color 0B & npm start"
timeout /t 5 /nobreak >nul

echo.
echo [5/5] 启动 Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "title Cloudflare Tunnel & color 0D & cloudflared tunnel run"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo ✅ 所有服务已启动完成！
echo ========================================
echo.
echo ⚠️  重要提示：
echo   - 等待前端编译完成（约30秒）
echo   - 在浏览器按 Ctrl+Shift+R 强制刷新页面
echo   - 如果还是有问题，请按 F12 打开开发者工具
echo     在 Network 标签页勾选 "Disable cache"
echo.
echo ========================================
echo 按任意键打开浏览器...
pause >nul

start https://oa.jjkjoa.top

echo.
echo 浏览器已打开，请稍候...
timeout /t 3


