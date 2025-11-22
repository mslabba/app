`# Bulk Player Upload Guide

This guide explains how to bulk upload players from an Excel file to your auction app.

## 📋 Prerequisites

1. **Python Libraries**: Install required packages
   ```bash
   pip install pandas openpyxl requests
   ```

2. **Authentication Token**: Get your auth token from the auction app
   - Login to your auction app
   - Open browser DevTools (F12)
   - Go to Application/Storage → Local Storage
   - Copy the `authToken` value

3. **Category ID**: You need the category ID where players will be added
   - Go to your event's category management page
   - Note the category IDs you want to use

## 📊 Excel File Format

Create an Excel file with the following columns:

### Required Columns:
- **name**: Player's full name (required)
- **category_id**: Category UUID (required)
- **base_price**: Base auction price in rupees (required)

### Optional Columns:
- **photo_url**: Photo URL or Google Drive link
- **age**: Player's age (number)
- **position**: Position/Role (e.g., "Batsman", "Forward")
- **specialty**: Special skills (e.g., "Right-hand bat")
- **previous_team**: Previous team name
- **cricheroes_link**: CricHeroes profile URL
- **matches**: Number of matches played (stats)
- **runs**: Total runs/goals scored (stats)
- **wickets**: Wickets taken/assists (stats)
- **goals**: Goals scored (stats)
- **assists**: Assists (stats)

### Example Excel Format:

| name | category_id | base_price | photo_url | age | position | specialty | previous_team | cricheroes_link | matches | runs | wickets |
|------|-------------|------------|-----------|-----|----------|-----------|---------------|-----------------|---------|------|---------|
| Virat Kohli | abc-123-xyz | 200000 | https://drive.google.com/file/d/FILE_ID/view | 35 | Batsman | Right-hand bat | RCB | https://cricheroes.com/... | 200 | 7000 | 0 |
| MS Dhoni | abc-123-xyz | 250000 | https://example.com/photo.jpg | 42 | Wicket-keeper | Finisher | CSK | | 250 | 5000 | 0 |

## 🚀 Usage

### 1. Dry Run (Validation Only)

First, validate your Excel file without uploading:

```bash
python bulk_upload_players.py \
  --excel players.xlsx \
  --token YOUR_AUTH_TOKEN \
  --dry-run
```

This will:
- ✅ Check if Excel file is valid
- ✅ Validate required columns exist
- ✅ Convert Google Drive links
- ✅ Show what would be uploaded
- ❌ NOT upload any data

### 2. Actual Upload

Once validation passes, run the actual upload:

```bash
python bulk_upload_players.py \
  --excel players.xlsx \
  --token YOUR_AUTH_TOKEN
```

### 3. Advanced Options

```bash
# Upload from a specific sheet
python bulk_upload_players.py \
  --excel players.xlsx \
  --token YOUR_AUTH_TOKEN \
  --sheet "Sheet2"

# Skip first 5 rows (e.g., if you have headers)
python bulk_upload_players.py \
  --excel players.xlsx \
  --token YOUR_AUTH_TOKEN \
  --start-row 5

# Use custom API URL
python bulk_upload_players.py \
  --excel players.xlsx \
  --token YOUR_AUTH_TOKEN \
  --api-url https://your-backend.com/api
```

## 📸 Google Drive Photo Links

The script automatically converts Google Drive sharing links to direct download URLs.

Supported formats:
- `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- `https://drive.google.com/open?id=FILE_ID`
- `https://drive.google.com/uc?id=FILE_ID`

### How to get Google Drive links:

1. Upload photos to Google Drive
2. Right-click photo → "Get link"
3. Set permissions to "Anyone with the link"
4. Copy the link and paste in Excel

**Note**: The script converts these to direct download URLs automatically.

## 🎯 Step-by-Step Guide

### Step 1: Prepare Your Excel File

1. Download the template: `player_upload_template.xlsx`
2. Fill in player details
3. Add Google Drive links for photos
4. Save the file

### Step 2: Get Your Auth Token

```bash
# Option 1: From browser
1. Login to auction app
2. Press F12 (DevTools)
3. Go to Application → Local Storage
4. Copy 'authToken' value

# Option 2: From API (if you have login credentials)
curl -X POST https://your-backend.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

### Step 3: Get Category IDs

Visit your event page and note the category IDs:
- Navigate to Event → Categories
- Copy the ID from the URL or category list

### Step 4: Run Dry Run

```bash
python bulk_upload_players.py \
  --excel players.xlsx \
  --token YOUR_TOKEN \
  --dry-run
```

Check output for any errors.

### Step 5: Upload Players

```bash
python bulk_upload_players.py \
  --excel players.xlsx \
  --token YOUR_TOKEN
```

Wait for completion. The script will show progress for each player.

## 📝 Output Example

```
🎯 Auction App - Bulk Player Upload
============================================================
Excel file:  players.xlsx
Sheet:       0
Start row:   0
Mode:        UPLOAD
API URL:     https://auction-app-backend-production.up.railway.app/api
============================================================

⚠️  This will upload players to the database. Continue? (y/n): y

📖 Reading Excel file: players.xlsx
✅ Found 50 players in Excel file

Columns found: name, category_id, base_price, photo_url, age, position

🚀 Starting upload...

[1/50] Processing: Virat Kohli
  📋 Payload: {'name': 'Virat Kohli', 'category_id': 'abc-123', ...}
  ✅ Successfully uploaded!

[2/50] Processing: MS Dhoni
  📋 Payload: {'name': 'MS Dhoni', 'category_id': 'abc-123', ...}
  ✅ Successfully uploaded!

...

============================================================
📊 UPLOAD SUMMARY
============================================================
Total players:      50
✅ Successful:      48
❌ Failed:          2
============================================================

⚠️  ERRORS:
Row 15: Rohit Sharma
  Error: Category not found

Row 23: Jasprit Bumrah
  Error: Duplicate player name
```

## 🔧 Troubleshooting

### Error: "Missing required columns"
- Ensure your Excel has `name`, `category_id`, and `base_price` columns
- Column names are case-sensitive

### Error: "Category not found"
- Verify the category_id exists in your event
- Check for typos in the category ID

### Error: "Authentication failed"
- Your token may have expired
- Get a fresh token from the app

### Error: "Google Drive link not working"
- Ensure the link is shared with "Anyone with the link"
- Check file permissions in Google Drive

### Script hangs or is slow
- This is normal - the script waits 0.5s between uploads to avoid rate limiting
- For 100 players, expect ~50 seconds

## 💡 Tips

1. **Always run dry-run first** to catch errors before uploading
2. **Use consistent category IDs** for players in the same category
3. **Set Google Drive permissions** to "Anyone with the link" for photos
4. **Keep backup** of your Excel file
5. **Test with small batch** (5-10 players) before doing full upload

## 🆘 Support

If you encounter issues:
1. Check this README first
2. Run with `--dry-run` to see validation errors
3. Check the error messages in the output
4. Verify your Excel format matches the template

## 📦 Requirements

```
pandas>=2.0.0
openpyxl>=3.1.0
requests>=2.31.0
```

Install all at once:
```bash
pip install pandas openpyxl requests
```
