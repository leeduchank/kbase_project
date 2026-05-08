# AWS CloudWatch Setup for KBase

## Mục tiêu
- Gửi log ứng dụng backend lên CloudWatch Logs
- Giám sát SQS queue và DLQ bằng CloudWatch Metrics / Alarm
- Dễ dàng kiểm tra lỗi và backlog trong dự án

## 1. Đã cấu hình trong dự án
### Docker Compose
Các service backend đã thêm `awslogs` logging driver:
- `discovery-server` -> `/kbase/discovery-server`
- `api-gateway` -> `/kbase/api-gateway`
- `auth-service` -> `/kbase/auth-service`
- `project-service` -> `/kbase/project-service`
- `storage-service` -> `/kbase/storage-service`

### Logback
Đã tạo `logback-spring.xml` cho mỗi service Spring Boot để
log ra `stdout` với định dạng chuẩn.

## 2. Yêu cầu AWS
### IAM permissions
Container runtime cần có IAM permission để ghi CloudWatch Logs:
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`

Nếu dùng một IAM role cho host/ECS, hãy gắn policy như sau:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/kbase/*"
    }
  ]
}
```

## 3. Cấu hình CloudWatch Logs Console
### 3.1 Kiểm tra log groups
- Vào AWS Console > CloudWatch > Logs > Log groups
- Tìm:
  - `/kbase/discovery-server`
  - `/kbase/api-gateway`
  - `/kbase/auth-service`
  - `/kbase/project-service`
  - `/kbase/storage-service`

### 3.2 Nếu muốn tạo thủ công
CloudWatch log group sẽ tự tạo khi container ghi log lần đầu nếu `awslogs-create-group` là `true`.

## 4. Cấu hình CloudWatch Metrics cho SQS
### 4.1 Metrics cần theo dõi
- `ApproximateNumberOfMessagesVisible`
- `ApproximateNumberOfMessagesNotVisible`
- `NumberOfMessagesSent`
- `NumberOfMessagesDeleted`
- `ApproximateAgeOfOldestMessage`

### 4.2 Tạo Alarm
Ví dụ với queue chính và DLQ:
- Nếu `ApproximateNumberOfMessagesVisible` > 0 trong 5 phút
- Nếu `ApproximateAgeOfOldestMessage` > 300 giây
- Nếu DLQ `ApproximateNumberOfMessagesVisible` > 0

## 5. Test nhanh
### 5.1 Test log
- Chạy container với `docker compose up`
- Vào CloudWatch Logs, mở log group tương ứng
- Tìm log dòng `INFO`, `ERROR` từ service

### 5.2 Test SQS
- Gửi message lỗi vào queue chính
- Quan sát queue chính tăng `Receive count`
- Sau `maxReceiveCount`, message vào DLQ
- Kiểm tra DLQ log group/metric

## 6. Nếu sử dụng AWS CLI
### 6.1 Send test message
```bash
aws sqs send-message \
  --queue-url <QUEUE_URL> \
  --message-body '{"bad":"data"}'
```

### 6.2 Kiểm tra DLQ
```bash
aws sqs receive-message \
  --queue-url <DLQ_URL> \
  --max-number-of-messages 1
```

## 7. Lưu ý
- `AWS_REGION` phải đúng và có quyền truy cập AWS
- `docker-compose` sẽ chỉ đẩy log nếu runtime Docker có quyền truy cập IAM hoặc AWS credentials
- `frontend` không gửi CloudWatch Logs vì không cấu hình `awslogs` ở hiện tại
