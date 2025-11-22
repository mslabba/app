# Load Testing Guide for Auction App

This guide will help you perform load testing on your auction app before going live with 80 players.

## Prerequisites

1. Your backend must be deployed and accessible (Railway URL)
2. Your database (Firebase) must be configured
3. You have admin access to your event

## Quick Start

### Option 1: Simple Load Test (Recommended for Quick Testing)

This uses a simple Python script with the `requests` library.

```bash
# Install dependencies
pip install requests

# Edit the configuration in simple_load_test.py:
# - BACKEND_URL: Your Railway backend URL
# - EVENT_ID: Your event ID from Firebase
# - NUM_CONCURRENT_USERS: Number of simulated users (start with 20)
# - TEST_DURATION_SECONDS: How long to run the test

# Run the test
python simple_load_test.py
```

### Option 2: Professional Load Test with Locust

Locust provides a web UI and more detailed metrics.

```bash
# Install Locust
pip install locust

# Run Locust with web interface
locust -f load_test.py --host=https://your-backend-url.railway.app

# Then open browser to http://localhost:8089
# Enter:
# - Number of users: 20-50 (for 80 player auction)
# - Spawn rate: 5 users/second
# - Host: Your backend URL
```

## Test Scenarios

### Scenario 1: Basic Load Test
- **Users**: 20 concurrent users
- **Duration**: 2 minutes
- **Purpose**: Verify basic functionality under load

### Scenario 2: Peak Load Test (Recommended)
- **Users**: 50 concurrent users (simulating teams + spectators)
- **Duration**: 5 minutes
- **Purpose**: Test peak auction activity when multiple teams bid

### Scenario 3: Stress Test
- **Users**: 100 concurrent users
- **Duration**: 10 minutes
- **Purpose**: Find breaking point and ensure graceful degradation

## What to Monitor

### Backend Performance
1. **Response Times**: Should be < 500ms for bidding
2. **Error Rate**: Should be < 1%
3. **Request Rate**: Can system handle 50+ requests/second?

### Firebase Metrics
1. **Read Operations**: Check Firebase console for read load
2. **Write Operations**: Bidding creates many writes
3. **Concurrent Connections**: Monitor active connections

### Key Endpoints to Watch
- `POST /api/bids/place` - Critical bidding endpoint
- `GET /api/auction/state/{event_id}` - Frequently polled
- `GET /api/teams/{team_id}/budget-analysis/{event_id}` - Budget checks

## Before Running Tests

### 1. Create Test Event
```bash
# Create a separate test event with test data
# Don't test on your production event!
```

### 2. Prepare Test Teams
- Create 10-20 test team accounts
- Assign them to your test event
- Give them reasonable budgets

### 3. Add Test Players
- Add 80+ test players to match your real auction
- Set categories and base prices

### 4. Start Test Auction
- Use your admin account to start the test event
- Set first player for bidding

## Running the Load Test

### Using simple_load_test.py

```bash
# 1. Edit configuration
nano simple_load_test.py

# 2. Update these variables:
BACKEND_URL = "https://your-app.railway.app"
EVENT_ID = "your-test-event-id"
NUM_CONCURRENT_USERS = 20
TEST_DURATION_SECONDS = 120

# 3. Run the test
python simple_load_test.py
```

### Using Locust

```bash
# 1. Start Locust
locust -f load_test.py --host=https://your-app.railway.app

# 2. Open browser to http://localhost:8089

# 3. Configure test:
#    - Number of users: 20
#    - Spawn rate: 2
#    - Run time: 2m

# 4. Start test and monitor web UI

# 5. Download results when complete
```

## Interpreting Results

### Good Performance Indicators
✅ Average response time < 500ms
✅ 95th percentile < 1000ms
✅ Error rate < 1%
✅ No timeout errors
✅ Stable memory usage

### Warning Signs
⚠️ Response times > 1000ms
⚠️ Error rate > 5%
⚠️ Increasing response times over test duration
⚠️ Timeout errors
⚠️ Firebase quota warnings

### Critical Issues
❌ Error rate > 10%
❌ Response times > 3000ms
❌ Server crashes
❌ Database connection errors
❌ Firebase quota exceeded

## Optimizations Based on Results

### If Response Times are Slow
1. Add database indexes in Firebase
2. Implement caching for auction state
3. Optimize queries (reduce nested calls)
4. Consider upgrading Railway plan

### If You Hit Firebase Limits
1. Implement rate limiting on frontend
2. Use Firebase real-time listeners instead of polling
3. Batch read operations
4. Upgrade Firebase plan if needed

### If Bidding Fails Under Load
1. Implement optimistic locking
2. Add retry logic with exponential backoff
3. Queue bids if simultaneous
4. Add bid validation before submission

## Production Checklist

Before your live auction:

- [ ] Successfully completed 20-user load test
- [ ] Successfully completed 50-user load test
- [ ] Average response times < 500ms
- [ ] No critical errors during testing
- [ ] Firebase quotas are sufficient
- [ ] Railway resources are adequate
- [ ] Monitoring/logging is enabled
- [ ] Backup plan if system fails
- [ ] Team knows how to restart services

## Emergency Procedures

### If System Slows During Live Auction

1. **Immediate Actions**:
   - Pause auction temporarily
   - Check Railway logs for errors
   - Check Firebase console for quota issues
   - Restart backend service if needed

2. **Communication**:
   - Announce pause to teams
   - Give estimated time to resume
   - Use backup communication channel

3. **Fallback Options**:
   - Manual bidding via spreadsheet
   - Pause and resume next day
   - Switch to backup Firebase project

## Sample Test Results

```
Expected Results for 20 Users, 2 Minutes:
=========================================
Total Requests: ~2,000-3,000
Success Rate: > 99%
Average Response Time: 200-500ms
Max Response Time: < 2000ms
Requests per Second: 15-25
Bids Placed: 100-200
```

## Advanced: Custom Test Scenarios

Create a custom scenario file:

```python
# custom_test.py
from load_test import AuctionUser
from locust import task, between

class CustomAuctionUser(AuctionUser):
    wait_time = between(0.5, 1.5)  # Faster bidding
    
    @task(20)  # Higher weight for bidding
    def place_aggressive_bid(self):
        # Custom bidding logic
        pass
```

## Monitoring During Live Auction

### Real-time Monitoring Tools
1. **Railway Dashboard**: Watch CPU, memory, and requests
2. **Firebase Console**: Monitor read/write operations
3. **Browser DevTools**: Network tab for frontend performance
4. **Custom Logging**: Add logging to critical endpoints

### Key Metrics to Watch
- Requests per second
- Error rate
- Response times (p50, p95, p99)
- Active connections
- Database operations

## Contact & Support

If you encounter issues during load testing:
1. Check backend logs: `railway logs`
2. Check Firebase console for errors
3. Review this guide's troubleshooting section
4. Test with fewer users first

## Additional Resources

- [Locust Documentation](https://docs.locust.io/)
- [Firebase Performance](https://firebase.google.com/docs/firestore/best-practices)
- [Railway Monitoring](https://docs.railway.app/)

Good luck with your auction! 🎯
