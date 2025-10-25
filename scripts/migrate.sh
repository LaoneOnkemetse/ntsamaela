#!/bin/bash

# Ntsamaela Database Migration Script
# This script handles automated database migrations with safety checks and rollback

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
MIGRATION_TIMEOUT=300  # 5 minutes

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

# Database functions
get_database_url() {
    local env=$1
    
    if [ "$env" = "staging" ]; then
        # Get staging database URL from Secrets Manager
        aws secretsmanager get-secret-value \
            --secret-id "${PROJECT_NAME}-staging-db-url" \
            --query 'SecretString' \
            --output text \
            --region $AWS_REGION
    else
        # Get production database URL from Secrets Manager
        aws secretsmanager get-secret-value \
            --secret-id "${PROJECT_NAME}-db-url" \
            --query 'SecretString' \
            --output text \
            --region $AWS_REGION
    fi
}

create_database_backup() {
    local env=$1
    local backup_name="${PROJECT_NAME}-${env}-pre-migration-$(date +%Y%m%d-%H%M%S)"
    
    log_info "Creating database backup: $backup_name"
    
    if [ "$env" = "staging" ]; then
        aws rds create-db-snapshot \
            --db-instance-identifier "${PROJECT_NAME}-staging-db" \
            --db-snapshot-identifier "$backup_name" \
            --region $AWS_REGION
    else
        aws rds create-db-snapshot \
            --db-instance-identifier "${PROJECT_NAME}-db" \
            --db-snapshot-identifier "$backup_name" \
            --region $AWS_REGION
    fi
    
    log_success "Database backup created: $backup_name"
    echo "$backup_name"
}

wait_for_backup() {
    local backup_name=$1
    local env=$2
    
    log_info "Waiting for backup to complete: $backup_name"
    
    if [ "$env" = "staging" ]; then
        aws rds wait db-snapshot-completed \
            --db-snapshot-identifier "$backup_name" \
            --region $AWS_REGION
    else
        aws rds wait db-snapshot-completed \
            --db-snapshot-identifier "$backup_name" \
            --region $AWS_REGION
    fi
    
    log_success "Backup completed: $backup_name"
}

check_database_health() {
    local database_url=$1
    
    log_info "Checking database health..."
    
    # Test database connection
    if ! psql "$database_url" -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "Database connection failed"
        return 1
    fi
    
    # Check for active connections
    local active_connections=$(psql "$database_url" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ')
    
    if [ "$active_connections" -gt 50 ]; then
        log_warning "High number of active connections: $active_connections"
    fi
    
    log_success "Database health check passed"
    return 0
}

run_migrations() {
    local database_url=$1
    local migration_dir=$2
    local dry_run=$3
    
    log_info "Running database migrations..."
    
    if [ "$dry_run" = "true" ]; then
        log_info "DRY RUN: Would execute migrations in $migration_dir"
        # List pending migrations without executing
        if [ -d "$migration_dir" ]; then
            find "$migration_dir" -name "*.sql" -type f | sort
        fi
        return 0
    fi
    
    # Set migration timeout
    export PGPASSWORD=$(echo "$database_url" | sed -n 's/.*:\([^@]*\)@.*/\1/p')
    
    # Run migrations with timeout
    timeout $MIGRATION_TIMEOUT psql "$database_url" -f "$migration_dir/migrate.sql" || {
        log_error "Migration failed or timed out after $MIGRATION_TIMEOUT seconds"
        return 1
    }
    
    log_success "Migrations completed successfully"
}

validate_migrations() {
    local database_url=$1
    local expected_schema_version=$2
    
    log_info "Validating migrations..."
    
    # Check if schema version table exists
    if ! psql "$database_url" -c "SELECT * FROM schema_migrations LIMIT 1;" > /dev/null 2>&1; then
        log_error "Schema migrations table not found"
        return 1
    fi
    
    # Get current schema version
    local current_version=$(psql "$database_url" -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | tr -d ' ')
    
    if [ "$current_version" != "$expected_schema_version" ]; then
        log_error "Schema version mismatch. Expected: $expected_schema_version, Current: $current_version"
        return 1
    fi
    
    log_success "Migration validation passed. Current version: $current_version"
    return 0
}

rollback_migration() {
    local database_url=$1
    local backup_name=$2
    local env=$3
    
    log_error "Migration failed. Initiating rollback..."
    
    # Restore from backup
    local rollback_instance="${PROJECT_NAME}-${env}-rollback-$(date +%Y%m%d-%H%M%S)"
    
    log_info "Restoring database from backup: $backup_name"
    
    if [ "$env" = "staging" ]; then
        aws rds restore-db-instance-from-db-snapshot \
            --db-instance-identifier "$rollback_instance" \
            --db-snapshot-identifier "$backup_name" \
            --region $AWS_REGION
    else
        aws rds restore-db-instance-from-db-snapshot \
            --db-instance-identifier "$rollback_instance" \
            --db-snapshot-identifier "$backup_name" \
            --region $AWS_REGION
    fi
    
    log_info "Database restore initiated. This may take several minutes..."
    
    # Wait for restore to complete
    aws rds wait db-instance-available \
        --db-instance-identifier "$rollback_instance" \
        --region $AWS_REGION
    
    log_success "Database rollback completed: $rollback_instance"
    echo "$rollback_instance"
}

# ECS migration task functions
run_ecs_migration() {
    local env=$1
    local migration_dir=$2
    local dry_run=$3
    
    log_info "Running migration via ECS task..."
    
    local cluster_name
    local task_definition
    
    if [ "$env" = "staging" ]; then
        cluster_name="${PROJECT_NAME}-staging-cluster"
        task_definition="${PROJECT_NAME}-migration-staging"
    else
        cluster_name="${PROJECT_NAME}-cluster"
        task_definition="${PROJECT_NAME}-migration-prod"
    fi
    
    # Get subnet and security group IDs
    local subnet_id=$(aws ec2 describe-subnets \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-${env}-private-subnet-1" \
        --query 'Subnets[0].SubnetId' \
        --output text \
        --region $AWS_REGION)
    
    local security_group_id=$(aws ec2 describe-security-groups \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-app-sg" \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $AWS_REGION)
    
    # Run migration task
    local task_arn=$(aws ecs run-task \
        --cluster $cluster_name \
        --task-definition $task_definition \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$subnet_id],securityGroups=[$security_group_id],assignPublicIp=ENABLED}" \
        --overrides "{
            \"containerOverrides\": [{
                \"name\": \"migration\",
                \"command\": [\"npm\", \"run\", \"migrate\"],
                \"environment\": [
                    {\"name\": \"NODE_ENV\", \"value\": \"$env\"},
                    {\"name\": \"MIGRATION_DIR\", \"value\": \"$migration_dir\"},
                    {\"name\": \"DRY_RUN\", \"value\": \"$dry_run\"}
                ]
            }]
        }" \
        --query 'tasks[0].taskArn' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Migration task started: $task_arn"
    
    # Wait for task to complete
    aws ecs wait tasks-stopped \
        --cluster $cluster_name \
        --tasks $task_arn \
        --region $AWS_REGION
    
    # Check task exit code
    local exit_code=$(aws ecs describe-tasks \
        --cluster $cluster_name \
        --tasks $task_arn \
        --query 'tasks[0].containers[0].exitCode' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$exit_code" = "0" ]; then
        log_success "Migration task completed successfully"
        return 0
    else
        log_error "Migration task failed with exit code: $exit_code"
        return 1
    fi
}

# Main migration function
main() {
    log_info "Starting Ntsamaela database migration..."
    
    # Parse command line arguments
    local env="prod"
    local dry_run="false"
    local migration_dir="migrations"
    local skip_backup="false"
    local force="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                env="$2"
                shift 2
                ;;
            --dry-run)
                dry_run="true"
                shift
                ;;
            --migration-dir)
                migration_dir="$2"
                shift 2
                ;;
            --skip-backup)
                skip_backup="true"
                shift
                ;;
            --force)
                force="true"
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --environment ENV     Environment to migrate (prod/staging)"
                echo "  --dry-run            Show what would be migrated without executing"
                echo "  --migration-dir DIR  Directory containing migration files"
                echo "  --skip-backup        Skip creating database backup"
                echo "  --force              Force migration without confirmation"
                echo "  --help               Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    log_info "Environment: $env"
    log_info "Migration directory: $migration_dir"
    log_info "Dry run: $dry_run"
    
    # Get database URL
    local database_url
    database_url=$(get_database_url "$env")
    
    if [ -z "$database_url" ]; then
        log_error "Failed to get database URL for environment: $env"
        exit 1
    fi
    
    # Check database health
    if ! check_database_health "$database_url"; then
        log_error "Database health check failed"
        exit 1
    fi
    
    # Create backup unless skipped
    local backup_name=""
    if [ "$skip_backup" = "false" ] && [ "$dry_run" = "false" ]; then
        backup_name=$(create_database_backup "$env")
        wait_for_backup "$backup_name" "$env"
    fi
    
    # Confirm migration unless forced
    if [ "$force" = "false" ] && [ "$dry_run" = "false" ]; then
        echo -n "Are you sure you want to run migrations on $env environment? (y/N): "
        read -r confirmation
        if [ "$confirmation" != "y" ] && [ "$confirmation" != "Y" ]; then
            log_info "Migration cancelled by user"
            exit 0
        fi
    fi
    
    # Run migrations
    if ! run_migrations "$database_url" "$migration_dir" "$dry_run"; then
        if [ "$skip_backup" = "false" ] && [ ! -z "$backup_name" ]; then
            rollback_migration "$database_url" "$backup_name" "$env"
        fi
        exit 1
    fi
    
    # Validate migrations
    if [ "$dry_run" = "false" ]; then
        local expected_version=$(date +%Y%m%d%H%M%S)
        if ! validate_migrations "$database_url" "$expected_version"; then
            log_error "Migration validation failed"
            if [ "$skip_backup" = "false" ] && [ ! -z "$backup_name" ]; then
                rollback_migration "$database_url" "$backup_name" "$env"
            fi
            exit 1
        fi
    fi
    
    # Final health check
    if [ "$dry_run" = "false" ]; then
        if ! check_database_health "$database_url"; then
            log_error "Post-migration health check failed"
            if [ "$skip_backup" = "false" ] && [ ! -z "$backup_name" ]; then
                rollback_migration "$database_url" "$backup_name" "$env"
            fi
            exit 1
        fi
    fi
    
    log_success "🎉 Database migration completed successfully!"
    
    if [ "$dry_run" = "false" ]; then
        log_info "Backup created: $backup_name"
        log_info "Environment: $env"
        log_info "Migration directory: $migration_dir"
    fi
    
    # Send notification
    if [ ! -z "$SLACK_WEBHOOK_URL" ] && [ "$dry_run" = "false" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ Database migration completed successfully for $env environment. Backup: $backup_name\"}" \
            $SLACK_WEBHOOK_URL
    fi
}

# Run main function
main "$@"
