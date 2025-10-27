# 启动解匠OA工作流程后端服务
# PowerShell 版本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 正在启动解匠OA工作流程后端服务" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查并启动 MongoDB
Write-Host "[1/3] 📦 检查 MongoDB 服务..." -ForegroundColor White
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq 'Running') {
    Write-Host "✅ MongoDB 已在运行" -ForegroundColor Green
} else {
    Write-Host "MongoDB 未运行，正在启动..." -ForegroundColor Yellow
    try {
        Start-Service -Name MongoDB -ErrorAction Stop
        Write-Host "✅ MongoDB 启动成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ MongoDB 启动失败: $_" -ForegroundColor Red
    }
}
Write-Host ""

# 2. 启动后端服务
Write-Host "[2/3] 🔧 启动后端 Node.js 服务..." -ForegroundColor White
Set-Location "E:\workflow-web-main\workflow-web-main\backend"
$pm2List = pm2 list 2>&1 | Out-String
if ($pm2List -match "oa-backend") {
    Write-Host "ℹ️  后端服务已存在，正在重启..." -ForegroundColor Yellow
    pm2 restart oa-backend 2>&1 | Out-Null
    Write-Host "✅ 后端服务重启成功" -ForegroundColor Green
} else {
    Write-Host "正在启动后端服务..." -ForegroundColor Yellow
    pm2 start server.js --name "oa-backend" 2>&1 | Out-Null
    Write-Host "✅ 后端服务启动成功" -ForegroundColor Green
}
Write-Host ""

# 3. 启动 Cloudflare Tunnel
Write-Host "[3/3] ☁️  启动 Cloudflare Tunnel..." -ForegroundColor White
$cloudflaredProcess = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredProcess) {
    Write-Host "✅ Cloudflare Tunnel 已在运行" -ForegroundColor Green
} else {
    Write-Host "正在启动 Cloudflare Tunnel..." -ForegroundColor Yellow
    Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "run", "oa-backend" -WindowStyle Minimized
    Start-Sleep -Seconds 3
    Write-Host "✅ Cloudflare Tunnel 启动成功" -ForegroundColor Green
}
Write-Host ""

# 4. 显示状态
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 所有服务启动完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 前端访问地址: https://oa.jjkjoa.top" -ForegroundColor Cyan
Write-Host "🔧 后端API地址: https://api.jjkjoa.top" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示：" -ForegroundColor Yellow
Write-Host "   - 查看后端状态: pm2 status"
Write-Host "   - 查看后端日志: pm2 logs oa-backend"
Write-Host "   - 停止所有服务: 运行 停止后端服务.ps1"
Write-Host ""
Write-Host "按任意键关闭此窗口..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

