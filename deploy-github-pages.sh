#!/bin/bash

# GitHub Pages Deployment Script

echo "🚀 Deploying to GitHub Pages..."
echo ""
echo "📦 Repository: https://github.com/mslabba/app"
echo "🌐 Will deploy to: https://mslabba.github.io/app"
echo ""

# Check if .env.production exists
if [ ! -f "frontend/.env.production" ]; then
    echo "⚠️  WARNING: frontend/.env.production not found!"
    echo "Please create it with your production environment variables."
    echo ""
    echo "Example:"
    echo "REACT_APP_BACKEND_URL=https://your-backend-url.com"
    echo "REACT_APP_FIREBASE_API_KEY=your_key"
    echo "REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com"
    echo "REACT_APP_FIREBASE_PROJECT_ID=your-project-id"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to frontend directory
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Deploy
echo "🔨 Building and deploying..."
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "🌐 Your site will be available at: https://mslabba.github.io/app"
    echo ""
    echo "📝 Next steps:"
    echo "1. Wait 1-2 minutes for GitHub Pages to update"
    echo "2. Visit your site and test all features"
    echo "3. Check browser console for any errors"
    echo "4. Verify API calls to your backend are working"
    echo ""
    echo "🔧 If you see 404 errors:"
    echo "   Go to: https://github.com/mslabba/app/settings/pages"
    echo "   Make sure 'Source' is set to 'gh-pages' branch"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Please check the error messages above."
    exit 1
fi
