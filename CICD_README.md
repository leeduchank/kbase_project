# KBase CI/CD Pipeline Documentation

## 🎯 Project Overview

This is a **complete GitHub Actions CI/CD pipeline** for KBase microservices deployment to AWS EC2. The system automates building, testing, containerizing, and deploying all services with zero-downtime deployments.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Repository                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Code Changes (commit to main/develop)                │   │
│  └────────────────┬─────────────────────────────────────┘   │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  │ Trigger GitHub Actions
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            GitHub Actions (Ubuntu Runner)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Checkout Code                                    │   │
│  │ 2. Setup Java/Node/Docker Environment              │   │
│  │ 3. Build & Test with Maven/NPM                    │   │
│  │ 4. Build Docker Image                             │   │
│  │ 5. Push to Docker Hub                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  │ On Push to main
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Docker Hub Registry                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ kbase-auth-service:main                             │   │
│  │ kbase-project-service:main                          │   │
│  │ kbase-storage-service:main                          │   │
│  │ kbase-api-gateway:main                              │   │
│  │ kbase-discovery-server:main                         │   │
│  │ kbase-frontend:main                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  │ SSH Deploy Script
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                AWS EC2 Instance                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Docker Daemon                                       │   │
│  │ ┌──────────────────────────────────────────────┐   │   │
│  │ │ Pull Images from Docker Hub                 │   │   │
│  │ │ Run docker-compose up -d                   │   │   │
│  │ ├──────────────────────────────────────────────┤   │   │
│  │ │ kbase-discovery-server (port 8761)        │   │   │
│  │ │ kbase-auth-service (port 8081)            │   │   │
│  │ │ kbase-api-gateway (port 8080)             │   │   │
│  │ │ kbase-project-service (port 8083)         │   │   │
│  │ │ kbase-storage-service (port 8082)         │   │   │
│  │ │ kbase-frontend (port 3000)                │   │   │
│  │ └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Workflow Files Structure

```
.github/
├── workflows/
│   ├── build-auth-service.yml          # Auth Service CI/CD
│   ├── build-discovery-server.yml      # Discovery Server CI/CD
│   ├── build-api-gateway.yml           # API Gateway CI/CD
│   ├── build-project-service.yml       # Project Service CI/CD
│   ├── build-storage-service.yml       # Storage Service CI/CD
│   ├── build-frontend.yml              # Frontend CI/CD
│   ├── deploy-all.yml                  # Master deployment workflow
│   ├── test-all.yml                    # Test suite for PR validation
│   └── docker-cleanup.yml              # Scheduled cleanup
├── CICD_SETUP_GUIDE.md                 # Complete setup instructions
└── QUICK_START.md                      # Quick reference guide
```

## 🚀 What Each Workflow Does

### 1. **build-*-service.yml** (Individual Service Workflows)
- **Trigger**: Push to service-specific paths or `pom.xml`
- **Steps**:
  - ✅ Checkout code
  - ✅ Setup Java 17
  - ✅ Cache Maven dependencies
  - ✅ Build with Maven (compile + package)
  - ✅ Setup Docker Buildx for multi-platform builds
  - ✅ Login to Docker Hub
  - ✅ Extract metadata (tags: branch, semver, git sha)
  - ✅ Build and push Docker image
  - ✅ SSH into EC2
  - ✅ Pull latest code from git
  - ✅ Stop old service container
  - ✅ Pull new image from Docker Hub
  - ✅ Start service with new image
  - ✅ Verify service health

### 2. **deploy-all.yml** (Master Deployment)
- **Trigger**: Push to `main` branch or manual trigger
- **Steps**:
  - Stop all services
  - Pull latest images for all microservices
  - Start all services using docker-compose
  - Wait 15 seconds for startup
  - Display running services status

### 3. **test-all.yml** (Test Suite)
- **Trigger**: Pull requests to `main` branch
- **Steps**:
  - Run Maven tests for all modules
  - Generate code coverage reports (Jacoco)
  - Upload test artifacts
  - Publish test results

### 4. **docker-cleanup.yml** (Maintenance)
- **Trigger**: Weekly schedule (Sunday 2 AM UTC)
- **Steps**:
  - Remove dangling images
  - Remove unused volumes
  - Remove unused networks
  - Display disk usage

## 🔄 Deployment Flow

### Development Workflow
```
Feature Branch → PR (Runs tests) → Code Review → Merge to main
                                                     ↓
                                        GitHub Action Triggers
                                                     ↓
                                    Build → Test → Push → Deploy
                                                     ↓
                                         EC2 Auto Updates
```

### Automatic Deployment Sequence
```
1. Generate tag (main, sha, semver)
2. Build Java/Node app
3. Build Docker image with multiple tags
4. Push to Docker Hub
5. SSH to EC2
6. Pull latest code
7. Stop old container
8. Pull new image
9. Start new container
10. Health check
```

## 📋 Prerequisites

### Local Requirements
- Git
- Docker & Docker Compose
- Maven 3.9+
- Node.js 18+
- SSH keys configured

### GitHub Setup
- Public/Private repository
- GitHub Actions enabled
- Secrets configured (see CICD_SETUP_GUIDE.md)

### Docker Hub
- Public account
- Access token (not password)
- Private repositories optional

### AWS EC2
- Ubuntu 20.04+ or Amazon Linux 2
- Docker & Docker Compose installed
- Git installed
- SSH access configured
- RDS endpoints for databases
- S3 bucket for storage

## 🔐 GitHub Secrets Required

```yaml
# Docker Hub Credentials
DOCKER_USERNAME: your-username
DOCKER_PASSWORD: your-access-token

# EC2 SSH Access
EC2_HOST: 1.2.3.4
EC2_USER: ubuntu
EC2_PRIVATE_KEY: -----BEGIN RSA PRIVATE KEY-----...
EC2_PORT: 22
```

## 📊 Performance Characteristics

| Metric | Value |
|--------|-------|
| Build Time (Maven) | ~3-5 minutes |
| Docker Build Time | ~1-2 minutes |
| Upload to Hub | ~30-60 seconds |
| SSH Deploy Time | ~1-2 minutes |
| **Total Pipeline** | **~7-10 minutes** |

### Cache Benefits
- Maven cache: Reduces build from ~5m to ~2-3m
- Docker layer cache: Reuses unchanged layers

## 🔍 Monitoring & Logs

### GitHub Actions Logs
```
Repository → Actions → Select workflow run → View job logs
```

### EC2 Service Logs
```bash
ssh -i key.pem ec2-user@host

# View all services
docker-compose ps

# View service logs
docker-compose logs -f auth-service

# View specific lines
docker-compose logs --tail=50 auth-service

# Follow new logs
docker-compose logs -f
```

### Health Check HTTP Endpoints
- Discovery Server: `http://ec2:8761`
- Auth Service: `http://ec2:8081/actuator/health`
- API Gateway: `http://ec2:8080/actuator/health`
- Project Service: `http://ec2:8083/actuator/health`
- Storage Service: `http://ec2:8082/actuator/health`
- Frontend: `http://ec2:3000`

## 🛠️ Helper Scripts

### 1. setup-ec2.sh
Automated EC2 environment setup
```bash
# Usage
sudo ./setup-ec2.sh

# Creates
- Docker & Docker Compose installation
- Application directory structure
- .env.template file
- Health check scripts
- Backup scripts
- Monitoring scripts
```

### 2. verify-deployment.sh
Post-deployment verification
```bash
# Usage
./verify-deployment.sh ec2.example.com

# Checks
- EC2 connectivity
- Docker daemon status
- Container health
- Service endpoints
- Resource usage
- Database connectivity
- Eureka service registry
```

### 3. health-check.sh (on EC2)
Manual service health verification
```bash
./health-check.sh
# Output:
# ✓ discovery-server: UP
# ✓ auth-service: UP
# ✓ api-gateway: UP
# ...
```

## 📈 Scaling & Optimization

### Parallel Builds (Optional)
Modify workflows to build multiple services in parallel:
```yaml
strategy:
  matrix:
    service: [auth-service, project-service, storage-service]
  max-parallel: 3
```

### Multi-stage Builds
Already implemented in Dockerfiles for optimal image size

### Layer Caching
Docker registry caching enabled in all build steps

## ⚠️ Troubleshooting

### Build Fails
```bash
# Check Maven build locally
mvn clean package -DskipTests

# View detailed logs
docker build -f Dockerfile --progress=plain .
```

### Deploy Fails
```bash
# SSH to EC2 and check
docker-compose ps
docker logs kbase-auth-service
docker-compose logs

# Check disk space
df -h
docker system df
```

### Service Not Starting
```bash
# Check logs
docker logs kbase-auth-service

# Check port conflicts
netstat -tlnp | grep LISTEN

# Check resources
docker stats

# Restart service
docker-compose restart auth-service
```

## 🔒 Security Best Practices

- ✅ Never commit secrets to repository
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate Docker Hub token quarterly
- ✅ Use SSH keys instead of passwords
- ✅ Limit EC2 security group access
- ✅ Use private subnets for RDS
- ✅ Enable AWS CloudWatch monitoring
- ✅ Regular security updates

## 📚 Related Documentation

- [GitHub Actions Docs](https://docs.github.com/actions)
- [Docker Compose Docs](https://docs.docker.com/compose)
- [Spring Cloud Netflix](https://spring.io/projects/spring-cloud-netflix)
- [AWS EC2 Guide](https://docs.aws.amazon.com/ec2/)
- [Maven Guide](https://maven.apache.org/guides/)

## 👥 Contributing

When making changes to microservices:
1. Create feature branch
2. Make code changes
3. Push to open pull request
4. Tests run automatically
5. After review and approval, merge to main
6. CI/CD automatically deploys to EC2

## 📞 Support

- Check `.github/QUICK_START.md` for common issues
- Review `.github/CICD_SETUP_GUIDE.md` for detailed setup
- Check GitHub Actions logs for specific failures
- SSH to EC2 and check `docker-compose logs`
