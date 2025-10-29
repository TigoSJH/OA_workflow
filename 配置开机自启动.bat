@echo off
chcp 65001 >nul
title 配置工作流系统开机自启动

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
echo    工作流系统 - 开机自启动配置
echo ========================================
echo.

:: 1. 配置 MongoDB 服务开机自启
echo [1/4] 配置 MongoDB 开机自启动...
sc config MongoDB start=auto >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ MongoDB 已设置为开机自启
) else (
    echo ⚠️  MongoDB 配置失败（可能未安装为服务）
)
echo.

:: 2. 安装 pm2-windows-startup
echo [2/4] 配置 PM2 开机自启动...
cd /d "%~dp0backend"

:: 检查是否已安装 pm2-windows-startup
npm list -g pm2-windows-startup >nul 2>&1
if %errorLevel% neq 0 (
    echo 正在安装 pm2-windows-startup...
    npm install -g pm2-windows-startup
)

:: 设置 pm2 开机启动
echo 正在设置 PM2 开机自启...
pm2-startup install

:: 保存当前 pm2 进程列表
echo 正在保存 PM2 配置...
pm2 save

echo ✅ PM2 开机自启配置完成
echo.

:: 3. 配置 Cloudflare Tunnel 开机自启（使用任务计划程序）
echo [3/4] 配置 Cloudflare Tunnel 开机自启动...

:: 创建任务计划程序 XML
set TASK_XML="%TEMP%\cloudflare-tunnel-task.xml"
(
echo ^<?xml version="1.0" encoding="UTF-16"?^>
echo ^<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"^>
echo   ^<RegistrationInfo^>
echo     ^<Description^>启动 Cloudflare Tunnel 服务^</Description^>
echo   ^</RegistrationInfo^>
echo   ^<Triggers^>
echo     ^<LogonTrigger^>
echo       ^<Enabled^>true^</Enabled^>
echo       ^<Delay^>PT30S^</Delay^>
echo     ^</LogonTrigger^>
echo   ^</Triggers^>
echo   ^<Principals^>
echo     ^<Principal^>
echo       ^<LogonType^>InteractiveToken^</LogonType^>
echo       ^<RunLevel^>HighestAvailable^</RunLevel^>
echo     ^</Principal^>
echo   ^</Principals^>
echo   ^<Settings^>
echo     ^<MultipleInstancesPolicy^>IgnoreNew^</MultipleInstancesPolicy^>
echo     ^<DisallowStartIfOnBatteries^>false^</DisallowStartIfOnBatteries^>
echo     ^<StopIfGoingOnBatteries^>false^</StopIfGoingOnBatteries^>
echo     ^<AllowHardTerminate^>true^</AllowHardTerminate^>
echo     ^<StartWhenAvailable^>true^</StartWhenAvailable^>
echo     ^<RunOnlyIfNetworkAvailable^>true^</RunOnlyIfNetworkAvailable^>
echo     ^<IdleSettings^>
echo       ^<StopOnIdleEnd^>false^</StopOnIdleEnd^>
echo       ^<RestartOnIdle^>false^</RestartOnIdle^>
echo     ^</IdleSettings^>
echo     ^<AllowStartOnDemand^>true^</AllowStartOnDemand^>
echo     ^<Enabled^>true^</Enabled^>
echo     ^<Hidden^>false^</Hidden^>
echo     ^<RunOnlyIfIdle^>false^</RunOnlyIfIdle^>
echo     ^<WakeToRun^>false^</WakeToRun^>
echo     ^<ExecutionTimeLimit^>PT0S^</ExecutionTimeLimit^>
echo     ^<Priority^>7^</Priority^>
echo   ^</Settings^>
echo   ^<Actions Context="Author"^>
echo     ^<Exec^>
echo       ^<Command^>cloudflared^</Command^>
echo       ^<Arguments^>tunnel run oa-backend^</Arguments^>
echo     ^</Exec^>
echo   ^</Actions^>
echo ^</Task^>
) > %TASK_XML%

:: 删除旧任务（如果存在）
schtasks /delete /tn "Cloudflare Tunnel - OA Backend" /f >nul 2>&1

:: 创建新任务
schtasks /create /xml %TASK_XML% /tn "Cloudflare Tunnel - OA Backend" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Cloudflare Tunnel 已设置为开机自启
) else (
    echo ⚠️  Cloudflare Tunnel 配置失败（可能未安装 cloudflared）
)

:: 清理临时文件
del %TASK_XML% >nul 2>&1
echo.

:: 4. 确保后端服务已添加到 PM2
echo [4/4] 配置后端服务...
cd /d "%~dp0backend"

:: 检查 oa-backend 是否在 pm2 列表中
pm2 list | find "oa-backend" >nul
if %errorLevel% neq 0 (
    echo 正在添加后端服务到 PM2...
    pm2 start server.js --name "oa-backend"
    pm2 save
    echo ✅ 后端服务已添加
) else (
    echo ✅ 后端服务已存在
)
echo.

:: 完成
echo ========================================
echo    配置完成！
echo ========================================
echo.
echo ✅ 已配置以下服务开机自启动：
echo    1. MongoDB 数据库服务
echo    2. PM2 进程管理器（包含后端服务）
echo    3. Cloudflare Tunnel 隧道服务
echo.
echo 💡 下次开机时将自动启动所有服务
echo.
echo 📝 注意事项：
echo    - MongoDB 会在开机时自动启动
echo    - PM2 会延迟 30 秒后启动后端服务
echo    - Cloudflare Tunnel 会延迟 30 秒后启动
echo.
echo 🔧 管理命令：
echo    - 查看 PM2 状态: pm2 status
echo    - 查看任务计划: taskschd.msc
echo    - 取消自启动: 运行"取消开机自启动.bat"
echo.
pause

