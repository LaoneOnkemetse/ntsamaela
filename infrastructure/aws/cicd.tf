# CI/CD Pipeline Configuration for Ntsamaela

# S3 Bucket for CodePipeline artifacts
resource "aws_s3_bucket" "codepipeline_artifacts" {
  bucket = "${var.project_name}-codepipeline-artifacts-${var.environment}"

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-codepipeline-artifacts"
  })
}

resource "aws_s3_bucket_public_access_block" "codepipeline_artifacts_pab" {
  bucket = aws_s3_bucket.codepipeline_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CodeBuild Project for API
resource "aws_codebuild_project" "ntsamaela_api_build" {
  name          = "${var.project_name}-api-build"
  description   = "Build project for Ntsamaela API"
  service_role  = aws_iam_role.codebuild_role.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                      = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                       = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = var.aws_account_id
    }

    environment_variable {
      name  = "ECR_REPOSITORY"
      value = aws_ecr_repository.ntsamaela_api.name
    }

    environment_variable {
      name  = "IMAGE_TAG"
      value = "latest"
    }
  }

  source {
    type = "CODEPIPELINE"
    buildspec = "buildspec-api.yml"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-api-build"
  })
}

# CodeBuild Project for Web App
resource "aws_codebuild_project" "ntsamaela_web_build" {
  name          = "${var.project_name}-web-build"
  description   = "Build project for Ntsamaela Web App"
  service_role  = aws_iam_role.codebuild_role.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                      = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type                       = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = var.aws_account_id
    }

    environment_variable {
      name  = "ECR_REPOSITORY"
      value = aws_ecr_repository.ntsamaela_web.name
    }

    environment_variable {
      name  = "IMAGE_TAG"
      value = "latest"
    }
  }

  source {
    type = "CODEPIPELINE"
    buildspec = "buildspec-web.yml"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-web-build"
  })
}

# CodePipeline
resource "aws_codepipeline" "ntsamaela_pipeline" {
  name     = "${var.project_name}-pipeline"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = aws_s3_bucket.codepipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "S3"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        S3Bucket    = aws_s3_bucket.codepipeline_artifacts.bucket
        S3ObjectKey = "source.zip"
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build-API"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["api_build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.ntsamaela_api_build.name
      }
    }

    action {
      name             = "Build-Web"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["web_build_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.ntsamaela_web_build.name
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "Deploy-API"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      input_artifacts = ["api_build_output"]
      version         = "1"

      configuration = {
        ClusterName = aws_ecs_cluster.ntsamaela_cluster.name
        ServiceName = aws_ecs_service.ntsamaela_api.name
        FileName    = "imagedefinitions.json"
      }
    }

    action {
      name            = "Deploy-Web"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      input_artifacts = ["web_build_output"]
      version         = "1"

      configuration = {
        ClusterName = aws_ecs_cluster.ntsamaela_cluster.name
        ServiceName = aws_ecs_service.ntsamaela_web.name
        FileName    = "imagedefinitions.json"
      }
    }
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-pipeline"
  })
}

# CloudWatch Event Rule for GitHub webhooks (if using GitHub)
resource "aws_cloudwatch_event_rule" "github_webhook" {
  count = var.enable_github_webhook ? 1 : 0

  name        = "${var.project_name}-github-webhook"
  description = "Trigger pipeline on GitHub push"

  event_pattern = jsonencode({
    source      = ["aws.codecommit"]
    detail-type = ["CodeCommit Repository State Change"]
    detail = {
      repository = [var.github_repository]
      reference = [{
        ref = ["refs/heads/main", "refs/heads/master"]
      }]
    }
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-github-webhook"
  })
}

resource "aws_cloudwatch_event_target" "codepipeline" {
  count = var.enable_github_webhook ? 1 : 0

  rule      = aws_cloudwatch_event_rule.github_webhook[0].name
  target_id = "TriggerCodePipeline"
  arn       = aws_codepipeline.ntsamaela_pipeline.arn
  role_arn  = aws_iam_role.codepipeline_trigger_role.arn
}

# IAM Role for CodePipeline trigger
resource "aws_iam_role" "codepipeline_trigger_role" {
  count = var.enable_github_webhook ? 1 : 0

  name = "${var.project_name}-codepipeline-trigger-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-codepipeline-trigger-role"
  })
}

resource "aws_iam_role_policy" "codepipeline_trigger_policy" {
  count = var.enable_github_webhook ? 1 : 0

  name = "${var.project_name}-codepipeline-trigger-policy"
  role = aws_iam_role.codepipeline_trigger_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codepipeline:StartPipelineExecution"
        ]
        Resource = aws_codepipeline.ntsamaela_pipeline.arn
      }
    ]
  })
}
