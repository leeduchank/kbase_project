#!/bin/bash

# KBase Simple Repository Setup Script
# Usage: ./setup-repos-simple.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPOS=("kbase-discovery-server" "kbase-auth-service" "kbase-api-gateway" "kbase-project-service" "kbase-storage-service" "kbase-frontend" "kbase-infrastructure")

echo -e "${BLUE}=================================="
echo "KBase Simple Repository Setup"
echo "==================================${NC}"

# Function to setup repository
setup_repo() {
    local repo_name=$1
    local repo_path="./$repo_name"

    echo -e "${YELLOW}Setting up $repo_name...${NC}"

    # Check if directory exists
    if [[ ! -d "$repo_path" ]]; then
        echo -e "${RED}✗ Directory not found: $repo_path${NC}"
        return 1
    fi

    cd "$repo_path"

    # Remove any existing .git
    if [[ -d ".git" ]]; then
        rm -rf .git
    fi

    # Initialize new git repo
    git init
    git add .
    git commit -m "Initial commit: $repo_name"

    echo -e "${GREEN}✓ Repository $repo_name initialized${NC}"

    # Ask for GitHub URL
    echo -e "${YELLOW}Enter GitHub repository URL for $repo_name:${NC}"
    echo -e "${YELLOW}Example: https://github.com/your-org/$repo_name.git${NC}"
    read -r github_url

    if [[ -n "$github_url" ]]; then
        git remote add origin "$github_url"
        git push -u origin main
        echo -e "${GREEN}✓ Repository $repo_name pushed to GitHub${NC}"
    else
        echo -e "${YELLOW}⚠ Skipping GitHub push for $repo_name${NC}"
    fi

    cd - > /dev/null
}

# Function to remove root .git
remove_root_git() {
    echo -e "${YELLOW}Removing root .git directory...${NC}"
    if [[ -d ".git" ]]; then
        rm -rf .git
        echo -e "${GREEN}✓ Root .git removed${NC}"
    else
        echo -e "${YELLOW}No root .git found${NC}"
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}This script will:${NC}"
    echo "1. Remove root .git directory"
    echo "2. Create separate .git for each service"
    echo "3. Push each service to its GitHub repository"
    echo ""

    echo -e "${YELLOW}Continue? (y/N):${NC}"
    read -r confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo -e "${RED}Operation cancelled${NC}"
        exit 0
    fi

    # Remove root .git
    remove_root_git

    echo ""

    # Setup each repository
    for repo in "${REPOS[@]}"; do
        setup_repo "$repo"
        echo ""
    done

    echo -e "${GREEN}=================================="
    echo "All repositories setup complete!"
    echo "==================================${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Configure GitHub Secrets for each repository"
    echo "2. Setup EC2 infrastructure"
    echo "3. Test CI/CD pipelines"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Run main function
main "$@"