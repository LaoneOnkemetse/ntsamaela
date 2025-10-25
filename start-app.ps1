Write-Host "Starting Ntsamaela Application..." -ForegroundColor Green

Write-Host "`nStep 1: Starting API Server on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\api; npm run dev"

Start-Sleep -Seconds 3

Write-Host "`nStep 2: Starting Web Admin on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\web-admin; npm run dev -- --port 3000"

Start-Sleep -Seconds 3

Write-Host "`nStep 3: Starting Mobile Development Server on port 8081..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\mobile; npx expo start --port 8081"

Write-Host "`nAll services are starting..." -ForegroundColor Green
Write-Host "`nAPI Server: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Web Admin: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Mobile Dev: http://localhost:8081" -ForegroundColor Cyan

Write-Host "`nPress any key to exit..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
