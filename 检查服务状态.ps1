# 检查解匠OA工作流程服务状态
# PowerShell 版本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 解匠OA工作流程服务状态" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. MongoDB 状态
Write-Host "1. 📦 MongoDB 服务" -ForegroundColor White
Write-Host "   -----------------------------------" -ForegroundColor DarkGray
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService) {
    if ($mongoService.Status -eq 'Running') {
        Write-Host "   状态: ✅ 运行中" -ForegroundColor Green
    } else {
        Write-Host "   状态: ❌ 已停止" -ForegroundColor Red
    }
    Write-Host "   启动类型: $($mongoService.StartType)"
} else {
    Write-Host "   状态: ❌ 未安装" -ForegroundColor Red
}
Write-Host ""

# 2. 后端服务状态
Write-Host "2. 🔧 后端 Node.js 服务 (PM2)" -ForegroundColor White
Write-Host "   -----------------------------------" -ForegroundColor DarkGray
Set-Location "E:\workflow-web-main\workflow-web-main\backend"
pm2 list
Write-Host ""

# 3. Cloudflare Tunnel 状态
Write-Host "3. ☁️  Cloudflare Tunnel" -ForegroundColor White
Write-Host "   -----------------------------------" -ForegroundColor DarkGray
$cloudflaredProcess = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredProcess) {
    Write-Host "   状态: ✅ 运行中" -ForegroundColor Green
    Write-Host "   进程ID: $($cloudflaredProcess.Id)"
    Write-Host "   内存使用: $([math]::Round($cloudflaredProcess.WorkingSet64/1MB, 2)) MB"
} else {
    Write-Host "   状态: ❌ 未运行" -ForegroundColor Red
}
Write-Host ""

# 4. 网络连接测试
Write-Host "4. 🌐 网络连接测试" -ForegroundColor White
Write-Host "   -----------------------------------" -ForegroundColor DarkGray

# 测试本地后端
Write-Host "   测试本地后端: " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ 正常 ($($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ 失败" -ForegroundColor Red
}

# 测试 Cloudflare Tunnel
Write-Host "   测试远程API: " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "https://api.jjkjoa.top" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ 正常 ($($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ 失败" -ForegroundColor Red
    Write-Host "   (可能需要等待 Cloudflare Tunnel 完全连接)" -ForegroundColor Yellow
}
Write-Host ""

# 显示访问地址
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📍 访问地址" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🌐 前端: https://oa.jjkjoa.top" -ForegroundColor Cyan
Write-Host "🔧 后端: https://api.jjkjoa.top" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意键关闭此窗口..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

