# S3 Bucket for Website
resource "aws_s3_bucket" "website" {
  bucket = "ntsamaela-website-${var.environment}"
  
  tags = {
    Name        = "Ntsamaela Website"
    Environment = var.environment
    Project     = var.project_name
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Public Access Block (will be overridden by bucket policy)
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id
  
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 Bucket Policy for Public Read Access
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
  
  depends_on = [aws_s3_bucket_public_access_block.website]
}

# S3 Bucket Website Configuration
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id
  
  index_document {
    suffix = "index.html"
  }
  
  error_document {
    key = "index.html"
  }
}

# ACM Certificate for Domain (must be in us-east-1 for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ACM Certificate for Domain
resource "aws_acm_certificate" "website" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"
  
  subject_alternative_names = [
    "www.${var.domain_name}"
  ]
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = {
    Name        = "Ntsamaela Website SSL"
    Environment = var.environment
  }
}

# ACM Certificate Validation (DNS records)
resource "aws_acm_certificate_validation" "website" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.website.arn
  
  validation_record_fqdns = [
    for record in aws_route53_record.cert_validation : record.fqdn
  ]
  
  timeouts {
    create = "5m"
  }
}

# Route 53 records for certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.website.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.create_route53_zone ? aws_route53_zone.main[0].zone_id : data.aws_route53_zone.existing[0].zone_id
}

# Data source for existing Route 53 zone (if not creating new one)
data "aws_route53_zone" "existing" {
  count = var.create_route53_zone ? 0 : 1
  name  = var.domain_name
}

# CloudFront Origin Access Identity (OAI)
resource "aws_cloudfront_origin_access_identity" "website" {
  comment = "OAI for Ntsamaela website"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Use only North America and Europe
  
  aliases = [
    var.domain_name,
    "www.${var.domain_name}"
  ]
  
  origin {
    domain_name = aws_s3_bucket_website_configuration.website.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.website.bucket}"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.bucket}"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }
  
  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern     = "*.css"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.bucket}"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 31536000 # 1 year
    max_ttl                = 31536000
    compress               = true
  }
  
  ordered_cache_behavior {
    path_pattern     = "*.js"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.bucket}"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 31536000 # 1 year
    max_ttl                = 31536000
    compress               = true
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.website.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  depends_on = [
    aws_acm_certificate_validation.website
  ]
  
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
  
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  
  tags = {
    Name        = "Ntsamaela Website CDN"
    Environment = var.environment
  }
}

# Route 53 Hosted Zone (if using Route 53)
resource "aws_route53_zone" "main" {
  count = var.create_route53_zone ? 1 : 0
  name  = var.domain_name
  
  tags = {
    Name        = "Ntsamaela Domain"
    Environment = var.environment
  }
}

# Route 53 A Record for Domain
resource "aws_route53_record" "website" {
  count   = var.create_route53_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route 53 A Record for WWW
resource "aws_route53_record" "website_www" {
  count   = var.create_route53_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# Outputs
output "website_bucket_name" {
  value       = aws_s3_bucket.website.bucket
  description = "Name of the S3 bucket hosting the website"
}

output "website_url" {
  value       = "https://${var.domain_name}"
  description = "URL of the website"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.website.id
  description = "CloudFront distribution ID"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.website.domain_name
  description = "CloudFront distribution domain name"
}

