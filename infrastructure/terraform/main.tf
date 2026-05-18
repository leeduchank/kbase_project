# 1. TẠO QUYỀN (IAM ROLE) CHO LAMBDA
resource "aws_iam_role" "lambda_cleanup_role" {
  name = "kbase_trash_cleanup_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" } }]
  })
}

# Attach policy cho phép Lambda chạy trong VPC và ghi log (Tương ứng Bước 4 trong README)
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_cleanup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# 2. TẠO HÀM LAMBDA (Tương ứng Bước 1, 2, 3 và 6 trong README)
resource "aws_lambda_function" "trash_cleanup" {
  function_name    = "kbase-trash-cleanup-job"
  filename         = "../infrastructure/lambda/trash-cleanup/trash-cleanup.zip" # Đường dẫn tới file zip vừa tạo
  source_code_hash = filebase64sha256("../infrastructure/lambda/trash-cleanup/trash-cleanup.zip")
  
  handler = "index.handler"
  runtime = "nodejs20.x"
  role    = aws_iam_role.lambda_cleanup_role.arn
  timeout = 60 # Bước 6: Tăng timeout lên 60 giây do query DB/S3 có thể lâu

  # Bước 3: Biến môi trường
  environment {
    variables = {
      STORAGE_SERVICE_URL = "http://172.31.x.x:8082/storage/internal/trash/purge" # Sửa IP này theo EC2 của em
    }
  }

  # Bước 4: Cấu hình VPC để Lambda gọi được API nội bộ của EC2
  vpc_config {
    subnet_ids         = ["subnet-xxxxxxx"] # Điền ID Subnet của VPC
    security_group_ids = ["sg-xxxxxxx"]     # Điền ID Security Group của Lambda
  }
}

# 3. CẤU HÌNH EVENTBRIDGE TỰ ĐỘNG CHẠY (Tương ứng Bước 5 trong README)
# Tạo Rule chạy lúc 3:00 AM UTC mỗi ngày
resource "aws_cloudwatch_event_rule" "daily_trash_cleanup" {
  name                = "DailyTrashCleanupRule"
  description         = "Trigger KBase trash cleanup job daily"
  schedule_expression = "cron(0 3 * * ? *)"
}

# Gắn Rule đó vào con Lambda của em
resource "aws_cloudwatch_event_target" "trigger_lambda" {
  rule      = aws_cloudwatch_event_rule.daily_trash_cleanup.name
  target_id = "TriggerTrashCleanupLambda"
  arn       = aws_lambda_function.trash_cleanup.arn
}

# Cấp quyền cho EventBridge được phép bấm nút "Run" con Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.trash_cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_trash_cleanup.arn
}