resource "aws_iam_role" "iam_for_lambda" {
  for_each = local.handlers

  name = "iam_for_lambda_${each.key}"

  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  inline_policy {
    name   = "lambda_policy"
    policy = data.aws_iam_policy_document.lambda_policy[each.key].json
  }
}

resource "aws_lambda_layer_version" "lambda_layer" {
  filename   = data.archive_file.lambda_layer.output_path
  layer_name = "game_center_layer"

  compatible_runtimes = ["nodejs20.x"]
}

resource "aws_lambda_function" "controller" {
  for_each = local.handlers

  filename         = data.archive_file.lambda[each.key].output_path
  description      = "${each.key} handler for game center project"
  function_name    = each.key
  role             = aws_iam_role.iam_for_lambda[each.key].arn
  handler          = "${each.key}.handler"
  source_code_hash = data.archive_file.lambda[each.key].output_base64sha256
  layers = [
    aws_lambda_layer_version.lambda_layer.arn
  ]

  runtime = "nodejs20.x"

  environment {
    variables = local.env_vars
  }

  tags = {
    Project = "game-center"
  }
}

resource "aws_lambda_function_url" "controller" {
  for_each = local.handlers

  function_name      = aws_lambda_function.controller[each.key].arn
  authorization_type = "NONE"
}

resource "local_file" "endpointsjs" {
  content  = templatefile("${path.module}/endpoints.tpl", { endpoint_arns = { for k, v in aws_lambda_function_url.controller : k => v.function_url } })
  filename = "${path.module}/endpoints.js"
}