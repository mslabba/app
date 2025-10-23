# 🚀 GitHub Pages Deployment Guide

## ✅ Setup Complete!

Your frontend is now configured for GitHub Pages deployment.

## 📋 Prerequisites

1. **GitHub Repository**: You need a GitHub repository for your project
2. **Backend Deployed**: Deploy your backend first (Railway, Render, or Heroku)
3. **Environment Variables**: Configure production environment

---

## 🔧 Step-by-Step Deployment

### Step 1: Create Production Environment File

Create `.env.production` in the frontend directory:

```bash
cd /Users/mslabba/Sites/auction-app/frontend
cat > .env.production << 'EOF'
REACT_APP_BACKEND_URL=https://your-backend-url.com
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_app_id
EOF
```

**⚠️ IMPORTANT**: Replace the placeholder values with your actual Firebase and backend URLs!

### Step 2: Initialize Git Repository (if not already done)

```bash
cd /Users/mslabba/Sites/auction-app
git init
git add .
git commit -m "Initial commit"
```

### Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `auction-app`
3. **DO NOT** initialize with README (since you already have code)

### Step 4: Link Local Repository to GitHub

```bash
cd /Users/mslabba/Sites/auction-app
git remote add origin https://github.com/mslabba/auction-app.git
git branch -M main
git push -u origin main
```

### Step 5: Deploy to GitHub Pages

```bash
cd /Users/mslabba/Sites/auction-app/frontend
npm run deploy
```

This will:
- Build your React app
- Create a `gh-pages` branch
- Push the build to GitHub Pages
- Your site will be live at: `https://mslabba.github.io/auction-app`

---

## 🔄 Updating Your Deployment

Whenever you make changes:

```bash
cd /Users/mslabba/Sites/auction-app/frontend
npm run deploy
```

That's it! The script automatically builds and deploys.

---

## ⚙️ Backend Deployment Options

Since GitHub Pages only hosts static sites, you need to deploy your backend separately.

### Option A: Railway (Recommended - $5/month)

1. **Sign up**: https://railway.app
2. **Install CLI**:
   ```bash
   npm install -g @railway/cli
   ```

3. **Deploy Backend**:
   ```bash
   cd /Users/mslabba/Sites/auction-app/backend
   railway login
   railway init
   railway up
   ```

4. **Set Environment Variables** in Railway dashboard:
   - `FIREBASE_CREDENTIALS`: Your Firebase service account JSON
   - `CORS_ORIGINS`: `https://mslabba.github.io`
   - `PORT`: `8000`

5. **Get your backend URL** (e.g., `https://your-app.railway.app`)

6. **Update Frontend**: Edit `.env.production` with your Railway URL

### Option B: Render (Free Tier Available)

1. **Sign up**: https://render.com
2. **Create New Web Service**
3. **Connect GitHub Repository**
4. **Configure**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. **Add Environment Variables**
6. **Deploy**

### Option C: Heroku

1. **Sign up**: https://heroku.com
2. **Install CLI**: https://devcenter.heroku.com/articles/heroku-cli
3. **Deploy**:
   ```bash
   cd /Users/mslabba/Sites/auction-app/backend
   heroku create auction-app-backend
   git push heroku main
   ```

---

## 🔒 Important Configuration

### 1. Update Backend CORS

After deploying frontend, update your backend CORS settings to allow:
```
https://mslabba.github.io
```

### 2. Firebase Configuration

Make sure your Firebase project allows your GitHub Pages domain:
- Go to Firebase Console
- Authentication → Settings → Authorized domains
- Add: `mslabba.github.io`

### 3. Router Configuration

Since GitHub Pages doesn't support client-side routing by default, add this to your `public` folder:

Create `public/404.html`:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Auction App</title>
    <script type="text/javascript">
      var pathSegmentsToKeep = 1;
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
  </body>
</html>
```

And update `public/index.html` (add this script in the `<head>` section):
```html
<script type="text/javascript">
  (function(l) {
    if (l.search[1] === '/' ) {
      var decoded = l.search.slice(1).split('&').map(function(s) { 
        return s.replace(/~and~/g, '&')
      }).join('?');
      window.history.replaceState(null, null,
          l.pathname.slice(0, -1) + decoded + l.hash
      );
    }
  }(window.location))
</script>
```

---

## 🧪 Testing Your Deployment

1. **Test Locally First**:
   ```bash
   cd /Users/mslabba/Sites/auction-app/frontend
   npm run build
   npx serve -s build
   ```
   Visit: http://localhost:3000

2. **After Deployment**:
   - Visit: https://mslabba.github.io/auction-app
   - Test all features
   - Check browser console for errors
   - Verify API calls work

---

## 🐛 Troubleshooting

### Issue: "Failed to load resource" errors
**Solution**: Check your backend URL in `.env.production`

### Issue: Blank page after deployment
**Solution**: 
- Check browser console for errors
- Verify `homepage` in package.json matches your GitHub Pages URL
- Make sure build completed successfully

### Issue: 404 on page refresh
**Solution**: Implement the 404.html routing fix above

### Issue: CORS errors
**Solution**: 
- Add your GitHub Pages URL to backend CORS settings
- Format: `https://mslabba.github.io` (no trailing slash)

### Issue: Firebase authentication not working
**Solution**: 
- Add `mslabba.github.io` to Firebase authorized domains
- Check Firebase config in `.env.production`

---

## 📊 Deployment Checklist

- [ ] Backend deployed and running
- [ ] `.env.production` created with correct values
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] `npm run deploy` executed successfully
- [ ] Site accessible at GitHub Pages URL
- [ ] Backend CORS configured for GitHub Pages domain
- [ ] Firebase authorized domains updated
- [ ] 404.html routing fix implemented
- [ ] All features tested in production
- [ ] Authentication working
- [ ] API calls successful

---

## 💰 Cost Summary

- **Frontend (GitHub Pages)**: FREE ✅
- **Backend Options**:
  - Railway: $5/month
  - Render: Free tier available
  - Heroku: $7/month (after free tier)
- **Firebase**: Free tier (50K reads/day)

**Total**: $0-7/month depending on backend choice

---

## 🔄 Continuous Deployment

To automate deployment on every push to main:

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: cd frontend && npm install --legacy-peer-deps
    
    - name: Build
      run: cd frontend && npm run build
      env:
        REACT_APP_BACKEND_URL: ${{ secrets.BACKEND_URL }}
        REACT_APP_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
        REACT_APP_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
        REACT_APP_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
    
    - name: Deploy
      run: cd frontend && npm run deploy
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Add your environment variables as GitHub Secrets:
- Go to repository Settings → Secrets and variables → Actions
- Add each environment variable

---

## 📞 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify all environment variables are correct
3. Test backend API directly
4. Check GitHub Pages deployment status in repository settings

---

## 🎉 You're All Set!

Your auction app is now configured for GitHub Pages deployment. Just run:

```bash
cd /Users/mslabba/Sites/auction-app/frontend
npm run deploy
```

And your site will be live! 🚀
