@echo off
echo Starting Ntsamaela Application...

echo.
echo Step 1: Starting API Server on port 3001...
start "API Server" cmd /k "cd apps\api && npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo Step 2: Starting Web Admin on port 3000...
start "Web Admin" cmd /k "cd apps\web-admin && npm run dev -- --port 3000"

timeout /t 3 /nobreak > nul

echo.
echo Step 3: Starting Mobile Development Server on port 8081...
start "Mobile Dev" cmd /k "cd apps\mobile && npx expo start --port 8081"

echo.
echo All services are starting...
echo.
echo API Server: http://localhost:3001
echo Web Admin: http://localhost:3000
echo Mobile Dev: http://localhost:8081
echo.
echo Press any key to exit this window...
pause > nul
