#!/bin/bash

# Ntsamaela Production Deployment Script
# This script handles the complete deployment process for the Ntsamaela application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ntsamaela"
AWS_REGION="us-east-1"
ENVIRONMENT="prod"
DOCKER_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v aws >/dev/null 2>&1 || { log_error "AWS CLI is required but not installed. Aborting."; exit 1; }
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed. Aborting."; exit 1; }
    command -v terraform >/dev/null 2>&1 || { log_error "Terraform is required but not installed. Aborting."; exit 1; }
    command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed. Aborting."; exit 1; }
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Get AWS Account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "Using AWS Account ID: $AWS_ACCOUNT_ID"
    
    log_success "Prerequisites check completed"
}

setup_environment() {
    log_info "Setting up environment variables..."
    
    # Export environment variables
    export AWS_ACCOUNT_ID
    export AWS_REGION
    export PROJECT_NAME
    export ENVIRONMENT
    export DOCKER_REGISTRY
    
    # Create .env file for the application
    cat > .env.production << EOF
NODE_ENV=production
AWS_REGION=${AWS_REGION}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}
PROJECT_NAME=${PROJECT_NAME}
ENVIRONMENT=${ENVIRONMENT}
DOCKER_REGISTRY=${DOCKER_REGISTRY}
EOF
    
    log_success "Environment setup completed"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd infrastructure/aws
    
    # Initialize Terraform
    terraform init
    
    # Plan the deployment
    terraform plan -var="aws_region=${AWS_REGION}" -var="environment=${ENVIRONMENT}" -out=tfplan
    
    # Apply the plan
    terraform apply tfplan
    
    # Get outputs
    terraform output -json > ../../terraform-outputs.json
    
    cd ../..
    
    log_success "Infrastructure deployment completed"
}

build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${DOCKER_REGISTRY}
    
    # Build and push API image
    log_info "Building API image..."
    docker build -t ${PROJECT_NAME}-api:latest -f apps/api/Dockerfile .
    docker tag ${PROJECT_NAME}-api:latest ${DOCKER_REGISTRY}/${PROJECT_NAME}-api:latest
    docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-api:latest
    
    # Build and push Web image
    log_info "Building Web image..."
    docker build -t ${PROJECT_NAME}-web:latest -f apps/web/Dockerfile .
    docker tag ${PROJECT_NAME}-web:latest ${DOCKER_REGISTRY}/${PROJECT_NAME}-web:latest
    docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}-web:latest
    
    log_success "Docker images built and pushed successfully"
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    # Get database connection details from Terraform outputs
    DB_ENDPOINT=$(jq -r '.db_endpoint.value' terraform-outputs.json)
    DB_NAME=$(jq -r '.db_name.value' terraform-outputs.json)
    
    # Run migrations using a temporary container
    docker run --rm \
        -e DATABASE_URL="postgresql://ntsamaela_admin:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}" \
        ${DOCKER_REGISTRY}/${PROJECT_NAME}-api:latest \
        npm run migrate
    
    log_success "Database migrations completed"
}

deploy_application() {
    log_info "Deploying application to ECS..."
    
    # Update ECS services
    aws ecs update-service \
        --cluster ${PROJECT_NAME}-cluster \
        --service ${PROJECT_NAME}-api \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    aws ecs update-service \
        --cluster ${PROJECT_NAME}-cluster \
        --service ${PROJECT_NAME}-web \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    # Wait for deployment to complete
    log_info "Waiting for deployment to complete..."
    aws ecs wait services-stable \
        --cluster ${PROJECT_NAME}-cluster \
        --services ${PROJECT_NAME}-api ${PROJECT_NAME}-web \
        --region ${AWS_REGION}
    
    log_success "Application deployment completed"
}

run_health_checks() {
    log_info "Running health checks..."
    
    # Get ALB DNS name from Terraform outputs
    ALB_DNS=$(jq -r '.alb_dns_name.value' terraform-outputs.json)
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check API health
    if curl -f -s "https://api.${DOMAIN_NAME}/health" > /dev/null; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        exit 1
    fi
    
    # Check Web app
    if curl -f -s "https://${DOMAIN_NAME}" > /dev/null; then
        log_success "Web app health check passed"
    else
        log_error "Web app health check failed"
        exit 1
    fi
    
    log_success "All health checks passed"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f terraform-outputs.json
    rm -f .env.production
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting Ntsamaela production deployment..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-infrastructure)
                SKIP_INFRASTRUCTURE=true
                shift
                ;;
            --skip-migrations)
                SKIP_MIGRATIONS=true
                shift
                ;;
            --domain)
                DOMAIN_NAME="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-infrastructure    Skip infrastructure deployment"
                echo "  --skip-migrations        Skip database migrations"
                echo "  --domain DOMAIN          Set domain name"
                echo "  --help                   Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Set default domain if not provided
    if [ -z "$DOMAIN_NAME" ]; then
        DOMAIN_NAME="ntsamaela.com"
    fi
    
    # Run deployment steps
    check_prerequisites
    setup_environment
    
    if [ "$SKIP_INFRASTRUCTURE" != "true" ]; then
        deploy_infrastructure
    fi
    
    build_and_push_images
    
    if [ "$SKIP_MIGRATIONS" != "true" ]; then
        run_database_migrations
    fi
    
    deploy_application
    run_health_checks
    cleanup
    
    log_success "🎉 Ntsamaela production deployment completed successfully!"
    log_info "Application is now available at: https://${DOMAIN_NAME}"
    log_info "API is available at: https://api.${DOMAIN_NAME}"
    log_info "Admin panel is available at: https://admin.${DOMAIN_NAME}"
}

# Run main function
main "$@"
