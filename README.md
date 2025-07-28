# Payment Processing Application

A complete, production-quality payment processing web application built with React, Node.js, Firebase, Stripe, and AWS infrastructure. This application showcases modern web development practices with beautiful UI/UX, robust backend architecture, and scalable cloud deployment.

## 🏗️ Architecture Overview

### Frontend (React + Vite)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Authentication**: Firebase Auth integration
- **Payment Processing**: Stripe.js with Elements
- **State Management**: React Context + Hooks
- **Charts & Analytics**: Recharts for data visualization
- **Animations**: Framer Motion for smooth interactions

### Backend (Node.js + Express)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK
- **Payment Processing**: Stripe API integration
- **Validation**: Joi for request validation
- **Security**: Helmet, CORS, rate limiting
- **Containerization**: Docker with multi-stage builds

### Infrastructure (AWS CDK)
- **Frontend Hosting**: S3 + CloudFront CDN
- **Backend Deployment**: ECS Fargate with Application Load Balancer
- **Container Registry**: Amazon ECR
- **Secrets Management**: AWS Secrets Manager
- **Networking**: VPC with public/private subnets
- **Auto Scaling**: ECS auto-scaling based on CPU utilization
- **SSL/TLS**: Automatic HTTPS with CloudFront

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- AWS CLI configured
- Firebase project with Firestore enabled
- Stripe account with API keys

### 1. Clone and Setup
```bash
git clone <repository-url>
cd payment
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Firebase and Stripe configuration
npm run dev
```

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Firebase service account and Stripe keys
npm run dev
```

### 4. Infrastructure Setup
```bash
cd infrastructure
npm install
npm run build
```

## 📋 Environment Configuration

### Frontend (.env)
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
VITE_API_URL=http://localhost:5000/api
```

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

## 🔧 Development

### Running Locally
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 🐳 Docker Deployment

### Build and Run Backend Container
```bash
cd backend
docker build -t payment-backend .
docker run -p 5000:5000 --env-file .env payment-backend
```

### Multi-Container Setup with Docker Compose
```bash
# Create docker-compose.yml in root directory
docker-compose up -d
```

## ☁️ AWS Deployment

### Prerequisites
1. AWS CLI configured with appropriate permissions
2. AWS CDK installed: `npm install -g aws-cdk`
3. Bootstrap CDK: `npm run bootstrap`

### 1. Update Secrets
Before deploying, update the AWS Secrets Manager secrets with your actual credentials:

```bash
# Update Firebase secret
aws secretsmanager update-secret \
  --secret-id payment-app/firebase \
  --secret-string '{
    \"projectId\": \"your-firebase-project-id\",
    \"clientEmail\": \"your-service-account@your-project.iam.gserviceaccount.com\",
    \"privateKey\": \"-----BEGIN PRIVATE KEY-----\\nyour_private_key\\n-----END PRIVATE KEY-----\\n\"
  }'

# Update Stripe secret
aws secretsmanager update-secret \
  --secret-id payment-app/stripe \
  --secret-string '{
    \"secretKey\": \"sk_live_your_stripe_secret_key\",
    \"webhookSecret\": \"whsec_your_webhook_secret\"
  }'
```

### 2. Build and Push Backend Image
```bash
# Get ECR repository URI from CDK output
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag image
cd backend
docker build -t payment-app-backend .
docker tag payment-app-backend:latest <ecr-repository-uri>:latest

# Push to ECR
docker push <ecr-repository-uri>:latest
```

### 3. Deploy Infrastructure
```bash
cd infrastructure
npm run deploy
```

### 4. Deploy Frontend
```bash
cd frontend
npm run build

# Upload to S3 bucket (replace with actual bucket name from CDK output)
aws s3 sync dist/ s3://payment-app-frontend-<account-id>-<region>/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths \"/*\"
```

### 5. Configure Stripe Webhook
After deployment, configure your Stripe webhook endpoint:
- URL: `https://<load-balancer-dns>/api/webhooks/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`

## 📱 Features

### Dashboard
- Real-time payment analytics
- Revenue charts and trends
- Transaction overview
- Success rate metrics

### Payment Processing
- Secure Stripe integration
- Multiple currency support
- Real-time payment status updates
- Comprehensive error handling

### Customer Management
- Customer profiles and history
- Transaction tracking per customer
- Automated customer aggregation

### Security
- Firebase Authentication
- JWT token validation
- Rate limiting and CORS protection
- Secure API endpoints
- AWS Secrets Manager for credentials

### Monitoring & Observability
- Health check endpoints
- CloudWatch logging
- ECS service monitoring
- Auto-scaling capabilities

## 🔍 API Endpoints

### Authentication
All API endpoints require Firebase JWT token in the Authorization header:
```
Authorization: Bearer <firebase-jwt-token>
```

### Payment Endpoints
- `POST /api/payments/create-payment-intent` - Create new payment
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/transactions` - Get all transactions
- `GET /api/payments/stats` - Get dashboard statistics

### Customer Endpoints
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `GET /api/customers/:id/transactions` - Get customer transactions

### Webhook Endpoints
- `POST /api/webhooks/stripe` - Stripe webhook handler

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI Framework |
| Styling | Tailwind CSS | Utility-first CSS |
| State Management | React Context + Hooks | Application state |
| Routing | React Router v6 | Client-side routing |
| Charts | Recharts | Data visualization |
| Animations | Framer Motion | Smooth animations |
| Authentication | Firebase Auth | User authentication |
| Backend | Node.js + Express | Server framework |
| Database | Firebase Firestore | NoSQL database |
| Payments | Stripe API | Payment processing |
| Validation | Joi | Request validation |
| Container | Docker | Containerization |
| Cloud | AWS (S3, CloudFront, ECS, ALB) | Infrastructure |
| IaC | AWS CDK | Infrastructure as Code |
| Secrets | AWS Secrets Manager | Secure credential storage |

## 📦 Project Structure

```
payment/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript definitions
│   │   └── contexts/        # React contexts
│   ├── public/              # Static assets
│   └── package.json
├── backend/                  # Node.js API
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   ├── config/          # Configuration
│   │   └── types/           # TypeScript definitions
│   ├── Dockerfile           # Container definition
│   └── package.json
└── infrastructure/           # AWS CDK
    ├── lib/
    │   ├── constructs/      # CDK constructs
    │   └── payment-stack.ts # Main stack
    ├── cdk.json             # CDK configuration
    └── package.json
```

## 🔒 Security Considerations

1. **Authentication**: Firebase Auth with JWT tokens
2. **Authorization**: Route-level protection
3. **API Security**: Rate limiting, CORS, Helmet.js
4. **Data Validation**: Joi schema validation
5. **Secrets Management**: AWS Secrets Manager
6. **HTTPS**: Enforced across all endpoints
7. **Container Security**: Non-root user, minimal base image
8. **Network Security**: VPC with private subnets

## 📈 Monitoring & Scaling

- **Health Checks**: Application and container health monitoring
- **Auto Scaling**: ECS auto-scaling based on CPU utilization
- **Logging**: Centralized logging with CloudWatch
- **Metrics**: Built-in ECS and ALB metrics
- **Alerts**: CloudWatch alarms for critical metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions, issues, or contributions, please:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information
4. Join our community discussions

---

Built with ❤️ using modern web technologies and cloud-native architecture.