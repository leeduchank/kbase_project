# KBase Multi-Repo Migration Guide

## 🎯 Mục Tiêu
Chuyển từ **mono-repo** sang **multi-repo architecture**:
- Mỗi service = 1 GitHub repository riêng
- Tính độc lập hoàn toàn giữa các services
- CI/CD riêng biệt cho từng service

## 📁 Cấu Trúc Mới

```
GitHub Organization/
├── kbase-infrastructure/          # Quản lý deployment
│   ├── docker-compose.yml
│   ├── .env.template
│   ├── .github/workflows/
│   │   ├── deploy-all.yml         # Deploy tất cả services
│   │   └── health-check.yml       # Monitoring
│   └── scripts/
│       ├── deploy.sh
│       └── health-check.sh
│
├── kbase-discovery-server/        # Repo riêng
│   ├── .github/workflows/ci.yml
│   ├── src/
│   └── pom.xml
│
├── kbase-auth-service/            # Repo riêng
│   ├── .github/workflows/ci.yml
│   ├── src/
│   └── pom.xml
│
├── kbase-api-gateway/             # Repo riêng
│   ├── .github/workflows/ci.yml
│   ├── src/
│   └── pom.xml
│
├── kbase-project-service/         # Repo riêng
│   ├── .github/workflows/ci.yml
│   ├── src/
│   └── pom.xml
│
├── kbase-storage-service/         # Repo riêng
│   ├── .github/workflows/ci.yml
│   ├── src/
│   └── pom.xml
│
└── kbase-frontend/                # Repo riêng
    ├── .github/workflows/ci.yml
    ├── src/
    └── package.json
```

## 🚀 Migration Steps

### Bước 1: Tạo GitHub Repositories

```bash
# Tạo các repo mới trên GitHub
# 1. kbase-infrastructure (private)
# 2. kbase-discovery-server (private)
# 3. kbase-auth-service (private)
# 4. kbase-api-gateway (private)
# 5. kbase-project-service (private)
# 6. kbase-storage-service (private)
# 7. kbase-frontend (private)
```

### Bước 2: Extract Services

```bash
# Từ mono-repo hiện tại, extract từng service

# 1. Discovery Server
mkdir ../kbase-discovery-server
cp -r kbase-discovery-server/* ../kbase-discovery-server/
cp pom.xml ../kbase-discovery-server/  # Parent POM

# 2. Auth Service
mkdir ../kbase-auth-service
cp -r kbase-auth-service/* ../kbase-auth-service/
cp pom.xml ../kbase-auth-service/

# 3. API Gateway
mkdir ../kbase-api-service
cp -r kbase-api-gateway/* ../kbase-api-gateway/
cp pom.xml ../kbase-api-gateway/

# 4. Project Service
mkdir ../kbase-project-service
cp -r kbase-project-service/* ../kbase-project-service/
cp pom.xml ../kbase-project-service/

# 5. Storage Service
mkdir ../kbase-storage-service
cp -r kbase-storage-service/* ../kbase-storage-service/
cp pom.xml ../kbase-storage-service/

# 6. Frontend
mkdir ../kbase-frontend
cp -r frontend/* ../kbase-frontend/

# 7. Infrastructure
mkdir ../kbase-infrastructure
cp docker-compose.yml ../kbase-infrastructure/
cp .env* ../kbase-infrastructure/
cp setup-ec2.sh ../kbase-infrastructure/
cp verify-deployment.sh ../kbase-infrastructure/
```

### Bước 3: Setup Individual CI/CD

Mỗi service repo sẽ có workflow riêng:

#### Service CI Workflow (Java)
```yaml
# .github/workflows/ci.yml trong từng service repo
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: docker.io
  IMAGE_NAME: ${{ secrets.DOCKER_USERNAME }}/${{ github.event.repository.name }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven

      - name: Build with Maven
        run: mvn clean package -DskipTests

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        if: github.event_name == 'push'
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

      - name: Deploy to EC2
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_PRIVATE_KEY }}
          port: ${{ secrets.EC2_PORT }}
          script: |
            cd /home/${{ secrets.EC2_USER }}/kbase-infrastructure

            # Pull latest code
            git pull origin main

            # Pull new image
            docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

            # Deploy specific service
            ./scripts/deploy-service.sh ${{ github.event.repository.name }}
```

#### Frontend CI Workflow
```yaml
# .github/workflows/ci.yml trong kbase-frontend
name: Frontend CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: docker.io
  IMAGE_NAME: ${{ secrets.DOCKER_USERNAME }}/kbase-frontend

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Login to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        if: github.event_name == 'push'
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ env.IMAGE_NAME }}:latest

      - name: Deploy to EC2
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_PRIVATE_KEY }}
          port: ${{ secrets.EC2_PORT }}
          script: |
            cd /home/${{ secrets.EC2_USER }}/kbase-infrastructure
            ./scripts/deploy-frontend.sh
```

### Bước 4: Infrastructure Repo

#### docker-compose.yml
```yaml
version: '3.9'

services:
  discovery-server:
    image: ${{DOCKER_USERNAME}}/kbase-discovery-server:latest
    ports:
      - "8761:8761"
    environment:
      - SPRING_PROFILES_ACTIVE=eureka
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8761/"]
      interval: 10s
      timeout: 5s
      retries: 3

  auth-service:
    image: ${{DOCKER_USERNAME}}/kbase-auth-service:latest
    ports:
      - "8081:8081"
    environment:
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://discovery-server:8761/eureka
    depends_on:
      discovery-server:
        condition: service_healthy

  api-gateway:
    image: ${{DOCKER_USERNAME}}/kbase-api-gateway:latest
    ports:
      - "8080:8080"
    environment:
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://discovery-server:8761/eureka
    depends_on:
      discovery-server:
        condition: service_healthy

  project-service:
    image: ${{DOCKER_USERNAME}}/kbase-project-service:latest
    ports:
      - "8083:8083"
    environment:
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://discovery-server:8761/eureka
    depends_on:
      discovery-server:
        condition: service_healthy

  storage-service:
    image: ${{DOCKER_USERNAME}}/kbase-storage-service:latest
    ports:
      - "8082:8082"
    environment:
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://discovery-server:8761/eureka
    depends_on:
      discovery-server:
        condition: service_healthy

  frontend:
    image: ${{DOCKER_USERNAME}}/kbase-frontend:latest
    ports:
      - "3000:3000"
```

#### Deploy Scripts

##### scripts/deploy-service.sh
```bash
#!/bin/bash

SERVICE_NAME=$1

echo "Deploying $SERVICE_NAME..."

# Stop specific service
docker-compose stop $SERVICE_NAME

# Remove old container
docker-compose rm -f $SERVICE_NAME

# Start with new image
docker-compose up -d $SERVICE_NAME

# Health check
sleep 10
docker-compose ps $SERVICE_NAME

echo "$SERVICE_NAME deployed successfully!"
```

##### scripts/deploy-frontend.sh
```bash
#!/bin/bash

echo "Deploying frontend..."

# Stop old frontend
docker stop kbase-frontend || true
docker rm kbase-frontend || true

# Start new frontend
docker run -d \
  --name kbase-frontend \
  -p 3000:3000 \
  --network kbase-network \
  ${{DOCKER_USERNAME}}/kbase-frontend:latest

echo "Frontend deployed successfully!"
```

### Bước 5: Update Parent POM

Mỗi service repo cần có parent POM riêng:

```xml
<!-- pom.xml trong từng service repo -->
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.kbase</groupId>
        <artifactId>kbase-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <artifactId>kbase-discovery-server</artifactId>  <!-- Thay đổi cho từng service -->
    <packaging>jar</packaging>

    <dependencies>
        <!-- Service specific dependencies -->
    </dependencies>
</project>
```

## 🔐 GitHub Secrets Setup

Mỗi repo cần có secrets riêng:

### Service Repos (auth, discovery, api-gateway, project, storage)
```
DOCKER_USERNAME = your-docker-username
DOCKER_PASSWORD = your-docker-token
EC2_HOST = your-ec2-ip
EC2_USER = ec2-user
EC2_PRIVATE_KEY = your-ssh-key
EC2_PORT = 22
```

### Infrastructure Repo
```
DOCKER_USERNAME = your-docker-username
DOCKER_PASSWORD = your-docker-token
```

## 📊 Workflow Triggers

| Repository | Trigger | Action |
|------------|---------|--------|
| kbase-discovery-server | Push `main` | Build → Push → Deploy |
| kbase-auth-service | Push `main` | Build → Push → Deploy |
| kbase-api-gateway | Push `main` | Build → Push → Deploy |
| kbase-project-service | Push `main` | Build → Push → Deploy |
| kbase-storage-service | Push `main` | Build → Push → Deploy |
| kbase-frontend | Push `main` | Build → Push → Deploy |
| kbase-infrastructure | Manual | Deploy all services |

## ✅ Benefits

### Independence (Độc Lập)
- ✅ Mỗi service có lifecycle riêng
- ✅ Deploy riêng không ảnh hưởng nhau
- ✅ Scale riêng từng service
- ✅ Debug riêng từng service

### Development (Phát Triển)
- ✅ Team có thể làm việc song song
- ✅ PR review riêng từng service
- ✅ Release riêng từng service
- ✅ Rollback riêng từng service

### Maintenance (Bảo Trì)
- ✅ CI/CD riêng từng service
- ✅ Monitoring riêng từng service
- ✅ Security riêng từng service
- ✅ Dependencies riêng từng service

## 🚀 Migration Timeline

### Phase 1: Setup Infrastructure (1-2 days)
- [ ] Tạo 7 GitHub repositories
- [ ] Setup infrastructure repo với docker-compose
- [ ] Configure EC2 với docker-compose

### Phase 2: Migrate Services (2-3 days)
- [ ] Extract discovery-server
- [ ] Extract auth-service
- [ ] Extract api-gateway
- [ ] Extract project-service
- [ ] Extract storage-service
- [ ] Extract frontend

### Phase 3: Setup CI/CD (1-2 days)
- [ ] Configure CI workflows cho từng service
- [ ] Setup secrets cho từng repo
- [ ] Test deployment từng service

### Phase 4: Go Live (1 day)
- [ ] Deploy all services
- [ ] Health check toàn bộ system
- [ ] Monitor và optimize

## 🛠️ Tools Needed

- GitHub CLI: `gh repo create`
- Git: Clone, push, pull
- Docker: Build, push, pull
- SSH: Access EC2
- Maven: Build Java services
- Node.js: Build frontend

## 📞 Next Steps

Bạn có muốn tôi:
1. **Tạo script tự động** để extract services?
2. **Setup infrastructure repo** trước?
3. **Tạo CI workflow templates** cho từng service type?
4. **Hướng dẫn migration step-by-step**?

Hãy cho tôi biết bạn muốn bắt đầu từ đâu! 🚀