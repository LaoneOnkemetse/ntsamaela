Write-Host "🚀 Starting Ntsamaela Application..." -ForegroundColor Green

# Set Android SDK environment variables
$env:ANDROID_HOME = "C:\Users\laone\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools"

Write-Host "`n📱 Android SDK Configuration:" -ForegroundColor Yellow
Write-Host "   ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor White

# Check if Java is installed
try {
    $javaVersion = java -version 2>&1
    Write-Host "   ✅ Java: Installed" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Java: Not installed (required for mobile development)" -ForegroundColor Yellow
}

Write-Host "`nStep 1: Starting API Server on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\api; npm run dev"

Start-Sleep -Seconds 3

Write-Host "`nStep 2: Starting Web Admin on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\web-admin; npm run dev -- --port 3000"

Start-Sleep -Seconds 3

Write-Host "`nStep 3: Starting Mobile Development Server..." -ForegroundColor Yellow
try {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\mobile; npx expo start --port 8081"
    Write-Host "   ✅ Mobile server started" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Mobile server failed (Java/JDK required)" -ForegroundColor Yellow
}

Write-Host "`n🎉 Application Status:" -ForegroundColor Green
Write-Host "`n✅ API Server: http://localhost:3001" -ForegroundColor Cyan
Write-Host "✅ Web Admin: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📱 Mobile Dev: http://localhost:8081" -ForegroundColor Cyan

Write-Host "`n📋 Next Steps for Mobile Development:" -ForegroundColor Yellow
Write-Host "   1. Install Java JDK 17 or 21" -ForegroundColor White
Write-Host "   2. Set JAVA_HOME environment variable" -ForegroundColor White
Write-Host "   3. Install Android SDK Platform Tools" -ForegroundColor White
Write-Host "   4. Create Android Virtual Device (AVD)" -ForegroundColor White

Write-Host "`nPress any key to exit..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
