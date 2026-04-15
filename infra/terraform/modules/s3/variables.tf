variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket to create."
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to the S3 bucket."
  default     = {}
}
