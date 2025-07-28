#!/bin/bash

echo "=== PULSEPAY SECRETS UPDATE SCRIPT ==="
echo ""

# Firebase Secret Update
echo "=== UPDATING FIREBASE SECRET ==="
echo "Please provide your Firebase credentials:"
echo ""

read -p "Enter your Firebase Project ID: " FIREBASE_PROJECT_ID
read -p "Enter your Firebase Service Account Email: " FIREBASE_CLIENT_EMAIL
echo "Enter your Firebase Private Key (paste the entire key including BEGIN and END lines):"
read -r FIREBASE_PRIVATE_KEY

# Create Firebase secret JSON
FIREBASE_SECRET_JSON=$(cat <<EOF
{
  "projectId": "$FIREBASE_PROJECT_ID",
  "clientEmail": "$FIREBASE_CLIENT_EMAIL",
  "privateKey": "$FIREBASE_PRIVATE_KEY"
}
EOF
)

echo ""
echo "Updating Firebase secret..."
aws secretsmanager update-secret \
  --secret-id payment-app/firebase \
  --secret-string "$FIREBASE_SECRET_JSON"

echo ""
echo "=== UPDATING STRIPE SECRET ==="
echo "Please provide your Stripe credentials:"
echo ""

read -p "Enter your Stripe Secret Key (starts with sk_test_ or sk_live_): " STRIPE_SECRET_KEY
read -p "Enter your Stripe Webhook Secret (starts with whsec_): " STRIPE_WEBHOOK_SECRET

# Create Stripe secret JSON
STRIPE_SECRET_JSON=$(cat <<EOF
{
  "secretKey": "$STRIPE_SECRET_KEY",
  "webhookSecret": "$STRIPE_WEBHOOK_SECRET"
}
EOF
)

echo ""
echo "Updating Stripe secret..."
aws secretsmanager update-secret \
  --secret-id payment-app/stripe \
  --secret-string "$STRIPE_SECRET_JSON"

echo ""
echo "=== RESTARTING ECS SERVICE ==="
echo "Restarting the backend service to pick up new secrets..."

aws ecs update-service \
  --cluster payment-app-cluster \
  --service PaymentApp-development-BackendService0012F2D2-oYgI1SrdmuQd \
  --force-new-deployment

echo ""
echo "=== SECRETS UPDATE COMPLETE ==="
echo "Your secrets have been updated and the backend service is restarting."
echo "Check the ECS service status in a few minutes to ensure it's running properly." 