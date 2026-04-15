#!/bin/bash

# EC2 Setup Script for KBase CI/CD Deployment
# Usage: ./setup-ec2.sh

set -e

echo "======================================"
echo "KBase EC2 Setup for CI/CD"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

echo -e "${YELLOW}Step 1: Update system${NC}"
yum update -y || apt-get update -y

echo -e "${YELLOW}Step 2: Install Docker${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}Docker already installed${NC}"
else
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}Docker installed successfully${NC}"
fi

echo -e "${YELLOW}Step 3: Install Docker Compose${NC}"
DOCKER_COMPOSE_VERSION="v2.20.0"
DOCKER_COMPOSE_URL="https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)"

sudo curl -L "$DOCKER_COMPOSE_URL" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
echo -e "${GREEN}Docker Compose $(docker-compose --version) installed${NC}"

echo -e "${YELLOW}Step 4: Install Git${NC}"
if command -v git &> /dev/null; then
    echo -e "${GREEN}Git already installed${NC}"
else
    yum install git -y || apt-get install git -y
fi

echo -e "${YELLOW}Step 5: Create application directory${NC}"
APP_USER="${1:-ec2-user}"
APP_DIR="/home/$APP_USER/kbase"

mkdir -p "$APP_DIR"
chown -R $APP_USER:$APP_USER "$APP_DIR"
echo -e "${GREEN}Application directory created at $APP_DIR${NC}"

echo -e "${YELLOW}Step 6: Add user to docker group${NC}"
usermod -aG docker $APP_USER
echo -e "${GREEN}User $APP_USER added to docker group${NC}"

echo -e "${YELLOW}Step 7: Create .env template${NC}"
cat > "$APP_DIR/.env.template" << 'EOF'
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

chown $APP_USER:$APP_USER "$APP_DIR/.env.template"
echo -e "${GREEN}.env template created. Please copy to .env and fill in values${NC}"

echo -e "${YELLOW}Step 8: Create health check script${NC}"
cat > "$APP_DIR/health-check.sh" << 'EOF'
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
echo "=================================="
EOF

chmod +x "$APP_DIR/health-check.sh"
chown $APP_USER:$APP_USER "$APP_DIR/health-check.sh"
echo -e "${GREEN}Health check script created${NC}"

echo -e "${YELLOW}Step 9: Create backup script${NC}"
cat > "$APP_DIR/backup.sh" << 'EOF'
#!/bin/bash

# Backup script for databases and volumes
BACKUP_DIR="/home/ec2-user/kbase/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "=== Starting backup at $TIMESTAMP ==="
docker-compose exec -T mysql mysqldump -u$DB_USER -p$DB_PASSWORD --all-databases > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
echo "✓ Database backup completed"

# Keep only last 7 backups
find "$BACKUP_DIR" -type f -name "backup_*.sql" -mtime +7 -delete
echo "✓ Old backups cleaned up"
echo "=================================="
EOF

chmod +x "$APP_DIR/backup.sh"
chown $APP_USER:$APP_USER "$APP_DIR/backup.sh"
echo -e "${GREEN}Backup script created${NC}"

echo -e "${YELLOW}Step 10: Configure SSH for GitHub Actions${NC}"
cat > "$APP_DIR/setup-ssh.md" << 'EOF'
# SSH Configuration for GitHub Actions

## Steps to configure SSH access:

1. Create SSH key pair (if not exists):
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-kbase
   ```

2. Add public key to EC2 authorized_keys:
   ```bash
   cat ~/.ssh/github-kbase.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

3. Copy private key content:
   ```bash
   cat ~/.ssh/github-kbase
   ```

4. Add to GitHub Secrets:
   - Go to: Settings → Secrets and variables → Actions
   - Create new secret: EC2_PRIVATE_KEY
   - Paste private key content

5. Other secrets needed:
   - EC2_HOST: Your EC2 public IP
   - EC2_USER: ec2-user or ubuntu
   - EC2_PORT: 22 (or custom port)
EOF

chown $APP_USER:$APP_USER "$APP_DIR/setup-ssh.md"
echo -e "${GREEN}SSH setup guide created${NC}"

echo -e "${YELLOW}Step 11: Create monitoring script${NC}"
cat > "$APP_DIR/monitor.sh" << 'EOF'
#!/bin/bash

# Continuous monitoring script
while true; do
    clear
    echo "=== KBase Services Monitoring ==="
    echo "Updated at: $(date +%Y-%m-%d\ %H:%M:%S)"
    echo ""
    
    echo "Docker Container Status:"
    docker-compose ps
    
    echo ""
    echo "Docker Disk Usage:"
    docker system df
    
    echo ""
    echo "EC2 Disk Usage:"
    df -h | grep -E 'Filesystem|/dev/xvda'
    
    echo ""
    echo "Memory Usage:"
    free -h
    
    sleep 10
done
EOF

chmod +x "$APP_DIR/monitor.sh"
chown $APP_USER:$APP_USER "$APP_DIR/monitor.sh"
echo -e "${GREEN}Monitoring script created${NC}"

echo ""
echo -e "${GREEN}======================================"
echo "Setup completed successfully!"
echo "======================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy project to $APP_DIR:"
echo "   sudo -u $APP_USER git clone <repo-url> $APP_DIR"
echo ""
echo "2. Configure environment variables:"
echo "   cp $APP_DIR/.env.template $APP_DIR/.env"
echo "   nano $APP_DIR/.env"
echo ""
echo "3. Setup SSH for GitHub Actions:"
echo "   cat $APP_DIR/setup-ssh.md"
echo ""
echo "4. Test deployment:"
echo "   cd $APP_DIR && docker-compose up -d"
echo ""
echo "5. Monitor services:"
echo "   $APP_DIR/monitor.sh"
echo ""
