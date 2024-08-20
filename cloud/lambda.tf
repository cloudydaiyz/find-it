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

# Layer for all lambda functions
resource "aws_lambda_layer_version" "lambda_layer" {
  filename   = data.archive_file.lambda_layer.output_path
  layer_name = "game_center_layer"

  compatible_runtimes = ["nodejs20.x"]
}

# Assume role policy for the IAM role of any lambda
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

# IAM policy for lambdas except the game lambda
data "aws_iam_policy_document" "lambda_policy" {
  for_each = setsubtract(local.handlers, ["game"])

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

# IAM role for lambdas except the game lambda
resource "aws_iam_role" "iam_for_lambda" {
  for_each = setsubtract(local.handlers, ["game"])

  name = "iam_for_lambda_${each.key}"

  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  inline_policy {
    name   = "lambda_policy"
    policy = data.aws_iam_policy_document.lambda_policy[each.key].json
  }
}

# Lambda functions except game
resource "aws_lambda_function" "controller" {
  for_each = setsubtract(local.handlers, ["game"])

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

# URL for lambda functions except game function
resource "aws_lambda_function_url" "controller" {
  for_each = setsubtract(local.handlers, ["game"])

  function_name      = aws_lambda_function.controller[each.key].arn
  authorization_type = "NONE"
}

# IAM policy for game lambda
data "aws_iam_policy_document" "game_lambda_policy" {
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
      "logs:PutLogEvents",
    ]
    resources = [
      "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/lambda/game:*"
    ]
  }

  statement {
    actions = [
      "scheduler:CreateSchedule",
      "scheduler:DeleteSchedule"
    ]
    resources = [
      "arn:aws:scheduler:${local.region}:${local.account_id}:schedule/${local.scheduler_group_name}/*"
    ]
  }

  statement {
    actions = [
      "iam:GetRole",
      "iam:PassRole"
    ]
    resources = [
      aws_iam_role.iam_for_scheduler.arn
    ]
  }
}

# IAM role for the game lambda
resource "aws_iam_role" "iam_for_game_lambda" {
  name = "iam_for_game_lambda"

  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  inline_policy {
    name   = "game_lambda_policy"
    policy = data.aws_iam_policy_document.game_lambda_policy.json
  }
}

# Game lambda function
resource "aws_lambda_function" "game_controller" {

  filename         = data.archive_file.lambda["game"].output_path
  description      = "game handler for game center project"
  function_name    = "game"
  role             = aws_iam_role.iam_for_game_lambda.arn
  handler          = "game.handler"
  source_code_hash = data.archive_file.lambda["game"].output_base64sha256
  timeout = 10
  layers = [
    aws_lambda_layer_version.lambda_layer.arn
  ]

  runtime = "nodejs20.x"

  environment {
    variables = merge(local.env_vars, { 
      "SCHEDULER_ROLE_ARN": aws_iam_role.iam_for_scheduler.arn,
      "SCHEDULER_GROUP_NAME": local.scheduler_group_name
    })
  }

  tags = {
    project = "vulture"
  }
}

# URL for game lambda function
resource "aws_lambda_function_url" "game_controller" {
  function_name      = aws_lambda_function.game_controller.arn
  authorization_type = "NONE"
}

# Creates `endpoints.js` file with the endpoints for each lambda function, use for website
resource "local_file" "endpointsjs" {
  content  = templatefile("${path.module}/endpoints.tpl", { 
    endpoint_arns = merge(
      { for k, v in aws_lambda_function_url.controller : k => v.function_url }, 
      { "game": aws_lambda_function_url.game_controller.function_url }
    ) 
  })
  filename = "${path.module}/endpoints.js"
}