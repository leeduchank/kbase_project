# GitHub Actions CI/CD Setup Guide

## 📋 Tổng Quan

Hệ thống CI/CD tự động này bao gồm:
- **Build & Test**: Tự động build và test khi có push code
- **Docker Registry**: Push Docker images lên Docker Hub
- **Auto Deploy**: Tự động deploy lên EC2 khi push vào branch `main`
- **Monitoring**: Kiểm tra trạng thái service sau deploy

## 🔐 GitHub Secrets Cần Cấu Hình

Truy cập: **Repository Settings → Secrets and variables → Actions**

### 1. Docker Hub Credentials
```
DOCKER_USERNAME: <your-dockerhub-username>
DOCKER_PASSWORD: <your-dockerhub-access-token>
```

### 2. EC2 Credentials
```
EC2_HOST: <ec2-public-ip-or-domain>
EC2_USER: <ec2-username> (thường là 'ec2-user' hoặc 'ubuntu')
EC2_PRIVATE_KEY: <private-key-content>
EC2_PORT: 22 (mặc định, hoặc port custom)
```

## 🔑 Tạo Docker Hub Access Token

1. Truy cập https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Tạo token với quyền "Read & Write"
4. Copy token và paste vào `DOCKER_PASSWORD`

## 🔓 Tạo EC2 SSH Key

### Option 1: Từ existing key
```bash
cat ~/.ssh/id_rsa | pbcopy  # macOS
# hoặc Windows: Get-Content C:\path\to\id_rsa | Set-Clipboard
```

### Option 2: Tạo key mới
```bash
ssh-keygen -t rsa -b 4096 -f kbase-github-actions
# Public key: kbase-github-actions.pub (thêm vào EC2 ~/.ssh/authorized_keys)
# Private key: kbase-github-actions (paste vào GitHub Secret)
```

## 📂 Cấu Trúc Workflow

### Individual Service Workflows
Các file này tự động chạy khi có thay đổi trong từng service:
- `build-auth-service.yml` - Auth Service
- `build-discovery-server.yml` - Discovery Server
- `build-api-gateway.yml` - API Gateway
- `build-project-service.yml` - Project Service
- `build-storage-service.yml` - Storage Service
- `build-frontend.yml` - Frontend (Next.js)

**Quy trình:**
1. ✅ Checkout code
2. 🔨 Build with Maven/Node.js
3. 🐳 Build Docker image
4. 📤 Push to Docker Hub
5. 🚀 Deploy to EC2

### Master Deployment Workflow
- `deploy-all.yml` - Deploy tất cả services cùng lúc
  - Trigger: Push vào `main` hoặc trigger manual

### Utility Workflows
- `test-all.yml` - Chạy test khi có PR
- `docker-cleanup.yml` - Dọn dẹp Docker images theo schedule

## 🚀 Cách Sử Dụng

### 1. Tạo Docker Hub Account
```bash
docker login
# Nhập username và password
```

### 2. Push code lên GitHub
```bash
git add .
git commit -m "feat: add CI/CD workflows"
git push origin main
```

### 3. Monitor Workflow
- Truy cập **Actions** tab trên GitHub repo
- Xem logs của từng job
- Check deployment status trên EC2

## 📝 Environment Variables trên EC2

Tạo file `.env` tại `/home/ec2-user/kbase/.env`:

```env
# Database
AUTH_DB_URL=jdbc:mysql://your-rds-endpoint:3306/auth_db
AUTH_DB_USERNAME=admin
AUTH_DB_PASSWORD=your-password

PROJECT_DB_URL=jdbc:mysql://your-rds-endpoint:3306/project_db
PROJECT_DB_USERNAME=admin
PROJECT_DB_PASSWORD=your-password

STORAGE_DB_URL=jdbc:mysql://your-rds-endpoint:3306/storage_db
STORAGE_DB_USERNAME=admin
STORAGE_DB_PASSWORD=your-password

# Eureka Discovery
EUREKA_URL=http://localhost:8761/eureka

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# AWS S3
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Spring Profile
SPRING_PROFILES_ACTIVE=prod
```

## 🔄 Update Docker Compose trên EC2

Chuẩn bị docker-compose.yml trên EC2:
```bash
sudo mkdir -p /home/ec2-user/kbase
cd /home/ec2-user/kbase
git clone <your-repo-url> .
cp docker-compose.yml docker-compose.prod.yml
```

## ✅ Pre-requisites trên EC2

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Install git
sudo yum install git -y  # or: sudo apt-get install git -y
```

## 🔍 Troubleshooting

### Workflow không chạy
- Check branch có là `main` không
- Verify file path changes match `paths:` trong workflow
- Check GitHub Secrets có cấu hình đầy đủ không

### Docker push fail
- Verify Docker Hub credentials
- Check Docker Hub account không bị khóa
- Ensure Docker images có naming convention: `DOCKER_USERNAME/service-name:tag`

### Deploy to EC2 fail
- Verify EC2 security group allow port 22
- Check private key có đúng format (PEM)
- Verify EC2 user có permission access `/home/ec2-user/kbase`
- Test SSH manually: `ssh -i private-key ec2-user@host`

### Container không start
- Check EC2 disk space: `df -h`
- Check container logs: `docker logs kbase-auth-service`
- Verify environment variables: `cat /home/ec2-user/kbase/.env`

## 📊 Monitoring

### View workflow status
```
GitHub Repo → Actions → Select workflow
```

### SSH into EC2 và check services
```bash
ssh -i private-key ec2-user@your-ec2-host

# Check running containers
docker-compose ps

# View container logs
docker logs kbase-auth-service

# Check resource usage
docker stats

# Restart service
docker-compose restart auth-service
```

## 🔒 Security Best Practices

1. ✅ Sử dụng SSH key thay vì password
2. ✅ Rotated Docker Hub token định kỳ
3. ✅ Store secrets trong GitHub Secrets, không hard-code
4. ✅ Limit EC2 security group to essential ports
5. ✅ Use RDS endpoint thay vì public DB
6. ✅ Enable EC2 instance monitoring

## 📈 Optimization Tips

### 1. Cache Maven Dependencies
```yaml
cache: maven
```
Được setup sẵn trong workflows để tăng tốc build.

### 2. Parallel Builds (Optional)
Sửa đổi workflows để build multiple services cùng lúc:
```yaml
strategy:
  matrix:
    service: [auth-service, project-service, storage-service]
```

### 3. Rollback Strategy (Optional)
Thêm script để rollback nếu deploy fail:
```bash
# Giữ lại 2 Docker images gần nhất
docker image ls --filter "dangling=false" | tail -n +2 | sort -k 4 -r | tail -n +3
```

## 🎯 Next Steps

1. [ ] Create Docker Hub account & get access token
2. [ ] Generate EC2 SSH key pair
3. [ ] Add GitHub Secrets
4. [ ] Test workflow bằng commit test
5. [ ] Monitor first deployment
6. [ ] Setup monitoring & alerts
7. [ ] Document any custom configurations
