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
  region  = var.region
  profile = var.aws_profile
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  handlers   = toset(["auth", "game", "players", "tasks"])
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  env_vars = {
    "MONGODB_CONNECTION_STRING" = var.mongodb_connection_string,
    "ACCESS_TOKEN_KEY"          = var.access_token_key,
    "REFRESH_TOKEN_KEY"         = var.refresh_token_key,
    "ADMIN_CODES"               = var.admin_codes
  }
}