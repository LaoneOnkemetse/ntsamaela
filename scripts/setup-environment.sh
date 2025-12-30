#!/bin/bash

# =============================================================================
# Ntsamaela Environment Setup Script
# =============================================================================
# This script helps you set up the Ntsamaela development environment
# It guides you through AWS configuration and creates necessary files
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step $1: $2${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

wait_for_user() {
    echo ""
    read -p "Press Enter to continue..."
}

# =============================================================================
# STEP 1: Check Required Tools
# =============================================================================
check_required_tools() {
    print_step "1" "Checking Required Tools"
    
    local missing_tools=()
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_success "Node.js installed: $node_version"
        
        # Check Node.js version (should be 18+)
        local node_major=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_major" -lt 18 ]; then
            print_warning "Node.js version should be 18 or higher. Current: $node_version"
        fi
    else
        print_error "Node.js is not installed"
        missing_tools+=("Node.js (v18+) - Download from https://nodejs.org/")
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        print_success "npm installed: $npm_version"
    else
        print_error "npm is not installed"
        missing_tools+=("npm - Usually comes with Node.js")
    fi
    
    # Check AWS CLI (optional but recommended)
    if command -v aws &> /dev/null; then
        local aws_version=$(aws --version 2>&1 | head -n1)
        print_success "AWS CLI installed: $aws_version"
        AWS_CLI_AVAILABLE=true
    else
        print_warning "AWS CLI is not installed (optional but recommended)"
        print_info "You can install it from: https://aws.amazon.com/cli/"
        AWS_CLI_AVAILABLE=false
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        local git_version=$(git --version)
        print_success "Git installed: $git_version"
    else
        print_warning "Git is not installed (optional)"
    fi
    
    # Check PostgreSQL (optional for local dev)
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL client installed"
    else
        print_info "PostgreSQL client not found (optional for local development)"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo ""
        print_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        echo ""
        print_info "Please install the missing tools and run this script again."
        exit 1
    fi
    
    print_success "All required tools are installed!"
    wait_for_user
}

# =============================================================================
# STEP 2: AWS Account Setup Guide
# =============================================================================
guide_aws_setup() {
    print_step "2" "AWS Account Setup Guide"
    
    echo -e "${CYAN}This step will guide you through setting up your AWS account.${NC}"
    echo ""
    print_info "You'll need:"
    echo "  1. An AWS account (sign up at https://aws.amazon.com/)"
    echo "  2. Access to the AWS Console"
    echo "  3. Permission to create IAM users and S3 buckets"
    echo ""
    
    read -p "Do you already have an AWS account? (y/n): " has_account
    
    if [ "$has_account" != "y" ] && [ "$has_account" != "Y" ]; then
        echo ""
        print_info "To create an AWS account:"
        echo "  1. Go to https://aws.amazon.com/"
        echo "  2. Click 'Create an AWS Account'"
        echo "  3. Follow the registration process"
        echo "  4. You'll need a credit card (AWS Free Tier available)"
        echo ""
        wait_for_user
    fi
    
    echo ""
    print_info "Next, we'll help you create an IAM user for the application."
    wait_for_user
}

# =============================================================================
# STEP 3: IAM User Creation Guide
# =============================================================================
guide_iam_user_creation() {
    print_step "3" "Creating IAM User in AWS Console"
    
    echo -e "${CYAN}Follow these steps to create an IAM user:${NC}"
    echo ""
    echo "1. Open AWS Console: https://console.aws.amazon.com/"
    echo "2. Navigate to IAM service (search 'IAM' in the top search bar)"
    echo "3. Click 'Users' in the left sidebar"
    echo "4. Click 'Create user' button"
    echo ""
    echo "   User details:"
    echo "   - User name: ntsamaela-app-user (or your preferred name)"
    echo "   - Select: 'Provide user access to the AWS Management Console' (optional)"
    echo "   - Select: 'Enable programmatic access' (REQUIRED)"
    echo ""
    echo "5. Click 'Next'"
    echo ""
    echo "6. Set permissions:"
    echo "   - Select 'Attach policies directly'"
    echo "   - Click 'Create policy'"
    echo "   - Click 'JSON' tab"
    echo "   - Copy the contents from: infrastructure/iam-policy.json"
    echo "   - Paste into the JSON editor"
    echo "   - Click 'Next'"
    echo "   - Name: NtsamaelaApplicationPolicy"
    echo "   - Click 'Create policy'"
    echo "   - Go back to user creation"
    echo "   - Refresh and select 'NtsamaelaApplicationPolicy'"
    echo ""
    echo "7. Click 'Next' through tags (optional)"
    echo ""
    echo "8. Review and click 'Create user'"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Save the Access Key ID and Secret Access Key!${NC}"
    echo "   - You'll only see the Secret Key once"
    echo "   - Download the CSV file or copy both keys"
    echo ""
    
    wait_for_user
    
    # Prompt for credentials
    echo ""
    echo -e "${CYAN}Enter your AWS credentials:${NC}"
    read -p "AWS Access Key ID: " aws_access_key
    read -sp "AWS Secret Access Key: " aws_secret_key
    echo ""
    read -p "AWS Region (default: us-east-1): " aws_region
    aws_region=${aws_region:-us-east-1}
    
    # Validate Access Key format
    if [[ ! $aws_access_key =~ ^AKIA[0-9A-Z]{16}$ ]]; then
        print_warning "Access Key ID should start with 'AKIA' and be 20 characters"
        read -p "Are you sure this is correct? (y/n): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            print_error "Please re-run the script with correct credentials"
            exit 1
        fi
    fi
    
    # Store for later use
    export AWS_ACCESS_KEY_ID="$aws_access_key"
    export AWS_SECRET_ACCESS_KEY="$aws_secret_key"
    export AWS_REGION="$aws_region"
    
    print_success "AWS credentials collected"
    wait_for_user
}

# =============================================================================
# STEP 4: S3 Bucket Setup
# =============================================================================
setup_s3_buckets() {
    print_step "4" "Setting Up S3 Buckets"
    
    echo -e "${CYAN}We need to create S3 buckets for document storage.${NC}"
    echo ""
    print_info "Required buckets:"
    echo "  1. ntsamaela-documents (verification documents, profile pictures)"
    echo "  2. ntsamaela-packages (package images)"
    echo "  3. ntsamaela-uploads (general uploads)"
    echo ""
    
    if [ "$AWS_CLI_AVAILABLE" = true ]; then
        echo -e "${CYAN}AWS CLI is available. We can create buckets automatically.${NC}"
        read -p "Create buckets automatically? (y/n): " auto_create
        
        if [ "$auto_create" = "y" ] || [ "$auto_create" = "Y" ]; then
            # Configure AWS CLI
            export AWS_ACCESS_KEY_ID
            export AWS_SECRET_ACCESS_KEY
            export AWS_DEFAULT_REGION="$AWS_REGION"
            
            # Create buckets
            buckets=("ntsamaela-documents" "ntsamaela-packages" "ntsamaela-uploads")
            
            for bucket in "${buckets[@]}"; do
                echo ""
                print_info "Creating bucket: $bucket"
                
                if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
                    print_warning "Bucket $bucket already exists"
                else
                    if aws s3api create-bucket \
                        --bucket "$bucket" \
                        --region "$AWS_REGION" \
                        --create-bucket-configuration LocationConstraint="$AWS_REGION" 2>/dev/null || \
                       aws s3api create-bucket \
                        --bucket "$bucket" \
                        --region us-east-1 2>/dev/null; then
                        print_success "Bucket $bucket created successfully"
                        
                        # Enable versioning
                        aws s3api put-bucket-versioning \
                            --bucket "$bucket" \
                            --versioning-configuration Status=Enabled 2>/dev/null || true
                        
                        # Block public access
                        aws s3api put-public-access-block \
                            --bucket "$bucket" \
                            --public-access-block-configuration \
                            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" 2>/dev/null || true
                    else
                        print_error "Failed to create bucket $bucket"
                        print_info "Please create it manually in AWS Console"
                    fi
                fi
            done
        else
            guide_manual_s3_setup
        fi
    else
        guide_manual_s3_setup
    fi
    
    wait_for_user
}

guide_manual_s3_setup() {
    echo ""
    echo -e "${CYAN}Manual S3 Bucket Creation:${NC}"
    echo ""
    echo "1. Go to AWS Console → S3"
    echo "2. Click 'Create bucket'"
    echo ""
    echo "For each bucket (ntsamaela-documents, ntsamaela-packages, ntsamaela-uploads):"
    echo "  - Bucket name: [bucket-name]"
    echo "  - AWS Region: $AWS_REGION"
    echo "  - Block all public access: ✅ (Keep checked)"
    echo "  - Bucket Versioning: Enable (optional but recommended)"
    echo "  - Default encryption: Enable (SSE-S3 or SSE-KMS)"
    echo "  - Click 'Create bucket'"
    echo ""
    print_info "After creating buckets, press Enter to continue"
}

# =============================================================================
# STEP 5: Rekognition Collection Setup
# =============================================================================
setup_rekognition_collection() {
    print_step "5" "Setting Up Rekognition Collection"
    
    echo -e "${CYAN}We need to create a Rekognition collection for facial recognition.${NC}"
    echo ""
    
    if [ "$AWS_CLI_AVAILABLE" = true ]; then
        read -p "Create Rekognition collection automatically? (y/n): " auto_create
        
        if [ "$auto_create" = "y" ] || [ "$auto_create" = "Y" ]; then
            export AWS_ACCESS_KEY_ID
            export AWS_SECRET_ACCESS_KEY
            export AWS_DEFAULT_REGION="$AWS_REGION"
            
            local collection_name="ntsamaela-verification"
            
            print_info "Creating Rekognition collection: $collection_name"
            
            if aws rekognition describe-collection \
                --collection-id "$collection_name" \
                --region "$AWS_REGION" 2>/dev/null; then
                print_warning "Collection $collection_name already exists"
            else
                if aws rekognition create-collection \
                    --collection-id "$collection_name" \
                    --region "$AWS_REGION" 2>/dev/null; then
                    print_success "Rekognition collection created successfully"
                else
                    print_error "Failed to create collection"
                    print_info "You can create it manually or skip for now"
                fi
            fi
        else
            guide_manual_rekognition_setup
        fi
    else
        guide_manual_rekognition_setup
    fi
    
    wait_for_user
}

guide_manual_rekognition_setup() {
    echo ""
    echo -e "${CYAN}Manual Rekognition Collection Creation:${NC}"
    echo ""
    echo "1. Go to AWS Console → Rekognition"
    echo "2. Click 'Face collections' in the left sidebar"
    echo "3. Click 'Create collection'"
    echo "4. Collection ID: ntsamaela-verification"
    echo "5. Click 'Create collection'"
    echo ""
    print_info "This can be done later if needed"
}

# =============================================================================
# STEP 6: Create .env File
# =============================================================================
create_env_file() {
    print_step "6" "Creating .env File"
    
    local env_file="$PROJECT_ROOT/.env"
    
    if [ -f "$env_file" ]; then
        print_warning ".env file already exists"
        read -p "Overwrite existing .env file? (y/n): " overwrite
        if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
            print_info "Skipping .env file creation"
            return
        fi
    fi
    
    # Generate JWT secrets
    local jwt_secret=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    local jwt_refresh_secret=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    # Read database configuration
    echo ""
    echo -e "${CYAN}Database Configuration:${NC}"
    read -p "Database URL (default: postgresql://postgres:password@localhost:5432/ntsamaela): " db_url
    db_url=${db_url:-postgresql://postgres:password@localhost:5432/ntsamaela}
    
    # Create .env file
    cat > "$env_file" << EOF
# =============================================================================
# NTSAMAELA ENVIRONMENT VARIABLES
# Generated by setup-environment.sh on $(date)
# =============================================================================

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL="$db_url"
TEST_DATABASE_URL="postgresql://test:test@localhost:5432/ntsamaela_test"

# =============================================================================
# JWT CONFIGURATION
# =============================================================================
JWT_SECRET="$jwt_secret"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="$jwt_refresh_secret"
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
AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
AWS_REGION="$AWS_REGION"
AWS_S3_BUCKET="ntsamaela-documents"
AWS_S3_BUCKET_NAME="ntsamaela-packages"
AWS_S3_BUCKET_REGION="$AWS_REGION"
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
EOF
    
    print_success ".env file created at $env_file"
    print_warning "⚠️  Remember: .env file contains sensitive information. Never commit it to Git!"
    wait_for_user
}

# =============================================================================
# STEP 7: Test AWS Configuration
# =============================================================================
test_aws_configuration() {
    print_step "7" "Testing AWS Configuration"
    
    if [ "$AWS_CLI_AVAILABLE" = false ]; then
        print_warning "AWS CLI not available. Skipping automated tests."
        print_info "You can test manually by running your application"
        wait_for_user
        return
    fi
    
    export AWS_ACCESS_KEY_ID
    export AWS_SECRET_ACCESS_KEY
    export AWS_DEFAULT_REGION="$AWS_REGION"
    
    echo -e "${CYAN}Testing AWS credentials and access...${NC}"
    echo ""
    
    # Test 1: Verify credentials
    print_info "Test 1: Verifying AWS credentials..."
    if aws sts get-caller-identity &>/dev/null; then
        local account_id=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
        local user_arn=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null)
        print_success "Credentials valid"
        print_info "  Account ID: $account_id"
        print_info "  User ARN: $user_arn"
    else
        print_error "Invalid AWS credentials"
        print_info "Please check your Access Key ID and Secret Access Key"
        return 1
    fi
    
    echo ""
    
    # Test 2: Test S3 access
    print_info "Test 2: Testing S3 bucket access..."
    local buckets=("ntsamaela-documents" "ntsamaela-packages" "ntsamaela-uploads")
    local all_buckets_ok=true
    
    for bucket in "${buckets[@]}"; do
        if aws s3 ls "s3://$bucket" &>/dev/null; then
            print_success "Bucket '$bucket' is accessible"
        else
            print_error "Cannot access bucket '$bucket'"
            print_info "  - Check if bucket exists"
            print_info "  - Verify IAM policy includes S3 permissions"
            all_buckets_ok=false
        fi
    done
    
    echo ""
    
    # Test 3: Test Rekognition access
    print_info "Test 3: Testing Rekognition access..."
    if aws rekognition list-collections --region "$AWS_REGION" &>/dev/null; then
        print_success "Rekognition service is accessible"
        
        # Check if collection exists
        if aws rekognition describe-collection \
            --collection-id "ntsamaela-verification" \
            --region "$AWS_REGION" &>/dev/null; then
            print_success "Rekognition collection 'ntsamaela-verification' exists"
        else
            print_warning "Rekognition collection 'ntsamaela-verification' not found"
            print_info "  You can create it later or it will be created automatically"
        fi
    else
        print_error "Cannot access Rekognition service"
        print_info "  - Verify IAM policy includes Rekognition permissions"
    fi
    
    echo ""
    
    if [ "$all_buckets_ok" = true ]; then
        print_success "All AWS configuration tests passed! ✅"
    else
        print_warning "Some tests failed. Please review the errors above."
    fi
    
    wait_for_user
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    clear
    print_header "Ntsamaela Environment Setup"
    
    echo -e "${CYAN}Welcome to the Ntsamaela environment setup!${NC}"
    echo ""
    echo "This script will help you:"
    echo "  1. Check required tools"
    echo "  2. Set up AWS account and IAM user"
    echo "  3. Create S3 buckets"
    echo "  4. Configure Rekognition"
    echo "  5. Create .env file"
    echo "  6. Test AWS configuration"
    echo ""
    echo -e "${YELLOW}This will take approximately 10-15 minutes.${NC}"
    echo ""
    
    read -p "Ready to start? (y/n): " ready
    if [ "$ready" != "y" ] && [ "$ready" != "Y" ]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    # Execute steps
    check_required_tools
    guide_aws_setup
    guide_iam_user_creation
    setup_s3_buckets
    setup_rekognition_collection
    create_env_file
    test_aws_configuration
    
    # Final summary
    print_header "Setup Complete! 🎉"
    
    echo -e "${GREEN}Your Ntsamaela environment has been set up successfully!${NC}"
    echo ""
    print_info "Next steps:"
    echo "  1. Review your .env file: $PROJECT_ROOT/.env"
    echo "  2. Install dependencies: npm install"
    echo "  3. Set up database: npm run migrate:dev"
    echo "  4. Start development server: npm run dev"
    echo ""
    print_warning "Remember:"
    echo "  - Never commit .env file to Git"
    echo "  - Keep your AWS credentials secure"
    echo "  - Review IAM permissions regularly"
    echo ""
    
    print_success "Happy coding! 🚀"
}

# Run main function
main

