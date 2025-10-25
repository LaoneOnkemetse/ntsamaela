Write-Host "🚀 Starting Ntsamaela Application..." -ForegroundColor Green

# Set Android SDK environment variables
$env:ANDROID_HOME = "C:\Users\laone\AppData\Local\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio1\jbr"
$env:PATH += ";$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:JAVA_HOME\bin"

Write-Host ""
Write-Host "📱 Environment Configuration:" -ForegroundColor Yellow
Write-Host "   ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor White
Write-Host "   JAVA_HOME: $env:JAVA_HOME" -ForegroundColor White

# Test Java
try {
    $javaVersion = java -version 2>&1
    Write-Host "   ✅ Java: Working" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Java: Not working" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 1: Starting API Server on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\api; npm run dev"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Step 2: Starting Web Admin on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\web-admin; npm run dev -- --port 3000"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Step 3: Starting Mobile Development Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\mobile; npx expo start --port 8082"

Write-Host ""
Write-Host "🎉 Application Status:" -ForegroundColor Green
Write-Host ""
Write-Host "✅ API Server: http://localhost:3001" -ForegroundColor Cyan
Write-Host "✅ Web Admin: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📱 Mobile Dev: http://localhost:8082" -ForegroundColor Cyan

Write-Host ""
Write-Host "📱 Mobile App Instructions:" -ForegroundColor Yellow
Write-Host "   1. Install Expo Go app on your phone" -ForegroundColor White
Write-Host "   2. Scan the QR code in the mobile terminal" -ForegroundColor White
Write-Host "   3. Or press 'w' in mobile terminal to open web version" -ForegroundColor White

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor White
Read-Host
