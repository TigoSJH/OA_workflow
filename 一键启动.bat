@echo off
chcp 65001 >nul
title 工作流系统 - 一键启动
color 0A

echo.
echo ========================================
echo   工业工作流管理系统 - 一键启动
echo ========================================
echo.

:: 检查是否以管理员权限运行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] 警告：未检测到管理员权限
    echo [i] 部分功能可能需要管理员权限
    echo.
)

:: 步骤1：检查并启动MongoDB
echo [1/4] 检查 MongoDB 服务...
sc query MongoDB | find "RUNNING" >nul
if %errorLevel% equ 0 (
    echo [√] MongoDB 已经在运行
) else (
    echo [i] MongoDB 未运行，正在启动...
    net start MongoDB >nul 2>&1
    if %errorLevel% equ 0 (
        echo [√] MongoDB 启动成功
    ) else (
        echo [!] MongoDB 启动失败，请手动启动或检查是否已安装
        echo [i] 命令：Start-Service -Name MongoDB
    )
)
echo.

:: 步骤2：启动后端服务
echo [2/4] 启动后端服务...
echo [i] 后端将运行在 http://localhost:3001
start "工作流后端服务" cmd /k "cd /d %~dp0backend && title 工作流后端服务 && npm start"
timeout /t 3 /nobreak >nul
echo [√] 后端服务启动中...
echo.

:: 步骤3：启动前端服务
echo [3/4] 启动前端服务...
echo [i] 前端将运行在 http://localhost:3000
start "工作流前端服务" cmd /k "cd /d %~dp0workflow-web && title 工作流前端服务 && npm start"
timeout /t 2 /nobreak >nul
echo [√] 前端服务启动中...
echo.

:: 步骤4：完成
echo [4/4] 启动完成！
echo.
echo ========================================
echo   系统启动信息
echo ========================================
echo.
echo  本机访问：
echo    前端：http://localhost:3000
echo    后端：http://localhost:3001
echo.
echo  局域网访问：
echo    前端：http://192.168.2.17:3000
echo    后端：http://192.168.2.17:3001
echo.
echo  远程访问（Tailscale）：
echo    前端：http://100.87.52.98:3000
echo    后端：http://100.87.52.98:3001
echo.
echo ========================================
echo   重要提示
echo ========================================
echo.
echo  [!] 前端和后端服务正在启动（需要10-30秒）
echo  [!] 浏览器会自动打开，如未打开请手动访问
echo  [!] 前后端服务窗口请保持打开状态
echo  [!] 关闭窗口将停止对应服务
echo.
echo  [i] 按任意键打开浏览器...
pause >nul

:: 打开浏览器
start http://localhost:3000

echo.
echo [√] 已打开浏览器，祝使用愉快！
echo.
echo  停止服务：在前端/后端窗口按 Ctrl+C
echo  完全退出：关闭所有服务窗口
echo.
timeout /t 3 /nobreak >nul
exit

