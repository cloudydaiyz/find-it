# Zip files for lambda
data "archive_file" "lambda" {
  for_each = local.handlers
  type     = "zip"

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
  source_dir  = "${path.module}/stage/layer"
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

# IAM policy for lambda
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
    project = "vulture"
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