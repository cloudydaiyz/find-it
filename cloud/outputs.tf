output "lambda_function_urls" {
  description = "urls for the lambda function"
  value       = aws_lambda_function_url.controller
}

output "game_lambda_function_url" {
  description = "url for the game lambda function"
  value       = aws_lambda_function_url.game_controller
}