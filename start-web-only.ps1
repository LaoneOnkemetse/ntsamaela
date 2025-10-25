Write-Host "Starting Ntsamaela Web Application (API + Admin Panel)..." -ForegroundColor Green

Write-Host "`nStep 1: Starting API Server on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\api; npm run dev"

Start-Sleep -Seconds 3

Write-Host "`nStep 2: Starting Web Admin on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\web-admin; npm run dev -- --port 3000"

Write-Host "`nWeb services are starting..." -ForegroundColor Green
Write-Host "`n✅ API Server: http://localhost:3001" -ForegroundColor Cyan
Write-Host "✅ Web Admin: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`n📱 Mobile App: Requires Android SDK setup" -ForegroundColor Yellow
Write-Host "   To setup mobile development:" -ForegroundColor White
Write-Host "   1. Open Android Studio" -ForegroundColor White
Write-Host "   2. Go to Tools > SDK Manager" -ForegroundColor White
Write-Host "   3. Install Android SDK Platform Tools" -ForegroundColor White
Write-Host "   4. Set ANDROID_HOME environment variable" -ForegroundColor White

Write-Host "`nPress any key to exit..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
