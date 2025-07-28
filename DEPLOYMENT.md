# 🚀 GitHub Actions Deployment Guide

This guide will help you deploy your PulsePay application through GitHub Actions.

## 📋 Prerequisites

1. **GitHub Repository**: Your code must be in a GitHub repository
2. **AWS Credentials**: You need AWS access keys with appropriate permissions
3. **AWS Resources**: ECS cluster, ECR repository, and Secrets Manager must be set up

## 🔧 Setup GitHub Secrets

### 1. Go to Your Repository
- Navigate to your GitHub repository
- Click on **Settings** tab
- Select **Secrets and variables** → **Actions**

### 2. Add Required Secrets
Add these secrets to your repository:

```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

**To get AWS credentials:**
```bash
# Create an IAM user with these permissions:
# - AmazonEC2ContainerRegistryFullAccess
# - AmazonECS-FullAccess
# - SecretsManagerReadWrite
# - IAMReadOnlyAccess
```

## 🔄 Deployment Methods

### Method 1: Automatic Deployment (Recommended)

**Trigger**: Push to `main` or `master` branch

```bash
# Make your changes
git add .
git commit -m "Update payment processing"
git push origin main
```

**What happens:**
1. ✅ Tests run automatically
2. ✅ Docker image builds
3. ✅ Image pushes to ECR
4. ✅ ECS service updates
5. ✅ Health checks run

### Method 2: Manual Deployment

**Trigger**: Manual workflow dispatch

1. Go to **Actions** tab in GitHub
2. Select **Manual Deploy PulsePay**
3. Click **Run workflow**
4. Choose environment (development/staging/production)
5. Click **Run workflow**

### Method 3: Pull Request Deployment

**Trigger**: Create a Pull Request

1. Create a new branch
2. Make your changes
3. Create a Pull Request
4. Tests run automatically
5. After merge, deployment happens

## 📊 Workflow Files

### `.github/workflows/deploy.yml`
- **Purpose**: Automatic deployment on push to main
- **Triggers**: Push to main/master, Pull Requests
- **Actions**: Build, test, deploy to ECS

### `.github/workflows/test.yml`
- **Purpose**: Run tests and linting
- **Triggers**: Push to main/master/develop, Pull Requests
- **Actions**: Install dependencies, lint, type-check, test

### `.github/workflows/manual-deploy.yml`
- **Purpose**: Manual deployment with environment selection
- **Triggers**: Manual workflow dispatch
- **Actions**: Build, deploy with environment variables

### `.github/workflows/setup-env.yml`
- **Purpose**: Setup environment variables from AWS Secrets
- **Triggers**: Manual or daily schedule
- **Actions**: Load secrets from AWS Secrets Manager

## 🔍 Monitoring Deployment

### 1. GitHub Actions
- Go to **Actions** tab
- Click on the workflow run
- Monitor each step

### 2. AWS Console
- **ECS**: Check service status
- **ECR**: Verify image was pushed
- **CloudWatch**: Check logs

### 3. Application Health
```bash
# Check health endpoint
curl http://Paymen-Backe-WgHaSH8uAK0D-961689159.us-east-1.elb.amazonaws.com/health

# Check ECS service status
aws ecs describe-services \
  --cluster payment-app-cluster \
  --services PaymentApp-development-BackendService0012F2D2-oYgI1SrdmuQd
```

## 🚨 Troubleshooting

### Common Issues

**1. AWS Credentials Error**
```
Error: The security token included in the request is invalid
```
**Solution**: Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in GitHub secrets

**2. ECR Login Failed**
```
Error: no basic auth credentials
```
**Solution**: Ensure AWS credentials have ECR permissions

**3. ECS Service Not Found**
```
Error: Service not found
```
**Solution**: Verify ECS service name in workflow file

**4. Docker Build Failed**
```
Error: failed to solve
```
**Solution**: Check Dockerfile and .dockerignore

**5. Environment Variables Missing**
```
Error: STRIPE_SECRET_KEY is required
```
**Solution**: Verify AWS Secrets Manager has the required secrets

### Debug Steps

1. **Check GitHub Actions Logs**
   - Go to Actions tab
   - Click on failed workflow
   - Check each step for errors

2. **Verify AWS Resources**
   ```bash
   # Check ECS cluster
   aws ecs describe-clusters --clusters payment-app-cluster
   
   # Check ECR repository
   aws ecr describe-repositories --repository-names payment-app-backend
   
   # Check secrets
   aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `payment-app`)]'
   ```

3. **Test Locally**
   ```bash
   # Test Docker build
   cd backend
   docker build --platform linux/amd64 -t payment-app-backend .
   
   # Test with environment variables
   ./create-env.sh
   npm run dev
   ```

## 🔐 Security Best Practices

1. **Use IAM Roles**: Create specific IAM roles for GitHub Actions
2. **Rotate Credentials**: Regularly rotate AWS access keys
3. **Least Privilege**: Give minimal required permissions
4. **Secrets Management**: Use AWS Secrets Manager for sensitive data
5. **Branch Protection**: Protect main branch with required reviews

## 📈 Advanced Configuration

### Environment-Specific Deployments

You can modify the workflows to support multiple environments:

```yaml
# In workflow file
env:
  ECS_CLUSTER: ${{ github.event.inputs.environment == 'production' && 'payment-app-prod-cluster' || 'payment-app-dev-cluster' }}
  ECS_SERVICE: ${{ github.event.inputs.environment == 'production' && 'PaymentApp-production' || 'PaymentApp-development' }}
```

### Custom Build Arguments

```yaml
# In workflow file
- name: Build with custom args
  run: |
    docker build \
      --build-arg NODE_ENV=${{ github.event.inputs.environment }} \
      --platform linux/amd64 \
      -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
```

### Slack Notifications

Add Slack notifications to your workflows:

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#deployments'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 🎉 Success Checklist

- [ ] GitHub secrets configured
- [ ] AWS resources exist (ECS, ECR, Secrets Manager)
- [ ] Workflow files in `.github/workflows/`
- [ ] Tests pass locally
- [ ] Docker build works locally
- [ ] Push to main triggers deployment
- [ ] Application is accessible via load balancer
- [ ] Health check endpoint responds
- [ ] Stripe webhook endpoint is configured

---

**Your PulsePay application is now ready for automated deployment! 🚀** 