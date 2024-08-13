output "lambda_function_urls" {
  description = "Url for the lambda function"
  value       = aws_lambda_function_url.controller
}