#!/bin/bash

# Deployment Verification Script
# Run this after deployment to verify all services are running correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================="
echo "KBase Deployment Verification"
echo "==================================${NC}"

# Configuration
SERVICES=("discovery-server" "auth-service" "api-gateway" "project-service" "storage-service")
EC2_HOST="${1:-localhost}"
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_WAIT=5

# Function to check service health
check_service_health() {
    local service=$1
    local port=$2
    local endpoint=$3
    
    echo -ne "  Checking $service..."
    
    for attempt in $(seq 1 $HEALTH_CHECK_RETRIES); do
        if nc -z $EC2_HOST $port 2>/dev/null; then
            echo -e " ${GREEN}✓ OK${NC}"
            return 0
        fi
        echo -ne "."
        sleep $HEALTH_CHECK_WAIT
    done
    
    echo -e " ${RED}✗ FAILED${NC}"
    return 1
}

# Function to check Docker container
check_container() {
    local container=$1
    
    echo -ne "  Checking container $container..."
    
    if docker ps | grep -q "$container"; then
        echo -e " ${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e " ${RED}✗ Not running${NC}"
        return 1
    fi
}

echo ""
echo -e "${YELLOW}1. Checking EC2 Connectivity${NC}"
if ping -c 1 $EC2_HOST &> /dev/null; then
    echo -e "  ${GREEN}✓ EC2 host is reachable${NC}"
else
    echo -e "  ${RED}✗ Cannot reach EC2 host${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}2. Checking Docker Status${NC}"
if ssh ec2-user@$EC2_HOST "docker ps" &> /dev/null; then
    echo -e "  ${GREEN}✓ Docker daemon is running${NC}"
else
    echo -e "  ${RED}✗ Cannot connect to Docker daemon${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}3. Checking running containers${NC}"
RUNNING=$(ssh ec2-user@$EC2_HOST "docker compose ps --format '{{.Service}}'" 2>/dev/null | wc -l)
echo "  $RUNNING services running"

echo ""
echo -e "${YELLOW}4. Checking Service Health${NC}"

check_service_health "Discovery Server" 8761 "/eureka"
check_service_health "Auth Service" 8081 "/actuator/health"
check_service_health "API Gateway" 8080 "/actuator/health"
check_service_health "Project Service" 8083 "/actuator/health"
check_service_health "Storage Service" 8082 "/actuator/health"

echo ""
echo -e "${YELLOW}5. Checking Service Logs${NC}"
ssh ec2-user@$EC2_HOST "docker compose logs --tail=5" | head -20

echo ""
echo -e "${YELLOW}6. Checking EC2 Resources${NC}"
echo "  Disk Usage:"
ssh ec2-user@$EC2_HOST "df -h /" | tail -1 | awk '{print "    Used: " $3 " / Available: " $4 " (" $5 ")"}'

echo "  Memory Usage:"
ssh ec2-user@$EC2_HOST "free -h | grep Mem" | awk '{print "    Used: " $3 " / Available: " $7}'

echo "  Docker Disk:"
ssh ec2-user@$EC2_HOST "docker system df" | grep -E "^Images|^Containers' | tail -2

echo ""
echo -e "${YELLOW}7. Database Connectivity Check${NC}"
echo -ne "  Auth Service DB..."
ssh ec2-user@$EC2_HOST "docker compose exec -T auth-service curl -s http://localhost:8081/actuator/health | grep -q 'UP'" && echo -e " ${GREEN}✓ OK${NC}" || echo -e " ${RED}✗ Failed${NC}"

echo ""
echo -e "${YELLOW}8. Frontend Status${NC}"
FRONTEND_CHECK=$(ssh ec2-user@$EC2_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" 2>/dev/null)
if [ "$FRONTEND_CHECK" == "200" ] || [ "$FRONTEND_CHECK" == "301" ]; then
    echo -e "  ${GREEN}✓ Frontend is accessible (HTTP $FRONTEND_CHECK)${NC}"
else
    echo -e "  ${YELLOW}! Frontend HTTP $FRONTEND_CHECK${NC}"
fi

echo ""
echo -e "${YELLOW}9. API Gateway Status${NC}"
API_RESPONSE=$(ssh ec2-user@$EC2_HOST "curl -s http://localhost:8080/actuator/health 2>/dev/null")
if echo "$API_RESPONSE" | grep -q '"status":"UP"'; then
    echo -e "  ${GREEN}✓ API Gateway is healthy${NC}"
else
    echo -e "  ${RED}✗ API Gateway is not healthy${NC}"
    echo "  Response: $API_RESPONSE"
fi

echo ""
echo -e "${YELLOW}10. Eureka Service Registry${NC}"
EUREKA_RESPONSE=$(ssh ec2-user@$EC2_HOST "curl -s http://localhost:8761/eureka/apps/json 2>/dev/null | grep -o '\"applications\"'")
if [ ! -z "$EUREKA_RESPONSE" ]; then
    REGISTERED=$(ssh ec2-user@$EC2_HOST "curl -s http://localhost:8761/eureka/apps/json 2>/dev/null | grep -o '\"instance\"' | wc -l")
    echo -e "  ${GREEN}✓ $REGISTERED services registered in Eureka${NC}"
else
    echo -e "  ${RED}✗ Cannot connect to Eureka${NC}"
fi

echo ""
echo -e "${BLUE}=================================="
echo "Verification Complete!"
echo "==================================${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor services: ssh ec2-user@$EC2_HOST './monitor.sh'"
echo "2. View logs: ssh ec2-user@$EC2_HOST 'docker compose logs -f'"
echo "3. Run tests: ssh ec2-user@$EC2_HOST 'cd ~/kbase && ./health-check.sh'"
