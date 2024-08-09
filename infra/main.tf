terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# For resources
provider "aws" {
  # alias   = "kduncan"
  region  = "us-east-2"
  profile = "kduncan"
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  handlers = toset(["auth", "game", "players", "tasks"])
  account_id = data.aws_caller_identity.current.account_id
  region = data.aws_region.current.name
  env_vars = {
    "MONGODB_CONNECTION_STRING" = var.mongodb_connection_string,
    "ACCESS_TOKEN_KEY" = var.access_token_key,
    "REFRESH_TOKEN_KEY" = var.refresh_token_key,
    "ADMIN_CODES" = var.admin_codes
  }
}

# Zip files for lambda
data "archive_file" "lambda" {
  for_each = local.handlers
  type = "zip"

  # If the file is not in the current working directory you will need to include a
  # path.module in the filename.
  source_file = "${path.module}/../functions/handlers/${each.key}.mjs"
  output_path = "${path.module}/stage/zip/${each.key}.zip"
}

# Zip files for lambda layer
data "archive_file" "lambda_layer" {
  type = "zip"

  # If the file is not in the current working directory you will need to include a
  # path.module in the filename.
  source_dir = "${path.module}/stage/layer"
  output_path = "${path.module}/stage/zip/layer.zip"
}

# Assume role policy for the IAM role
data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "lambda_policy" {
  for_each = local.handlers

  statement {
    actions = [
      "logs:CreateLogGroup"
    ]
    resources = [
      "arn:aws:logs:${local.region}:${local.account_id}:*"
    ]
  }

  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/lambda/${each.key}:*"
    ]
  }
}