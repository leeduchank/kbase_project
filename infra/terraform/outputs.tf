output "s3_bucket_name" {
  description = "The name of the created S3 bucket"
  value       = module.s3.bucket_name
}

output "s3_bucket_arn" {
  description = "The ARN of the created S3 bucket"
  value       = module.s3.bucket_arn
}

output "ec2_instance_ids" {
  description = "List of EC2 instance IDs created by the EC2 module"
  value       = module.ec2.instance_ids
}
