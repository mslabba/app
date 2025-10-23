# 🚂 Railway Backend Deployment Guide

## ✅ Backend Files Created

I've created the necessary Railway configuration files:
- ✅ `Procfile` - Tells Railway how to start your app
- ✅ `railway.json` - Railway-specific configuration
- ✅ `runtime.txt` - Specifies Python version

---

## 🚀 Deploy to Railway (Step-by-Step)

### **Method 1: Using Railway CLI (Recommended)**

#### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

#### Step 2: Login to Railway

```bash
railway login
```

This will open your browser. Sign up/login with:
- GitHub (recommended)
- Email

#### Step 3: Initialize Project

```bash
cd /Users/mslabba/Sites/auction-app/backend
railway init
```

You'll be asked:
- **Create new project or link existing?** → Select "Create new project"
- **Project name?** → Enter: `auction-app-backend` (or your choice)

#### Step 4: Deploy

```bash
railway up
```

This will:
1. Upload your code
2. Install dependencies from `requirements.txt`
3. Start your FastAPI server
4. Give you a deployment URL

#### Step 5: Get Your URL

```bash
railway domain
```

Or visit Railway dashboard to see your URL.

---

### **Method 2: Using Railway Web Interface**

#### Step 1: Sign Up

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub

#### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select your `auction-app` repository

#### Step 3: Configure

1. **Root Directory**: Set to `backend`
2. **Build Command**: Auto-detected from `requirements.txt`
3. **Start Command**: Auto-detected from `Procfile`

#### Step 4: Deploy

Click "Deploy" - Railway will automatically build and deploy!

---

## ⚙️ Configure Environment Variables

### Required Environment Variables

After deployment, add these in Railway dashboard:

1. **Go to your project** → Variables tab

2. **Add these variables**:

```bash
# Firebase Credentials (IMPORTANT!)
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"your-project-id",...}

# CORS Origins (Your frontend URL)
CORS_ORIGINS=https://mslabba.github.io

# Port (Railway provides this automatically, but you can set it)
PORT=8000
```

### How to Get Firebase Credentials

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file
7. Copy the **entire JSON content** and paste as `FIREBASE_CREDENTIALS` value

**⚠️ Important**: Paste the entire JSON as a single line or Railway will format it correctly.

---

## 🔧 Railway CLI Commands

| Command | Description |
|---------|-------------|
| `railway login` | Login to Railway |
| `railway init` | Initialize new project |
| `railway up` | Deploy your code |
| `railway logs` | View application logs |
| `railway status` | Check deployment status |
| `railway domain` | Get your deployment URL |
| `railway variables` | Manage environment variables |
| `railway open` | Open project in browser |

---

## 📊 Check Deployment Status

### Using CLI:

```bash
cd /Users/mslabba/Sites/auction-app/backend
railway status
```

### Using Web:

1. Go to https://railway.app
2. Click on your project
3. View deployment status and logs

---

## 🔍 View Logs

### Using CLI:

```bash
railway logs
```

### Using Web:

1. Go to your project in Railway dashboard
2. Click on "Deployments" tab
3. View real-time logs

---

## 🌐 Get Your Backend URL

After successful deployment:

### Using CLI:

```bash
railway domain
```

### Using Web:

1. Go to your project
2. Click "Settings" tab
3. Under "Domains", you'll see your URL
4. Format: `https://your-app-name.up.railway.app`

**Copy this URL** - you'll need it for frontend `.env.production`!

---

## ✅ Verify Deployment

### Test Your API:

```bash
# Replace with your actual Railway URL
curl https://your-app-name.up.railway.app/api/health

# Or visit in browser:
# https://your-app-name.up.railway.app/docs
```

You should see the FastAPI documentation page!

---

## 🔒 Security Checklist

Before going live:

- [ ] Remove `/auth/promote-to-admin` endpoint
- [ ] Set strong Firebase credentials
- [ ] Configure CORS properly (only your frontend domain)
- [ ] Set up Firebase security rules
- [ ] Enable HTTPS (Railway does this automatically)
- [ ] Review all API endpoints for security

---

## 💰 Railway Pricing

- **Free Tier**: $5 credit/month (enough for testing)
- **Hobby Plan**: $5/month (recommended for production)
- **Pro Plan**: $20/month (for larger apps)

**Note**: Free tier is great for testing, but upgrade to Hobby for production use.

---

## 🐛 Troubleshooting

### Issue: Build Failed

**Check**:
- `requirements.txt` has all dependencies
- Python version in `runtime.txt` is correct
- No syntax errors in code

**Solution**:
```bash
railway logs
```
Check logs for specific error.

### Issue: App Crashes on Start

**Check**:
- Environment variables are set correctly
- `FIREBASE_CREDENTIALS` is valid JSON
- Port is set to `$PORT` (Railway provides this)

**Solution**:
```bash
railway logs
```
Look for startup errors.

### Issue: Can't Connect to Database

**Check**:
- Firebase credentials are correct
- Firebase project exists
- Service account has proper permissions

**Solution**: Regenerate Firebase service account key.

### Issue: CORS Errors

**Check**:
- `CORS_ORIGINS` includes your frontend URL
- No trailing slash in URL
- Format: `https://mslabba.github.io`

**Solution**: Update CORS_ORIGINS in Railway variables.

---

## 🔄 Update Deployment

### Using CLI:

```bash
cd /Users/mslabba/Sites/auction-app/backend
railway up
```

### Using GitHub:

If you connected via GitHub:
1. Push changes to your repository
2. Railway auto-deploys on push to main branch

---

## 📝 Post-Deployment Steps

1. **Copy your Railway URL**
2. **Update frontend `.env.production`**:
   ```bash
   cd /Users/mslabba/Sites/auction-app/frontend
   nano .env.production
   ```
   Set: `REACT_APP_BACKEND_URL=https://your-app.up.railway.app`

3. **Update backend CORS** (in Railway variables):
   ```
   CORS_ORIGINS=https://mslabba.github.io
   ```

4. **Test API**:
   Visit: `https://your-app.up.railway.app/docs`

5. **Deploy frontend**:
   ```bash
   cd /Users/mslabba/Sites/auction-app
   ./deploy-github-pages.sh
   ```

---

## 🎉 Success!

Your backend is now live on Railway! 

**Next**: Deploy your frontend to GitHub Pages using the Railway URL.

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check logs: `railway logs`
