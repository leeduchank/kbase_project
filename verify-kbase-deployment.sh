#!/bin/bash

# KBase Deployment Verification Script
# Usage: ./verify-deployment.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
INFRA_DIR="/home/kbase/kbase-infrastructure"
SERVICES=("discovery-server" "auth-service" "api-gateway" "project-service" "storage-service")
FRONTEND_PORT=3000

echo -e "${BLUE}=================================="
echo "KBase Deployment Verification"
echo "==================================${NC}"

# Function to check if script is run as kbase user
check_user() {
    if [[ $USER != "kbase" ]]; then
        echo -e "${YELLOW}Warning: This script should be run as 'kbase' user${NC}"
        echo -e "${YELLOW}Current user: $USER${NC}"
        echo ""
    fi
}

# Function to check Docker installation
check_docker() {
    echo -e "${YELLOW}Checking Docker installation...${NC}"

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker is not installed${NC}"
        return 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}✗ Docker Compose is not installed${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
    docker --version
    docker-compose --version
    return 0
}

# Function to check infrastructure directory
check_infrastructure() {
    echo -e "${YELLOW}Checking infrastructure directory...${NC}"

    if [[ ! -d "$INFRA_DIR" ]]; then
        echo -e "${RED}✗ Infrastructure directory not found: $INFRA_DIR${NC}"
        return 1
    fi

    if [[ ! -f "$INFRA_DIR/docker-compose.yml" ]]; then
        echo -e "${RED}✗ docker-compose.yml not found in $INFRA_DIR${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ Infrastructure directory exists${NC}"
    return 0
}

# Function to check Docker containers
check_containers() {
    echo -e "${YELLOW}Checking Docker containers...${NC}"

    local running_containers=$(docker ps --format "{{.Names}}" | wc -l)
    local total_containers=$(docker ps -a --format "{{.Names}}" | wc -l)

    echo "Running containers: $running_containers"
    echo "Total containers: $total_containers"

    if [[ $running_containers -eq 0 ]]; then
        echo -e "${RED}✗ No containers are running${NC}"
        return 1
    fi

    echo ""
    echo "Container Status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo -e "${GREEN}✓ Containers are running${NC}"
    return 0
}

# Function to check service health
check_service_health() {
    local service=$1
    local port=$2
    local endpoint=${3:-"/actuator/health"}
    local timeout=${4:-30}

    echo -e "${YELLOW}Checking $service health (port $port)...${NC}"

    # Wait for service to be ready
    local count=0
    while [[ $count -lt $timeout ]]; do
        if curl -s -f --max-time 5 "http://localhost:$port$endpoint" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service is healthy${NC}"
            return 0
        fi

        echo -n "."
        sleep 2
        ((count+=2))
    done

    echo -e "${RED}✗ $service health check failed after ${timeout}s${NC}"
    return 1
}

# Function to check frontend health
check_frontend_health() {
    echo -e "${YELLOW}Checking frontend health...${NC}"

    # Check if frontend container is running
    if ! docker ps --format "{{.Names}}" | grep -q "kbase-frontend"; then
        echo -e "${RED}✗ Frontend container is not running${NC}"
        return 1
    fi

    # Check HTTP response
    if curl -s -f --max-time 10 "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is responding${NC}"
        return 0
    else
        echo -e "${RED}✗ Frontend is not responding on port $FRONTEND_PORT${NC}"
        return 1
    fi
}

# Function to check service dependencies
check_service_dependencies() {
    echo -e "${YELLOW}Checking service dependencies...${NC}"

    # Check if discovery server is running first
    if ! docker-compose -f "$INFRA_DIR/docker-compose.yml" ps discovery-server | grep -q "Up"; then
        echo -e "${RED}✗ Discovery server is not running. Other services may fail to register.${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ Discovery server is running${NC}"
    return 0
}

# Function to check network connectivity
check_network() {
    echo -e "${YELLOW}Checking network connectivity...${NC}"

    # Check if services can communicate
    local discovery_ip=$(docker inspect kbase-discovery-server 2>/dev/null | grep -o '"IPAddress": "[^"]*"' | head -1 | cut -d'"' -f4)

    if [[ -z "$discovery_ip" ]]; then
        echo -e "${RED}✗ Cannot get discovery server IP${NC}"
        return 1
    fi

    echo "Discovery server IP: $discovery_ip"

    # Test network connectivity from another container
    if docker run --rm --network kbase-network curlimages/curl -s --max-time 5 "http://kbase-discovery-server:8761" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Inter-service network connectivity is working${NC}"
        return 0
    else
        echo -e "${RED}✗ Inter-service network connectivity failed${NC}"
        return 1
    fi
}

# Function to check logs for errors
check_logs() {
    echo -e "${YELLOW}Checking recent logs for errors...${NC}"

    local error_count=0

    # Check logs for each service
    for service in "${SERVICES[@]}"; do
        local log_errors=$(docker-compose -f "$INFRA_DIR/docker-compose.yml" logs --tail=50 "$service" 2>&1 | grep -i error | wc -l)

        if [[ $log_errors -gt 0 ]]; then
            echo -e "${RED}⚠ $service has $log_errors error(s) in recent logs${NC}"
            ((error_count+=log_errors))
        fi
    done

    # Check frontend logs
    if docker ps --format "{{.Names}}" | grep -q "kbase-frontend"; then
        local frontend_errors=$(docker logs kbase-frontend --tail 50 2>&1 | grep -i error | wc -l)
        if [[ $frontend_errors -gt 0 ]]; then
            echo -e "${RED}⚠ Frontend has $frontend_errors error(s) in recent logs${NC}"
            ((error_count+=frontend_errors))
        fi
    fi

    if [[ $error_count -eq 0 ]]; then
        echo -e "${GREEN}✓ No errors found in recent logs${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Found $error_count error(s) in logs. Check logs manually for details.${NC}"
        return 1
    fi
}

# Function to check system resources
check_resources() {
    echo -e "${YELLOW}Checking system resources...${NC}"

    # Check memory usage
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    echo "Memory usage: ${mem_usage}%"

    if [[ $mem_usage -gt 90 ]]; then
        echo -e "${RED}⚠ High memory usage: ${mem_usage}%${NC}"
    elif [[ $mem_usage -gt 80 ]]; then
        echo -e "${YELLOW}⚠ Moderate memory usage: ${mem_usage}%${NC}"
    else
        echo -e "${GREEN}✓ Memory usage is acceptable${NC}"
    fi

    # Check disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "Disk usage: ${disk_usage}%"

    if [[ $disk_usage -gt 90 ]]; then
        echo -e "${RED}⚠ High disk usage: ${disk_usage}%${NC}"
    elif [[ $disk_usage -gt 80 ]]; then
        echo -e "${YELLOW}⚠ Moderate disk usage: ${disk_usage}%${NC}"
    else
        echo -e "${GREEN}✓ Disk usage is acceptable${NC}"
    fi

    # Check Docker disk usage
    local docker_disk=$(docker system df 2>/dev/null | grep "Total" | awk '{print $3}' | sed 's/%//')
    if [[ -n "$docker_disk" ]]; then
        echo "Docker disk usage: ${docker_disk}%"
        if [[ $docker_disk -gt 80 ]]; then
            echo -e "${YELLOW}⚠ High Docker disk usage. Consider cleaning up unused images.${NC}"
        fi
    fi
}

# Function to generate report
generate_report() {
    local report_file="/home/kbase/deployment-report-$(date +%Y%m%d-%H%M%S).txt"

    echo -e "${YELLOW}Generating deployment report...${NC}"

    {
        echo "KBase Deployment Report"
        echo "Generated: $(date)"
        echo "Server: $(hostname)"
        echo "User: $(whoami)"
        echo ""
        echo "=== System Information ==="
        echo "OS: $(lsb_release -d 2>/dev/null | cut -f2 || uname -s)"
        echo "Kernel: $(uname -r)"
        echo "Uptime: $(uptime -p)"
        echo ""
        echo "=== Docker Information ==="
        docker --version
        docker-compose --version
        echo ""
        echo "=== Container Status ==="
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo "=== Service Health ==="
        for service in "${SERVICES[@]}"; do
            local port_var="${service^^}_PORT"
            local port="${!port_var:-8080}"
            if curl -s -f --max-time 5 "http://localhost:$port/actuator/health" > /dev/null 2>&1; then
                echo "$service: HEALTHY"
            else
                echo "$service: UNHEALTHY"
            fi
        done
        if curl -s -f --max-time 5 "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
            echo "frontend: HEALTHY"
        else
            echo "frontend: UNHEALTHY"
        fi
        echo ""
        echo "=== Resource Usage ==="
        echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
        echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
        echo ""
        echo "=== Recent Errors ==="
        for service in "${SERVICES[@]}"; do
            echo "--- $service errors ---"
            docker-compose -f "$INFRA_DIR/docker-compose.yml" logs --tail=10 "$service" 2>&1 | grep -i error || echo "No errors"
        done
    } > "$report_file"

    echo -e "${GREEN}✓ Report generated: $report_file${NC}"
}

# Function to display summary
display_summary() {
    local total_checks=$1
    local passed_checks=$2
    local failed_checks=$3

    echo ""
    echo -e "${BLUE}=================================="
    echo "Verification Summary"
    echo -e "==================================${NC}"
    echo "Total checks: $total_checks"
    echo -e "${GREEN}Passed: $passed_checks${NC}"
    echo -e "${RED}Failed: $failed_checks${NC}"

    if [[ $failed_checks -eq 0 ]]; then
        echo ""
        echo -e "${GREEN}🎉 All checks passed! Deployment is successful.${NC}"
        return 0
    else
        local success_rate=$((passed_checks * 100 / total_checks))
        echo ""
        echo -e "${YELLOW}⚠ $success_rate% success rate. Some issues need attention.${NC}"
        return 1
    fi
}

# Main execution
main() {
    check_user

    local total_checks=0
    local passed_checks=0
    local failed_checks=0

    # Run all checks
    checks=(
        "check_docker"
        "check_infrastructure"
        "check_containers"
        "check_service_dependencies"
        "check_network"
        "check_logs"
        "check_resources"
    )

    for check_func in "${checks[@]}"; do
        ((total_checks++))
        if $check_func; then
            ((passed_checks++))
        else
            ((failed_checks++))
        fi
        echo ""
    done

    # Service health checks
    for service in "${SERVICES[@]}"; do
        ((total_checks++))
        case $service in
            "discovery-server") port=8761 ;;
            "auth-service") port=8081 ;;
            "api-gateway") port=8080 ;;
            "project-service") port=8083 ;;
            "storage-service") port=8082 ;;
            *) port=8080 ;;
        esac

        if check_service_health "$service" "$port"; then
            ((passed_checks++))
        else
            ((failed_checks++))
        fi
        echo ""
    done

    # Frontend health check
    ((total_checks++))
    if check_frontend_health; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    echo ""

    # Generate report
    generate_report

    # Display summary
    display_summary "$total_checks" "$passed_checks" "$failed_checks"
}

# Run main function
main "$@"