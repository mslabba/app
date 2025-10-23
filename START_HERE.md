# 🚀 START HERE - Deployment Guide

## 👋 Welcome!

Your auction app is ready to deploy! Follow this guide to get your app live.

---

## 📋 What You Need

1. **Railway Account** (free) - https://railway.app
2. **GitHub Account** (free) - https://github.com
3. **Firebase Project** - https://console.firebase.google.com
4. **15 minutes** ⏱️

---

## 🎯 Quick Deploy (3 Steps)

### Step 1: Deploy Backend to Railway

```bash
cd /Users/mslabba/Sites/auction-app
./deploy-railway.sh
```

**What this does**:
- Installs Railway CLI
- Logs you into Railway
- Deploys your backend
- Gives you a URL

**After deployment**:
1. Go to Railway dashboard
2. Add environment variables (see below)
3. Copy your Railway URL

### Step 2: Configure Frontend

```bash
cd frontend
cp .env.production.template .env.production
nano .env.production
```

**Fill in**:
- `REACT_APP_BACKEND_URL` = Your Railway URL
- Firebase credentials (from Firebase Console)

### Step 3: Deploy Frontend to GitHub Pages

```bash
cd /Users/mslabba/Sites/auction-app
./deploy-github-pages.sh
```

**Done!** Visit: `https://mslabba.github.io/auction-app`

---

## 📚 Documentation

Choose your path:

### 🏃 Fast Track
- **START HERE** ← You are here
- **RAILWAY_QUICK_START.md** - Backend in 3 commands
- **QUICK_DEPLOY.md** - Frontend in 1 command

### 📖 Detailed Guides
- **RAILWAY_DEPLOYMENT.md** - Complete Railway guide
- **GITHUB_PAGES_DEPLOYMENT.md** - Complete GitHub Pages guide
- **DEPLOYMENT_STEPS.md** - Step-by-step checklist

### 🔧 Reference
- **DEPLOYMENT_SUMMARY.md** - Overview
- **DEPLOYMENT_CHECKLIST.md** - Security checklist

---

## ⚙️ Environment Variables

### Backend (Railway Dashboard)

```bash
FIREBASE_CREDENTIALS = {"type":"service_account",...}
CORS_ORIGINS = https://mslabba.github.io
PORT = 8000
```

### Frontend (.env.production)

```bash
REACT_APP_BACKEND_URL = https://your-railway-url.up.railway.app
REACT_APP_FIREBASE_API_KEY = your_key
REACT_APP_FIREBASE_AUTH_DOMAIN = your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID = your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET = your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID = 123456789
REACT_APP_FIREBASE_APP_ID = your_app_id
```

---

## 🔑 Get Firebase Credentials

1. Go to https://console.firebase.google.com
2. Select your project (or create new)
3. Click ⚙️ → **Project Settings**
4. **Service Accounts** tab
5. **Generate New Private Key**
6. Download JSON
7. Copy entire JSON content
8. Paste in Railway as `FIREBASE_CREDENTIALS`

For frontend credentials:
- Same page, **General** tab
- Scroll to "Your apps"
- Copy the config values

---

## ✅ Verify Deployment

### Backend Test:
```bash
curl https://your-railway-url.up.railway.app/api/health
```
Should return: `{"status":"ok"}`

### Frontend Test:
Visit: `https://mslabba.github.io/auction-app`
Should see: Your landing page

### Full Test:
- Register account
- Login
- Create event (if super admin)
- Test all features

---

## 💰 Cost

- **Backend (Railway)**: $5/month
- **Frontend (GitHub Pages)**: FREE
- **Database (Firebase)**: FREE (up to 50K reads/day)

**Total: $5/month**

---

## 🔄 Update Your App

### Backend:
```bash
cd backend
railway up
```

### Frontend:
```bash
cd /Users/mslabba/Sites/auction-app
./deploy-github-pages.sh
```

---

## 🐛 Troubleshooting

### Backend Issues:
```bash
railway logs
```

### Frontend Issues:
- Check browser console (F12)
- Verify `.env.production` values
- Check GitHub Pages settings

### Common Fixes:
- **CORS errors**: Update `CORS_ORIGINS` in Railway
- **Auth errors**: Add domain to Firebase authorized domains
- **404 errors**: Already fixed with routing scripts
- **Build errors**: Check logs for specific errors

---

## 🔒 Security (Before Going Live)

- [ ] Remove `/auth/promote-to-admin` endpoint
- [ ] Remove `PromoteToAdmin.jsx` component
- [ ] Set up Firebase security rules
- [ ] Configure CORS properly
- [ ] Create admin users manually

See: **DEPLOYMENT_CHECKLIST.md**

---

## 📞 Need Help?

1. **Check logs**: `railway logs` or browser console
2. **Read docs**: See documentation list above
3. **Railway support**: https://discord.gg/railway
4. **GitHub Pages**: Check repository settings

---

## 🎉 Next Steps

After successful deployment:

1. **Test everything** - All features working?
2. **Set up admin users** - Create super admin in Firebase
3. **Import data** - Add teams, players, etc.
4. **Share your app** - Give URL to users
5. **Monitor** - Check Railway logs regularly

---

## 📊 Deployment Status

Track your progress:

- [ ] Railway account created
- [ ] Backend deployed to Railway
- [ ] Environment variables set
- [ ] Backend URL obtained
- [ ] Frontend .env.production created
- [ ] Frontend deployed to GitHub Pages
- [ ] Firebase configured
- [ ] CORS updated
- [ ] Everything tested
- [ ] App is live! 🎉

---

## 🚀 Ready to Deploy?

Run this command to start:

```bash
cd /Users/mslabba/Sites/auction-app
./deploy-railway.sh
```

Then follow the prompts!

**Good luck!** 🎉
