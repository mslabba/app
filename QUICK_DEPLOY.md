# ⚡ Quick Deploy Reference

## 🚀 Deploy in 3 Steps

### 1️⃣ Deploy Backend (Choose One)

**Railway (Easiest)**
```bash
npm install -g @railway/cli
cd backend
railway login
railway init
railway up
```
Get URL: `https://your-app.railway.app`

**Render**
- Go to https://render.com
- New → Web Service
- Connect GitHub repo
- Deploy

### 2️⃣ Configure Frontend

```bash
cd frontend
cp .env.production.template .env.production
nano .env.production  # Edit with your backend URL
```

### 3️⃣ Deploy Frontend

```bash
cd /Users/mslabba/Sites/auction-app
./deploy-github-pages.sh
```

**Done!** Visit: https://mslabba.github.io/auction-app

---

## 🔄 Update Deployment

```bash
cd /Users/mslabba/Sites/auction-app
./deploy-github-pages.sh
```

---

## 🔧 Backend Environment Variables

Set these in Railway/Render dashboard:

```
FIREBASE_CREDENTIALS={"type":"service_account",...}
CORS_ORIGINS=https://mslabba.github.io
PORT=8000
```

---

## ⚠️ Before First Deploy

1. **Remove dev features**:
   - Delete `/auth/promote-to-admin` endpoint
   - Remove `PromoteToAdmin.jsx`

2. **Firebase setup**:
   - Add `mslabba.github.io` to authorized domains

3. **Create .env.production**:
   - Copy from template
   - Add real values

---

## 💡 Commands

| Action | Command |
|--------|---------|
| Deploy frontend | `cd frontend && npm run deploy` |
| Deploy backend | `cd backend && railway up` |
| Test build locally | `cd frontend && npm run build && npx serve -s build` |
| Check deployment | Visit https://mslabba.github.io/auction-app |

---

## 📞 Help

- Full guide: `GITHUB_PAGES_DEPLOYMENT.md`
- Summary: `DEPLOYMENT_SUMMARY.md`
- Checklist: `DEPLOYMENT_CHECKLIST.md`
