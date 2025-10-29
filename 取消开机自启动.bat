@echo off
chcp 65001 >nul
title 取消工作流系统开机自启动

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ========================================
    echo    需要管理员权限
    echo ========================================
    echo.
    echo 请右键点击此脚本，选择"以管理员身份运行"
    echo.
    pause
    exit
)

echo ========================================
echo    工作流系统 - 取消开机自启动
echo ========================================
echo.

:: 1. 取消 MongoDB 开机自启
echo [1/3] 取消 MongoDB 开机自启动...
sc config MongoDB start=demand >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ MongoDB 开机自启已取消
) else (
    echo ⚠️  MongoDB 配置失败
)
echo.

:: 2. 取消 PM2 开机自启
echo [2/3] 取消 PM2 开机自启动...
pm2-startup uninstall >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ PM2 开机自启已取消
) else (
    echo ⚠️  PM2 配置失败
)
echo.

:: 3. 取消 Cloudflare Tunnel 开机自启
echo [3/3] 取消 Cloudflare Tunnel 开机自启动...
schtasks /delete /tn "Cloudflare Tunnel - OA Backend" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Cloudflare Tunnel 开机自启已取消
) else (
    echo ⚠️  Cloudflare Tunnel 任务不存在
)
echo.

echo ========================================
echo    配置完成！
echo ========================================
echo.
echo ✅ 已取消所有服务的开机自启动
echo.
echo 💡 下次开机后需要手动运行"启动后端服务.bat"
echo.
pause

