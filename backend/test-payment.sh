#!/bin/bash

# Get the user's Firebase token (you'll need to paste this from the browser's DevTools)
echo "To create test transactions, you need to:"
echo "1. Open your browser DevTools (F12)"
echo "2. Go to the Application/Storage tab"
echo "3. Find the Firebase Auth token under localStorage or use console:"
echo "4. Run: firebase.auth().currentUser.getIdToken().then(token => console.log(token))"
echo ""
echo "Then run: ./create-test-transaction.sh YOUR_TOKEN_HERE"

if [ -z "$1" ]; then
    echo "Usage: $0 <firebase_id_token>"
    exit 1
fi

TOKEN=$1

echo "Creating test transactions..."

# Create multiple test transactions
curl -X POST http://localhost:5001/api/payments/create-test-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount": 2500, "description": "Coffee subscription"}' && echo ""

curl -X POST http://localhost:5001/api/payments/create-test-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount": 5000, "description": "Monthly software subscription"}' && echo ""

curl -X POST http://localhost:5001/api/payments/create-test-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount": 1200, "description": "E-book purchase"}' && echo ""

curl -X POST http://localhost:5001/api/payments/create-test-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount": 7500, "description": "Premium subscription"}' && echo ""

echo "Test transactions created! Check your dashboard."