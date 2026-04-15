terraform {
  source = "../terraform"
}

inputs = {
  aws_region  = "ap-southeast-1"
  bucket_name = "kbase-storage-bucket"
  create_ec2  = false
  tags = {
    project     = "kbase"
    environment = "dev"
  }
}
