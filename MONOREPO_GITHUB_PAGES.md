# 🚀 GitHub Pages Deployment - Monorepo Setup

## 📦 Your Repository Structure

```
https://github.com/mslabba/app
├── frontend/     ← React app (will be deployed)
├── backend/      ← FastAPI (deployed on Railway)
└── ...
```

**Your site will be**: `https://mslabba.github.io/app`

---

## ✅ Configuration Complete

I've updated your configuration for the monorepo structure:

1. ✅ **package.json** - Updated `homepage` to `https://mslabba.github.io/app`
2. ✅ **deploy script** - Updated to show correct URLs
3. ✅ **404.html** - Already configured for client-side routing
4. ✅ **index.html** - Already has routing script

---

## 🚀 Deploy Now

### **Step 1: Ensure .env.production is Ready**

Check your file:
```bash
cat /Users/mslabba/Sites/auction-app/frontend/.env.production
```

Should have:
```bash
REACT_APP_BACKEND_URL=https://your-railway-url.up.railway.app
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### **Step 2: Deploy**

```bash
cd /Users/mslabba/Sites/auction-app
./deploy-github-pages.sh
```

This will:
1. Build your React app
2. Create/update `gh-pages` branch
3. Push to GitHub
4. GitHub Pages will automatically deploy

### **Step 3: Configure GitHub Pages (First Time Only)**

1. Go to: https://github.com/mslabba/app/settings/pages
2. Under **Source**, select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
3. Click **Save**

### **Step 4: Wait & Visit**

- **Wait**: 1-2 minutes for GitHub to build
- **Visit**: https://mslabba.github.io/app

---

## 🔧 Important: Update Backend CORS

After deploying frontend, update Railway:

1. Go to Railway Dashboard
2. Click your project → **Variables**
3. Update `CORS_ORIGINS`:
   ```
   https://mslabba.github.io
   ```
   **Note**: No `/app` at the end, just the domain!

4. Redeploy:
   ```bash
   cd backend
   railway up
   ```

---

## 🔥 Update Firebase Authorized Domains

1. Go to: https://console.firebase.google.com
2. Select your project
3. **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add: `mslabba.github.io`
6. Save

---

## ✅ Verification Checklist

After deployment:

- [ ] Visit `https://mslabba.github.io/app`
- [ ] Landing page loads correctly
- [ ] No 404 errors
- [ ] Can navigate between pages
- [ ] Browser console shows no errors
- [ ] Can register/login
- [ ] API calls work (check Network tab)

---

## 🐛 Troubleshooting

### **Issue: 404 Page Not Found**

**Solution 1: Check GitHub Pages Settings**
```
https://github.com/mslabba/app/settings/pages
```
Make sure:
- Source: `gh-pages` branch
- Folder: `/ (root)`

**Solution 2: Check Deployment**
```bash
cd /Users/mslabba/Sites/auction-app/frontend
git branch -a
```
Should see `remotes/origin/gh-pages`

### **Issue: Blank Page**

**Check 1: Browser Console**
- Press F12
- Look for errors
- Common: Wrong backend URL

**Check 2: Build Success**
```bash
cd /Users/mslabba/Sites/auction-app/frontend
npm run build
```
Should complete without errors.

### **Issue: CORS Errors**

**Fix**: Update Railway CORS_ORIGINS
```
CORS_ORIGINS=https://mslabba.github.io
```

### **Issue: Authentication Not Working**

**Fix**: Add domain to Firebase
1. Firebase Console → Authentication → Settings
2. Authorized domains → Add `mslabba.github.io`

### **Issue: 404 on Page Refresh**

**Already Fixed!** ✅
- We added `404.html` routing fix
- Should work automatically

If still issues:
```bash
# Check files exist
ls /Users/mslabba/Sites/auction-app/frontend/public/404.html
```

---

## 🔄 Update Your Deployment

When you make changes:

```bash
cd /Users/mslabba/Sites/auction-app
./deploy-github-pages.sh
```

That's it! GitHub Pages will auto-update in 1-2 minutes.

---

## 📊 Deployment Status

Check deployment status:
1. Go to: https://github.com/mslabba/app/actions
2. See latest "pages build and deployment" workflow
3. Should show green checkmark ✅

---

## 🎯 Your URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://mslabba.github.io/app |
| **Backend** | https://your-app.up.railway.app |
| **GitHub Repo** | https://github.com/mslabba/app |
| **GitHub Pages Settings** | https://github.com/mslabba/app/settings/pages |
| **Deployment Actions** | https://github.com/mslabba/app/actions |

---

## 💡 Pro Tips

### **Tip 1: Check Build Locally**
```bash
cd /Users/mslabba/Sites/auction-app/frontend
npm run build
npx serve -s build
```
Visit: http://localhost:3000

### **Tip 2: View Deployment Logs**
```bash
# In frontend directory
git log --oneline gh-pages
```

### **Tip 3: Force Redeploy**
```bash
cd /Users/mslabba/Sites/auction-app/frontend
npm run deploy -- -f
```

### **Tip 4: Custom Domain (Optional)**
If you have a custom domain:
1. Add CNAME file to `public/` folder
2. Configure DNS
3. Update in GitHub Pages settings

---

## 🚀 Quick Deploy Command

```bash
cd /Users/mslabba/Sites/auction-app && ./deploy-github-pages.sh
```

---

## ✅ Success!

When everything works:
- ✅ Frontend loads at `https://mslabba.github.io/app`
- ✅ Can navigate all pages
- ✅ Authentication works
- ✅ API calls succeed
- ✅ No console errors

**Your auction app is live!** 🎉
