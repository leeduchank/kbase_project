name: Quick Start Checklist

on:
  - GitHub Actions CI/CD Setup Complete

## 🎯 Quick Start Checklist

### Phase 1: GitHub Configuration (5 mins)
- [ ] Fork/Clone repository to GitHub
- [ ] Go to Settings → Secrets and variables → Actions
- [ ] Add the following secrets:

```
DOCKER_USERNAME = your-docker-username
DOCKER_PASSWORD = your-docker-hub-token
EC2_HOST = your-ec2-public-ip
EC2_USER = ec2-user
EC2_PRIVATE_KEY = your-ssh-private-key-content
EC2_PORT = 22
```

### Phase 2: EC2 Preparation (10 mins)
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Download and run setup script
curl -O https://raw.githubusercontent.com/yourrepo/main/setup-ec2.sh
chmod +x setup-ec2.sh
sudo ./setup-ec2.sh
```

### Phase 3: Environment Configuration (10 mins)
```bash
# On EC2
cd ~/kbase
cp .env.template .env
nano .env
# Fill in your database, AWS, and JWT secret values
```

### Phase 4: Test Deployment (5 mins)
```bash
# Test locally on EC2
docker-compose up -d
docker-compose ps
./health-check.sh
```

### Phase 5: Push Code & Deploy (2 mins)
```bash
# On your local machine
git add .github/workflows/
git commit -m "Add CI/CD workflows"
git push origin main

# Watch GitHub Actions → View logs
# After ~10 mins, services auto-deploy to EC2
```

## 📊 Workflow Triggers

| Workflow | Trigger | Action |
|----------|---------|--------|
| build-and-deploy-auth-service.yml | Push `kbase-auth-service/**` | Build, test, push, deploy |
| build-and-deploy-discovery-server.yml | Push `kbase-discovery-server/**` | Build, test, push, deploy |
| build-and-deploy-api-gateway.yml | Push `kbase-api-gateway/**` | Build, test, push, deploy |
| build-and-deploy-project-service.yml | Push `kbase-project-service/**` | Build, test, push, deploy |
| build-and-deploy-storage-service.yml | Push `kbase-storage-service/**` | Build, test, push, deploy |
| build-and-deploy-frontend.yml | Push `frontend/**` | Build, test, push, deploy |
| run-tests.yml | PR to `main`/`develop` | Run Java tests |
| docker-cleanup.yml | Weekly schedule (Sunday 2 AM) | Cleanup old images |

## 🔥 Emergency Commands

### Check Service Status
```bash
ssh -i key.pem ec2-user@host
docker-compose ps
docker logs kbase-auth-service
```

### Restart Service
```bash
docker-compose restart auth-service
# or all
docker-compose restart
```

### View Logs
```bash
docker-compose logs -f auth-service
docker-compose logs --tail=100 auth-service
```

### Rollback to Previous Image
```bash
# View available images
docker images | grep kbase

# Specify previous tag in docker-compose.yml and restart
docker-compose up -d -V
```

### Manual Deploy
```bash
cd ~/kbase
git pull origin main
docker-compose down
docker pull docker.io/youruser/kbase-auth-service:main
docker-compose up -d
```

## 🐛 Common Issues & Solutions

### Issue: "Permission denied (publickey)"
**Solution:**
- Verify EC2_PRIVATE_KEY is correct in GitHub Secrets
- Check EC2 security group allows port 22
- Test SSH locally: `ssh -i key.pem ec2-user@host`

### Issue: "Docker image not found on Docker Hub"
**Solution:**
- Verify DOCKER_USERNAME and DOCKER_PASSWORD secrets
- Check Docker Hub login works locally: `docker login`
- Verify Docker Hub has public repository

### Issue: "Database connection timeout"
**Solution:**
- Verify RDS endpoint is accessible from EC2
- Check security group allows port 3306 to EC2
- Verify credentials in .env match RDS

### Issue: "Service crashes after deploy"
**Solution:**
```bash
docker logs kbase-auth-service  # Check error
docker-compose ps              # Check status
# Review service requirements (memory, CPU)
# Check application.yml configuration
```

## 📈 Monitoring & Logs

### GitHub Actions Logs
- Go to: **Actions** tab
- Select workflow run
- Click on job to see detailed logs

### EC2 Service Logs
```bash
# View real-time logs
docker-compose logs -f

# View specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs --tail=100

# Save to file
docker-compose logs > ./service-logs.txt
```

### System Logs (EC2)
```bash
syslog: /var/log/syslog
docker daemon: journalctl -u docker -f
auth logs: tail -f /var/log/auth.log
```

## 🔐 Security Reminders

1. **Never commit secrets** - Use GitHub Secrets only
2. **Rotate tokens** - Change Docker Hub token quarterly
3. **SSH key protection** - Keep private keys secure
4. **RDS access** - Use security groups to limit access
5. **S3 IAM policies** - Least privilege access for AWS

## 📞 Support Resources

- GitHub Actions Docs: https://docs.github.com/actions
- Docker Compose Docs: https://docs.docker.com/compose/
- Spring Cloud Docs: https://cloud.spring.io/
- AWS EC2 Docs: https://docs.aws.amazon.com/ec2/

## ✅ Success Indicators

After first deployment, you should see:
- ✅ All GitHub Actions workflows completed successfully
- ✅ Docker images pushed to Docker Hub
- ✅ All EC2 services running: `docker-compose ps` shows "Up"
- ✅ API Gateway responding: `curl http://ec2-ip:8080`
- ✅ Discovery Server running: `curl http://ec2-ip:8761`
- ✅ Frontend accessible: `http://ec2-ip:3000`
