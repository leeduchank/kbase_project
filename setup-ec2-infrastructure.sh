#!/bin/bash

# KBase EC2 Infrastructure Setup Script
# Usage: ./setup-ec2-infrastructure.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOCKER_COMPOSE_VERSION="2.24.0"
DOCKER_VERSION="24.0.6"
JAVA_VERSION="17"
NODE_VERSION="18"

echo -e "${BLUE}=================================="
echo "KBase EC2 Infrastructure Setup"
echo "==================================${NC}"

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}This script should not be run as root. Please run as a regular user with sudo access.${NC}"
        exit 1
    fi
}

# Function to update system
update_system() {
    echo -e "${YELLOW}Updating system packages...${NC}"
    sudo apt update && sudo apt upgrade -y
    echo -e "${GREEN}✓ System updated${NC}"
}

# Function to install Java
install_java() {
    echo -e "${YELLOW}Installing OpenJDK $JAVA_VERSION...${NC}"

    # Remove any existing Java installations
    sudo apt remove -y openjdk-* || true

    # Install OpenJDK 17
    sudo apt install -y openjdk-$JAVA_VERSION-jdk

    # Set JAVA_HOME
    JAVA_HOME="/usr/lib/jvm/java-$JAVA_VERSION-openjdk-amd64"
    echo "export JAVA_HOME=$JAVA_HOME" | sudo tee -a /etc/profile.d/java.sh
    echo "export PATH=\$JAVA_HOME/bin:\$PATH" | sudo tee -a /etc/profile.d/java.sh

    # Verify installation
    java -version
    echo -e "${GREEN}✓ Java $JAVA_VERSION installed${NC}"
}

# Function to install Node.js
install_nodejs() {
    echo -e "${YELLOW}Installing Node.js $NODE_VERSION...${NC}"

    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Verify installation
    node --version
    npm --version
    echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"
}

# Function to install Docker
install_docker() {
    echo -e "${YELLOW}Installing Docker...${NC}"

    # Remove old versions
    sudo apt remove -y docker docker-engine docker.io containerd runc || true

    # Install prerequisites
    sudo apt install -y ca-certificates curl gnupg lsb-release

    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Set up repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add user to docker group
    sudo usermod -aG docker $USER

    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker

    # Verify installation
    docker --version
    docker compose version
    echo -e "${GREEN}✓ Docker installed${NC}"
}

# Function to install Docker Compose (standalone)
install_docker_compose() {
    echo -e "${YELLOW}Installing Docker Compose...${NC}"

    # Download Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/v$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

    # Make executable
    sudo chmod +x /usr/local/bin/docker-compose

    # Verify installation
    docker-compose --version
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
}

# Function to install Maven
install_maven() {
    echo -e "${YELLOW}Installing Maven...${NC}"

    # Download and install Maven
    MAVEN_VERSION="3.9.5"
    wget https://downloads.apache.org/maven/maven-3/$MAVEN_VERSION/binaries/apache-maven-$MAVEN_VERSION-bin.tar.gz
    sudo tar xf apache-maven-$MAVEN_VERSION-bin.tar.gz -C /opt
    sudo ln -sf /opt/apache-maven-$MAVEN_VERSION /opt/maven

    # Set MAVEN_HOME
    echo "export MAVEN_HOME=/opt/maven" | sudo tee -a /etc/profile.d/maven.sh
    echo "export PATH=\$MAVEN_HOME/bin:\$PATH" | sudo tee -a /etc/profile.d/maven.sh

    # Verify installation
    mvn -version
    echo -e "${GREEN}✓ Maven installed${NC}"

    # Cleanup
    rm apache-maven-$MAVEN_VERSION-bin.tar.gz
}

# Function to install Git
install_git() {
    echo -e "${YELLOW}Installing Git...${NC}"
    sudo apt install -y git
    git --version
    echo -e "${GREEN}✓ Git installed${NC}"
}

# Function to configure firewall
configure_firewall() {
    echo -e "${YELLOW}Configuring firewall...${NC}"

    # Install ufw if not present
    sudo apt install -y ufw

    # Allow SSH (important!)
    sudo ufw allow ssh
    sudo ufw allow 22

    # Allow application ports
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw allow 3000  # Frontend
    sudo ufw allow 8080  # API Gateway
    sudo ufw allow 8081  # Auth Service
    sudo ufw allow 8082  # Storage Service
    sudo ufw allow 8083  # Project Service
    sudo ufw allow 8761  # Discovery Server

    # Enable firewall
    echo "y" | sudo ufw enable

    # Check status
    sudo ufw status
    echo -e "${GREEN}✓ Firewall configured${NC}"
}

# Function to create application user
create_app_user() {
    echo -e "${YELLOW}Creating application user...${NC}"

    # Create user if it doesn't exist
    if ! id -u kbase > /dev/null 2>&1; then
        sudo useradd -m -s /bin/bash kbase
        sudo usermod -aG docker kbase
        echo -e "${GREEN}✓ User 'kbase' created${NC}"
    else
        echo -e "${YELLOW}User 'kbase' already exists${NC}"
    fi
}

# Function to setup application directory
setup_app_directory() {
    echo -e "${YELLOW}Setting up application directory...${NC}"

    # Create directory structure
    sudo mkdir -p /home/kbase/kbase-infrastructure
    sudo mkdir -p /home/kbase/logs
    sudo mkdir -p /home/kbase/data

    # Set ownership
    sudo chown -R kbase:kbase /home/kbase

    # Create basic docker-compose.yml placeholder
    sudo -u kbase tee /home/kbase/kbase-infrastructure/docker-compose.yml > /dev/null << 'EOF'
version: '3.8'

services:
  # Services will be added here by CI/CD pipelines
  # This file is managed by the kbase-infrastructure repository

networks:
  kbase-network:
    driver: bridge

volumes:
  kbase-data:
    driver: local
EOF

    echo -e "${GREEN}✓ Application directory setup${NC}"
}

# Function to setup monitoring
setup_monitoring() {
    echo -e "${YELLOW}Setting up basic monitoring...${NC}"

    # Install htop for process monitoring
    sudo apt install -y htop

    # Install net-tools for network monitoring
    sudo apt install -y net-tools

    # Create monitoring script
    sudo tee /home/kbase/monitor.sh > /dev/null << 'EOF'
#!/bin/bash

echo "=== KBase System Monitor ==="
echo "Date: $(date)"
echo ""

echo "=== Docker Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "=== System Resources ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'
echo ""

echo "Memory Usage:"
free -h
echo ""

echo "Disk Usage:"
df -h /
echo ""

echo "=== Network Connections ==="
netstat -tlnp | grep LISTEN
echo ""

echo "=== Recent Logs ==="
tail -20 /home/kbase/logs/*.log 2>/dev/null || echo "No logs found"
echo "=========================="
EOF

    sudo chmod +x /home/kbase/monitor.sh
    sudo chown kbase:kbase /home/kbase/monitor.sh

    echo -e "${GREEN}✓ Basic monitoring setup${NC}"
}

# Function to create systemd service for monitoring
create_monitoring_service() {
    echo -e "${YELLOW}Creating monitoring service...${NC}"

    sudo tee /etc/systemd/system/kbase-monitor.service > /dev/null << 'EOF'
[Unit]
Description=KBase System Monitor
After=network.target

[Service]
Type=oneshot
User=kbase
ExecStart=/home/kbase/monitor.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable kbase-monitor.service

    echo -e "${GREEN}✓ Monitoring service created${NC}"
}

# Function to setup log rotation
setup_log_rotation() {
    echo -e "${YELLOW}Setting up log rotation...${NC}"

    sudo tee /etc/logrotate.d/kbase > /dev/null << 'EOF'
/home/kbase/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 kbase kbase
    postrotate
        docker-compose -f /home/kbase/kbase-infrastructure/docker-compose.yml logs -f > /dev/null 2>&1 || true
    endscript
}
EOF

    echo -e "${GREEN}✓ Log rotation configured${NC}"
}

# Function to create deployment verification script
create_verification_script() {
    echo -e "${YELLOW}Creating deployment verification script...${NC}"

    sudo -u kbase tee /home/kbase/verify-deployment.sh > /dev/null << 'EOF'
#!/bin/bash

# KBase Deployment Verification Script

echo "=== KBase Deployment Verification ==="
echo "Timestamp: $(date)"
echo ""

# Function to check service health
check_service() {
    local service=$1
    local port=$2
    local endpoint=${3:-"/actuator/health"}

    echo -n "Checking $service ($port)... "

    if curl -s -f "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        echo "✓ UP"
        return 0
    else
        echo "✗ DOWN"
        return 1
    fi
}

# Check Docker containers
echo "=== Docker Containers Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check services
echo "=== Services Health Check ==="
failed_services=0

check_service "discovery-server" 8761 || ((failed_services++))
check_service "auth-service" 8081 || ((failed_services++))
check_service "api-gateway" 8080 || ((failed_services++))
check_service "project-service" 8083 || ((failed_services++))
check_service "storage-service" 8082 || ((failed_services++))
check_service "frontend" 3000 "/" || ((failed_services++))

echo ""
echo "=== Summary ==="
if [ $failed_services -eq 0 ]; then
    echo "✓ All services are running successfully!"
    exit 0
else
    echo "✗ $failed_services service(s) failed health check"
    exit 1
fi
EOF

    sudo chmod +x /home/kbase/verify-deployment.sh

    echo -e "${GREEN}✓ Verification script created${NC}"
}

# Function to display completion message
completion_message() {
    echo ""
    echo -e "${GREEN}=================================="
    echo "Infrastructure Setup Complete!"
    echo "==================================${NC}"
    echo ""
    echo -e "${YELLOW}What was installed:${NC}"
    echo "✓ OpenJDK $JAVA_VERSION"
    echo "✓ Node.js $NODE_VERSION"
    echo "✓ Docker & Docker Compose"
    echo "✓ Maven"
    echo "✓ Git"
    echo "✓ Firewall configuration"
    echo "✓ Application user (kbase)"
    echo "✓ Application directory structure"
    echo "✓ Basic monitoring tools"
    echo "✓ Log rotation"
    echo "✓ Deployment verification script"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Reboot the system to apply all changes:"
    echo "   sudo reboot"
    echo ""
    echo "2. After reboot, switch to kbase user:"
    echo "   su - kbase"
    echo ""
    echo "3. Clone the infrastructure repository:"
    echo "   git clone https://github.com/your-org/kbase-infrastructure.git"
    echo ""
    echo "4. Setup environment variables:"
    echo "   cp .env.template .env"
    echo "   # Edit .env with your values"
    echo ""
    echo "5. Run the migration script on your local machine"
    echo ""
    echo -e "${GREEN}Happy deploying! 🚀${NC}"
}

# Main execution
main() {
    check_root

    echo -e "${YELLOW}Starting EC2 infrastructure setup...${NC}"
    echo "This will take several minutes..."
    echo ""

    update_system
    install_java
    install_nodejs
    install_docker
    install_docker_compose
    install_maven
    install_git
    configure_firewall
    create_app_user
    setup_app_directory
    setup_monitoring
    create_monitoring_service
    setup_log_rotation
    create_verification_script

    completion_message
}

# Run main function
main "$@"