@echo off
chcp 65001 >nul
title 停止后端服务

echo ========================================
echo 🛑 正在停止解匠OA工作流程后端服务
echo ========================================
echo.

REM 1. 停止 Cloudflare Tunnel
echo [1/3] ☁️ 停止 Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Cloudflare Tunnel 已停止
) else (
    echo ℹ️ Cloudflare Tunnel 未在运行
)
echo.

REM 2. 停止后端服务
echo [2/3] 🔧 停止后端 Node.js 服务...
cd /d E:\workflow-web-main\workflow-web-main\backend
call pm2 stop oa-backend >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 后端服务已停止
) else (
    echo ℹ️ 后端服务未在运行
)
echo.

REM 3. 询问是否停止 MongoDB
echo [3/3] 📦 是否停止 MongoDB 服务？
echo     （如果其他程序在使用 MongoDB，请选择 N）
choice /C YN /M "停止 MongoDB"
if %errorlevel% equ 1 (
    net stop MongoDB
    if %errorlevel% equ 0 (
        echo ✅ MongoDB 已停止
    ) else (
        echo ❌ MongoDB 停止失败
    )
) else (
    echo ℹ️ 保持 MongoDB 运行
)
echo.

echo ========================================
echo ✅ 服务停止完成！
echo ========================================
echo.
pause


