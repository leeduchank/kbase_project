# KBase Multi-Repo Migration & CI/CD Setup

## Overview

This repository contains scripts and documentation for migrating KBase from a mono-repo to a multi-repo architecture with independent CI/CD pipelines for each service.

## Architecture

### Before (Mono-repo)
- All services in one repository
- Shared CI/CD workflows
- Coupled deployments

### After (Multi-repo)
- Each service in separate repository
- Independent CI/CD pipelines
- Isolated deployments
- Better scalability and maintainability

## Repository Structure

```
kbase-discovery-server/     # Service registry
kbase-auth-service/         # Authentication & authorization
kbase-api-gateway/          # API gateway
kbase-project-service/      # Project management
kbase-storage-service/      # File storage
kbase-frontend/             # Next.js frontend
kbase-infrastructure/       # Docker orchestration
```

## Migration Scripts

### 1. `migrate-to-multi-repo.sh` (Chạy trên Local Machine)
Automated script to extract services from mono-repo into separate repositories.

**Usage:**
```bash
chmod +x migrate-to-multi-repo.sh
./migrate-to-multi-repo.sh
```

**What it does:**
- Creates individual repositories for each service
- Generates CI/CD workflows for each service
- Creates README files with service-specific documentation
- Sets up proper directory structures

### 2. `setup-ec2-infrastructure.sh` (Chạy trên EC2)
EC2 server setup script for production deployment.

**Usage (on EC2):**
```bash
chmod +x setup-ec2-infrastructure.sh
sudo ./setup-ec2-infrastructure.sh
```

**What it installs:**
- OpenJDK 17
- Node.js 18
- Docker & Docker Compose
- Maven
- Git
- Firewall configuration
- Application user and directories
- Monitoring tools
- Log rotation

### 3. `verify-kbase-deployment.sh` (Chạy trên EC2)
Comprehensive deployment verification script.

**Usage (on EC2 as kbase user):**
```bash
chmod +x verify-kbase-deployment.sh
./verify-kbase-deployment.sh
```

**What it checks:**
- Docker installation and containers
- Service health endpoints
- Network connectivity
- System resources
- Error logs
- Generates deployment reports

### 4. `setup-repos.sh` (Chạy trên Local Machine)
Script đơn giản để xóa .git tổng và tạo .git riêng cho từng service.

**Usage:**
```bash
chmod +x setup-repos.sh
./setup-repos.sh
```

**What it does:**
- Xóa .git directory ở root của mono-repo
- Tạo .git repository riêng cho từng service
- Push từng service lên GitHub repository tương ứng
- Interactive: hỏi GitHub URL cho từng repo

**Yêu cầu:**
- Đã tạo GitHub repositories trước
- Có quyền push lên các repositories

## Migration Steps

### Cách đơn giản: Xóa .git tổng và tạo .git riêng cho từng service

**Thay vì tạo script phức tạp, làm theo cách này:**

1. **Xóa .git tổng ở root:**
   ```bash
   rm -rf .git
   ```

2. **Tạo .git riêng cho từng service:**
   ```bash
   # Cho từng service
   cd kbase-discovery-server
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-org/kbase-discovery-server.git
   git push -u origin main
   cd ..

   # Lặp lại cho các service khác...
   ```

3. **Script tự động (đơn giản hơn):**
   ```bash
   ./setup-repos-simple.sh
   ```

### Phase 2: Infrastructure Setup
1. Provision EC2 instance (c7i-flex.large recommended)
2. Run infrastructure setup:
   ```bash
   sudo ./setup-ec2-infrastructure.sh
   sudo reboot
   ```

3. Clone infrastructure repo:
   ```bash
   su - kbase
   git clone https://github.com/your-org/kbase-infrastructure.git
   ```

### Phase 3: CI/CD Configuration
For each service repository, configure GitHub Secrets:

**Required Secrets:**
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password
- `EC2_HOST`: EC2 instance IP/hostname
- `EC2_USER`: SSH username (kbase)
- `EC2_PRIVATE_KEY`: Private SSH key for deployment
- `EC2_PORT`: SSH port (22)

### Phase 4: Deployment & Testing
1. Push code to trigger CI/CD pipelines
2. Monitor deployment on EC2
3. Run verification script:
   ```bash
   ./verify-kbase-deployment.sh
   ```

## Service Ports

| Service | Port | Health Check |
|---------|------|-------------|
| discovery-server | 8761 | `/eureka/apps` |
| auth-service | 8081 | `/actuator/health` |
| api-gateway | 8080 | `/actuator/health` |
| project-service | 8083 | `/actuator/health` |
| storage-service | 8082 | `/actuator/health` |
| frontend | 3000 | `/` |

## Environment Variables

Create `.env` file in infrastructure repository:

```bash
# Database Configuration
AUTH_DB_URL=jdbc:mysql://your-rds-endpoint:3306/auth_db
AUTH_DB_USERNAME=admin
AUTH_DB_PASSWORD=your-password

PROJECT_DB_URL=jdbc:mysql://your-rds-endpoint:3306/project_db
PROJECT_DB_USERNAME=admin
PROJECT_DB_PASSWORD=your-password

STORAGE_DB_URL=jdbc:mysql://your-rds-endpoint:3306/storage_db
STORAGE_DB_USERNAME=admin
STORAGE_DB_PASSWORD=your-password

# Service Discovery
EUREKA_URL=http://localhost:8761/eureka

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# AWS Configuration
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Spring Profile
SPRING_PROFILES_ACTIVE=prod
```

## CI/CD Workflow

Each service repository contains `.github/workflows/ci.yml` with:

1. **Build**: Maven/Java build and test
2. **Docker**: Build and push image to Docker Hub
3. **Deploy**: SSH to EC2 and update containers
4. **Health Check**: Verify deployment success

## Monitoring & Maintenance

### Health Checks
```bash
# Quick health check
curl http://localhost:8080/actuator/health

# Full verification
./verify-kbase-deployment.sh
```

### Logs
```bash
# View service logs
docker-compose logs -f auth-service

# View all logs
docker-compose logs -f

# System monitoring
./monitor.sh
```

### Updates
```bash
# Update infrastructure
cd kbase-infrastructure
git pull origin main

# Update specific service
docker-compose pull auth-service
docker-compose up -d auth-service
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Check if ports are available
   ```bash
   netstat -tlnp | grep :8080
   ```

2. **Memory issues**: Monitor resource usage
   ```bash
   htop
   free -h
   ```

3. **Network issues**: Check Docker networks
   ```bash
   docker network ls
   docker network inspect kbase-network
   ```

4. **Database connection**: Verify environment variables
   ```bash
   docker-compose exec auth-service env | grep DB
   ```

### Rollback
```bash
# Rollback specific service
docker-compose stop auth-service
docker-compose run --rm auth-service bash -c "rollback-command"
docker-compose up -d auth-service
```

## Security Considerations

- SSH keys for deployment (no password auth)
- Docker Hub credentials stored as secrets
- Environment variables for sensitive data
- Firewall rules for service ports only
- Regular security updates on EC2

## Performance Optimization

- EC2 c7i-flex.large (4GB RAM) for shared infrastructure
- Docker layer caching in CI/CD
- Maven dependency caching
- Log rotation to prevent disk filling
- Resource limits in docker-compose.yml

## Tóm tắt Scripts và Nơi chạy

| Script | Nơi chạy | Mục đích |
|--------|----------|----------|
| `migrate-to-multi-repo.sh` | Local Machine | Extract services thành các thư mục riêng |
| `setup-repos.sh` | Local Machine | Xóa .git tổng, tạo .git riêng cho từng service |
| `setup-ec2-infrastructure.sh` | EC2 Server | Setup môi trường production |
| `verify-kbase-deployment.sh` | EC2 Server | Kiểm tra deployment |

### Quy trình Migration đơn giản:

1. **Local Machine**: Chạy `migrate-to-multi-repo.sh` → Tạo thư mục services
2. **GitHub**: Tạo 7 repositories trống thủ công
3. **Local Machine**: Chạy `setup-repos.sh` → Xóa .git tổng + tạo .git riêng + push
4. **EC2**: Chạy `setup-ec2-infrastructure.sh` → Setup server
5. **EC2**: Chạy `verify-kbase-deployment.sh` → Test deployment

### Tại sao cách này đơn giản hơn?

- ✅ **Không cần GitHub CLI** phức tạp
- ✅ **Không cần API calls** để tạo repos
- ✅ **Interactive**: Nhập GitHub URL cho từng repo
- ✅ **Trực tiếp**: Xóa .git tổng và tạo .git riêng ngay trong code hiện tại

## 🚀 Hướng dẫn Migration đơn giản (Manual)

### Bước 1: Tạo thư mục services
```bash
# Tạo thư mục cho từng service
mkdir kbase-discovery-server
mkdir kbase-auth-service
mkdir kbase-api-gateway
mkdir kbase-project-service
mkdir kbase-storage-service
mkdir kbase-frontend
mkdir kbase-infrastructure

# Copy files vào từng thư mục (adjust paths as needed)
cp -r kbase-discovery-server/* kbase-discovery-server/ 2>/dev/null || true
cp -r kbase-auth-service/* kbase-auth-service/ 2>/dev/null || true
cp -r kbase-api-gateway/* kbase-api-gateway/ 2>/dev/null || true
cp -r kbase-project-service/* kbase-project-service/ 2>/dev/null || true
cp -r kbase-storage-service/* kbase-storage-service/ 2>/dev/null || true
cp -r frontend/* kbase-frontend/ 2>/dev/null || true
cp docker-compose.yml kbase-infrastructure/
```

### Bước 2: Xóa .git tổng và tạo .git riêng
```bash
# Xóa .git ở root
rm -rf .git

# Tạo .git riêng cho từng service
cd kbase-discovery-server
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/kbase-discovery-server.git
git push -u origin main
cd ..

# Lặp lại cho các service khác...
cd kbase-auth-service
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/kbase-auth-service.git
git push -u origin main
cd ..
```

### Bước 3: Setup EC2
```bash
# Trên EC2 server
sudo ./setup-ec2-infrastructure.sh
sudo reboot
```

### Bước 4: Verify deployment
```bash
# Trên EC2 server
su - kbase
./verify-kbase-deployment.sh
```

## 🪟 Hướng dẫn cho Windows Users

### Scripts for Windows:
- `migrate.bat` - Thay thế cho `migrate-to-multi-repo.sh`
- `setup-repos.bat` - Thay thế cho `setup-repos.sh`

### Cách chạy:
```cmd
# Bước 1: Migrate services
migrate.bat

# Bước 2: Setup git repos
setup-repos.bat
```

### Manual steps nếu không dùng script:
```cmd
# 1. Tạo thư mục
mkdir kbase-discovery-server
mkdir kbase-auth-service
mkdir kbase-api-gateway
mkdir kbase-project-service
mkdir kbase-storage-service
mkdir kbase-frontend
mkdir kbase-infrastructure

# 2. Copy files
xcopy kbase-discovery-server\*.* kbase-discovery-server\ /E /I /H /Y
xcopy kbase-auth-service\*.* kbase-auth-service\ /E /I /H /Y
# ... copy for other services

# 3. Xóa .git root
rmdir /s /q .git

# 4. Setup từng repo
cd kbase-discovery-server
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/kbase-discovery-server.git
git push -u origin main
cd ..
```