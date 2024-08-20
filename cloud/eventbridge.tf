# Assume role policy for the IAM role
data "aws_iam_policy_document" "scheduler_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# IAM policy for eventbridge
data "aws_iam_policy_document" "scheduler_policy" {
  statement {
    actions = [
      "lambda:InvokeFunction"
    ]
    resources = [
      "arn:aws:lambda:${local.region}:${local.account_id}:function:game:*",
      "arn:aws:lambda:${local.region}:${local.account_id}:function:game"
    ]
  }
}

resource "aws_iam_role" "iam_for_scheduler" {
  name = "iam_for_scheduler"

  assume_role_policy = data.aws_iam_policy_document.scheduler_assume_role.json

  inline_policy {
    name   = "scheduler_policy"
    policy = data.aws_iam_policy_document.scheduler_policy.json
  }
}

resource "aws_scheduler_schedule_group" "game" {
  name = local.scheduler_group_name
}