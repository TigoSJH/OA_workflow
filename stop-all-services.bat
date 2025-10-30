@echo off
chcp 65001 >nul
color 0C
title OA系统 - 停止所有服务

echo ========================================
echo    OA 工作流管理系统 - 停止服务
echo ========================================
echo.

echo 正在停止所有服务...
echo.

:: 停止占用端口 3001 的进程（后端）
echo [1/3] 停止后端服务 (端口 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if errorlevel 0 (
        echo ✅ 后端服务已停止
    )
)

:: 停止占用端口 3000 的进程（前端）
echo [2/3] 停止前端服务 (端口 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if errorlevel 0 (
        echo ✅ 前端服务已停止
    )
)

:: 停止 cloudflared 进程
echo [3/3] 停止 Cloudflare Tunnel...
taskkill /IM cloudflared.exe /F >nul 2>&1
if errorlevel 0 (
    echo ✅ Cloudflare Tunnel已停止
) else (
    echo ℹ️  Cloudflare Tunnel未运行
)

echo.
echo ========================================
echo ✅ 所有服务已停止！
echo ========================================
echo.
pause

