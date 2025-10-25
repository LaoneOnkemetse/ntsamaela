@echo off
echo Starting Ntsamaela Mobile App...

REM Navigate to the mobile directory
cd /d "C:\Users\laone\Ntsamaela\apps\mobile"

REM Check if we're in the right directory
if exist "package.json" (
    echo Found package.json in mobile directory
    
    REM Start the Expo server
    echo Starting Expo server...
    npm start
) else (
    echo Error: Could not find package.json in mobile directory
    echo Current directory: %CD%
    pause
)

