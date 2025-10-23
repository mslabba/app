# 🔥 Railway Firebase Project ID Fix

## 🐛 Error

```
A project ID is required to access the auth service.
1. Use a service account credential, or
2. set the project ID explicitly via Firebase App options, or
3. set the project ID via the GOOGLE_CLOUD_PROJECT environment variable.
```

## 🎯 Root Cause

Your `FIREBASE_CREDENTIALS` environment variable in Railway is missing the `project_id` field, or the JSON is malformed.

---

## ✅ Solution (Choose One)

### **Option 1: Fix Your Firebase JSON (Recommended)**

Your Firebase service account JSON **MUST** include `project_id`. 

#### **Step 1: Get Correct Firebase JSON**

1. Go to: https://console.firebase.google.com
2. Select your project
3. Click ⚙️ → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file

#### **Step 2: Verify JSON Has project_id**

Open the downloaded JSON file and verify it has:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",  ← THIS MUST BE PRESENT
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

#### **Step 3: Convert to Single Line**

**Using Command Line:**
```bash
cd ~/Downloads
cat your-firebase-file.json | python3 -c "import json, sys; print(json.dumps(json.load(sys.stdin), separators=(',', ':')))"
```

**Or use the helper script:**
```bash
cd /Users/mslabba/Sites/auction-app
./format-firebase-json.sh ~/Downloads/your-firebase-file.json
```

#### **Step 4: Update Railway Variable**

1. Go to: https://railway.app/dashboard
2. Select your project
3. Go to **Variables** tab
4. Find `FIREBASE_CREDENTIALS`
5. **Delete old value**
6. **Paste new single-line JSON** (with project_id)
7. Click **Save**

#### **Step 5: Redeploy Backend**

```bash
cd /Users/mslabba/Sites/auction-app/backend
railway up
```

---

### **Option 2: Add Separate Project ID Variable**

If you can't modify the JSON, add project ID separately:

#### **Step 1: Find Your Project ID**

1. Go to: https://console.firebase.google.com
2. Select your project
3. Click ⚙️ → **Project Settings**
4. Copy the **Project ID** (e.g., `my-auction-app-12345`)

#### **Step 2: Add to Railway**

1. Railway Dashboard → Your Project → **Variables**
2. Click **+ New Variable**
3. **Name**: `FIREBASE_PROJECT_ID`
4. **Value**: Your project ID (e.g., `my-auction-app-12345`)
5. Click **Add**

#### **Step 3: Redeploy**

```bash
cd /Users/mslabba/Sites/auction-app/backend
railway up
```

The updated code will automatically use `FIREBASE_PROJECT_ID` if `project_id` is missing from credentials.

---

## 🚀 Deploy Updated Code

I've updated the backend code to:
1. ✅ Accept both `FIREBASE_CREDENTIALS` and `FIREBASE_CREDENTIALS_JSON`
2. ✅ Handle missing `project_id` by using `FIREBASE_PROJECT_ID` env var
3. ✅ Add better logging to debug issues
4. ✅ Explicitly set project ID in Firebase initialization

**Deploy now:**

```bash
cd /Users/mslabba/Sites/auction-app/backend
railway up
```

---

## 🧪 Verify the Fix

### **Step 1: Check Railway Logs**

```bash
railway logs
```

Look for:
- ✅ `✅ Loading Firebase credentials from environment variable`
- ✅ `✅ Initializing Firebase with project_id: your-project-id`
- ✅ `✅ Firebase Admin SDK initialized successfully`

**Bad signs:**
- ❌ `⚠️ Warning: project_id not found in credentials`
- ❌ `❌ Firebase initialization error`

### **Step 2: Test Health Endpoint**

```bash
curl https://your-app.up.railway.app/api/health
```

Should show:
```json
{
  "status": "healthy",
  "firebase": "connected"
}
```

### **Step 3: Test Authentication**

Try registering a user from your frontend:
1. Visit: https://mslabba.github.io/app/register
2. Fill in details
3. Click Register
4. Should succeed! ✅

---

## 📋 Complete Checklist

- [ ] Downloaded fresh Firebase service account JSON
- [ ] Verified JSON contains `project_id` field
- [ ] Converted JSON to single line
- [ ] Updated `FIREBASE_CREDENTIALS` in Railway
- [ ] Deployed updated backend code: `railway up`
- [ ] Checked Railway logs for success messages
- [ ] Tested `/api/health` endpoint
- [ ] Tested authentication from frontend

---

## 🐛 Still Not Working?

### **Debug 1: Check Your JSON**

Copy your `FIREBASE_CREDENTIALS` value from Railway and validate it:

```bash
echo 'YOUR_JSON_HERE' | python3 -c "import json, sys; data=json.load(sys.stdin); print('project_id:', data.get('project_id', 'MISSING'))"
```

Should output: `project_id: your-project-id`

If it says `MISSING`, your JSON is incomplete!

### **Debug 2: Check Railway Logs**

```bash
railway logs --tail
```

Look for the exact error message. Common issues:
- **"Invalid JSON"**: Your JSON is malformed
- **"project_id not found"**: JSON missing project_id field
- **"Invalid service account"**: Wrong Firebase project

### **Debug 3: Verify Environment Variables**

In Railway dashboard, check:
- ✅ `FIREBASE_CREDENTIALS` is set (long JSON string)
- ✅ `FIREBASE_PROJECT_ID` is set (if using Option 2)
- ✅ No extra spaces or line breaks in values

### **Debug 4: Test JSON Locally**

```bash
cd /Users/mslabba/Sites/auction-app/backend

# Create test file
echo 'YOUR_RAILWAY_JSON_HERE' > test-creds.json

# Validate it
python3 -c "import json; data=json.load(open('test-creds.json')); print('Valid!', data.get('project_id'))"

# Clean up
rm test-creds.json
```

---

## 💡 Common Mistakes

### **❌ Mistake 1: Multi-line JSON**

**Wrong:**
```json
{
  "type": "service_account",
  "project_id": "my-project"
}
```

**Correct:**
```json
{"type":"service_account","project_id":"my-project"}
```

### **❌ Mistake 2: Missing project_id**

Your JSON must have:
```json
{"type":"service_account","project_id":"YOUR_PROJECT_ID",...}
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                          THIS IS REQUIRED!
```

### **❌ Mistake 3: Wrong Private Key Format**

Private key should have `\n` (not actual newlines):
```json
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

### **❌ Mistake 4: Using Old/Expired Key**

Generate a fresh key from Firebase Console if yours is old.

---

## 🎯 Quick Fix Commands

### **1. Get Your Project ID:**
```bash
# From your local firebase-admin.json
cat backend/firebase-admin.json | python3 -c "import json, sys; print(json.load(sys.stdin)['project_id'])"
```

### **2. Format JSON:**
```bash
./format-firebase-json.sh ~/Downloads/your-firebase-file.json
```

### **3. Deploy Backend:**
```bash
cd backend && railway up
```

### **4. Check Logs:**
```bash
railway logs
```

### **5. Test Health:**
```bash
curl https://your-app.up.railway.app/api/health
```

---

## ✅ Expected Result

After fixing:

```bash
$ railway logs
✅ Loading Firebase credentials from environment variable
✅ Initializing Firebase with project_id: your-project-id
✅ Firebase Admin SDK initialized successfully
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

```bash
$ curl https://your-app.up.railway.app/api/health
{
  "status": "healthy",
  "firebase": "connected"
}
```

**🎉 Firebase is now working!**

---

## 🚀 Next Steps

Once Firebase is connected:

1. **Test Frontend Authentication:**
   - Visit: https://mslabba.github.io/app/register
   - Register a new user
   - Should work! ✅

2. **Update CORS (if not done):**
   ```
   CORS_ORIGINS=https://mslabba.github.io
   ```

3. **Test Full Workflow:**
   - Register → Login → Create Event → Add Teams → Add Players → Start Auction

4. **Monitor Logs:**
   ```bash
   railway logs --tail
   ```

---

## 📞 Support

If still having issues:

1. **Check Railway logs**: `railway logs`
2. **Verify JSON**: Use the validation commands above
3. **Test locally**: Run backend locally with same credentials
4. **Generate new key**: Get fresh Firebase service account key

---

## 📚 Reference

- **Railway Variables**: https://docs.railway.app/develop/variables
- **Firebase Admin SDK**: https://firebase.google.com/docs/admin/setup
- **Service Account Keys**: https://console.firebase.google.com → Project Settings → Service Accounts
