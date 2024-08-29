variable "access_token_key" {
  type        = string
  description = "string for your access token key"
}

variable "refresh_token_key" {
  type        = string
  description = "string for your refresh token key"
}

variable "admin_codes" {
  type        = string
  description = "comma separated admin codes (e.g. `'h3ll0,w0rld'`)"
}

variable "aws_profile" {
  type        = string
  description = "aws profile to deploy infrastructure on"
  default     = "default"
}

variable "aws_region" {
  type        = string
  description = "region to deploy aws infrastructure on"
  default     = "us-east-2"
}

variable "mongodb_public_key" {
  type        = string
  description = "public API key from mongodb atlas organization"
}

variable "mongodb_private_key" {
  type        = string
  description = "private API key from mongodb atlas organization"
}

variable "mongodb_project_owner_id" {
  type        = string
  description = "ID of the user to be assigned as the project owner"
}

variable "mongodb_region" {
  type        = string
  description = "the region of the cluster to be created; should reflect aws region, see https://www.mongodb.com/docs/atlas/reference/amazon-aws/"
  default     = "US_EAST_1"
}

variable "mongodb_user_username" {
  type        = string
  description = "the username of the initial user for the database"
  default     = "vulture_user"
}

variable "mongodb_user_password" {
  type        = string
  description = "the password of the initial user for the database"
  default     = "vulture_pass"
}