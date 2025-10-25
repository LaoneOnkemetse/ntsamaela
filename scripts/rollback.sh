#!/bin/bash

# Ntsamaela Rollback Script
# This script handles rollback procedures for failed deployments

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

# Rollback functions
rollback_ecs_service() {
    local service_name=$1
    local cluster_name=$2
    local previous_task_definition=$3
    
    log_info "Rolling back ECS service: $service_name"
    
    # Get current task definition
    local current_task_def=$(aws ecs describe-services \
        --cluster $cluster_name \
        --services $service_name \
        --query 'services[0].taskDefinition' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Current task definition: $current_task_def"
    log_info "Rolling back to: $previous_task_definition"
    
    # Update service to previous task definition
    aws ecs update-service \
        --cluster $cluster_name \
        --service $service_name \
        --task-definition $previous_task_definition \
        --region $AWS_REGION
    
    # Wait for rollback to complete
    log_info "Waiting for rollback to complete..."
    aws ecs wait services-stable \
        --cluster $cluster_name \
        --services $service_name \
        --region $AWS_REGION
    
    log_success "ECS service rollback completed: $service_name"
}

rollback_database() {
    local snapshot_id=$1
    
    log_info "Rolling back database to snapshot: $snapshot_id"
    
    # Get current database instance
    local db_instance=$(aws rds describe-db-instances \
        --db-instance-identifier ${PROJECT_NAME}-db \
        --query 'DBInstances[0]' \
        --region $AWS_REGION)
    
    if [ -z "$db_instance" ]; then
        log_error "Database instance not found"
        return 1
    fi
    
    # Restore from snapshot
    aws rds restore-db-instance-from-db-snapshot \
        --db-instance-identifier ${PROJECT_NAME}-db-rollback \
        --db-snapshot-identifier $snapshot_id \
        --region $AWS_REGION
    
    log_info "Database restore initiated. This may take several minutes..."
    
    # Wait for restore to complete
    aws rds wait db-instance-available \
        --db-instance-identifier ${PROJECT_NAME}-db-rollback \
        --region $AWS_REGION
    
    log_success "Database rollback completed"
}

rollback_cloudfront() {
    local distribution_id=$1
    local previous_config_id=$2
    
    log_info "Rolling back CloudFront distribution: $distribution_id"
    
    # Get previous configuration
    local previous_config=$(aws cloudfront get-distribution-config \
        --id $distribution_id \
        --query 'DistributionConfig' \
        --region $AWS_REGION)
    
    # Update distribution with previous configuration
    aws cloudfront update-distribution \
        --id $distribution_id \
        --distribution-config "$previous_config" \
        --if-match $previous_config_id \
        --region $AWS_REGION
    
    log_success "CloudFront rollback completed"
}

rollback_alb() {
    local target_group_arn=$1
    local previous_targets=$2
    
    log_info "Rolling back Application Load Balancer targets"
    
    # Deregister current targets
    local current_targets=$(aws elbv2 describe-target-health \
        --target-group-arn $target_group_arn \
        --query 'TargetHealthDescriptions[].Target.Id' \
        --output text \
        --region $AWS_REGION)
    
    if [ ! -z "$current_targets" ]; then
        aws elbv2 deregister-targets \
            --target-group-arn $target_group_arn \
            --targets Id=$current_targets \
            --region $AWS_REGION
    fi
    
    # Register previous targets
    if [ ! -z "$previous_targets" ]; then
        aws elbv2 register-targets \
            --target-group-arn $target_group_arn \
            --targets Id=$previous_targets \
            --region $AWS_REGION
    fi
    
    log_success "ALB rollback completed"
}

rollback_s3() {
    local bucket_name=$1
    local backup_prefix=$2
    
    log_info "Rolling back S3 bucket: $bucket_name"
    
    # List objects in backup
    local backup_objects=$(aws s3api list-objects-v2 \
        --bucket $bucket_name \
        --prefix $backup_prefix \
        --query 'Contents[].Key' \
        --output text \
        --region $AWS_REGION)
    
    if [ ! -z "$backup_objects" ]; then
        # Restore objects from backup
        for object in $backup_objects; do
            local restore_key=$(echo $object | sed "s/$backup_prefix\///")
            aws s3 cp s3://$bucket_name/$object s3://$bucket_name/$restore_key \
                --region $AWS_REGION
        done
    fi
    
    log_success "S3 rollback completed"
}

rollback_route53() {
    local zone_id=$1
    local record_name=$2
    local previous_value=$3
    
    log_info "Rolling back Route53 record: $record_name"
    
    # Update record with previous value
    aws route53 change-resource-record-sets \
        --hosted-zone-id $zone_id \
        --change-batch "{
            \"Changes\": [{
                \"Action\": \"UPSERT\",
                \"ResourceRecordSet\": {
                    \"Name\": \"$record_name\",
                    \"Type\": \"A\",
                    \"AliasTarget\": {
                        \"DNSName\": \"$previous_value\",
                        \"EvaluateTargetHealth\": true,
                        \"HostedZoneId\": \"Z35SXDOTRQ7X7K\"
                    }
                }
            }]
        }" \
        --region $AWS_REGION
    
    log_success "Route53 rollback completed"
}

# Health check functions
check_service_health() {
    local service_url=$1
    local max_attempts=30
    local attempt=1
    
    log_info "Checking service health: $service_url"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$service_url" > /dev/null; then
            log_success "Service is healthy: $service_url"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Service health check failed after $max_attempts attempts"
    return 1
}

# Main rollback function
main() {
    log_info "Starting Ntsamaela rollback procedure..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --service)
                SERVICE="$2"
                shift 2
                ;;
            --snapshot-id)
                SNAPSHOT_ID="$2"
                shift 2
                ;;
            --previous-task-def)
                PREVIOUS_TASK_DEF="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --environment ENV     Environment to rollback (prod/staging)"
                echo "  --service SERVICE     Specific service to rollback"
                echo "  --snapshot-id ID      Database snapshot ID for rollback"
                echo "  --previous-task-def   Previous ECS task definition"
                echo "  --help                Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Set environment-specific variables
    if [ "$ENVIRONMENT" = "staging" ]; then
        ECS_CLUSTER="${PROJECT_NAME}-staging-cluster"
        ECS_SERVICE_API="${PROJECT_NAME}-staging-api"
        ECS_SERVICE_WEB="${PROJECT_NAME}-staging-web"
        DOMAIN_NAME="staging.ntsamaela.com"
        API_DOMAIN="api-staging.ntsamaela.com"
    else
        ECS_CLUSTER="${PROJECT_NAME}-cluster"
        ECS_SERVICE_API="${PROJECT_NAME}-api"
        ECS_SERVICE_WEB="${PROJECT_NAME}-web"
        DOMAIN_NAME="ntsamaela.com"
        API_DOMAIN="api.ntsamaela.com"
    fi
    
    log_info "Rolling back environment: $ENVIRONMENT"
    log_info "ECS Cluster: $ECS_CLUSTER"
    log_info "Domain: $DOMAIN_NAME"
    
    # Check if we have the necessary information for rollback
    if [ -z "$PREVIOUS_TASK_DEF" ] && [ -z "$SNAPSHOT_ID" ]; then
        log_error "Either --previous-task-def or --snapshot-id must be provided"
        exit 1
    fi
    
    # Rollback ECS services
    if [ ! -z "$PREVIOUS_TASK_DEF" ]; then
        if [ "$SERVICE" = "api" ] || [ -z "$SERVICE" ]; then
            rollback_ecs_service $ECS_SERVICE_API $ECS_CLUSTER $PREVIOUS_TASK_DEF
        fi
        
        if [ "$SERVICE" = "web" ] || [ -z "$SERVICE" ]; then
            rollback_ecs_service $ECS_SERVICE_WEB $ECS_CLUSTER $PREVIOUS_TASK_DEF
        fi
    fi
    
    # Rollback database if snapshot provided
    if [ ! -z "$SNAPSHOT_ID" ]; then
        rollback_database $SNAPSHOT_ID
    fi
    
    # Wait for services to stabilize
    log_info "Waiting for services to stabilize..."
    sleep 30
    
    # Run health checks
    log_info "Running health checks..."
    
    if [ "$SERVICE" = "api" ] || [ -z "$SERVICE" ]; then
        check_service_health "https://$API_DOMAIN/health"
    fi
    
    if [ "$SERVICE" = "web" ] || [ -z "$SERVICE" ]; then
        check_service_health "https://$DOMAIN_NAME"
    fi
    
    # Verify rollback success
    log_info "Verifying rollback success..."
    
    # Check ECS service status
    local api_status=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $ECS_SERVICE_API \
        --query 'services[0].deployments[0].status' \
        --output text \
        --region $AWS_REGION)
    
    local web_status=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $ECS_SERVICE_WEB \
        --query 'services[0].deployments[0].status' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$api_status" = "PRIMARY" ] && [ "$web_status" = "PRIMARY" ]; then
        log_success "🎉 Rollback completed successfully!"
        log_info "Services are now running with previous configuration"
        log_info "API: https://$API_DOMAIN"
        log_info "Web: https://$DOMAIN_NAME"
    else
        log_error "Rollback verification failed"
        log_error "API Status: $api_status"
        log_error "Web Status: $web_status"
        exit 1
    fi
    
    # Send notification
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Rollback completed for $ENVIRONMENT environment. Services are now running with previous configuration.\"}" \
            $SLACK_WEBHOOK_URL
    fi
}

# Run main function
main "$@"
