# 🚂 Railway Quick Start

## ⚡ Deploy in 3 Commands

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Run deployment script
cd /Users/mslabba/Sites/auction-app
./deploy-railway.sh

# 3. Get your URL
cd backend
railway domain
```

**Done!** Your backend is live! 🎉

---

## 📋 What You'll Need

1. **Railway Account** (free) - Sign up at https://railway.app
2. **Firebase Service Account JSON** - From Firebase Console
3. **5 minutes** ⏱️

---

## 🎯 Step-by-Step (First Time)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login

```bash
railway login
```

Browser will open → Sign up/Login with GitHub

### Step 3: Deploy

```bash
cd /Users/mslabba/Sites/auction-app
./deploy-railway.sh
```

Follow the prompts:
- Create new project? → **Yes**
- Project name? → **auction-app-backend**

### Step 4: Set Environment Variables

Go to Railway dashboard (https://railway.app):

1. Click your project
2. Go to **Variables** tab
3. Add these:

```
FIREBASE_CREDENTIALS = {"type":"service_account",...}
CORS_ORIGINS = https://mslabba.github.io
PORT = 8000
```

### Step 5: Get Your URL

```bash
cd backend
railway domain
```

Copy the URL (e.g., `https://auction-app-backend.up.railway.app`)

### Step 6: Test

Visit: `https://your-url.up.railway.app/docs`

You should see FastAPI documentation! ✅

---

## 🔄 Update Deployment (After First Time)

```bash
cd /Users/mslabba/Sites/auction-app/backend
railway up
```

That's it! 🚀

---

## 🔑 Get Firebase Credentials

1. Go to https://console.firebase.google.com
2. Select your project
3. Click ⚙️ (Settings) → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download JSON file
7. Copy entire JSON content
8. Paste in Railway as `FIREBASE_CREDENTIALS`

---

## ✅ Verify Everything Works

### Test 1: API Docs
Visit: `https://your-url.up.railway.app/docs`
Should see: FastAPI Swagger UI ✅

### Test 2: Health Check
```bash
curl https://your-url.up.railway.app/api/health
```
Should return: `{"status":"ok"}` ✅

### Test 3: Check Logs
```bash
railway logs
```
Should see: Server startup messages ✅

---

## 🐛 Troubleshooting

### "railway: command not found"
```bash
npm install -g @railway/cli
```

### "Build failed"
```bash
railway logs
```
Check for missing dependencies or syntax errors.

### "App crashes on start"
Check environment variables are set correctly in Railway dashboard.

### "CORS errors"
Make sure `CORS_ORIGINS=https://mslabba.github.io` (no trailing slash!)

---

## 💰 Cost

- **Free**: $5 credit/month (good for testing)
- **Hobby**: $5/month (recommended for production)

Start with free, upgrade when ready!

---

## 📞 Useful Commands

```bash
railway login          # Login to Railway
railway up             # Deploy
railway logs           # View logs
railway domain         # Get URL
railway open           # Open in browser
railway status         # Check status
railway variables      # Manage env vars
```

---

## 🎉 Next Steps

After backend is deployed:

1. **Copy your Railway URL**
2. **Update frontend**:
   ```bash
   cd /Users/mslabba/Sites/auction-app/frontend
   nano .env.production
   ```
   Set: `REACT_APP_BACKEND_URL=https://your-railway-url.up.railway.app`

3. **Deploy frontend**:
   ```bash
   cd /Users/mslabba/Sites/auction-app
   ./deploy-github-pages.sh
   ```

**Your app is live!** 🚀

---

## 📚 Full Documentation

- **Complete Guide**: `RAILWAY_DEPLOYMENT.md`
- **Troubleshooting**: Check Railway logs
- **Railway Docs**: https://docs.railway.app
