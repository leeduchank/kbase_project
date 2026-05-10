# Trash Auto-Cleanup Lambda

This directory contains the AWS Lambda function code to replace the Spring Boot `@Scheduled` job for auto-cleaning up documents that have been in the trash for longer than 30 days.

## Rationale
Using AWS Lambda with EventBridge (CloudWatch Events) instead of Spring Boot's internal `@Scheduled` provides several benefits:
- **Stateless & Scalable:** It decouples the cron scheduler from the application, allowing your instances to spin up and down without missing jobs or running jobs multiple times (if you have multiple instances of `kbase-storage-service`).
- **Observability:** You can easily monitor the cron job executions natively in AWS without setting up separate monitoring for Spring Boot scheduling.

## Deployment Steps

1. **Create the Lambda Function:**
   - Go to the AWS Management Console -> Lambda.
   - Create a new function using the **Node.js** runtime.
   - Name it `kbase-trash-cleanup-job`.

2. **Upload the Code:**
   - Copy the contents of `index.js` into your Lambda function's source code, OR zip the `index.js` file and upload it.

3. **Configure Environment Variables:**
   - Set the `STORAGE_SERVICE_URL` environment variable to point to the Private IP of your EC2 instance and port 8082.
   - Example: `STORAGE_SERVICE_URL=http://172.31.x.x:8082/storage/internal/trash/purge` (thay `172.31.x.x` bằng Private IPv4 của máy ảo EC2).

4. **VPC & Security Group Configuration:**
   - Ensure the Lambda function is placed in the **same VPC** as your EC2 instance.
   - Assign a Security Group to the Lambda that allows outbound traffic.
   - **Quan trọng:** Ở máy ảo EC2, hãy cập nhật Inbound Rules của Security Group để cho phép kết nối vào port **8082** từ Security Group của Lambda (hoặc từ dải IP nội bộ của VPC).

5. **Set up the Trigger (EventBridge / CloudWatch Events):**
   - In the Lambda configuration, click **Add trigger**.
   - Select **EventBridge (CloudWatch Events)**.
   - Create a new rule. Name it `DailyTrashCleanupRule`.
   - Set the Rule type to **Schedule expression**.
   - Provide your cron expression (e.g., `cron(0 3 * * ? *)` to run daily at 3:00 AM UTC).
   - Add the trigger.

6. **Adjust Timeout:**
   - Go to Configuration -> General configuration for your Lambda function.
   - Change the timeout from the default 3 seconds to at least 30 seconds or 1 minute, as the DB query and S3 deletion might take some time if there are many documents.
