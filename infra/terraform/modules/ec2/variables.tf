variable "ami" {
  type        = string
  description = "AMI to use for the EC2 instance."
  default     = ""
}

variable "instance_type" {
  type        = string
  description = "Instance type for EC2."
  default     = "t3.micro"
}

variable "create" {
  type        = bool
  description = "Whether to create an EC2 instance."
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to the EC2 instance."
  default     = {}
}
