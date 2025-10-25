# Start Mobile Expo Server
Write-Host "Starting Ntsamaela Mobile App..." -ForegroundColor Green

# Navigate to the mobile directory
Set-Location -Path "C:\Users\laone\Ntsamaela\apps\mobile"

# Check if we're in the right directory
if (Test-Path "package.json") {
    Write-Host "Found package.json in mobile directory" -ForegroundColor Green
    
    # Start the Expo server
    Write-Host "Starting Expo server..." -ForegroundColor Yellow
    npm start
} else {
    Write-Host "Error: Could not find package.json in mobile directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Red
}

