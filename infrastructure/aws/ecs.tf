# ECS Configuration for Ntsamaela

# ECS Cluster
resource "aws_ecs_cluster" "ntsamaela_cluster" {
  name = var.ecs_cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-cluster"
  })
}

# ECS Cluster Capacity Providers
resource "aws_ecs_cluster_capacity_providers" "ntsamaela_cluster" {
  cluster_name = aws_ecs_cluster.ntsamaela_cluster.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# Application Load Balancer
resource "aws_lb" "ntsamaela_alb" {
  name               = var.alb_name
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.web_sg.id]
  subnets            = aws_subnet.public_subnets[*].id

  enable_deletion_protection = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-alb"
  })
}

# ALB Target Group for API
resource "aws_lb_target_group" "ntsamaela_api_tg" {
  name        = "${var.project_name}-api-tg"
  port        = 3002
  protocol    = "HTTP"
  vpc_id      = aws_vpc.ntsamaela_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-api-tg"
  })
}

# ALB Target Group for Web App
resource "aws_lb_target_group" "ntsamaela_web_tg" {
  name        = "${var.project_name}-web-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.ntsamaela_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-web-tg"
  })
}

# ALB Listener for HTTPS
resource "aws_lb_listener" "ntsamaela_https" {
  load_balancer_arn = aws_lb.ntsamaela_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = aws_lb_ssl_policy.ntsamaela_ssl_policy.name
  certificate_arn   = aws_acm_certificate_validation.ntsamaela_cert_validation.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ntsamaela_web_tg.arn
  }
}

# ALB Listener for HTTP (redirect to HTTPS)
resource "aws_lb_listener" "ntsamaela_http" {
  load_balancer_arn = aws_lb.ntsamaela_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ALB Listener Rule for API
resource "aws_lb_listener_rule" "ntsamaela_api" {
  listener_arn = aws_lb_listener.ntsamaela_https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ntsamaela_api_tg.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# ECS Task Definition for API
resource "aws_ecs_task_definition" "ntsamaela_api" {
  family                   = "${var.project_name}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-api:latest"

      portMappings = [
        {
          containerPort = 3002
          hostPort      = 3002
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3002"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.jwt_secret.arn
        },
        {
          name      = "ADMIN_JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.admin_jwt_secret.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ntsamaela_api_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-api-task"
  })
}

# ECS Task Definition for Web App
resource "aws_ecs_task_definition" "ntsamaela_web" {
  family                   = "${var.project_name}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "web"
      image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-web:latest"

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "REACT_APP_API_URL"
          value = "https://api.${var.domain_name}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ntsamaela_app_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-web-task"
  })
}

# ECS Service for API
resource "aws_ecs_service" "ntsamaela_api" {
  name            = "${var.project_name}-api"
  cluster         = aws_ecs_cluster.ntsamaela_cluster.id
  task_definition = aws_ecs_task_definition.ntsamaela_api.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.app_sg.id]
    subnets          = aws_subnet.private_subnets[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.ntsamaela_api_tg.arn
    container_name   = "api"
    container_port   = 3002
  }

  depends_on = [aws_lb_listener.ntsamaela_https]

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-api-service"
  })
}

# ECS Service for Web App
resource "aws_ecs_service" "ntsamaela_web" {
  name            = "${var.project_name}-web"
  cluster         = aws_ecs_cluster.ntsamaela_cluster.id
  task_definition = aws_ecs_task_definition.ntsamaela_web.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.app_sg.id]
    subnets          = aws_subnet.private_subnets[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.ntsamaela_web_tg.arn
    container_name   = "web"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.ntsamaela_https]

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-web-service"
  })
}

# Auto Scaling Target for API
resource "aws_appautoscaling_target" "ntsamaela_api_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.ntsamaela_cluster.name}/${aws_ecs_service.ntsamaela_api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy for API
resource "aws_appautoscaling_policy" "ntsamaela_api_scale_up" {
  name               = "${var.project_name}-api-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ntsamaela_api_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ntsamaela_api_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ntsamaela_api_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Auto Scaling Target for Web
resource "aws_appautoscaling_target" "ntsamaela_web_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.ntsamaela_cluster.name}/${aws_ecs_service.ntsamaela_web.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy for Web
resource "aws_appautoscaling_policy" "ntsamaela_web_scale_up" {
  name               = "${var.project_name}-web-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ntsamaela_web_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ntsamaela_web_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ntsamaela_web_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
