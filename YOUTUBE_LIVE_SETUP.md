# 🎥 YouTube Live Streaming Setup for Auction

## Option 1: Share Your Screen to YouTube Live (Easiest) ⭐

### **Using OBS Studio (Free & Professional)**

#### Step 1: Install OBS Studio (5 minutes)
1. Download from: https://obsproject.com/
2. Install on your Mac
3. Open OBS Studio

#### Step 2: Configure OBS for YouTube Live (10 minutes)

1. **Get YouTube Stream Key:**
   - Go to: https://studio.youtube.com/
   - Click **"Create"** → **"Go live"**
   - Choose **"Stream"** (not Webcam)
   - Copy your **Stream Key** (keep this secret!)

2. **Configure OBS Settings:**
   ```
   Settings → Stream
   - Service: YouTube
   - Server: Primary YouTube ingest server
   - Stream Key: [Paste your key here]
   ```

3. **Set Video Quality:**
   ```
   Settings → Output
   - Output Mode: Simple
   - Video Bitrate: 4500 Kbps
   - Encoder: Apple VT H264 Hardware Encoder (for Mac)
   
   Settings → Video
   - Base Resolution: 1920x1080
   - Output Resolution: 1920x1080
   - FPS: 30
   ```

#### Step 3: Add Your Auction Display as Source

1. **Capture Browser Window:**
   ```
   Sources (bottom left) → Add (+) → Window Capture
   Name: "Auction Display"
   Window: [Select your browser with auction display]
   ✅ Capture Cursor (if you want to show mouse)
   ```

2. **Add Auction Control (Optional):**
   ```
   Sources → Add (+) → Window Capture
   Name: "Auction Control"
   Window: [Select browser with auction control]
   Position this in a corner or side panel
   ```

3. **Add Logo/Branding (Optional):**
   ```
   Sources → Add (+) → Image
   Select your logo/banner image
   Position it where you want
   ```

#### Step 4: Go Live! (1 minute)

1. In OBS: Click **"Start Streaming"**
2. In YouTube Studio:
   - Set title: "Live Cricket Auction 2025"
   - Set visibility: **Public** or **Unlisted**
   - Add description
   - Click **"Go Live"**

3. **Share YouTube link** with your audience!

---

## Option 2: Embed Auction Display URL Directly (Quick & Simple)

### **YouTube Live with Browser Stream**

1. **Get your auction display URL:**
   ```
   https://your-frontend-url.com/auction-display/YOUR_EVENT_ID
   ```

2. **Use Restream.io or similar:**
   - Sign up at: https://restream.io (free tier available)
   - Connect to YouTube
   - Use "Browser Source" to share your auction URL
   - Start streaming

---

## Option 3: Direct Iframe Embed (For Your Own Website)

If you want to embed the auction display on your website alongside YouTube chat:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Live Auction</title>
    <style>
        body { margin: 0; display: flex; height: 100vh; }
        #auction { flex: 3; }
        #chat { flex: 1; border-left: 2px solid #ccc; }
    </style>
</head>
<body>
    <!-- Your Auction Display -->
    <iframe id="auction" 
            src="https://your-frontend-url.com/auction-display/EVENT_ID" 
            frameborder="0">
    </iframe>
    
    <!-- YouTube Live Chat -->
    <iframe id="chat" 
            src="https://www.youtube.com/live_chat?v=YOUR_VIDEO_ID&embed_domain=your-domain.com" 
            frameborder="0">
    </iframe>
</body>
</html>
```

---

## 🎯 Recommended Setup for Your Auction

### **Best: OBS Studio + YouTube Live**

**Why?**
- ✅ Professional quality
- ✅ Can add overlays, logos, sponsor banners
- ✅ Can switch between auction display and control screen
- ✅ Can show multiple views simultaneously
- ✅ Free!

**Layout Suggestion:**
```
┌────────────────────────────────────────┐
│         YOUR LOGO / BANNER             │
├────────────────────────────────────────┤
│                                        │
│      AUCTION DISPLAY (MAIN VIEW)       │
│      (Current Player, Bids, Teams)     │
│                                        │
├─────────────────┬──────────────────────┤
│  Control Panel  │   Leaderboard/Stats  │
│  (Small corner) │   (Optional)         │
└─────────────────┴──────────────────────┘
```

---

## 📋 Pre-Stream Checklist

### Before Going Live:

- [ ] OBS installed and configured
- [ ] YouTube stream key added to OBS
- [ ] Test stream (YouTube lets you test privately)
- [ ] Audio working (if you want commentary)
- [ ] Auction display loading properly
- [ ] Internet connection stable (upload speed >10 Mbps)
- [ ] Backup internet (mobile hotspot ready)

### During Stream:

- [ ] Monitor YouTube Studio for viewer count
- [ ] Check chat for questions/issues
- [ ] Have someone monitoring stream quality
- [ ] Keep OBS "Stats" panel open to monitor:
  - CPU usage (keep below 80%)
  - Dropped frames (should be 0)
  - Bitrate

---

## 🚀 Quick Start (15 Minutes Setup)

### Fastest Way to Go Live:

1. **Download OBS:** https://obsproject.com/ (5 min)
2. **Get YouTube Stream Key:** YouTube Studio → Go Live (2 min)
3. **Configure OBS:**
   ```
   Settings → Stream → Add YouTube key
   Sources → Add Window Capture → Select auction browser
   ```
4. **Click "Start Streaming"** in OBS
5. **Share YouTube link** with teams!

---

## 🔗 Your Auction Display URLs

You'll need these URLs for streaming:

### **Auction Display (Public View):**
```
https://your-frontend-url.com/auction-display/YOUR_EVENT_ID
```
This shows:
- Current player being auctioned
- Live bidding
- Team budgets
- Sold players

### **Auction Control (Your Control Panel):**
```
https://your-frontend-url.com/auction-control/YOUR_EVENT_ID
```
This is what YOU use to control the auction (don't show this on stream!)

### **Public Team Stats (For Team Owners):**
```
https://your-frontend-url.com/public/team/TEAM_ID/stats?token=YOUR_TOKEN
```
Give each team their unique link (from earlier discussion)

---

## 💡 Pro Tips

### For Better Streaming:

1. **Use Wired Internet** (not WiFi if possible)
2. **Close unnecessary apps** to save CPU/bandwidth
3. **Have backup device** ready to take over if needed
4. **Test 30 minutes before** going live
5. **Set YouTube stream to 30-second delay** (gives you buffer for issues)

### Add Commentary:

1. In OBS: **Sources → Add Audio Input** (your microphone)
2. Adjust audio levels so commentary is clear
3. Can mute/unmute during auction

### Add Multiple Views:

```
Scene 1: "Auction Main View"
- Full screen auction display

Scene 2: "Auction + Stats"
- Auction display (70%)
- Team leaderboard (30%)

Scene 3: "Break Screen"
- Logo/sponsors
- Music (add audio file)
- "Starting soon..." text
```

Switch between scenes during auction breaks!

---

## 🆘 Troubleshooting

### Stream Lagging:
- Lower bitrate: OBS Settings → Output → 3000 Kbps
- Lower resolution: Settings → Video → 1280x720
- Close other apps using internet

### No Audio:
- Check OBS audio mixer (bottom)
- Desktop Audio should show green bars
- Check YouTube stream settings

### Dropped Frames:
- CPU overloaded: Close other apps
- Switch encoder: Settings → Output → x264 (uses CPU instead of GPU)

---

## 📞 Need Help During Auction?

**YouTube Live Support:** https://support.google.com/youtube/answer/2474026
**OBS Support:** https://obsproject.com/wiki/

---

## 🎬 After Auction

YouTube automatically saves your live stream as a video that you can:
- Share with teams who missed it
- Create highlights
- Download and edit

---

**Ready to go live?** 🚀

1. Install OBS now
2. Test stream privately
3. Go live 10 minutes before auction starts!

Good luck with your auction! 🏏
