# CloudFront CDN Configuration for Ntsamaela

# S3 Bucket for static assets and images
resource "aws_s3_bucket" "ntsamaela_assets" {
  bucket = "${var.s3_bucket_name}-${var.environment}"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-assets"
  })
}

resource "aws_s3_bucket_versioning" "ntsamaela_assets_versioning" {
  bucket = aws_s3_bucket.ntsamaela_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "ntsamaela_assets_encryption" {
  bucket = aws_s3_bucket.ntsamaela_assets.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "ntsamaela_assets_pab" {
  bucket = aws_s3_bucket.ntsamaela_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "ntsamaela_assets_lifecycle" {
  bucket = aws_s3_bucket.ntsamaela_assets.id

  rule {
    id     = "image_optimization"
    status = "Enabled"

    # Transition to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Transition to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete old versions after 365 days
    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "ntsamaela_assets_policy" {
  bucket = aws_s3_bucket.ntsamaela_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.ntsamaela_assets.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.ntsamaela_cdn.arn
          }
        }
      }
    ]
  })
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "ntsamaela_oac" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for Ntsamaela S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "ntsamaela_cdn" {
  origin {
    domain_name              = aws_s3_bucket.ntsamaela_assets.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.ntsamaela_oac.id
    origin_id                = "S3-${aws_s3_bucket.ntsamaela_assets.bucket}"
  }

  # Custom error pages
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

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for Ntsamaela"
  default_root_object = "index.html"

  # Aliases
  aliases = [var.domain_name, "www.${var.domain_name}"]

  # SSL Certificate
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.ntsamaela_cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.ntsamaela_assets.bucket}"

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

  # Cache behavior for images
  ordered_cache_behavior {
    path_pattern     = "/images/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.ntsamaela_assets.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400  # 1 day
    max_ttl                = 31536000  # 1 year
    compress               = true
  }

  # Cache behavior for API responses (shorter cache)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.ntsamaela_assets.bucket}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "CloudFront-Forwarded-Proto"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  # Price class
  price_class = var.cloudfront_price_class

  # Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Logging
  logging_config {
    bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
    prefix          = "cloudfront-logs/"
    include_cookies = false
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cdn"
  })

  depends_on = [aws_s3_bucket_policy.ntsamaela_assets_policy]
}

# S3 Bucket for CloudFront logs
resource "aws_s3_bucket" "cloudfront_logs" {
  bucket = "${var.s3_bucket_name}-cloudfront-logs-${var.environment}"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cloudfront-logs"
  })
}

resource "aws_s3_bucket_public_access_block" "cloudfront_logs_pab" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudfront_logs_lifecycle" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  rule {
    id     = "log_retention"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}

# Lambda@Edge for image optimization
resource "aws_lambda_function" "image_optimizer" {
  filename         = "lambda/image-optimizer.zip"
  function_name    = "${var.project_name}-image-optimizer"
  role            = aws_iam_role.lambda_edge_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 128

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-image-optimizer"
  })
}

# IAM Role for Lambda@Edge
resource "aws_iam_role" "lambda_edge_role" {
  name = "${var.project_name}-lambda-edge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-lambda-edge-role"
  })
}

resource "aws_iam_role_policy_attachment" "lambda_edge_policy" {
  role       = aws_iam_role.lambda_edge_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# CloudFront Function for request manipulation
resource "aws_cloudfront_function" "request_manipulator" {
  name    = "${var.project_name}-request-manipulator"
  runtime = "cloudfront-js-1.0"
  comment = "Manipulate requests for image optimization"
  publish = true
  code    = file("${path.module}/cloudfront-functions/request-manipulator.js")
}

# CloudFront Function for response manipulation
resource "aws_cloudfront_function" "response_manipulator" {
  name    = "${var.project_name}-response-manipulator"
  runtime = "cloudfront-js-1.0"
  comment = "Manipulate responses for caching headers"
  publish = true
  code    = file("${path.module}/cloudfront-functions/response-manipulator.js")
}
