#!/bin/bash

# Backend Deployment Script for Railway

echo "🚀 Starting Backend Deployment..."

# Navigate to backend directory
cd backend

# Create Procfile if it doesn't exist
if [ ! -f "Procfile" ]; then
    echo "📝 Creating Procfile..."
    echo "web: uvicorn server:app --host 0.0.0.0 --port \$PORT" > Procfile
fi

# Create railway.json if it doesn't exist
if [ ! -f "railway.json" ]; then
    echo "📝 Creating railway.json..."
    cat > railway.json << EOF
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn server:app --host 0.0.0.0 --port \$PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
fi

# Deploy to Railway
echo "🌐 Deploying to Railway..."
railway up

echo "✅ Backend deployment complete!"
echo "🔗 Your API will be available at the Railway URL"
echo "⚠️  Don't forget to set environment variables in Railway dashboard!"
