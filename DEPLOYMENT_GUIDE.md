# Ntsamaela Production Deployment Guide

This guide provides comprehensive instructions for deploying the Ntsamaela application to AWS production environment.

## 🏗️ Infrastructure Overview

The production infrastructure includes:

- **VPC with Public/Private/Database Subnets**
- **RDS PostgreSQL Database with Multi-AZ**
- **ElastiCache Redis for Caching**
- **ECS Fargate for Container Orchestration**
- **Application Load Balancer with SSL**
- **CloudFront CDN for Global Distribution**
- **S3 for File Storage**
- **Route53 for DNS Management**
- **CloudWatch for Monitoring and Logging**
- **CodePipeline for CI/CD**

## 📋 Prerequisites

### Required Tools
- [AWS CLI](https://aws.amazon.com/cli/) v2.0+
- [Terraform](https://www.terraform.io/) v1.0+
- [Docker](https://www.docker.com/) v20.0+
- [Node.js](https://nodejs.org/) v18.0+
- [npm](https://www.npmjs.com/) v8.0+

### AWS Account Setup
1. Create an AWS account
2. Configure AWS CLI with your credentials:
   ```bash
   aws configure
   ```
3. Ensure you have the following permissions:
   - AdministratorAccess (for initial setup)
   - Or create a custom policy with required permissions

### Domain Setup
1. Purchase a domain name (e.g., `ntsamaela.com`)
2. Have access to domain DNS management

## 🚀 Deployment Steps

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd ntsamaela

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables

Create a `.env.production` file:

```bash
# AWS Configuration
AWS_ACCOUNT_ID=your-aws-account-id
AWS_REGION=us-east-1
PROJECT_NAME=ntsamaela
ENVIRONMENT=prod

# Domain Configuration
DOMAIN_NAME=ntsamaela.com

# Database Configuration
DB_PASSWORD=your-secure-database-password

# JWT Secrets
JWT_SECRET=your-jwt-secret
ADMIN_JWT_SECRET=your-admin-jwt-secret

# External Services
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Monitoring
ALERT_EMAIL=admin@ntsamaela.com
ALERT_PHONE=+1234567890
```

### Step 3: Deploy Infrastructure

```bash
# Navigate to infrastructure directory
cd infrastructure/aws

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -var="aws_region=us-east-1" -var="environment=prod"

# Apply the infrastructure
terraform apply -var="aws_region=us-east-1" -var="environment=prod"

# Save outputs for later use
terraform output -json > ../../terraform-outputs.json
```

### Step 4: Configure DNS

1. Get the Route53 name servers from Terraform outputs:
   ```bash
   terraform output route53_name_servers
   ```

2. Update your domain's DNS settings to use these name servers

3. Wait for DNS propagation (can take up to 48 hours)

### Step 5: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push API image
docker build -t ntsamaela-api:latest -f apps/api/Dockerfile .
docker tag ntsamaela-api:latest $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ntsamaela-api:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ntsamaela-api:latest

# Build and push Web image
docker build -t ntsamaela-web:latest -f apps/web/Dockerfile .
docker tag ntsamaela-web:latest $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ntsamaela-web:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ntsamaela-web:latest
```

### Step 6: Run Database Migrations

```bash
# Get database endpoint from Terraform outputs
DB_ENDPOINT=$(jq -r '.db_endpoint.value' terraform-outputs.json)

# Run migrations
docker run --rm \
  -e DATABASE_URL="postgresql://ntsamaela_admin:${DB_PASSWORD}@${DB_ENDPOINT}:5432/ntsamaela" \
  $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ntsamaela-api:latest \
  npm run migrate
```

### Step 7: Deploy Application

```bash
# Update ECS services to use new images
aws ecs update-service \
  --cluster ntsamaela-cluster \
  --service ntsamaela-api \
  --force-new-deployment \
  --region us-east-1

aws ecs update-service \
  --cluster ntsamaela-cluster \
  --service ntsamaela-web \
  --force-new-deployment \
  --region us-east-1

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster ntsamaela-cluster \
  --services ntsamaela-api ntsamaela-web \
  --region us-east-1
```

### Step 8: Verify Deployment

```bash
# Check application health
curl -f https://api.ntsamaela.com/health
curl -f https://ntsamaela.com

# Check ECS services
aws ecs describe-services \
  --cluster ntsamaela-cluster \
  --services ntsamaela-api ntsamaela-web \
  --region us-east-1
```

## 🔧 Automated Deployment

### Using the Deployment Script

```bash
# Make the script executable
chmod +x scripts/deploy.sh

# Run the deployment
./scripts/deploy.sh --domain ntsamaela.com
```

### Using CI/CD Pipeline

1. Push code to your repository
2. The CodePipeline will automatically:
   - Build Docker images
   - Push to ECR
   - Deploy to ECS
   - Run health checks

## 📊 Monitoring and Maintenance

### CloudWatch Dashboard

Access the monitoring dashboard:
```bash
# Get dashboard URL from Terraform outputs
terraform output cloudwatch_dashboard_url
```

### Logs

View application logs:
```bash
# API logs
aws logs tail /aws/ecs/ntsamaela/application --follow --region us-east-1

# Database logs
aws logs tail /aws/rds/ntsamaela-db --follow --region us-east-1
```

### Alerts

Configured alerts will notify you via:
- Email (admin@ntsamaela.com)
- SMS (if configured)

### Backup

- **Database**: Automated daily backups with 7-day retention
- **S3**: Versioning enabled with lifecycle policies
- **Infrastructure**: Terraform state stored in S3 with versioning

## 🔒 Security Considerations

### SSL/TLS
- SSL certificates managed by AWS Certificate Manager
- Automatic renewal
- HTTPS enforced for all traffic

### Network Security
- VPC with private subnets for application and database
- Security groups with minimal required access
- NAT Gateway for outbound internet access

### Data Protection
- Database encryption at rest
- S3 bucket encryption
- Secrets stored in AWS Secrets Manager
- IAM roles with least privilege access

## 🚨 Troubleshooting

### Common Issues

1. **DNS Not Resolving**
   - Check Route53 name servers are configured
   - Wait for DNS propagation
   - Verify domain ownership

2. **SSL Certificate Issues**
   - Ensure domain validation is complete
   - Check certificate is in us-east-1 for CloudFront

3. **ECS Service Not Starting**
   - Check CloudWatch logs
   - Verify IAM roles and permissions
   - Check security group rules

4. **Database Connection Issues**
   - Verify security group allows port 5432
   - Check database endpoint and credentials
   - Ensure database is in available state

### Getting Help

1. Check CloudWatch logs for detailed error messages
2. Review ECS service events
3. Verify all Terraform resources are created successfully
4. Check AWS Service Health Dashboard

## 📈 Scaling

### Horizontal Scaling
- ECS Auto Scaling configured
- Scales based on CPU utilization (70% threshold)
- Min: 2 tasks, Max: 10 tasks per service

### Vertical Scaling
- Update ECS task definition with more CPU/memory
- Update RDS instance class for database
- Update ElastiCache node type for Redis

### Performance Optimization
- CloudFront CDN for global distribution
- Redis caching for frequently accessed data
- Database read replicas for read-heavy workloads
- S3 with lifecycle policies for cost optimization

## 💰 Cost Optimization

### Estimated Monthly Costs (us-east-1)
- **ECS Fargate**: ~$50-100 (2 tasks, 1 vCPU, 2GB RAM)
- **RDS PostgreSQL**: ~$30-50 (db.t3.micro, Multi-AZ)
- **ElastiCache Redis**: ~$15-25 (cache.t3.micro)
- **Application Load Balancer**: ~$20
- **CloudFront**: ~$5-15 (depending on traffic)
- **S3**: ~$5-10 (depending on storage)
- **Route53**: ~$1
- **CloudWatch**: ~$5-10

**Total Estimated Cost**: ~$130-230/month

### Cost Optimization Tips
1. Use Spot instances for non-critical workloads
2. Implement S3 lifecycle policies
3. Monitor and optimize CloudWatch log retention
4. Use Reserved Instances for predictable workloads
5. Implement auto-scaling to scale down during low usage

## 🔄 Updates and Maintenance

### Application Updates
1. Update code in repository
2. CI/CD pipeline automatically deploys
3. Or manually run deployment script

### Infrastructure Updates
1. Update Terraform configuration
2. Run `terraform plan` to review changes
3. Run `terraform apply` to apply changes

### Database Updates
1. Create database migration scripts
2. Run migrations through ECS task or manually
3. Test thoroughly in staging environment first

## 📞 Support

For deployment support:
- Check the troubleshooting section above
- Review AWS documentation
- Contact your DevOps team
- Create an issue in the repository

---

**🎉 Congratulations!** Your Ntsamaela application is now deployed to production with enterprise-grade infrastructure, monitoring, and security.
