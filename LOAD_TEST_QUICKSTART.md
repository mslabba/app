# Pre-Auction Load Testing - Quick Reference

## 🚀 Quick Start (5 minutes)

```bash
# 1. Install dependencies
cd /Users/mslabba/Sites/auction-app
./setup_loadtest.sh

# 2. Edit configuration
nano simple_load_test.py
# Update: BACKEND_URL, EVENT_ID

# 3. Run test
python3 simple_load_test.py
```

## 📊 What You Need

Before starting:
- ✅ Your Railway backend URL
- ✅ A test event ID (don't use production!)
- ✅ Test team accounts created
- ✅ Test players added to event

## 🎯 Recommended Tests

### Test 1: Basic Load (5 min)
```bash
# In simple_load_test.py, set:
NUM_CONCURRENT_USERS = 20
TEST_DURATION_SECONDS = 120

python3 simple_load_test.py
```

**Expected Results:**
- ✅ Success rate > 99%
- ✅ Avg response time < 500ms
- ✅ No errors

### Test 2: Peak Load (10 min)
```bash
# Use Locust for better control
locust -f load_test.py --host=https://your-backend.railway.app

# In browser (http://localhost:8089):
# - Users: 50
# - Spawn rate: 5
# - Duration: 5 minutes
```

**Expected Results:**
- ✅ Success rate > 95%
- ✅ Avg response time < 1000ms
- ✅ Error rate < 5%

## 🔍 Monitor During Test

**Terminal 1: Run load test**
```bash
python3 simple_load_test.py
```

**Terminal 2: Monitor auction**
```bash
# Edit monitor_auction.py first (BACKEND_URL, EVENT_ID)
python3 monitor_auction.py
```

**Browser: Watch metrics**
- Railway Dashboard: CPU, Memory
- Firebase Console: Reads/Writes

## 📈 What to Look For

### ✅ Good Signs
- Response times stable throughout test
- No error spikes
- Bids processing successfully
- CPU/memory usage reasonable

### ⚠️ Warning Signs
- Response times increasing over time
- Error rate > 5%
- Firebase quota warnings
- CPU > 80% sustained

### ❌ Critical Issues
- Errors > 10%
- Response times > 3 seconds
- Server crashes
- Database connection failures

## 🛠️ Quick Fixes

**If response times are slow:**
```bash
# Check Railway logs
railway logs --tail

# Restart backend
railway up
```

**If Firebase quota hit:**
- Reduce polling frequency in frontend
- Implement caching
- Upgrade Firebase plan

**If bids failing:**
- Add retry logic in frontend
- Check budget validation logic
- Verify auction state

## 📝 Pre-Live Checklist

Before your auction today:

- [ ] Ran 20-user test successfully
- [ ] Response times acceptable (< 500ms)
- [ ] No critical errors
- [ ] Firebase quotas sufficient
- [ ] Railway resources adequate
- [ ] Know how to restart services
- [ ] Have backup plan ready

## 🆘 Emergency Contacts

**If system fails during live auction:**

1. **Pause auction** (admin control)
2. **Check Railway logs**: `railway logs`
3. **Check Firebase**: console.firebase.google.com
4. **Restart if needed**: `railway restart`
5. **Communicate** with teams about pause

## 📞 Quick Commands

```bash
# Check backend is up
curl https://your-backend.railway.app/api/public/test

# Run quick 1-minute test
python3 -c "
import requests
import time
url = 'https://your-backend.railway.app/api/auction/state/your-event-id'
for i in range(20):
    start = time.time()
    r = requests.get(url)
    print(f'Request {i+1}: {r.status_code} - {(time.time()-start)*1000:.0f}ms')
    time.sleep(0.5)
"

# Monitor auction real-time
python3 monitor_auction.py
```

## 🎬 The Load Testing Files

1. **simple_load_test.py** - Easy to use, no dependencies
2. **load_test.py** - Advanced with Locust
3. **monitor_auction.py** - Real-time dashboard
4. **setup_loadtest.sh** - One-command setup

## 📚 Need More Help?

Read the full guide:
```bash
open LOAD_TESTING_GUIDE.md
```

---

**Good luck with your auction! 🏏🎯**
