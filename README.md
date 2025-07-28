# 🚀 PulsePay - Payment Processing Application

A modern payment processing application built with Node.js, Express, Stripe, and Firebase, deployed on AWS ECS.

## 🌟 Features

- **Payment Processing**: Secure payment handling with Stripe
- **User Management**: Firebase Authentication and user data
- **Real-time Webhooks**: Stripe webhook integration
- **Scalable Architecture**: AWS ECS with load balancer
- **CI/CD Pipeline**: Automated deployment via GitHub Actions

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Load Balancer │    │   ECS Cluster   │
│   (React/Vue)   │───▶│   (ALB)         │───▶│   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Stripe API    │    │   Firebase      │
                       │   (Payments)    │    │   (Auth/DB)     │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker
- AWS CLI configured
- GitHub repository

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd payment
   ```

2. **Set up environment variables**
   ```bash
   cd backend
   ./create-env.sh  # Creates .env from AWS Secrets Manager
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🐳 Docker Deployment

### Build and Push Image
```bash
cd backend
docker build --platform linux/amd64 -t payment-app-backend .
docker tag payment-app-backend:latest 434676049739.dkr.ecr.us-east-1.amazonaws.com/payment-app-backend:latest
docker push 434676049739.dkr.ecr.us-east-1.amazonaws.com/payment-app-backend:latest
```

### Deploy to ECS
```bash
aws ecs update-service --cluster payment-app-cluster --service PaymentApp-development-BackendService0012F2D2-oYgI1SrdmuQd --force-new-deployment
```

## 🔄 GitHub Actions Deployment

### Setup GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

### Automatic Deployment

The application will automatically deploy when you:

1. **Push to main/master branch**
   ```bash
   git add .
   git commit -m "Update payment processing"
   git push origin main
   ```

2. **Create a Pull Request**
   - Tests will run automatically
   - Deployment happens after merge

### Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab in GitHub
2. Select **Deploy PulsePay to AWS ECS**
3. Click **Run workflow**

## 📊 Application URLs

- **Production API**: `http://Paymen-Backe-WgHaSH8uAK0D-961689159.us-east-1.elb.amazonaws.com`
- **Health Check**: `http://Paymen-Backe-WgHaSH8uAK0D-961689159.us-east-1.elb.amazonaws.com/health`
- **Stripe Webhook**: `http://Paymen-Backe-WgHaSH8uAK0D-961689159.us-east-1.elb.amazonaws.com/api/webhooks/stripe`

## 🔐 Environment Variables

The application uses AWS Secrets Manager for secure credential storage:

- **Stripe Secret**: `payment-app/stripe`
- **Firebase Secret**: `payment-app/firebase`

### Local Development
```bash
# Export environment variables
source ./get-secrets.sh

# Or create .env file
./create-env.sh
```

## 🧪 Testing

### Run Tests
```bash
cd backend
npm test
```

### Run Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run type-check
```

## 📁 Project Structure

```
payment/
├── .github/
│   └── workflows/
│       ├── deploy.yml      # Production deployment
│       └── test.yml        # Testing workflow
├── backend/
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   └── config/         # Configuration files
│   ├── Dockerfile          # Docker configuration
│   ├── package.json        # Dependencies
│   └── tsconfig.json       # TypeScript config
├── frontend/               # Frontend application
└── README.md              # This file
```

## 🔧 Configuration

### AWS Resources
- **ECS Cluster**: `payment-app-cluster`
- **ECR Repository**: `payment-app-backend`
- **Load Balancer**: `Paymen-Backe-WgHaSH8uAK0D-961689159.us-east-1.elb.amazonaws.com`
- **Secrets Manager**: `payment-app/stripe`, `payment-app/firebase`

### GitHub Actions
- **Trigger**: Push to main/master or PR
- **Build**: Docker image with TypeScript
- **Deploy**: AWS ECS with rolling updates
- **Health Check**: Automatic service validation

## 🚨 Troubleshooting

### Common Issues

1. **Environment Variables Missing**
   ```bash
   ./create-env.sh  # Create .env file
   ```

2. **Docker Build Fails**
   ```bash
   docker build --platform linux/amd64 -t payment-app-backend .
   ```

3. **ECS Service Not Starting**
   ```bash
   aws ecs describe-services --cluster payment-app-cluster --services PaymentApp-development-BackendService0012F2D2-oYgI1SrdmuQd
   ```

4. **GitHub Actions Fails**
   - Check AWS credentials in GitHub secrets
   - Verify ECS service name and cluster
   - Ensure ECR repository exists

### Logs and Monitoring

- **ECS Logs**: CloudWatch `/ecs/payment-app-backend`
- **Application Logs**: Container logs in ECS
- **Load Balancer**: ALB access logs

## 📈 Monitoring

- **Health Checks**: Automatic health monitoring
- **CloudWatch**: Application and infrastructure metrics
- **ECS Service**: Service status and task health

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**PulsePay** - Modern payment processing made simple! 💳✨