variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "bucket_name" {
  type    = string
  default = "kbase-storage-bucket"
}

variable "tags" {
  type = map(string)
  default = {
    project     = "kbase"
    environment = "dev"
  }
}

variable "ec2_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "ec2_ami" {
  type    = string
  default = ""
}

variable "create_ec2" {
  type    = bool
  default = false
}
