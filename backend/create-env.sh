#!/bin/bash

# Script to create .env file from AWS Secrets Manager

echo "🔐 Creating .env file from AWS Secrets Manager..."

# Get Stripe secrets
echo "📊 Getting Stripe secrets..."
STRIPE_SECRET=$(aws secretsmanager get-secret-value --secret-id payment-app/stripe --query 'SecretString' --output text)

# Extract Stripe values
STRIPE_SECRET_KEY=$(echo $STRIPE_SECRET | jq -r '.secretKey')
STRIPE_WEBHOOK_SECRET=$(echo $STRIPE_SECRET | jq -r '.webhookSecret')

# Get Firebase secrets
echo "🔥 Getting Firebase secrets..."
FIREBASE_SECRET=$(aws secretsmanager get-secret-value --secret-id payment-app/firebase --query 'SecretString' --output text)

# Extract Firebase values
FIREBASE_PROJECT_ID=$(echo $FIREBASE_SECRET | jq -r '.projectId')
FIREBASE_CLIENT_EMAIL=$(echo $FIREBASE_SECRET | jq -r '.clientEmail')
FIREBASE_PRIVATE_KEY=$(echo $FIREBASE_SECRET | jq -r '.privateKey')

# Create .env file
cat > .env << EOF
# Stripe Configuration
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET

# Firebase Configuration
FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY"

# Server Configuration
PORT=5000
NODE_ENV=development
EOF

echo "✅ .env file created successfully!"
echo "📁 File location: $(pwd)/.env"
echo ""
echo "🚀 You can now run your application:"
echo "   npm run dev" 