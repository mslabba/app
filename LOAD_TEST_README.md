# 🎯 Load Testing Suite for Auction App

Complete load testing solution for your live auction with ~80 players.

## 📦 What's Included

### 🚀 Testing Scripts
- **`simple_load_test.py`** - Simple, standalone load test (recommended for beginners)
- **`load_test.py`** - Professional load testing with Locust (web UI, graphs, metrics)
- **`monitor_auction.py`** - Real-time auction monitoring dashboard

### 🛠️ Helper Tools
- **`get_config.py`** - Auto-configure your backend URL and event ID
- **`setup_loadtest.sh`** - One-command setup script
- **`requirements-loadtest.txt`** - Python dependencies

### 📚 Documentation
- **`LOAD_TEST_SUMMARY.md`** - Complete overview (READ THIS FIRST)
- **`LOAD_TESTING_GUIDE.md`** - Detailed guide with troubleshooting
- **`LOAD_TEST_QUICKSTART.md`** - Quick reference card
- **`PRE_AUCTION_CHECKLIST.md`** - Printable testing checklist

## ⚡ Quick Start (3 Steps)

```bash
# 1. Get your configuration
python3 get_config.py

# 2. Install dependencies
pip3 install -r requirements-loadtest.txt

# 3. Run test
python3 simple_load_test.py
```

That's it! Results will show if your system is ready.

## 📖 Which Guide to Read?

**🏃 In a Hurry?**
→ Read `LOAD_TEST_QUICKSTART.md` (2 minutes)
→ Run `python3 get_config.py` then `python3 simple_load_test.py`

**📚 Want Full Details?**
→ Read `LOAD_TEST_SUMMARY.md` (10 minutes)
→ Then read `LOAD_TESTING_GUIDE.md` for deep dive

**✅ Want a Checklist?**
→ Use `PRE_AUCTION_CHECKLIST.md` while testing

## 🎯 Testing Strategy

### Phase 1: Quick Test (5 min)
```bash
python3 simple_load_test.py
```
- 20 concurrent users
- 2 minutes duration
- Verifies basic functionality

### Phase 2: Load Test (10 min)
```bash
locust -f load_test.py --host=https://your-backend.railway.app
```
- 50 concurrent users
- 5 minutes duration
- Tests real auction conditions

### Phase 3: Monitor (During auction)
```bash
python3 monitor_auction.py
```
- Real-time dashboard
- Track bids and budgets
- Watch for issues

## 📊 Success Criteria

Your system is ready if:
- ✅ Success rate > 95%
- ✅ Response times < 500ms
- ✅ No critical errors
- ✅ No Firebase quota warnings

## 🆘 Need Help?

1. **Getting Started:** Read `LOAD_TEST_QUICKSTART.md`
2. **Detailed Help:** Read `LOAD_TESTING_GUIDE.md`
3. **During Testing:** Use `PRE_AUCTION_CHECKLIST.md`
4. **Troubleshooting:** See "Common Issues" section in guides

## 🎓 File Guide

| File | Purpose | When to Use |
|------|---------|-------------|
| `get_config.py` | Configure URLs | Run first |
| `simple_load_test.py` | Basic testing | Quick tests |
| `load_test.py` | Advanced testing | Detailed analysis |
| `monitor_auction.py` | Real-time monitoring | During auction |
| `LOAD_TEST_QUICKSTART.md` | Quick reference | When in hurry |
| `LOAD_TEST_SUMMARY.md` | Overview | First time |
| `LOAD_TESTING_GUIDE.md` | Complete guide | Deep learning |
| `PRE_AUCTION_CHECKLIST.md` | Testing checklist | During testing |

## ⚙️ Configuration

Before running tests, you need:
- **Backend URL** - Get from Railway dashboard
- **Event ID** - Get from Firebase console

Run `python3 get_config.py` to set these automatically.

## 🔍 What Gets Tested?

The load tests simulate real auction behavior:
- ✓ Viewing auction state (frequent)
- ✓ Checking available players
- ✓ Placing bids (rapid, concurrent)
- ✓ Viewing team budgets
- ✓ Checking team squads
- ✓ Viewing all teams

## 📈 Example Results

```
LOAD TEST RESULTS
================================================================================
Total Requests: 2,847
Successful: 2,839
Failed: 8
Success Rate: 99.72%

Bids Placed: 192
Bids Failed: 5

Response Times:
  Average: 287.32ms
  Min: 42.15ms
  Max: 1,205.67ms
  Median: 251.04ms

Requests per second: 23.73
================================================================================
```

## 🚨 Emergency Commands

```bash
# Quick health check
curl https://your-backend.railway.app/api/public/test

# View logs
cd backend && railway logs --tail

# Restart service
cd backend && railway restart

# Monitor auction
python3 monitor_auction.py
```

## 🏆 Best Practices

1. **Test on a separate event** - Never test on production!
2. **Start small** - Begin with 20 users, then scale up
3. **Monitor metrics** - Watch Railway and Firebase dashboards
4. **Test early** - Give yourself time to fix issues
5. **Have a backup** - Know what to do if systems fail

## ⏰ Time Budget

| Activity | Duration |
|----------|----------|
| Setup | 5 min |
| First test | 5 min |
| Analysis | 5 min |
| Second test | 10 min |
| Fixes (if needed) | 30-60 min |
| **Total** | **55-85 min** |

**Recommendation:** Allocate 2 hours for thorough testing.

## ✅ Pre-Auction Checklist

Before going live:
- [ ] Completed load testing successfully
- [ ] Fixed all critical issues
- [ ] Success rate > 95%
- [ ] Response times acceptable
- [ ] Monitoring tools ready
- [ ] Emergency procedures known
- [ ] Backup plan prepared
- [ ] Team briefed on procedures

## 🎊 You're Ready When...

- Tests pass with expected load
- You understand the metrics
- You know how to restart services
- You have monitoring running
- You have a backup plan
- Your team knows what to do

## 🚀 Let's Get Started!

```bash
cd /Users/mslabba/Sites/auction-app
python3 get_config.py
```

Then follow the prompts!

---

**Questions?** Check the guides in this directory.

**Issues?** See troubleshooting sections in `LOAD_TESTING_GUIDE.md`

**Good luck with your auction! 🏏🎯**
