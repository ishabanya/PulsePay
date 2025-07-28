# 🚀 PulsePay Deployment Guide

## 📋 Prerequisites

Before updating secrets, make sure you have:

1. **Firebase Project** with Firestore enabled
2. **Stripe Account** with API keys
3. **AWS CLI** configured (already done)

## 🔐 Step 1: Get Your Credentials

### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one)
3. Go to **Project Settings** > **Service Accounts**
4. Click **"Generate new private key"**
5. Download the JSON file
6. Note your **Project ID** from the JSON file

### Stripe Setup
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Sign in to your account
3. Go to **Developers** > **API Keys**
4. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
5. Go to **Developers** > **Webhooks**
6. Create a webhook endpoint for your backend URL:
   ```
   http://Paymen-Backe-WgHaSH8uAK0D-961689159.us-east-1.elb.amazonaws.com/api/webhooks/stripe
   ```
7. Copy the **webhook signing secret** (starts with `whsec_`)

## 🔄 Step 2: Update Secrets

### Option A: Automated Script (Recommended)
```bash
cd /Users/shabanya123/Documents/payment
./update-secrets.sh
```

### Option B: Manual Commands

#### Update Firebase Secret
```bash
aws secretsmanager update-secret \
  --secret-id payment-app/firebase \
  --secret-string '{
    "projectId": "YOUR_FIREBASE_PROJECT_ID",
    "clientEmail": "YOUR_SERVICE_ACCOUNT_EMAIL",
    "privateKey": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----\n"
  }'
```

#### Update Stripe Secret
```bash
aws secretsmanager update-secret \
  --secret-id payment-app/stripe \
  --secret-string '{
    "secretKey": "sk_test_YOUR_STRIPE_SECRET_KEY",
    "webhookSecret": "whsec_YOUR_WEBHOOK_SECRET"
  }'
```

#### Restart ECS Service
```bash
aws ecs update-service \
  --cluster payment-app-cluster \
  --service PaymentApp-development-BackendService0012F2D2-oYgI1SrdmuQd \
  --force-new-deployment
```

## 🌐 Step 3: Update Frontend Configuration

Create a `.env.production` file in the frontend directory:

```env
# Production Environment Variables
VITE_API_URL=http://Paymen-Backe-WgHaSH8uAK0D-961689159.us-east-1.elb.amazonaws.com/api

# Firebase Configuration (Update with your actual values)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Stripe Configuration (Update with your actual values)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

Then rebuild and redeploy the frontend:
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://payment-app-frontend-434676049739-us-east-1 --delete
aws cloudfront create-invalidation --distribution-id E2J0P82968QFRW --paths "/*"
```

## ✅ Step 4: Verify Deployment

### Check ECS Service Status
```bash
aws ecs describe-services \
  --cluster payment-app-cluster \
  --services PaymentApp-development-BackendService0012F2D2-oYgI1SrdmuQd \
  --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}'
```

### Check Running Tasks
```bash
aws ecs list-tasks \
  --cluster payment-app-cluster \
  --service-name PaymentApp-development-BackendService0012F2D2-oYgI1SrdmuQd
```

### Check Application URLs
- **Frontend**: https://dl26own8thu5j.cloudfront.net
- **Backend API**: http://Paymen-Backe-WgHaSH8uAK0D-961689159.us-east-1.elb.amazonaws.com

## 🔧 Troubleshooting

### If ECS Tasks Fail to Start
1. Check task logs:
```bash
aws logs describe-log-groups --log-group-name-prefix /ecs/payment-app-backend
```

2. Check specific task logs:
```bash
aws logs get-log-events --log-group-name /ecs/payment-app-backend --log-stream-name [STREAM_NAME]
```

### If Secrets Are Not Working
1. Verify secret values:
```bash
aws secretsmanager get-secret-value --secret-id payment-app/firebase
aws secretsmanager get-secret-value --secret-id payment-app/stripe
```

2. Check ECS task role permissions:
```bash
aws iam get-role --role-name [ECS_TASK_ROLE_NAME]
```

## 📞 Support

If you encounter issues:
1. Check AWS CloudWatch logs for detailed error messages
2. Verify all credentials are correctly formatted
3. Ensure Firebase project has Firestore enabled
4. Confirm Stripe webhook endpoint is accessible

## 🎉 Success Indicators

Your deployment is successful when:
- ✅ ECS service shows 2 running tasks
- ✅ Frontend loads at CloudFront URL
- ✅ Backend API responds to health checks
- ✅ Firebase authentication works
- ✅ Stripe payments can be processed 