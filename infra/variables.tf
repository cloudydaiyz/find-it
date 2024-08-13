variable "mongodb_connection_string" {
  type = string
  description = "URL for MongoDB Atlas database"
}

variable "access_token_key" {
  type = string
  description = "string for your access token key"
}

variable "refresh_token_key" {
  type = string
  description = "string for your refresh token key"
}

variable "admin_codes" {
  type = string
  description = "comma separated admin codes (e.g. `'h3ll0,w0rld'`)"
}

variable "aws_profile" {
  type = string
  description = "aws profile to deploy infrastructure on"
  default = "default"
}

variable "region" {
  type = string
  description = "region to deploy aws infrastructure on"
  default = "us-east-2"
}