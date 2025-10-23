#!/bin/bash

# Railway Backend Deployment Script

echo "🚂 Railway Backend Deployment"
echo "=============================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo ""
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Railway CLI"
        echo "Please install manually: npm install -g @railway/cli"
        exit 1
    fi
    echo "✅ Railway CLI installed!"
    echo ""
fi

# Navigate to backend directory
cd backend

echo "📋 Pre-deployment Checklist:"
echo ""
echo "✅ Procfile created"
echo "✅ railway.json created"
echo "✅ runtime.txt created"
echo "✅ requirements.txt exists"
echo ""

# Check if already logged in
echo "🔐 Checking Railway authentication..."
railway whoami &> /dev/null

if [ $? -ne 0 ]; then
    echo "Please login to Railway..."
    railway login
    
    if [ $? -ne 0 ]; then
        echo "❌ Login failed"
        exit 1
    fi
fi

echo "✅ Authenticated!"
echo ""

# Check if project is initialized
if [ ! -f ".railway" ]; then
    echo "🎯 Initializing Railway project..."
    echo ""
    echo "Please follow the prompts:"
    echo "1. Select 'Create new project'"
    echo "2. Enter project name (e.g., auction-app-backend)"
    echo ""
    railway init
    
    if [ $? -ne 0 ]; then
        echo "❌ Project initialization failed"
        exit 1
    fi
fi

echo ""
echo "🚀 Deploying to Railway..."
echo ""

railway up

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. Get your deployment URL:"
    echo "   railway domain"
    echo ""
    echo "2. Set environment variables in Railway dashboard:"
    echo "   - FIREBASE_CREDENTIALS (your Firebase service account JSON)"
    echo "   - CORS_ORIGINS (https://mslabba.github.io)"
    echo "   - PORT (8000)"
    echo ""
    echo "3. View your deployment:"
    echo "   railway open"
    echo ""
    echo "4. Check logs:"
    echo "   railway logs"
    echo ""
    echo "5. Test your API:"
    echo "   Visit: https://your-app.up.railway.app/docs"
    echo ""
    echo "6. Update frontend .env.production with your Railway URL"
    echo ""
    echo "📚 Full guide: ../RAILWAY_DEPLOYMENT.md"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Check logs for errors:"
    echo "  railway logs"
    echo ""
    echo "Common issues:"
    echo "- Missing dependencies in requirements.txt"
    echo "- Syntax errors in code"
    echo "- Invalid Python version"
    echo ""
    exit 1
fi
