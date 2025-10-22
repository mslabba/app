#!/bin/bash

# Frontend Deployment Script for Vercel

echo "🚀 Starting Frontend Deployment..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for production
echo "🔨 Building for production..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
npx vercel --prod

echo "✅ Frontend deployment complete!"
echo "🔗 Your app will be available at the URL shown above"
