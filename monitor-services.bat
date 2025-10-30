@echo off
chcp 65001 >nul
color 0B
title OA系统 - 服务监控

:loop
cls
echo ========================================
echo    OA 系统服务监控
echo    %date% %time%
echo ========================================
echo.

:: 检查后端服务
echo [后端服务 - 端口 3001]
netstat -ano | findstr :3001 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo ❌ 后端服务未运行
) else (
    echo ✅ 后端服务运行正常
)
echo.

:: 检查前端服务
echo [前端服务 - 端口 3000]
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo ❌ 前端服务未运行
) else (
    echo ✅ 前端服务运行正常
)
echo.

:: 检查 Cloudflare Tunnel
echo [Cloudflare Tunnel]
tasklist | findstr cloudflared.exe >nul 2>&1
if errorlevel 1 (
    echo ❌ Cloudflare Tunnel未运行
) else (
    echo ✅ Cloudflare Tunnel运行正常
)
echo.

:: 检查网络连接
echo [网络连接测试]
ping 8.8.8.8 -n 1 -w 1000 | findstr "TTL" >nul 2>&1
if errorlevel 1 (
    echo ❌ 网络连接异常！
) else (
    ping 8.8.8.8 -n 1 | findstr "平均" >nul 2>&1
    if errorlevel 0 (
        for /f "tokens=10 delims==" %%a in ('ping 8.8.8.8 -n 1 ^| findstr "平均"') do (
            echo ✅ 网络连接正常 - 延迟: %%a
        )
    ) else (
        echo ✅ 网络连接正常
    )
)
echo.

:: 检查本地API响应
echo [本地API健康检查]
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  本地API无响应
) else (
    echo ✅ 本地API响应正常
)
echo.

echo ========================================
echo 提示：
echo   - 每10秒自动刷新一次
echo   - 按 Ctrl+C 退出监控
echo ========================================
echo.

timeout /t 10 /nobreak >nul
goto loop

