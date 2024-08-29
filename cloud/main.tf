terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "1.18.0"
    }
  }
}

# For resources
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

provider "mongodbatlas" {
  public_key  = var.mongodb_public_key
  private_key = var.mongodb_private_key
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  handlers   = toset(["auth", "game", "players", "tasks"])
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  env_vars = {
    "MONGODB_CONNECTION_STRING" = mongodbatlas_cluster.main_cluster.connection_strings[0].standard_srv,
    "ACCESS_TOKEN_KEY"          = var.access_token_key,
    "REFRESH_TOKEN_KEY"         = var.refresh_token_key,
    "ADMIN_CODES"               = var.admin_codes,
    "MONGODB_USERNAME"          = var.mongodb_user_username,
    "MONGODB_PASSWORD"          = var.mongodb_user_password
  }
  scheduler_group_name = "vulture"
}