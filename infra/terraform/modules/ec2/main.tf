resource "aws_instance" "this" {
  count         = var.create ? 1 : 0
  ami           = var.ami
  instance_type = var.instance_type

  tags = merge(var.tags, {
    Name = "kbase-ec2-instance"
  })
}
