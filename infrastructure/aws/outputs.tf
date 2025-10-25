# Terraform Outputs for Ntsamaela Infrastructure

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.ntsamaela_vpc.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.ntsamaela_vpc.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public_subnets[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private_subnets[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database_subnets[*].id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.ntsamaela_igw.id
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = aws_nat_gateway.nat_gateway[*].id
}

# Database Outputs
output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.ntsamaela_db.endpoint
  sensitive   = true
}

output "db_port" {
  description = "RDS instance port"
  value       = aws_db_instance.ntsamaela_db.port
}

output "db_name" {
  description = "RDS database name"
  value       = aws_db_instance.ntsamaela_db.db_name
}

output "db_username" {
  description = "RDS instance root username"
  value       = aws_db_instance.ntsamaela_db.username
}

output "db_password_secret_arn" {
  description = "ARN of the database password secret"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.ntsamaela_redis.primary_endpoint_address
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_replication_group.ntsamaela_redis.port
}

# ECS Outputs
output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.ntsamaela_cluster.id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.ntsamaela_cluster.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.ntsamaela_cluster.arn
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.ntsamaela_alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.ntsamaela_alb.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.ntsamaela_alb.arn
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.ntsamaela_cdn.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.ntsamaela_cdn.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Hosted zone ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.ntsamaela_cdn.hosted_zone_id
}

# S3 Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket for assets"
  value       = aws_s3_bucket.ntsamaela_assets.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for assets"
  value       = aws_s3_bucket.ntsamaela_assets.arn
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket for assets"
  value       = aws_s3_bucket.ntsamaela_assets.bucket_domain_name
}

# ECR Outputs
output "ecr_api_repository_url" {
  description = "URL of the ECR repository for API"
  value       = aws_ecr_repository.ntsamaela_api.repository_url
}

output "ecr_web_repository_url" {
  description = "URL of the ECR repository for Web App"
  value       = aws_ecr_repository.ntsamaela_web.repository_url
}

# Route53 Outputs
output "route53_zone_id" {
  description = "Zone ID of the Route53 hosted zone"
  value       = aws_route53_zone.ntsamaela_zone.zone_id
}

output "route53_name_servers" {
  description = "Name servers of the Route53 hosted zone"
  value       = aws_route53_zone.ntsamaela_zone.name_servers
}

# SSL Certificate Outputs
output "ssl_certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = aws_acm_certificate_validation.ntsamaela_cert_validation.certificate_arn
}

output "ssl_certificate_arn_cloudfront" {
  description = "ARN of the SSL certificate for CloudFront"
  value       = aws_acm_certificate_validation.ntsamaela_cert_validation_cloudfront.certificate_arn
}

# Monitoring Outputs
output "cloudwatch_log_groups" {
  description = "CloudWatch log groups"
  value = {
    app_logs    = aws_cloudwatch_log_group.ntsamaela_app_logs.name
    api_logs    = aws_cloudwatch_log_group.ntsamaela_api_logs.name
    nginx_logs  = aws_cloudwatch_log_group.ntsamaela_nginx_logs.name
    redis_logs  = aws_cloudwatch_log_group.redis_slow_log.name
  }
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.ntsamaela_alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.ntsamaela_dashboard.dashboard_name}"
}

# Security Group Outputs
output "web_security_group_id" {
  description = "ID of the web security group"
  value       = aws_security_group.web_sg.id
}

output "app_security_group_id" {
  description = "ID of the app security group"
  value       = aws_security_group.app_sg.id
}

output "database_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.database_sg.id
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis_sg.id
}

# Application URLs
output "application_urls" {
  description = "URLs of the deployed application"
  value = {
    main_app    = "https://${var.domain_name}"
    api         = "https://api.${var.domain_name}"
    admin       = "https://admin.${var.domain_name}"
    www         = "https://www.${var.domain_name}"
  }
}

# Deployment Information
output "deployment_info" {
  description = "Information about the deployment"
  value = {
    environment     = var.environment
    aws_region      = var.aws_region
    project_name    = var.project_name
    deployment_date = timestamp()
  }
}
