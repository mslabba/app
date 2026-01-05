# Demo Players Generator Guide

This guide will help you quickly generate 50 demo players with dummy images for your demo auction.

## 🚀 Quick Start

### 1. Get Your Authentication Token

**Option A: Using Network Tab (Easiest & Most Reliable)**

1. Login to your demo account at https://thepowerauction.com/login
2. Open browser DevTools (F12 or Right Click → Inspect)
3. Go to **Network** tab
4. Navigate to your players page or click on any page in the admin panel
5. In the Network tab, look for any API request (like `players`, `categories`, `teams`, etc.)
6. Click on that request
7. Go to **Headers** section → scroll to **Request Headers**
8. Find the line that says `Authorization: Bearer eyJhbGc...`
9. Copy everything **after "Bearer "** (this is your token - it's very long!)

**Option B: Using Browser Console**

If Option A doesn't work, try this in the Console tab:
```javascript
// This might work depending on your app setup
auth.currentUser.getIdToken().then(token => {
  console.log('YOUR TOKEN:');
  console.log(token);
  navigator.clipboard.writeText(token);
  alert('Token copied to clipboard!');
});
```

### 2. Run the Script

```bash
cd /Users/mslabba/Sites/auction-app

python3 generate_demo_players.py \
  --event-id 870d7af6-de24-4ea0-a408-8aff421b0e9b \
  --token "eyJhbGciOiJSUzI1NiIsImtpZCI6ImEzOGVhNmEwNDA4YjBjYzVkYTE4OWRmYzg4ODgyZDBmMWI3ZmJmMGUiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiRGVtbyBVc2VyIiwicm9sZSI6ImV2ZW50X29yZ2FuaXplciIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS90dXJndXQtYXVjdGlvbiIsImF1ZCI6InR1cmd1dC1hdWN0aW9uIiwiYXV0aF90aW1lIjoxNzY3NDQ4Nzg1LCJ1c2VyX2lkIjoiYlJOUWFKSDBKTE1vUlluTkVEVXpOUEc1Nk1FMiIsInN1YiI6ImJSTlFhSkgwSkxNb1JZbk5FRFV6TlBHNTZNRTIiLCJpYXQiOjE3Njc0NDg3ODUsImV4cCI6MTc2NzQ1MjM4NSwiZW1haWwiOiJkZW1vdXNlckBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZGVtb3VzZXJAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.kpDzEM43bHhIKcDYkgqkQiu7W8MnPKyFlPej1VFuvmTiuEskN-n7X2sQ4FpN45ZXN_cboPACPQfiNNmIdhaNF46AiBpgg3jbNv3i8U5mfVAOvwFIIxkwcSvJj8-VzCOqbZRJbd2waTUQu_NgHAPPFpQcKw1WfhuCY7Dt3cbrkzfibrZr0z74XK4eHMrmfC9kPboNCOhSauQ1hW8Yt00tOSTDU0dGp_4wYM8WhuxhmUe6646KO2iyozFpL7gajgsq0vj3JrScnfleROYXHI-JDW0dQRH0GLoyDtMC5c2xI1XhESwDgip_IujvpkxVBExXzdgptHCtlRfq8bgwRyhVIA"
```

### 3. Custom Options

Generate a different number of players:
```bash
python3 generate_demo_players.py \
  --event-id 870d7af6-de24-4ea0-a408-8aff421b0e9b \
  --token "YOUR_TOKEN_HERE" \
  --count 100
```

## 📋 What It Does

The script will:
- ✅ Generate 50 unique players with realistic Indian cricket names
- ✅ Create colorful dummy avatars using UI Avatars API
- ✅ Assign random but realistic stats (matches, runs, wickets)
- ✅ Distribute players across all your event categories
- ✅ Add random positions, specialties, and previous teams
- ✅ Show progress as each player is created

## 🎭 Generated Player Features

Each demo player includes:
- **Name**: Unique combinations like "Virat Sharma 1", "Rohit Patel 2"
- **Photo**: Colorful avatar with initials (e.g., VS, RP)
- **Age**: Random age between 18-35
- **Position**: Batsman, Bowler, All-rounder, etc.
- **Specialty**: Power Hitting, Death Bowling, etc.
- **Stats**: Random matches (10-150), runs (100-5000), wickets (5-200)
- **Base Price**: Automatically uses your category base prices

## 🖼️ About the Dummy Images

The script uses [UI Avatars API](https://ui-avatars.com/) which:
- ✅ Generates avatars instantly (no upload needed)
- ✅ Creates unique colors for each player
- ✅ Shows player initials on the avatar
- ✅ Works perfectly for demos and testing
- ✅ No storage or bandwidth concerns

## 🔧 Requirements

```bash
# Install required package (if not already installed)
pip3 install requests
```

## 📝 Example Output

```
🎭 Demo Player Generator
==================================================
Event ID: 870d7af6-de24-4ea0-a408-8aff421b0e9b
Players to generate: 50
API URL: https://power-auction-app-production.up.railway.app/api
==================================================

📋 Fetching categories...
✅ Found 3 categories
   - Category A (Base Price: ₹50,000)
   - Category B (Base Price: ₹30,000)
   - Category C (Base Price: ₹20,000)

🎯 Generating 50 demo players...
--------------------------------------------------
[1/50] Creating Virat Sharma 1... ✅
[2/50] Creating Rohit Patel 2... ✅
[3/50] Creating Rahul Singh 3... ✅
...
[50/50] Creating Hardik Kumar 50... ✅

==================================================
📊 Summary
==================================================
✅ Successfully created: 50 players
❌ Failed: 0 players
📝 Total: 50 players

🎉 Demo players created successfully!
🔗 View them at: https://thepowerauction.com/admin/players/870d7af6-de24-4ea0-a408-8aff421b0e9b

==================================================
```

## 🎥 Ready for Demo Video!

After running the script, you'll have:
- 50 diverse demo players
- Colorful player photos
- Realistic player stats
- Ready-to-auction players

Now you can:
1. Start your auction
2. Record your training video
3. Show bidding process
4. Demonstrate team management

## 🆘 Troubleshooting

**Can't Get Token from Console?**
The Network Tab method (Option A) is the most reliable. Just:
1. Open DevTools → Network tab
2. Click around in your admin panel
3. Click any API request in the Network list
4. Headers → Request Headers → find "Authorization: Bearer ..."
5. Copy the long token after "Bearer "

**Token Error?**
- Make sure you copied the full token (it's usually very long, 800+ characters)
- Token might expire after 1 hour - get a fresh one if needed
- Ensure you're logged in before trying to get the token

**No Categories Error?**
- Create at least one category in your event before running the script
- Go to: https://thepowerauction.com/admin/categories/870d7af6-de24-4ea0-a408-8aff421b0e9b

**Players Not Showing?**
- Refresh the players page
- Check that you're viewing the correct event

## 🔗 Quick Links

- **Your Event Players**: https://thepowerauction.com/admin/players/870d7af6-de24-4ea0-a408-8aff421b0e9b
- **Event Categories**: https://thepowerauction.com/admin/categories/870d7af6-de24-4ea0-a408-8aff421b0e9b
- **Event Dashboard**: https://thepowerauction.com/admin

---

Happy Demo Recording! 🎬
