# =============================================================================
# Ntsamaela Environment Setup Script (PowerShell)
# =============================================================================
# This script helps you set up the Ntsamaela development environment on Windows
# It guides you through AWS configuration and creates necessary files
# =============================================================================

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "=============================================================================" -ForegroundColor Blue
    Write-Host $Text -ForegroundColor Blue
    Write-Host "=============================================================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Text)
    Write-Host "⚠️  $Text" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Text)
    Write-Host "ℹ️  $Text" -ForegroundColor Cyan
}

function Write-Step {
    param([int]$Number, [string]$Title)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "Step $Number : $Title" -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host ""
}

function Wait-ForUser {
    Write-Host ""
    Read-Host "Press Enter to continue"
}

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# =============================================================================
# STEP 1: Check Required Tools
# =============================================================================
function Check-RequiredTools {
    Write-Step 1 "Checking Required Tools"
    
    $missingTools = @()
    $AWS_CLI_AVAILABLE = $false
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Success "Node.js installed: $nodeVersion"
            $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
            if ($nodeMajor -lt 18) {
                Write-Warning "Node.js version should be 18 or higher. Current: $nodeVersion"
            }
        }
    } catch {
        Write-Error "Node.js is not installed"
        $missingTools += "Node.js (v18+) - Download from https://nodejs.org/"
    }
    
    # Check npm
    try {
        $npmVersion = npm --version 2>$null
        if ($npmVersion) {
            Write-Success "npm installed: $npmVersion"
        }
    } catch {
        Write-Error "npm is not installed"
        $missingTools += "npm - Usually comes with Node.js"
    }
    
    # Check AWS CLI
    try {
        $awsVersion = aws --version 2>$null
        if ($awsVersion) {
            Write-Success "AWS CLI installed: $awsVersion"
            $script:AWS_CLI_AVAILABLE = $true
        }
    } catch {
        Write-Warning "AWS CLI is not installed (optional but recommended)"
        Write-Info "You can install it from: https://aws.amazon.com/cli/"
    }
    
    # Check Git
    try {
        $gitVersion = git --version 2>$null
        if ($gitVersion) {
            Write-Success "Git installed: $gitVersion"
        }
    } catch {
        Write-Warning "Git is not installed (optional)"
    }
    
    if ($missingTools.Count -gt 0) {
        Write-Host ""
        Write-Error "Missing required tools:"
        foreach ($tool in $missingTools) {
            Write-Host "  - $tool"
        }
        Write-Host ""
        Write-Info "Please install the missing tools and run this script again."
        exit 1
    }
    
    Write-Success "All required tools are installed!"
    Wait-ForUser
}

# =============================================================================
# STEP 2: AWS Account Setup Guide
# =============================================================================
function Guide-AWSSetup {
    Write-Step 2 "AWS Account Setup Guide"
    
    Write-Info "This step will guide you through setting up your AWS account."
    Write-Host ""
    Write-Info "You'll need:"
    Write-Host "  1. An AWS account (sign up at https://aws.amazon.com/)"
    Write-Host "  2. Access to the AWS Console"
    Write-Host "  3. Permission to create IAM users and S3 buckets"
    Write-Host ""
    
    $hasAccount = Read-Host "Do you already have an AWS account? (y/n)"
    
    if ($hasAccount -ne "y" -and $hasAccount -ne "Y") {
        Write-Host ""
        Write-Info "To create an AWS account:"
        Write-Host "  1. Go to https://aws.amazon.com/"
        Write-Host "  2. Click 'Create an AWS Account'"
        Write-Host "  3. Follow the registration process"
        Write-Host "  4. You'll need a credit card (AWS Free Tier available)"
        Write-Host ""
        Wait-ForUser
    }
    
    Write-Host ""
    Write-Info "Next, we'll help you create an IAM user for the application."
    Wait-ForUser
}

# =============================================================================
# STEP 3: IAM User Creation Guide
# =============================================================================
function Guide-IAMUserCreation {
    Write-Step 3 "Creating IAM User in AWS Console"
    
    Write-Info "Follow these steps to create an IAM user:"
    Write-Host ""
    Write-Host "1. Open AWS Console: https://console.aws.amazon.com/"
    Write-Host "2. Navigate to IAM service (search 'IAM' in the top search bar)"
    Write-Host "3. Click 'Users' in the left sidebar"
    Write-Host "4. Click 'Create user' button"
    Write-Host ""
    Write-Host "   User details:"
    Write-Host "   - User name: ntsamaela-app-user (or your preferred name)"
    Write-Host "   - Select: 'Enable programmatic access' (REQUIRED)"
    Write-Host ""
    Write-Host "5. Click 'Next'"
    Write-Host ""
    Write-Host "6. Set permissions:"
    Write-Host "   - Select 'Attach policies directly'"
    Write-Host "   - Click 'Create policy'"
    Write-Host "   - Click 'JSON' tab"
    Write-Host "   - Copy the contents from: infrastructure/iam-policy.json"
    Write-Host "   - Paste into the JSON editor"
    Write-Host "   - Click 'Next'"
    Write-Host "   - Name: NtsamaelaApplicationPolicy"
    Write-Host "   - Click 'Create policy'"
    Write-Host "   - Go back to user creation"
    Write-Host "   - Refresh and select 'NtsamaelaApplicationPolicy'"
    Write-Host ""
    Write-Host "7. Click 'Next' through tags (optional)"
    Write-Host ""
    Write-Host "8. Review and click 'Create user'"
    Write-Host ""
    Write-Warning "IMPORTANT: Save the Access Key ID and Secret Access Key!"
    Write-Host "   - You'll only see the Secret Key once"
    Write-Host "   - Download the CSV file or copy both keys"
    Write-Host ""
    
    Wait-ForUser
    
    # Prompt for credentials
    Write-Host ""
    Write-Info "Enter your AWS credentials:"
    $script:AWS_ACCESS_KEY_ID = Read-Host "AWS Access Key ID"
    $script:AWS_SECRET_ACCESS_KEY = Read-Host "AWS Secret Access Key" -AsSecureString
    $script:AWS_REGION = Read-Host "AWS Region (default: us-east-1)"
    
    if ([string]::IsNullOrWhiteSpace($script:AWS_REGION)) {
        $script:AWS_REGION = "us-east-1"
    }
    
    # Convert secure string to plain text
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($script:AWS_SECRET_ACCESS_KEY)
    $script:AWS_SECRET_ACCESS_KEY_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    # Validate Access Key format
    if ($script:AWS_ACCESS_KEY_ID -notmatch '^AKIA[0-9A-Z]{16}$') {
        Write-Warning "Access Key ID should start with 'AKIA' and be 20 characters"
        $confirm = Read-Host "Are you sure this is correct? (y/n)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Error "Please re-run the script with correct credentials"
            exit 1
        }
    }
    
    Write-Success "AWS credentials collected"
    Wait-ForUser
}

# =============================================================================
# STEP 4: S3 Bucket Setup
# =============================================================================
function Setup-S3Buckets {
    Write-Step 4 "Setting Up S3 Buckets"
    
    Write-Info "We need to create S3 buckets for document storage."
    Write-Host ""
    Write-Info "Required buckets:"
    Write-Host "  1. ntsamaela-documents (verification documents, profile pictures)"
    Write-Host "  2. ntsamaela-packages (package images)"
    Write-Host "  3. ntsamaela-uploads (general uploads)"
    Write-Host ""
    
    if ($script:AWS_CLI_AVAILABLE) {
        Write-Info "AWS CLI is available. We can create buckets automatically."
        $autoCreate = Read-Host "Create buckets automatically? (y/n)"
        
        if ($autoCreate -eq "y" -or $autoCreate -eq "Y") {
            $env:AWS_ACCESS_KEY_ID = $script:AWS_ACCESS_KEY_ID
            $env:AWS_SECRET_ACCESS_KEY = $script:AWS_SECRET_ACCESS_KEY_PLAIN
            $env:AWS_DEFAULT_REGION = $script:AWS_REGION
            
            $buckets = @("ntsamaela-documents", "ntsamaela-packages", "ntsamaela-uploads")
            
            foreach ($bucket in $buckets) {
                Write-Host ""
                Write-Info "Creating bucket: $bucket"
                
                try {
                    aws s3api head-bucket --bucket $bucket 2>$null
                    Write-Warning "Bucket $bucket already exists"
                } catch {
                    try {
                        if ($script:AWS_REGION -eq "us-east-1") {
                            aws s3api create-bucket --bucket $bucket --region us-east-1 2>$null
                        } else {
                            aws s3api create-bucket --bucket $bucket --region $script:AWS_REGION --create-bucket-configuration LocationConstraint=$script:AWS_REGION 2>$null
                        }
                        Write-Success "Bucket $bucket created successfully"
                        
                        # Enable versioning
                        aws s3api put-bucket-versioning --bucket $bucket --versioning-configuration Status=Enabled 2>$null
                        
                        # Block public access
                        aws s3api put-public-access-block --bucket $bucket --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" 2>$null
                    } catch {
                        Write-Error "Failed to create bucket $bucket"
                        Write-Info "Please create it manually in AWS Console"
                    }
                }
            }
        } else {
            Guide-ManualS3Setup
        }
    } else {
        Guide-ManualS3Setup
    }
    
    Wait-ForUser
}

function Guide-ManualS3Setup {
    Write-Host ""
    Write-Info "Manual S3 Bucket Creation:"
    Write-Host ""
    Write-Host "1. Go to AWS Console → S3"
    Write-Host "2. Click 'Create bucket'"
    Write-Host ""
    Write-Host "For each bucket (ntsamaela-documents, ntsamaela-packages, ntsamaela-uploads):"
    Write-Host "  - Bucket name: [bucket-name]"
    Write-Host "  - AWS Region: $($script:AWS_REGION)"
    Write-Host "  - Block all public access: ✅ (Keep checked)"
    Write-Host "  - Bucket Versioning: Enable (optional but recommended)"
    Write-Host "  - Default encryption: Enable (SSE-S3 or SSE-KMS)"
    Write-Host "  - Click 'Create bucket'"
    Write-Host ""
    Write-Info "After creating buckets, press Enter to continue"
}

# =============================================================================
# STEP 5: Rekognition Collection Setup
# =============================================================================
function Setup-RekognitionCollection {
    Write-Step 5 "Setting Up Rekognition Collection"
    
    Write-Info "We need to create a Rekognition collection for facial recognition."
    Write-Host ""
    
    if ($script:AWS_CLI_AVAILABLE) {
        $autoCreate = Read-Host "Create Rekognition collection automatically? (y/n)"
        
        if ($autoCreate -eq "y" -or $autoCreate -eq "Y") {
            $env:AWS_ACCESS_KEY_ID = $script:AWS_ACCESS_KEY_ID
            $env:AWS_SECRET_ACCESS_KEY = $script:AWS_SECRET_ACCESS_KEY_PLAIN
            $env:AWS_DEFAULT_REGION = $script:AWS_REGION
            
            $collectionName = "ntsamaela-verification"
            
            Write-Info "Creating Rekognition collection: $collectionName"
            
            try {
                aws rekognition describe-collection --collection-id $collectionName --region $script:AWS_REGION 2>$null
                Write-Warning "Collection $collectionName already exists"
            } catch {
                try {
                    aws rekognition create-collection --collection-id $collectionName --region $script:AWS_REGION 2>$null
                    Write-Success "Rekognition collection created successfully"
                } catch {
                    Write-Error "Failed to create collection"
                    Write-Info "You can create it manually or skip for now"
                }
            }
        } else {
            Guide-ManualRekognitionSetup
        }
    } else {
        Guide-ManualRekognitionSetup
    }
    
    Wait-ForUser
}

function Guide-ManualRekognitionSetup {
    Write-Host ""
    Write-Info "Manual Rekognition Collection Creation:"
    Write-Host ""
    Write-Host "1. Go to AWS Console → Rekognition"
    Write-Host "2. Click 'Face collections' in the left sidebar"
    Write-Host "3. Click 'Create collection'"
    Write-Host "4. Collection ID: ntsamaela-verification"
    Write-Host "5. Click 'Create collection'"
    Write-Host ""
    Write-Info "This can be done later if needed"
}

# =============================================================================
# STEP 6: Create .env File
# =============================================================================
function Create-EnvFile {
    Write-Step 6 "Creating .env File"
    
    $envFile = Join-Path $ProjectRoot ".env"
    
    if (Test-Path $envFile) {
        Write-Warning ".env file already exists"
        $overwrite = Read-Host "Overwrite existing .env file? (y/n)"
        if ($overwrite -ne "y" -and $overwrite -ne "Y") {
            Write-Info "Skipping .env file creation"
            return
        }
    }
    
    # Generate JWT secrets
    $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $jwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    # Read database configuration
    Write-Host ""
    Write-Info "Database Configuration:"
    $dbUrl = Read-Host "Database URL (default: postgresql://postgres:password@localhost:5432/ntsamaela)"
    if ([string]::IsNullOrWhiteSpace($dbUrl)) {
        $dbUrl = "postgresql://postgres:password@localhost:5432/ntsamaela"
    }
    
    # Create .env file content
    $envContent = @"
# =============================================================================
# NTSAMAELA ENVIRONMENT VARIABLES
# Generated by setup-environment.ps1 on $(Get-Date)
# =============================================================================

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL="$dbUrl"
TEST_DATABASE_URL="postgresql://test:test@localhost:5432/ntsamaela_test"

# =============================================================================
# JWT CONFIGURATION
# =============================================================================
JWT_SECRET="$jwtSecret"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="$jwtRefreshSecret"
JWT_REFRESH_EXPIRES_IN="30d"

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
NODE_ENV="development"
PORT=3000
API_URL="http://localhost:3000/api"
CORS_ORIGIN="http://localhost:3000,http://localhost:3001,http://localhost:19006"

# =============================================================================
# AWS CONFIGURATION
# =============================================================================
AWS_ACCESS_KEY_ID="$($script:AWS_ACCESS_KEY_ID)"
AWS_SECRET_ACCESS_KEY="$($script:AWS_SECRET_ACCESS_KEY_PLAIN)"
AWS_REGION="$($script:AWS_REGION)"
AWS_S3_BUCKET="ntsamaela-documents"
AWS_S3_BUCKET_NAME="ntsamaela-packages"
AWS_S3_BUCKET_REGION="$($script:AWS_REGION)"
AWS_REKOGNITION_COLLECTION_ID="ntsamaela-verification"

# =============================================================================
# GOOGLE CLOUD CONFIGURATION (Optional)
# =============================================================================
GOOGLE_CLOUD_PROJECT_ID="your-google-cloud-project-id"
GOOGLE_CLOUD_PRIVATE_KEY="your-google-cloud-private-key"
GOOGLE_CLOUD_CLIENT_EMAIL="your-google-cloud-client-email"

# =============================================================================
# FIREBASE CONFIGURATION (Optional)
# =============================================================================
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"

# =============================================================================
# PAYMENT PROCESSORS (Optional)
# =============================================================================
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret"

# Paystack Configuration
PAYSTACK_SECRET_KEY="sk_test_your-paystack-secret-key"
PAYSTACK_PUBLIC_KEY="pk_test_your-paystack-public-key"

# =============================================================================
# EMAIL CONFIGURATION (Optional)
# =============================================================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-email-password"
EMAIL_FROM="noreply@ntsamaela.com"

# =============================================================================
# REDIS CONFIGURATION (Optional)
# =============================================================================
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
LOG_LEVEL="info"
LOG_FILE="logs/app.log"

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================================================
# VERIFICATION CONFIGURATION
# =============================================================================
VERIFICATION_RISK_THRESHOLD=75
VERIFICATION_AUTO_APPROVAL_THRESHOLD=90
VERIFICATION_MANUAL_REVIEW_THRESHOLD=50

# =============================================================================
# COMMISSION CONFIGURATION
# =============================================================================
DRIVER_COMMISSION_PERCENTAGE=30
PLATFORM_FEE_PERCENTAGE=5

# =============================================================================
# MOBILE APP CONFIGURATION
# =============================================================================
EXPO_PUBLIC_API_URL="http://localhost:3000/api"
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# =============================================================================
# WEB ADMIN CONFIGURATION
# =============================================================================
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_NAME="Ntsamaela Admin"

# =============================================================================
# MONITORING AND ANALYTICS (Optional)
# =============================================================================
SENTRY_DSN="your-sentry-dsn"
SENTRY_ENVIRONMENT="development"

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ENABLE_AI_VERIFICATION=true
ENABLE_REAL_TIME_TRACKING=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true

# =============================================================================
# DEVELOPMENT TOOLS
# =============================================================================
ENABLE_SWAGGER=true
ENABLE_GRAPHQL_PLAYGROUND=true
ENABLE_DEBUG_LOGGING=false
"@
    
    $envContent | Out-File -FilePath $envFile -Encoding UTF8 -NoNewline
    Write-Success ".env file created at $envFile"
    Write-Warning "⚠️  Remember: .env file contains sensitive information. Never commit it to Git!"
    Wait-ForUser
}

# =============================================================================
# STEP 7: Test AWS Configuration
# =============================================================================
function Test-AWSConfiguration {
    Write-Step 7 "Testing AWS Configuration"
    
    if (-not $script:AWS_CLI_AVAILABLE) {
        Write-Warning "AWS CLI not available. Skipping automated tests."
        Write-Info "You can test manually by running your application"
        Wait-ForUser
        return
    }
    
    $env:AWS_ACCESS_KEY_ID = $script:AWS_ACCESS_KEY_ID
    $env:AWS_SECRET_ACCESS_KEY = $script:AWS_SECRET_ACCESS_KEY_PLAIN
    $env:AWS_DEFAULT_REGION = $script:AWS_REGION
    
    Write-Info "Testing AWS credentials and access..."
    Write-Host ""
    
    # Test 1: Verify credentials
    Write-Info "Test 1: Verifying AWS credentials..."
    try {
        $identity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
        Write-Success "Credentials valid"
        Write-Info "  Account ID: $($identity.Account)"
        Write-Info "  User ARN: $($identity.Arn)"
    } catch {
        Write-Error "Invalid AWS credentials"
        Write-Info "Please check your Access Key ID and Secret Access Key"
        return
    }
    
    Write-Host ""
    
    # Test 2: Test S3 access
    Write-Info "Test 2: Testing S3 bucket access..."
    $buckets = @("ntsamaela-documents", "ntsamaela-packages", "ntsamaela-uploads")
    $allBucketsOk = $true
    
    foreach ($bucket in $buckets) {
        try {
            aws s3 ls "s3://$bucket" 2>$null | Out-Null
            Write-Success "Bucket '$bucket' is accessible"
        } catch {
            Write-Error "Cannot access bucket '$bucket'"
            Write-Info "  - Check if bucket exists"
            Write-Info "  - Verify IAM policy includes S3 permissions"
            $allBucketsOk = $false
        }
    }
    
    Write-Host ""
    
    # Test 3: Test Rekognition access
    Write-Info "Test 3: Testing Rekognition access..."
    try {
        aws rekognition list-collections --region $script:AWS_REGION 2>$null | Out-Null
        Write-Success "Rekognition service is accessible"
        
        try {
            aws rekognition describe-collection --collection-id "ntsamaela-verification" --region $script:AWS_REGION 2>$null | Out-Null
            Write-Success "Rekognition collection 'ntsamaela-verification' exists"
        } catch {
            Write-Warning "Rekognition collection 'ntsamaela-verification' not found"
            Write-Info "  You can create it later or it will be created automatically"
        }
    } catch {
        Write-Error "Cannot access Rekognition service"
        Write-Info "  - Verify IAM policy includes Rekognition permissions"
    }
    
    Write-Host ""
    
    if ($allBucketsOk) {
        Write-Success "All AWS configuration tests passed! ✅"
    } else {
        Write-Warning "Some tests failed. Please review the errors above."
    }
    
    Wait-ForUser
}

# =============================================================================
# Main Execution
# =============================================================================
function Main {
    Clear-Host
    Write-Header "Ntsamaela Environment Setup"
    
    Write-Info "Welcome to the Ntsamaela environment setup!"
    Write-Host ""
    Write-Host "This script will help you:"
    Write-Host "  1. Check required tools"
    Write-Host "  2. Set up AWS account and IAM user"
    Write-Host "  3. Create S3 buckets"
    Write-Host "  4. Configure Rekognition"
    Write-Host "  5. Create .env file"
    Write-Host "  6. Test AWS configuration"
    Write-Host ""
    Write-Warning "This will take approximately 10-15 minutes."
    Write-Host ""
    
    $ready = Read-Host "Ready to start? (y/n)"
    if ($ready -ne "y" -and $ready -ne "Y") {
        Write-Host "Setup cancelled."
        exit 0
    }
    
    # Execute steps
    Check-RequiredTools
    Guide-AWSSetup
    Guide-IAMUserCreation
    Setup-S3Buckets
    Setup-RekognitionCollection
    Create-EnvFile
    Test-AWSConfiguration
    
    # Final summary
    Write-Header "Setup Complete! 🎉"
    
    Write-Success "Your Ntsamaela environment has been set up successfully!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "  1. Review your .env file: $(Join-Path $ProjectRoot '.env')"
    Write-Host "  2. Install dependencies: npm install"
    Write-Host "  3. Set up database: npm run migrate:dev"
    Write-Host "  4. Start development server: npm run dev"
    Write-Host ""
    Write-Warning "Remember:"
    Write-Host "  - Never commit .env file to Git"
    Write-Host "  - Keep your AWS credentials secure"
    Write-Host "  - Review IAM permissions regularly"
    Write-Host ""
    
    Write-Success "Happy coding! 🚀"
}

# Run main function
Main

