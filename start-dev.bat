@echo off
echo Starting Ntsamaela Development Environment...

REM Kill existing Node processes
taskkill /f /im node.exe >nul 2>&1

echo Starting API server on port 3003...
start "API Server" cmd /k "cd apps\api && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Web Admin on port 3000...
start "Web Admin" cmd /k "cd apps\web-admin && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Mobile app...
start "Mobile App" cmd /k "cd apps\mobile && npm run start"

echo All services started!
echo API: http://localhost:3003
echo Web Admin: http://localhost:3000
echo Mobile: Check terminal for Expo URL

timeout /t 5 /nobreak >nul
echo Testing services...
node test-api.js

pause




