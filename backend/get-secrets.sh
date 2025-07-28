#!/bin/bash

# Script to retrieve secrets from AWS Secrets Manager and export as environment variables

echo "🔐 Retrieving secrets from AWS Secrets Manager..."

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

# Export environment variables
export STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
export STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
export FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
export FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
export FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY

echo "✅ Environment variables exported:"
echo "   STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:20}..."
echo "   STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:0:20}..."
echo "   FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID"
echo "   FIREBASE_CLIENT_EMAIL: $FIREBASE_CLIENT_EMAIL"
echo "   FIREBASE_PRIVATE_KEY: ${FIREBASE_PRIVATE_KEY:0:30}..."

echo ""
echo "🚀 You can now run your application with these environment variables!"
echo "   Example: npm run dev" 