#!/bin/bash

# Ntsamaela Health Check Script
# This script performs comprehensive health checks on the deployed application

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
TIMEOUT=30
MAX_RETRIES=3

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

# Health check functions
check_http_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local retries=0
    
    log_info "Checking HTTP endpoint: $url"
    
    while [ $retries -lt $MAX_RETRIES ]; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
        
        if [ "$status_code" = "$expected_status" ]; then
            log_success "HTTP check passed: $url (Status: $status_code)"
            return 0
        fi
        
        log_warning "HTTP check failed: $url (Status: $status_code, Attempt: $((retries + 1))/$MAX_RETRIES)"
        ((retries++))
        sleep 5
    done
    
    log_error "HTTP check failed after $MAX_RETRIES attempts: $url"
    return 1
}

check_https_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    
    log_info "Checking HTTPS endpoint: $url"
    
    # Check SSL certificate
    local ssl_check=$(echo | openssl s_client -servername $(echo $url | cut -d'/' -f3) -connect $(echo $url | cut -d'/' -f3):443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [ -z "$ssl_check" ]; then
        log_error "SSL certificate check failed: $url"
        return 1
    fi
    
    log_success "SSL certificate check passed: $url"
    
    # Check HTTP endpoint
    check_http_endpoint "$url" "$expected_status"
}

check_database_health() {
    local env=$1
    
    log_info "Checking database health for environment: $env"
    
    # Get database endpoint
    local db_endpoint
    if [ "$env" = "staging" ]; then
        db_endpoint=$(aws rds describe-db-instances \
            --db-instance-identifier "${PROJECT_NAME}-staging-db" \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text \
            --region $AWS_REGION)
    else
        db_endpoint=$(aws rds describe-db-instances \
            --db-instance-identifier "${PROJECT_NAME}-db" \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text \
            --region $AWS_REGION)
    fi
    
    if [ -z "$db_endpoint" ] || [ "$db_endpoint" = "None" ]; then
        log_error "Database endpoint not found for environment: $env"
        return 1
    fi
    
    # Check database status
    local db_status=$(aws rds describe-db-instances \
        --db-instance-identifier "${PROJECT_NAME}-${env}-db" \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$db_status" != "available" ]; then
        log_error "Database is not available. Status: $db_status"
        return 1
    fi
    
    log_success "Database health check passed: $db_endpoint (Status: $db_status)"
    return 0
}

check_redis_health() {
    local env=$1
    
    log_info "Checking Redis health for environment: $env"
    
    # Get Redis endpoint
    local redis_endpoint
    if [ "$env" = "staging" ]; then
        redis_endpoint=$(aws elasticache describe-replication-groups \
            --replication-group-id "${PROJECT_NAME}-staging-redis" \
            --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' \
            --output text \
            --region $AWS_REGION)
    else
        redis_endpoint=$(aws elasticache describe-replication-groups \
            --replication-group-id "${PROJECT_NAME}-redis" \
            --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' \
            --output text \
            --region $AWS_REGION)
    fi
    
    if [ -z "$redis_endpoint" ] || [ "$redis_endpoint" = "None" ]; then
        log_error "Redis endpoint not found for environment: $env"
        return 1
    fi
    
    # Check Redis status
    local redis_status=$(aws elasticache describe-replication-groups \
        --replication-group-id "${PROJECT_NAME}-${env}-redis" \
        --query 'ReplicationGroups[0].Status' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$redis_status" != "available" ]; then
        log_error "Redis is not available. Status: $redis_status"
        return 1
    fi
    
    log_success "Redis health check passed: $redis_endpoint (Status: $redis_status)"
    return 0
}

check_ecs_service_health() {
    local env=$1
    local service_name=$2
    
    log_info "Checking ECS service health: $service_name"
    
    local cluster_name
    if [ "$env" = "staging" ]; then
        cluster_name="${PROJECT_NAME}-staging-cluster"
    else
        cluster_name="${PROJECT_NAME}-cluster"
    fi
    
    # Check service status
    local service_status=$(aws ecs describe-services \
        --cluster $cluster_name \
        --services $service_name \
        --query 'services[0].status' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$service_status" != "ACTIVE" ]; then
        log_error "ECS service is not active. Status: $service_status"
        return 1
    fi
    
    # Check running tasks
    local running_tasks=$(aws ecs describe-services \
        --cluster $cluster_name \
        --services $service_name \
        --query 'services[0].runningCount' \
        --output text \
        --region $AWS_REGION)
    
    local desired_tasks=$(aws ecs describe-services \
        --cluster $cluster_name \
        --services $service_name \
        --query 'services[0].desiredCount' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$running_tasks" -lt "$desired_tasks" ]; then
        log_error "ECS service has insufficient running tasks. Running: $running_tasks, Desired: $desired_tasks"
        return 1
    fi
    
    log_success "ECS service health check passed: $service_name (Running: $running_tasks/$desired_tasks)"
    return 0
}

check_load_balancer_health() {
    local env=$1
    
    log_info "Checking load balancer health for environment: $env"
    
    local alb_name
    if [ "$env" = "staging" ]; then
        alb_name="${PROJECT_NAME}-staging-alb"
    else
        alb_name="${PROJECT_NAME}-alb"
    fi
    
    # Check ALB status
    local alb_status=$(aws elbv2 describe-load-balancers \
        --names $alb_name \
        --query 'LoadBalancers[0].State.Code' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$alb_status" != "active" ]; then
        log_error "Load balancer is not active. Status: $alb_status"
        return 1
    fi
    
    # Check target group health
    local target_groups=$(aws elbv2 describe-target-groups \
        --load-balancer-arn $(aws elbv2 describe-load-balancers \
            --names $alb_name \
            --query 'LoadBalancers[0].LoadBalancerArn' \
            --output text \
            --region $AWS_REGION) \
        --query 'TargetGroups[].TargetGroupArn' \
        --output text \
        --region $AWS_REGION)
    
    for tg_arn in $target_groups; do
        local unhealthy_targets=$(aws elbv2 describe-target-health \
            --target-group-arn $tg_arn \
            --query 'TargetHealthDescriptions[?TargetHealth.State!=`healthy`]' \
            --output text \
            --region $AWS_REGION)
        
        if [ ! -z "$unhealthy_targets" ]; then
            log_warning "Unhealthy targets found in target group: $tg_arn"
        fi
    done
    
    log_success "Load balancer health check passed: $alb_name"
    return 0
}

check_cloudwatch_metrics() {
    local env=$1
    
    log_info "Checking CloudWatch metrics for environment: $env"
    
    local cluster_name
    if [ "$env" = "staging" ]; then
        cluster_name="${PROJECT_NAME}-staging-cluster"
    else
        cluster_name="${PROJECT_NAME}-cluster"
    fi
    
    # Check CPU utilization
    local cpu_utilization=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ECS \
        --metric-name CPUUtilization \
        --dimensions Name=ServiceName,Value="${PROJECT_NAME}-${env}-api" Name=ClusterName,Value=$cluster_name \
        --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 300 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$cpu_utilization" != "None" ] && [ $(echo "$cpu_utilization > 90" | bc -l) -eq 1 ]; then
        log_warning "High CPU utilization detected: ${cpu_utilization}%"
    fi
    
    # Check memory utilization
    local memory_utilization=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ECS \
        --metric-name MemoryUtilization \
        --dimensions Name=ServiceName,Value="${PROJECT_NAME}-${env}-api" Name=ClusterName,Value=$cluster_name \
        --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 300 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$memory_utilization" != "None" ] && [ $(echo "$memory_utilization > 90" | bc -l) -eq 1 ]; then
        log_warning "High memory utilization detected: ${memory_utilization}%"
    fi
    
    log_success "CloudWatch metrics check completed"
    return 0
}

check_ssl_certificates() {
    local domain=$1
    
    log_info "Checking SSL certificate for domain: $domain"
    
    # Check certificate expiration
    local cert_info=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [ -z "$cert_info" ]; then
        log_error "SSL certificate check failed for domain: $domain"
        return 1
    fi
    
    # Extract expiration date
    local not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
    local expiration_date=$(date -d "$not_after" +%s)
    local current_date=$(date +%s)
    local days_until_expiry=$(( (expiration_date - current_date) / 86400 ))
    
    if [ $days_until_expiry -lt 30 ]; then
        log_warning "SSL certificate expires in $days_until_expiry days for domain: $domain"
    fi
    
    log_success "SSL certificate check passed for domain: $domain (Expires in $days_until_expiry days)"
    return 0
}

# Main health check function
main() {
    log_info "Starting Ntsamaela health check..."
    
    # Parse command line arguments
    local env="prod"
    local check_type="all"
    local domain=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                env="$2"
                shift 2
                ;;
            --type)
                check_type="$2"
                shift 2
                ;;
            --domain)
                domain="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --environment ENV     Environment to check (prod/staging)"
                echo "  --type TYPE          Type of check (all/http/database/ecs/ssl)"
                echo "  --domain DOMAIN      Domain to check (for SSL checks)"
                echo "  --help               Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Set environment-specific variables
    if [ "$env" = "staging" ]; then
        API_URL="https://api-staging.ntsamaela.com"
        WEB_URL="https://staging.ntsamaela.com"
        ADMIN_URL="https://admin-staging.ntsamaela.com"
    else
        API_URL="https://api.ntsamaela.com"
        WEB_URL="https://ntsamaela.com"
        ADMIN_URL="https://admin.ntsamaela.com"
    fi
    
    log_info "Environment: $env"
    log_info "Check type: $check_type"
    
    local exit_code=0
    
    # Run health checks based on type
    case $check_type in
        "all")
            # HTTP checks
            check_https_endpoint "$API_URL/health" || exit_code=1
            check_https_endpoint "$WEB_URL" || exit_code=1
            check_https_endpoint "$ADMIN_URL" || exit_code=1
            
            # Database checks
            check_database_health "$env" || exit_code=1
            check_redis_health "$env" || exit_code=1
            
            # ECS checks
            check_ecs_service_health "$env" "${PROJECT_NAME}-${env}-api" || exit_code=1
            check_ecs_service_health "$env" "${PROJECT_NAME}-${env}-web" || exit_code=1
            
            # Load balancer checks
            check_load_balancer_health "$env" || exit_code=1
            
            # SSL checks
            check_ssl_certificates "api.ntsamaela.com" || exit_code=1
            check_ssl_certificates "ntsamaela.com" || exit_code=1
            
            # CloudWatch metrics
            check_cloudwatch_metrics "$env" || exit_code=1
            ;;
        "http")
            check_https_endpoint "$API_URL/health" || exit_code=1
            check_https_endpoint "$WEB_URL" || exit_code=1
            check_https_endpoint "$ADMIN_URL" || exit_code=1
            ;;
        "database")
            check_database_health "$env" || exit_code=1
            check_redis_health "$env" || exit_code=1
            ;;
        "ecs")
            check_ecs_service_health "$env" "${PROJECT_NAME}-${env}-api" || exit_code=1
            check_ecs_service_health "$env" "${PROJECT_NAME}-${env}-web" || exit_code=1
            ;;
        "ssl")
            if [ -z "$domain" ]; then
                log_error "Domain must be specified for SSL checks"
                exit 1
            fi
            check_ssl_certificates "$domain" || exit_code=1
            ;;
        *)
            log_error "Unknown check type: $check_type"
            exit 1
            ;;
    esac
    
    # Summary
    if [ $exit_code -eq 0 ]; then
        log_success "🎉 All health checks passed!"
    else
        log_error "❌ Some health checks failed!"
    fi
    
    exit $exit_code
}

# Run main function
main "$@"
