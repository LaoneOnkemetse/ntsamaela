# ECS Task Definitions for Database Migrations

# Migration task definition for production
resource "aws_ecs_task_definition" "ntsamaela_migration_prod" {
  family                   = "${var.project_name}-migration-prod"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "migration"
      image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-api:latest"

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
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
          "awslogs-group"         = aws_cloudwatch_log_group.ntsamaela_migration_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "migration"
        }
      }

      essential = true
    }
  ])

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-migration-prod"
    Environment = "production"
  })
}

# Migration task definition for staging
resource "aws_ecs_task_definition" "ntsamaela_migration_staging" {
  family                   = "${var.project_name}-migration-staging"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "migration"
      image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-api:latest"

      environment = [
        {
          name  = "NODE_ENV"
          value = "staging"
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
          "awslogs-group"         = aws_cloudwatch_log_group.ntsamaela_migration_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "migration-staging"
        }
      }

      essential = true
    }
  ])

  tags = merge(var.common_tags, {
    Name        = "${var.project_name}-migration-staging"
    Environment = "staging"
  })
}

# CloudWatch Log Group for migration logs
resource "aws_cloudwatch_log_group" "ntsamaela_migration_logs" {
  name              = "/aws/ecs/${var.project_name}/migration"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-migration-logs"
  })
}

# IAM policy for migration tasks
resource "aws_iam_policy" "migration_task_policy" {
  name        = "${var.project_name}-migration-task-policy"
  description = "Policy for migration tasks to access AWS services"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.admin_jwt_secret.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "rds:CreateDBSnapshot",
          "rds:DescribeDBSnapshots",
          "rds:DescribeDBInstances"
        ]
        Resource = [
          aws_db_instance.ntsamaela_db.arn,
          "arn:aws:rds:${var.aws_region}:${var.aws_account_id}:snapshot:${var.project_name}-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/aws/ecs/${var.project_name}/migration*"
        ]
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-migration-task-policy"
  })
}

resource "aws_iam_role_policy_attachment" "migration_task_policy_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.migration_task_policy.arn
}
