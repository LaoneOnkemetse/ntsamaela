# Monitoring and Alerting Configuration for Ntsamaela

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ntsamaela_app_logs" {
  name              = "/aws/ecs/${var.project_name}/application"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-app-logs"
  })
}

resource "aws_cloudwatch_log_group" "ntsamaela_nginx_logs" {
  name              = "/aws/ecs/${var.project_name}/nginx"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-nginx-logs"
  })
}

resource "aws_cloudwatch_log_group" "ntsamaela_api_logs" {
  name              = "/aws/ecs/${var.project_name}/api"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-api-logs"
  })
}

# SNS Topic for alerts
resource "aws_sns_topic" "ntsamaela_alerts" {
  name = "${var.project_name}-alerts"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-alerts"
  })
}

# SNS Topic Subscription (Email)
resource "aws_sns_topic_subscription" "ntsamaela_alerts_email" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.ntsamaela_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# SNS Topic Subscription (SMS)
resource "aws_sns_topic_subscription" "ntsamaela_alerts_sms" {
  count = var.alert_phone != "" ? 1 : 0

  topic_arn = aws_sns_topic.ntsamaela_alerts.arn
  protocol  = "sms"
  endpoint  = var.alert_phone
}

# CloudWatch Alarms for ECS
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.project_name}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.ntsamaela_alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.ntsamaela_api.name
    ClusterName = aws_ecs_cluster.ntsamaela_cluster.name
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ecs-cpu-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "${var.project_name}-ecs-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.ntsamaela_alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.ntsamaela_api.name
    ClusterName = aws_ecs_cluster.ntsamaela_cluster.name
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-ecs-memory-high"
  })
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.ntsamaela_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.ntsamaela_db.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-rds-cpu-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "${var.project_name}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS database connections"
  alarm_actions       = [aws_sns_topic.ntsamaela_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.ntsamaela_db.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-rds-connections-high"
  })
}

# CloudWatch Alarms for Application Load Balancer
resource "aws_cloudwatch_metric_alarm" "alb_response_time_high" {
  alarm_name          = "${var.project_name}-alb-response-time-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.ntsamaela_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.ntsamaela_alb.arn_suffix
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-alb-response-time-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.project_name}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ALB 5XX errors"
  alarm_actions       = [aws_sns_topic.ntsamaela_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.ntsamaela_alb.arn_suffix
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-alb-5xx-errors"
  })
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${var.project_name}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.ntsamaela_alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.ntsamaela_redis.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-redis-cpu-high"
  })
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "ntsamaela_dashboard" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.ntsamaela_api.name, "ClusterName", aws_ecs_cluster.ntsamaela_cluster.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Service Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.ntsamaela_db.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeableMemory", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.ntsamaela_alb.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", aws_elasticache_replication_group.ntsamaela_redis.id],
            [".", "CurrConnections", ".", "."],
            [".", "Evictions", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Redis Metrics"
          period  = 300
        }
      }
    ]
  })
}

# CloudWatch Log Insights Queries
resource "aws_cloudwatch_query_definition" "error_logs" {
  name = "${var.project_name}-error-logs"

  log_group_names = [
    aws_cloudwatch_log_group.ntsamaela_app_logs.name,
    aws_cloudwatch_log_group.ntsamaela_api_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
EOF
}

resource "aws_cloudwatch_query_definition" "slow_queries" {
  name = "${var.project_name}-slow-queries"

  log_group_names = [
    aws_cloudwatch_log_group.ntsamaela_api_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /slow query/
| sort @timestamp desc
| limit 50
EOF
}

# X-Ray Tracing
resource "aws_xray_sampling_rule" "ntsamaela_sampling" {
  rule_name      = "${var.project_name}-sampling"
  priority       = 10000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-sampling"
  })
}
