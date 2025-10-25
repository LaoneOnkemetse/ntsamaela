# Staging Environment Configuration for Ntsamaela

# Staging VPC (separate from production)
resource "aws_vpc" "ntsamaela_staging_vpc" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-vpc"
    Environment = "staging"
  })
}

# Staging Internet Gateway
resource "aws_internet_gateway" "ntsamaela_staging_igw" {
  vpc_id = aws_vpc.ntsamaela_staging_vpc.id

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-igw"
    Environment = "staging"
  })
}

# Staging Subnets
resource "aws_subnet" "staging_public_subnets" {
  count = 2

  vpc_id                  = aws_vpc.ntsamaela_staging_vpc.id
  cidr_block              = "10.1.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-public-subnet-${count.index + 1}"
    Environment = "staging"
  })
}

resource "aws_subnet" "staging_private_subnets" {
  count = 2

  vpc_id            = aws_vpc.ntsamaela_staging_vpc.id
  cidr_block        = "10.1.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-private-subnet-${count.index + 1}"
    Environment = "staging"
  })
}

# Staging Route Table
resource "aws_route_table" "staging_public_rt" {
  vpc_id = aws_vpc.ntsamaela_staging_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.ntsamaela_staging_igw.id
  }

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-public-rt"
    Environment = "staging"
  })
}

resource "aws_route_table_association" "staging_public_rta" {
  count = length(aws_subnet.staging_public_subnets)

  subnet_id      = aws_subnet.staging_public_subnets[count.index].id
  route_table_id = aws_route_table.staging_public_rt.id
}

# Staging Security Groups
resource "aws_security_group" "staging_web_sg" {
  name_prefix = "${var.project_name}-staging-web-sg"
  vpc_id      = aws_vpc.ntsamaela_staging_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-web-sg"
    Environment = "staging"
  })
}

resource "aws_security_group" "staging_app_sg" {
  name_prefix = "${var.project_name}-staging-app-sg"
  vpc_id      = aws_vpc.ntsamaela_staging_vpc.id

  ingress {
    from_port       = 3000
    to_port         = 3002
    protocol        = "tcp"
    security_groups = [aws_security_group.staging_web_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-app-sg"
    Environment = "staging"
  })
}

# Staging RDS Instance
resource "aws_db_instance" "ntsamaela_staging_db" {
  identifier = "${var.project_name}-staging-db"

  # Engine configuration
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = "db.t3.micro"  # Smaller instance for staging

  # Storage configuration
  allocated_storage     = 20
  max_allocated_storage = 50
  storage_type          = "gp3"
  storage_encrypted     = true

  # Database configuration
  db_name  = "ntsamaela_staging"
  username = "ntsamaela_admin"
  password = random_password.db_password.result

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.ntsamaela_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.database_sg.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 3  # Shorter retention for staging
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  delete_automated_backups = true

  # Monitoring configuration
  monitoring_interval = 0  # No enhanced monitoring for staging
  performance_insights_enabled = false

  # Parameter group
  parameter_group_name = aws_db_parameter_group.ntsamaela_db_params.name

  # Deletion protection
  deletion_protection = false  # Allow deletion for staging
  skip_final_snapshot = true

  # Single AZ for staging (cost optimization)
  multi_az = false

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-db"
    Environment = "staging"
  })
}

# Staging Redis
resource "aws_elasticache_replication_group" "ntsamaela_staging_redis" {
  replication_group_id       = "${var.project_name}-staging-redis"
  description                = "Redis cluster for Ntsamaela staging"

  # Node configuration
  node_type                  = "cache.t3.micro"  # Smaller instance for staging
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.ntsamaela_redis_params.name

  # Cluster configuration
  num_cache_clusters         = 1  # Single node for staging
  automatic_failover_enabled = false  # No failover for staging
  multi_az_enabled          = false

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.ntsamaela_redis_subnet_group.name
  security_group_ids = [aws_security_group.redis_sg.id]

  # Backup configuration
  snapshot_retention_limit = 1  # Minimal backup for staging
  snapshot_window         = "03:00-05:00"

  # Maintenance
  maintenance_window = "sun:05:00-sun:07:00"

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-redis"
    Environment = "staging"
  })
}

# Staging ECS Cluster
resource "aws_ecs_cluster" "ntsamaela_staging_cluster" {
  name = "${var.project_name}-staging-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-cluster"
    Environment = "staging"
  })
}

# Staging Application Load Balancer
resource "aws_lb" "ntsamaela_staging_alb" {
  name               = "${var.project_name}-staging-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.staging_web_sg.id]
  subnets            = aws_subnet.staging_public_subnets[*].id

  enable_deletion_protection = false  # Allow deletion for staging

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-alb"
    Environment = "staging"
  })
}

# Staging Target Groups
resource "aws_lb_target_group" "ntsamaela_staging_api_tg" {
  name        = "${var.project_name}-staging-api-tg"
  port        = 3002
  protocol    = "HTTP"
  vpc_id      = aws_vpc.ntsamaela_staging_vpc.id
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
    Name        = "${var.project_name}-staging-api-tg"
    Environment = "staging"
  })
}

resource "aws_lb_target_group" "ntsamaela_staging_web_tg" {
  name        = "${var.project_name}-staging-web-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.ntsamaela_staging_vpc.id
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
    Name        = "${var.project_name}-staging-web-tg"
    Environment = "staging"
  })
}

# Staging ALB Listener
resource "aws_lb_listener" "ntsamaela_staging_http" {
  load_balancer_arn = aws_lb.ntsamaela_staging_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ntsamaela_staging_web_tg.arn
  }
}

# Staging ALB Listener Rule for API
resource "aws_lb_listener_rule" "ntsamaela_staging_api" {
  listener_arn = aws_lb_listener.ntsamaela_staging_http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ntsamaela_staging_api_tg.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Staging ECS Task Definitions
resource "aws_ecs_task_definition" "ntsamaela_staging_api" {
  family                   = "${var.project_name}-staging-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256  # Smaller CPU for staging
  memory                   = 512  # Smaller memory for staging
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
          value = "staging"
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
          "awslogs-group"         = aws_cloudwatch_log_group.ntsamaela_staging_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-api-task"
    Environment = "staging"
  })
}

resource "aws_ecs_task_definition" "ntsamaela_staging_web" {
  family                   = "${var.project_name}-staging-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256  # Smaller CPU for staging
  memory                   = 512  # Smaller memory for staging
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
          value = "staging"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "REACT_APP_API_URL"
          value = "https://api-staging.ntsamaela.com"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ntsamaela_staging_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-web-task"
    Environment = "staging"
  })
}

# Staging ECS Services
resource "aws_ecs_service" "ntsamaela_staging_api" {
  name            = "${var.project_name}-staging-api"
  cluster         = aws_ecs_cluster.ntsamaela_staging_cluster.id
  task_definition = aws_ecs_task_definition.ntsamaela_staging_api.arn
  desired_count   = 1  # Single instance for staging
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.staging_app_sg.id]
    subnets          = aws_subnet.staging_private_subnets[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.ntsamaela_staging_api_tg.arn
    container_name   = "api"
    container_port   = 3002
  }

  depends_on = [aws_lb_listener.ntsamaela_staging_http]

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-api-service"
    Environment = "staging"
  })
}

resource "aws_ecs_service" "ntsamaela_staging_web" {
  name            = "${var.project_name}-staging-web"
  cluster         = aws_ecs_cluster.ntsamaela_staging_cluster.id
  task_definition = aws_ecs_task_definition.ntsamaela_staging_web.arn
  desired_count   = 1  # Single instance for staging
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.staging_app_sg.id]
    subnets          = aws_subnet.staging_private_subnets[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.ntsamaela_staging_web_tg.arn
    container_name   = "web"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.ntsamaela_staging_http]

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-web-service"
    Environment = "staging"
  })
}

# Staging CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ntsamaela_staging_logs" {
  name              = "/aws/ecs/${var.project_name}-staging"
  retention_in_days = 7  # Shorter retention for staging

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-staging-logs"
    Environment = "staging"
  })
}

# Staging Route53 Records
resource "aws_route53_record" "staging_main" {
  zone_id = aws_route53_zone.ntsamaela_zone.zone_id
  name    = "staging.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.ntsamaela_staging_alb.dns_name
    zone_id                = aws_lb.ntsamaela_staging_alb.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "staging_api" {
  zone_id = aws_route53_zone.ntsamaela_zone.zone_id
  name    = "api-staging.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.ntsamaela_staging_alb.dns_name
    zone_id                = aws_lb.ntsamaela_staging_alb.zone_id
    evaluate_target_health = true
  }
}
