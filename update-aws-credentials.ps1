# PowerShell script to update AWS credentials in .env file
# Usage: Run this script and enter your credentials when prompted

Write-Host "Updating AWS credentials in .env file..." -ForegroundColor Green

# Read the current .env file
$envContent = Get-Content .env -Raw

# Prompt for credentials
$accessKeyId = Read-Host "Enter your AWS Access Key ID"
$secretAccessKey = Read-Host "Enter your AWS Secret Access Key" -AsSecureString
$region = Read-Host "Enter AWS Region (default: us-east-1)" -Default "us-east-1"
$bucket = Read-Host "Enter S3 Bucket name (default: ntsamaela-documents)" -Default "ntsamaela-documents"

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretAccessKey)
$plainSecretKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Replace AWS credentials
$envContent = $envContent -replace 'AWS_ACCESS_KEY_ID="[^"]*"', "AWS_ACCESS_KEY_ID=`"$accessKeyId`""
$envContent = $envContent -replace 'AWS_SECRET_ACCESS_KEY="[^"]*"', "AWS_SECRET_ACCESS_KEY=`"$plainSecretKey`""
$envContent = $envContent -replace 'AWS_REGION="[^"]*"', "AWS_REGION=`"$region`""
$envContent = $envContent -replace 'AWS_S3_BUCKET="[^"]*"', "AWS_S3_BUCKET=`"$bucket`""

# Write back to file
$envContent | Set-Content .env -NoNewline

Write-Host "`nAWS credentials updated successfully!" -ForegroundColor Green
Write-Host "Updated values:" -ForegroundColor Yellow
Write-Host "  AWS_ACCESS_KEY_ID: $accessKeyId" -ForegroundColor Cyan
Write-Host "  AWS_SECRET_ACCESS_KEY: [HIDDEN]" -ForegroundColor Cyan
Write-Host "  AWS_REGION: $region" -ForegroundColor Cyan
Write-Host "  AWS_S3_BUCKET: $bucket" -ForegroundColor Cyan

