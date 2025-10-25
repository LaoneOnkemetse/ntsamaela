# SSL Certificate Configuration for Ntsamaela

# ACM Certificate for main domain
resource "aws_acm_certificate" "ntsamaela_cert" {
  domain_name               = var.domain_name
  subject_alternative_names = [
    "www.${var.domain_name}",
    "api.${var.domain_name}",
    "admin.${var.domain_name}",
    "*.${var.domain_name}"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cert"
  })
}

# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "ntsamaela_cert_cloudfront" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = [
    "www.${var.domain_name}",
    "api.${var.domain_name}",
    "admin.${var.domain_name}",
    "*.${var.domain_name}"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cert-cloudfront"
  })
}

# Route53 Zone
resource "aws_route53_zone" "ntsamaela_zone" {
  name = var.domain_name

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-zone"
  })
}

# Route53 Records for certificate validation
resource "aws_route53_record" "ntsamaela_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.ntsamaela_cert.domain_validation_options : dvo.domain_name => {
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
  zone_id         = aws_route53_zone.ntsamaela_zone.zone_id
}

resource "aws_route53_record" "ntsamaela_cert_validation_cloudfront" {
  provider = aws.us_east_1

  for_each = {
    for dvo in aws_acm_certificate.ntsamaela_cert_cloudfront.domain_validation_options : dvo.domain_name => {
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
  zone_id         = aws_route53_zone.ntsamaela_zone.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "ntsamaela_cert_validation" {
  certificate_arn         = aws_acm_certificate.ntsamaela_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.ntsamaela_cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }
}

resource "aws_acm_certificate_validation" "ntsamaela_cert_validation_cloudfront" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.ntsamaela_cert_cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.ntsamaela_cert_validation_cloudfront : record.fqdn]

  timeouts {
    create = "5m"
  }
}

# Route53 Records for the application
resource "aws_route53_record" "ntsamaela_main" {
  zone_id = aws_route53_zone.ntsamaela_zone.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.ntsamaela_cdn.domain_name
    zone_id                = aws_cloudfront_distribution.ntsamaela_cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ntsamaela_www" {
  zone_id = aws_route53_zone.ntsamaela_zone.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.ntsamaela_cdn.domain_name
    zone_id                = aws_cloudfront_distribution.ntsamaela_cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ntsamaela_api" {
  zone_id = aws_route53_zone.ntsamaela_zone.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.ntsamaela_alb.dns_name
    zone_id                = aws_lb.ntsamaela_alb.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "ntsamaela_admin" {
  zone_id = aws_route53_zone.ntsamaela_zone.zone_id
  name    = "admin.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.ntsamaela_alb.dns_name
    zone_id                = aws_lb.ntsamaela_alb.zone_id
    evaluate_target_health = true
  }
}

# SSL Policy for Application Load Balancer
resource "aws_lb_ssl_policy" "ntsamaela_ssl_policy" {
  name            = "${var.project_name}-ssl-policy"
  load_balancer_type = "application"

  policy_type = "ELBSecurityPolicy-TLS-1-2-2017-01"
}

# Additional provider for us-east-1 (required for CloudFront certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
