# 🚀 Ntsamaela Deployment Runbook

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Migrations](#database-migrations)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring and Health Checks](#monitoring-and-health-checks)
9. [Troubleshooting](#troubleshooting)
10. [Emergency Procedures](#emergency-procedures)

---

## 🎯 Overview

This runbook provides comprehensive procedures for deploying the Ntsamaela application across different environments. The deployment process follows a CI/CD pipeline with automated testing, staging deployment, and production deployment with approval gates.

### Deployment Environments

- **Development**: Local development environment
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

### Key Components

- **API Service**: Node.js/Express backend
- **Web Application**: React frontend
- **Database**: PostgreSQL with Redis caching
- **Infrastructure**: AWS ECS, RDS, ElastiCache, CloudFront

---

## ✅ Pre-Deployment Checklist

### Code Quality Checks

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage above 90%
- [ ] Security scan completed
- [ ] Performance tests passing
- [ ] Code review approved
- [ ] Documentation updated

### Infrastructure Checks

- [ ] Terraform plan reviewed
- [ ] AWS resources available
- [ ] Database backups current
- [ ] SSL certificates valid
- [ ] DNS configuration correct

### Environment Preparation

- [ ] Environment variables configured
- [ ] Secrets updated in AWS Secrets Manager
- [ ] Database migrations tested
- [ ] Rollback plan prepared

---

## 🔄 CI/CD Pipeline

### Pipeline Stages

1. **Code Quality & Security**
   - ESLint and Prettier checks
   - TypeScript compilation
   - Security audit
   - CodeQL analysis

2. **Testing**
   - Unit tests (90%+ coverage)
   - Integration tests
   - E2E tests
   - Performance tests

3. **Build & Push**
   - Docker image building
   - ECR image push
   - Image vulnerability scanning

4. **Deployment**
   - Staging deployment (develop branch)
   - Production deployment (main branch)

### Pipeline Triggers

- **Push to `develop`**: Triggers staging deployment
- **Push to `main`**: Triggers production deployment
- **Pull Request**: Runs tests and quality checks

### Manual Triggers

```bash
# Trigger staging deployment
gh workflow run ci-cd-pipeline.yml --ref develop

# Trigger production deployment
gh workflow run ci-cd-pipeline.yml --ref main
```

---

## 🧪 Staging Deployment

### Automatic Staging Deployment

Staging deployments are automatically triggered when code is pushed to the `develop` branch.

### Manual Staging Deployment

```bash
# Deploy to staging
./scripts/deploy.sh --environment staging --domain staging.ntsamaela.com

# Run staging health checks
curl -f https://staging.ntsamaela.com/health
curl -f https://api-staging.ntsamaela.com/health
```

### Staging Environment Details

- **URL**: https://staging.ntsamaela.com
- **API URL**: https://api-staging.ntsamaela.com
- **Database**: Single-AZ RDS instance
- **ECS**: Single task per service
- **Resources**: Reduced CPU/memory for cost optimization

### Staging Validation

1. **Smoke Tests**
   ```bash
   npm run test:smoke -- --base-url=https://staging.ntsamaela.com
   ```

2. **API Tests**
   ```bash
   npm run test:api -- --base-url=https://api-staging.ntsamaela.com
   ```

3. **Performance Tests**
   ```bash
   npm run test:performance -- --base-url=https://staging.ntsamaela.com
   ```

---

## 🚀 Production Deployment

### Production Deployment Process

1. **Pre-deployment Backup**
   - RDS snapshot creation
   - S3 bucket backup
   - Configuration backup

2. **Deployment Execution**
   - ECS service updates
   - Database migrations
   - Health checks

3. **Post-deployment Validation**
   - Smoke tests
   - Performance monitoring
   - Error rate monitoring

### Manual Production Deployment

```bash
# Deploy to production
./scripts/deploy.sh --environment production --domain ntsamaela.com

# Verify deployment
curl -f https://ntsamaela.com/health
curl -f https://api.ntsamaela.com/health
```

### Production Environment Details

- **URL**: https://ntsamaela.com
- **API URL**: https://api.ntsamaela.com
- **Admin URL**: https://admin.ntsamaela.com
- **Database**: Multi-AZ RDS instance
- **ECS**: Auto-scaling (2-10 tasks)
- **Resources**: Full production resources

### Production Validation

1. **Health Checks**
   ```bash
   # API health
   curl -f https://api.ntsamaela.com/health
   
   # Web app health
   curl -f https://ntsamaela.com
   
   # Admin panel health
   curl -f https://admin.ntsamaela.com
   ```

2. **Performance Monitoring**
   ```bash
   # Check response times
   curl -w "@curl-format.txt" -o /dev/null -s https://api.ntsamaela.com/health
   ```

3. **Database Health**
   ```bash
   # Check database connections
   aws rds describe-db-instances --db-instance-identifier ntsamaela-db
   ```

---

## 🗄️ Database Migrations

### Migration Process

1. **Pre-migration Backup**
   - Automatic RDS snapshot
   - Schema backup
   - Data validation

2. **Migration Execution**
   - ECS task execution
   - Schema updates
   - Data transformations

3. **Post-migration Validation**
   - Schema validation
   - Data integrity checks
   - Performance verification

### Running Migrations

```bash
# Dry run migration
./scripts/migrate.sh --environment production --dry-run

# Execute migration
./scripts/migrate.sh --environment production

# Staging migration
./scripts/migrate.sh --environment staging
```

### Migration Safety Features

- **Automatic Backups**: Pre-migration snapshots
- **Rollback Capability**: Automatic rollback on failure
- **Health Checks**: Database health validation
- **Timeout Protection**: 5-minute migration timeout
- **Validation**: Schema version verification

### Migration Monitoring

```bash
# Monitor migration progress
aws logs tail /aws/ecs/ntsamaela/migration --follow

# Check migration status
aws ecs describe-tasks --cluster ntsamaela-cluster --tasks <task-arn>
```

---

## 🔄 Rollback Procedures

### Automatic Rollback

The system automatically triggers rollback in the following scenarios:

- Health check failures
- High error rates (>5%)
- Performance degradation
- Database connection issues

### Manual Rollback

```bash
# Rollback ECS services
./scripts/rollback.sh --environment production --previous-task-def <task-def-arn>

# Rollback database
./scripts/rollback.sh --environment production --snapshot-id <snapshot-id>

# Rollback specific service
./scripts/rollback.sh --environment production --service api
```

### Rollback Scenarios

1. **ECS Service Rollback**
   - Revert to previous task definition
   - Update service configuration
   - Verify service health

2. **Database Rollback**
   - Restore from RDS snapshot
   - Update connection strings
   - Validate data integrity

3. **Infrastructure Rollback**
   - Revert Terraform changes
   - Update DNS records
   - Restore configurations

### Rollback Validation

```bash
# Verify rollback success
curl -f https://api.ntsamaela.com/health
curl -f https://ntsamaela.com

# Check service status
aws ecs describe-services --cluster ntsamaela-cluster --services ntsamaela-api
```

---

## 📊 Monitoring and Health Checks

### Health Check Endpoints

- **API Health**: `GET /health`
- **Web Health**: `GET /`
- **Database Health**: `GET /health/db`
- **Redis Health**: `GET /health/redis`

### Monitoring Dashboards

1. **CloudWatch Dashboard**
   - ECS service metrics
   - RDS performance
   - ALB metrics
   - Redis metrics

2. **Application Metrics**
   - Response times
   - Error rates
   - Throughput
   - User activity

### Alerting

- **Critical Alerts**: Email + SMS
- **Warning Alerts**: Email only
- **Info Alerts**: Slack notifications

### Health Check Commands

```bash
# Check API health
curl -f https://api.ntsamaela.com/health

# Check database health
curl -f https://api.ntsamaela.com/health/db

# Check Redis health
curl -f https://api.ntsamaela.com/health/redis

# Check overall system health
curl -f https://api.ntsamaela.com/health/all
```

---

## 🔧 Troubleshooting

### Common Issues

1. **ECS Service Not Starting**
   ```bash
   # Check service events
   aws ecs describe-services --cluster ntsamaela-cluster --services ntsamaela-api
   
   # Check task logs
   aws logs tail /aws/ecs/ntsamaela/application --follow
   ```

2. **Database Connection Issues**
   ```bash
   # Check database status
   aws rds describe-db-instances --db-instance-identifier ntsamaela-db
   
   # Check security groups
   aws ec2 describe-security-groups --group-ids sg-xxxxx
   ```

3. **Load Balancer Issues**
   ```bash
   # Check target health
   aws elbv2 describe-target-health --target-group-arn <target-group-arn>
   
   # Check ALB status
   aws elbv2 describe-load-balancers --names ntsamaela-alb
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   aws acm describe-certificate --certificate-arn <cert-arn>
   
   # Check DNS validation
   aws route53 get-change --id <change-id>
   ```

### Debug Commands

```bash
# Check ECS cluster status
aws ecs describe-clusters --clusters ntsamaela-cluster

# Check running tasks
aws ecs list-tasks --cluster ntsamaela-cluster

# Check task definition
aws ecs describe-task-definition --task-definition ntsamaela-api

# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix /aws/ecs/ntsamaela
```

---

## 🚨 Emergency Procedures

### Critical Issues

1. **Service Down**
   - Check ECS service status
   - Verify load balancer health
   - Check database connectivity
   - Review recent deployments

2. **Database Issues**
   - Check RDS instance status
   - Verify backup availability
   - Check connection limits
   - Review slow query logs

3. **Security Incidents**
   - Check access logs
   - Verify SSL certificates
   - Review security groups
   - Check for unauthorized access

### Emergency Contacts

- **On-call Engineer**: +1-XXX-XXX-XXXX
- **DevOps Team**: devops@ntsamaela.com
- **Security Team**: security@ntsamaela.com
- **Management**: management@ntsamaela.com

### Emergency Rollback

```bash
# Emergency rollback to last known good state
./scripts/rollback.sh --environment production --force

# Emergency database restore
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ntsamaela-db-emergency \
  --db-snapshot-identifier ntsamaela-last-known-good
```

### Communication Plan

1. **Internal Notification**
   - Slack #incidents channel
   - Email to on-call team
   - SMS alerts for critical issues

2. **External Communication**
   - Status page updates
   - Customer notifications
   - Social media updates

---

## 📚 Additional Resources

### Documentation

- [Infrastructure Guide](infrastructure/README.md)
- [API Documentation](docs/api.md)
- [Database Schema](docs/database.md)
- [Security Guidelines](docs/security.md)

### Tools and Scripts

- [Deployment Script](scripts/deploy.sh)
- [Rollback Script](scripts/rollback.sh)
- [Migration Script](scripts/migrate.sh)
- [Health Check Script](scripts/health-check.sh)

### Monitoring Tools

- [CloudWatch Dashboard](https://console.aws.amazon.com/cloudwatch/home)
- [ECS Console](https://console.aws.amazon.com/ecs/home)
- [RDS Console](https://console.aws.amazon.com/rds/home)
- [Route53 Console](https://console.aws.amazon.com/route53/home)

---

## 📝 Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-01 | Initial deployment runbook |
| 1.1.0 | 2024-01-15 | Added rollback procedures |
| 1.2.0 | 2024-02-01 | Added migration automation |
| 1.3.0 | 2024-02-15 | Added emergency procedures |

---

**🎯 This runbook is a living document. Please update it as procedures change and new scenarios are discovered.**
