# PowerShell script to start development servers
Write-Host "Starting Ntsamaela Development Environment..." -ForegroundColor Green

# Kill any existing Node processes
Write-Host "Stopping existing Node processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Start API server
Write-Host "Starting API server on port 3003..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/c", "cd apps/api && npm run dev" -WindowStyle Minimized

# Wait a bit for API to start
Start-Sleep -Seconds 3

# Start Web Admin
Write-Host "Starting Web Admin on port 3000..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/c", "cd apps/web-admin && npm run dev" -WindowStyle Minimized

# Wait a bit for Web Admin to start
Start-Sleep -Seconds 3

# Start Mobile (Expo)
Write-Host "Starting Mobile app..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/c", "cd apps/mobile && npm run start" -WindowStyle Minimized

Write-Host "All services started!" -ForegroundColor Green
Write-Host "API: http://localhost:3003" -ForegroundColor White
Write-Host "Web Admin: http://localhost:3000" -ForegroundColor White
Write-Host "Mobile: Check terminal for Expo URL" -ForegroundColor White

# Test the services
Write-Host "Testing services..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
node test-api.js




