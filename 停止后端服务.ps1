# 停止解匠OA工作流程后端服务
# PowerShell 版本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🛑 正在停止解匠OA工作流程后端服务" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 停止 Cloudflare Tunnel
Write-Host "[1/3] ☁️  停止 Cloudflare Tunnel..." -ForegroundColor White
$cloudflaredProcess = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredProcess) {
    Stop-Process -Name cloudflared -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cloudflare Tunnel 已停止" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Cloudflare Tunnel 未在运行" -ForegroundColor Yellow
}
Write-Host ""

# 2. 停止后端服务
Write-Host "[2/3] 🔧 停止后端 Node.js 服务..." -ForegroundColor White
Set-Location "E:\workflow-web-main\workflow-web-main\backend"
$pm2List = pm2 list 2>&1 | Out-String
if ($pm2List -match "oa-backend") {
    pm2 stop oa-backend 2>&1 | Out-Null
    Write-Host "✅ 后端服务已停止" -ForegroundColor Green
} else {
    Write-Host "ℹ️  后端服务未在运行" -ForegroundColor Yellow
}
Write-Host ""

# 3. MongoDB 保持运行（通常不需要停止）
Write-Host "[3/3] 📦 MongoDB 服务..." -ForegroundColor White
Write-Host "ℹ️  MongoDB 保持运行（建议不要停止）" -ForegroundColor Yellow
Write-Host ""

# 显示结果
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 服务停止完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 如需重新启动服务，运行: .\启动后端服务.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "按任意键关闭此窗口..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

