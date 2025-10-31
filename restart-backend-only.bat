@echo off
chcp 65001 >nul
echo ========================================
echo   重启后端服务
echo ========================================
echo.

echo [1/3] 停止后端服务...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✓ 后端服务已停止
) else (
    echo ℹ 后端服务未运行
)

echo.
echo [2/3] 等待端口释放...
timeout /t 2 /nobreak >nul

echo.
echo [3/3] 启动后端服务...
cd backend
start "后端服务" cmd /k "node server.js"
cd ..

echo.
echo ========================================
echo ✓ 后端服务已重启
echo ========================================
echo.
echo 后端运行在: http://localhost:3001
echo API文档: http://localhost:3001/api-docs
echo.
pause

