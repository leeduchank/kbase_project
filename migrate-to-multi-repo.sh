#!/bin/bash

# KBase Multi-Repo Migration Script
# Usage: ./migrate-to-multi-repo.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MONO_REPO_PATH="$(pwd)"
TEMP_DIR="/tmp/kbase-migration"
SERVICES=("discovery-server" "auth-service" "api-gateway" "project-service" "storage-service")
FRONTEND="frontend"
INFRASTRUCTURE="infrastructure"

echo -e "${BLUE}=================================="
echo "KBase Multi-Repo Migration"
echo "==================================${NC}"

# Function to create service repo
create_service_repo() {
    local service=$1
    local repo_name="kbase-$service"
    local repo_path="$TEMP_DIR/$repo_name"

    echo -e "${YELLOW}Creating $repo_name...${NC}"

    # Create directory
    mkdir -p "$repo_path"

    # Copy service files
    if [ -d "$MONO_REPO_PATH/kbase-$service" ]; then
        cp -r "$MONO_REPO_PATH/kbase-$service"/* "$repo_path/"
    fi

    # Copy parent POM
    cp "$MONO_REPO_PATH/pom.xml" "$repo_path/"

    # Create .gitignore
    cat > "$repo_path/.gitignore" << 'EOF'
target/
*.log
.env
.env.local
.DS_Store
.vscode/
.idea/
*.iml
EOF

    # Create README
    cat > "$repo_path/README.md" << EOF
# KBase $service

## Overview
This is the $service component of KBase microservices architecture.

## Development

### Prerequisites
- Java 17
- Maven 3.6+
- Docker

### Build
```bash
mvn clean package
```

### Run
```bash
docker build -t kbase-$service .
docker run -p 8080:8080 kbase-$service
```

## API Documentation
- Health Check: `GET /actuator/health`
- API Docs: `GET /swagger-ui.html`

## Contributing
1. Create feature branch
2. Make changes
3. Run tests
4. Create PR to main branch
EOF

    # Create GitHub Actions workflow
    mkdir -p "$repo_path/.github/workflows"
    create_ci_workflow "$repo_path" "$service"

    echo -e "${GREEN}✓ $repo_name created${NC}"
}

# Function to create CI workflow
create_ci_workflow() {
    local repo_path=$1
    local service=$2

    cat > "$repo_path/.github/workflows/ci.yml" << EOF
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: docker.io
  IMAGE_NAME: \${{ secrets.DOCKER_USERNAME }}/kbase-$service

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven

      - name: Build with Maven
        run: |
          mvn clean package -DskipTests

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKER_USERNAME }}
          password: \${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        if: github.event_name == 'push'
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}

      - name: Build Docker image (PR only)
        if: github.event_name == 'pull_request'
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: false

      - name: Deploy to EC2
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: appleboy/ssh-action@master
        with:
          host: \${{ secrets.EC2_HOST }}
          username: \${{ secrets.EC2_USER }}
          key: \${{ secrets.EC2_PRIVATE_KEY }}
          port: \${{ secrets.EC2_PORT }}

          script: |
            cd /home/\${{ secrets.EC2_USER }}/kbase-infrastructure

            # Pull latest code
            git pull origin main

            # Stop current service
            docker-compose stop $service || true

            # Pull latest image
            docker pull \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:main

            # Start service with new image
            docker-compose up -d $service

            # Check service health
            sleep 5
            docker-compose ps $service
EOF
}

# Function to create frontend repo
create_frontend_repo() {
    local repo_name="kbase-frontend"
    local repo_path="$TEMP_DIR/$repo_name"

    echo -e "${YELLOW}Creating $repo_name...${NC}"

    mkdir -p "$repo_path"
    cp -r "$MONO_REPO_PATH/frontend"/* "$repo_path/"

    # Create .gitignore
    cat > "$repo_path/.gitignore" << 'EOF'
.next/
out/
node_modules/
*.log
.env
.env.local
.DS_Store
.vscode/
.idea/
*.iml
EOF

    # Create README
    cat > "$repo_path/README.md" << 'EOF'
# KBase Frontend

## Overview
Next.js frontend application for KBase platform.

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t kbase-frontend .
docker run -p 3000:3000 kbase-frontend
```

## Tech Stack
- Next.js 14
- React 18
- Redux Toolkit
- Tailwind CSS
- TypeScript

## Contributing
1. Create feature branch
2. Make changes
3. Run linting: `npm run lint`
4. Create PR to main branch
EOF

    # Create CI workflow for frontend
    mkdir -p "$repo_path/.github/workflows"
    create_frontend_ci_workflow "$repo_path"

    echo -e "${GREEN}✓ $repo_name created${NC}"
}

# Function to create frontend CI workflow
create_frontend_ci_workflow() {
    local repo_path=$1

    cat > "$repo_path/.github/workflows/ci.yml" << 'EOF'
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

    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint || true

      - name: Build Next.js
        run: npm run build

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: Create Dockerfile
        run: |
          cat > ./Dockerfile << 'DOCKER_EOF'
          FROM node:18-alpine AS builder
          WORKDIR /app
          COPY package*.json ./
          RUN npm ci
          COPY . .
          RUN npm run build

          FROM node:18-alpine
          WORKDIR /app
          ENV NODE_ENV=production
          COPY package*.json ./
          RUN npm ci --only=production
          COPY --from=builder /app/.next ./.next
          COPY --from=builder /app/public ./public
          EXPOSE 3000
          CMD ["npm", "start"]
          DOCKER_EOF

      - name: Build and push Docker image
        if: github.event_name == 'push'
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      - name: Build Docker image (PR only)
        if: github.event_name == 'pull_request'
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false

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

            # Pull latest frontend image
            docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main

            # Stop old frontend container
            docker rm -f kbase-frontend || true

            # Start new frontend container
            docker run -d \
              --name kbase-frontend \
              -p 3000:3000 \
              --network host \
              ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main

            # Check service health
            sleep 5
            docker ps | grep kbase-frontend
EOF
}

# Function to create infrastructure repo
create_infrastructure_repo() {
    local repo_name="kbase-infrastructure"
    local repo_path="$TEMP_DIR/$repo_name"

    echo -e "${YELLOW}Creating $repo_name...${NC}"

    mkdir -p "$repo_path"

    # Copy infrastructure files
    cp "$MONO_REPO_PATH/docker-compose.yml" "$repo_path/"
    cp "$MONO_REPO_PATH/setup-ec2.sh" "$repo_path/" 2>/dev/null || true
    cp "$MONO_REPO_PATH/verify-deployment.sh" "$repo_path/" 2>/dev/null || true

    # Create .env template
    cat > "$repo_path/.env.template" << 'EOF'
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
EOF

    # Create scripts directory
    mkdir -p "$repo_path/scripts"

    # Create deploy script
    cat > "$repo_path/scripts/deploy-service.sh" << 'EOF'
#!/bin/bash

SERVICE_NAME=$1

if [ -z "$SERVICE_NAME" ]; then
    echo "Usage: $0 <service-name>"
    exit 1
fi

echo "Deploying $SERVICE_NAME..."

# Stop specific service
docker-compose stop $SERVICE_NAME || true

# Remove old container
docker-compose rm -f $SERVICE_NAME || true

# Start with new image
docker-compose up -d $SERVICE_NAME

# Health check
sleep 10
docker-compose ps $SERVICE_NAME

echo "$SERVICE_NAME deployed successfully!"
EOF

    chmod +x "$repo_path/scripts/deploy-service.sh"

    # Create health check script
    cat > "$repo_path/scripts/health-check.sh" << 'EOF'
#!/bin/bash

# Health check for all services
services=("discovery-server" "auth-service" "api-gateway" "project-service" "storage-service")

echo "=== KBase Services Health Check ==="
for service in "${services[@]}"; do
    if docker-compose ps "$service" | grep -q "Up"; then
        echo "✓ $service: UP"
    else
        echo "✗ $service: DOWN"
    fi
done

# Check frontend
if docker ps | grep -q "kbase-frontend"; then
    echo "✓ frontend: UP"
else
    echo "✗ frontend: DOWN"
fi

echo "=================================="
EOF

    chmod +x "$repo_path/scripts/health-check.sh"

    # Create README
    cat > "$repo_path/README.md" << 'EOF'
# KBase Infrastructure

## Overview
Infrastructure repository for KBase microservices deployment and orchestration.

## Structure

### docker-compose.yml
Main orchestration file for all services:
- discovery-server (port 8761)
- auth-service (port 8081)
- api-gateway (port 8080)
- project-service (port 8083)
- storage-service (port 8082)
- frontend (port 3000)

### scripts/
- `deploy-service.sh`: Deploy individual service
- `health-check.sh`: Check all services health

### .env.template
Environment variables template for all services.

## Usage

### Deploy All Services
```bash
docker-compose up -d
```

### Deploy Specific Service
```bash
./scripts/deploy-service.sh auth-service
```

### Health Check
```bash
./scripts/health-check.sh
```

### View Logs
```bash
docker-compose logs -f
docker-compose logs -f auth-service
```

## Environment Setup

1. Copy environment template:
   ```bash
   cp .env.template .env
   ```

2. Fill in your values:
   - Database URLs and credentials
   - AWS S3 configuration
   - JWT secret
   - Eureka configuration

## Services Dependencies

```
discovery-server (no deps)
├── auth-service
├── api-gateway
├── project-service
└── storage-service
    └── frontend (separate container)
```

## Contributing

This repository is automatically updated by individual service CI/CD pipelines.
Manual changes should be made carefully as they affect all services.
EOF

    echo -e "${GREEN}✓ $repo_name created${NC}"
}

# Main execution
echo -e "${YELLOW}Setting up temporary directory...${NC}"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo -e "${YELLOW}Creating service repositories...${NC}"

# Create service repos
for service in "${SERVICES[@]}"; do
    create_service_repo "$service"
done

# Create frontend repo
create_frontend_repo

# Create infrastructure repo
create_infrastructure_repo

echo ""
echo -e "${GREEN}=================================="
echo "Migration Complete!"
echo "==================================${NC}"
echo ""
echo -e "${YELLOW}Generated repositories in: $TEMP_DIR${NC}"
echo ""
echo "Contents:"
ls -la "$TEMP_DIR"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Create GitHub repositories:"
for service in "${SERVICES[@]}"; do
    echo "   - kbase-$service"
done
echo "   - kbase-frontend"
echo "   - kbase-infrastructure"
echo ""
echo "2. Push each repo:"
echo "   cd $TEMP_DIR/kbase-xxx"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin https://github.com/your-org/kbase-xxx.git"
echo "   git push -u origin main"
echo ""
echo "3. Setup GitHub Secrets for each repo"
echo "4. Configure infrastructure repo on EC2"
echo "5. Test deployment"
echo ""
echo -e "${GREEN}Happy migrating! 🚀${NC}"