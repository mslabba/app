"""
Bulk Upload Players from Excel

This script reads player data from an Excel file and uploads them to the auction app.
It can handle Google Drive photo links and optionally upload them to Cloudinary.

Excel Format Required:
- name (required)
- category_id (required) 
- base_price (required)
- photo_url (optional) - Can be Google Drive link or direct URL
- age (optional)
- position (optional)
- specialty (optional)
- previous_team (optional)
- cricheroes_link (optional)
- matches (optional)
- runs (optional)
- wickets (optional)
- goals (optional)
- assists (optional)

Usage:
    python bulk_upload_players.py --excel players.xlsx --token YOUR_AUTH_TOKEN
"""

import pandas as pd
import requests
import argparse
import sys
import re
from typing import Optional, Dict, Any
import time

# Backend API URL
API_URL = "https://auction-app-backend-production.up.railway.app/api"  # Update if different

def convert_google_drive_link(url: str) -> str:
    """
    Convert Google Drive sharing link to direct download link.
    
    Handles formats:
    - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    - https://drive.google.com/open?id=FILE_ID
    - https://drive.google.com/uc?id=FILE_ID
    """
    if not url or not isinstance(url, str):
        return url
    
    # Extract file ID from various Google Drive URL formats
    patterns = [
        r'drive\.google\.com/file/d/([a-zA-Z0-9_-]+)',
        r'drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)',
        r'drive\.google\.com/uc\?id=([a-zA-Z0-9_-]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            file_id = match.group(1)
            # Return direct download link
            return f"https://drive.google.com/uc?export=download&id={file_id}"
    
    # If not a Google Drive link, return as is
    return url

def create_player_payload(row: pd.Series) -> Dict[str, Any]:
    """Create player payload from Excel row."""
    
    # Required fields
    payload = {
        "name": str(row['name']).strip(),
        "category_id": str(row['category_id']).strip(),
        "base_price": int(row['base_price'])
    }
    
    # Optional fields - only include if not null/empty
    optional_fields = [
        'photo_url', 'age', 'position', 'specialty', 
        'previous_team', 'cricheroes_link'
    ]
    
    for field in optional_fields:
        if field in row and pd.notna(row[field]) and str(row[field]).strip():
            value = str(row[field]).strip()
            
            # Convert Google Drive links for photo_url
            if field == 'photo_url':
                value = convert_google_drive_link(value)
            
            # Convert age to int if present
            if field == 'age':
                value = int(float(value))
            
            payload[field] = value
    
    # Handle stats
    stats = {}
    stat_fields = ['matches', 'runs', 'wickets', 'goals', 'assists']
    
    for stat in stat_fields:
        if stat in row and pd.notna(row[stat]) and str(row[stat]).strip():
            try:
                stats[stat] = int(float(row[stat]))
            except (ValueError, TypeError):
                pass
    
    if stats:
        payload['stats'] = stats
    
    return payload

def upload_player(payload: Dict[str, Any], token: str) -> Dict[str, Any]:
    """Upload a single player to the backend."""
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/players",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {
                "success": False, 
                "error": f"Status {response.status_code}: {response.text}"
            }
    
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}

def bulk_upload_players(
    excel_file: str, 
    token: str,
    sheet_name: str = 0,
    start_row: int = 0,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Bulk upload players from Excel file.
    
    Args:
        excel_file: Path to Excel file
        token: Authentication token
        sheet_name: Excel sheet name or index (default: 0 for first sheet)
        start_row: Row number to start from (default: 0)
        dry_run: If True, validate data but don't upload
    
    Returns:
        Dict with upload results
    """
    
    try:
        # Read Excel file
        print(f"📖 Reading Excel file: {excel_file}")
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        
        # Skip rows if specified
        if start_row > 0:
            df = df.iloc[start_row:]
        
        print(f"✅ Found {len(df)} players in Excel file")
        print(f"\nColumns found: {', '.join(df.columns.tolist())}")
        
        # Validate required columns
        required_cols = ['name', 'category_id', 'base_price']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            return {
                "success": False,
                "error": f"Missing required columns: {', '.join(missing_cols)}"
            }
        
        # Remove rows where name is empty
        df = df[df['name'].notna() & (df['name'] != '')]
        
        print(f"\n{'🔍 DRY RUN MODE - No uploads will be made' if dry_run else '🚀 Starting upload...'}\n")
        
        results = {
            "total": len(df),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        # Process each player
        for idx, row in df.iterrows():
            try:
                player_name = str(row['name']).strip()
                print(f"\n[{idx + 1}/{len(df)}] Processing: {player_name}")
                
                # Create payload
                payload = create_player_payload(row)
                print(f"  📋 Payload: {payload}")
                
                if dry_run:
                    print(f"  ✓ Validation passed (dry run)")
                    results["successful"] += 1
                else:
                    # Upload player
                    result = upload_player(payload, token)
                    
                    if result["success"]:
                        print(f"  ✅ Successfully uploaded!")
                        results["successful"] += 1
                    else:
                        print(f"  ❌ Failed: {result['error']}")
                        results["failed"] += 1
                        results["errors"].append({
                            "row": idx + 1,
                            "name": player_name,
                            "error": result['error']
                        })
                    
                    # Rate limiting - wait a bit between uploads
                    time.sleep(0.5)
            
            except Exception as e:
                print(f"  ❌ Error processing row: {str(e)}")
                results["failed"] += 1
                results["errors"].append({
                    "row": idx + 1,
                    "name": str(row.get('name', 'Unknown')),
                    "error": str(e)
                })
        
        return results
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to read Excel file: {str(e)}"
        }

def print_results(results: Dict[str, Any]):
    """Print upload results summary."""
    
    if not results.get("success", True):
        print(f"\n❌ ERROR: {results.get('error', 'Unknown error')}")
        return
    
    print("\n" + "="*60)
    print("📊 UPLOAD SUMMARY")
    print("="*60)
    print(f"Total players:      {results['total']}")
    print(f"✅ Successful:      {results['successful']}")
    print(f"❌ Failed:          {results['failed']}")
    print("="*60)
    
    if results['errors']:
        print("\n⚠️  ERRORS:")
        for error in results['errors']:
            print(f"\nRow {error['row']}: {error['name']}")
            print(f"  Error: {error['error']}")

def main():
    parser = argparse.ArgumentParser(
        description="Bulk upload players from Excel to Auction App",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run to validate data
  python bulk_upload_players.py --excel players.xlsx --token YOUR_TOKEN --dry-run
  
  # Upload players
  python bulk_upload_players.py --excel players.xlsx --token YOUR_TOKEN
  
  # Upload from specific sheet, starting at row 5
  python bulk_upload_players.py --excel players.xlsx --token YOUR_TOKEN --sheet "Sheet2" --start-row 5
        """
    )
    
    parser.add_argument(
        '--excel',
        required=True,
        help='Path to Excel file with player data'
    )
    
    parser.add_argument(
        '--token',
        required=True,
        help='Authentication token from your auction app'
    )
    
    parser.add_argument(
        '--sheet',
        default=0,
        help='Sheet name or index (default: 0 for first sheet)'
    )
    
    parser.add_argument(
        '--start-row',
        type=int,
        default=0,
        help='Row number to start from (default: 0)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Validate data without uploading'
    )
    
    parser.add_argument(
        '--api-url',
        default=API_URL,
        help=f'Backend API URL (default: {API_URL})'
    )
    
    args = parser.parse_args()
    
    # Update global API URL if provided
    global API_URL
    API_URL = args.api_url
    
    print("🎯 Auction App - Bulk Player Upload")
    print("="*60)
    print(f"Excel file:  {args.excel}")
    print(f"Sheet:       {args.sheet}")
    print(f"Start row:   {args.start_row}")
    print(f"Mode:        {'DRY RUN' if args.dry_run else 'UPLOAD'}")
    print(f"API URL:     {API_URL}")
    print("="*60)
    
    # Confirm before proceeding
    if not args.dry_run:
        response = input("\n⚠️  This will upload players to the database. Continue? (y/n): ")
        if response.lower() != 'y':
            print("❌ Upload cancelled")
            return
    
    # Run bulk upload
    results = bulk_upload_players(
        excel_file=args.excel,
        token=args.token,
        sheet_name=args.sheet,
        start_row=args.start_row,
        dry_run=args.dry_run
    )
    
    # Print results
    print_results(results)
    
    # Exit with appropriate code
    if results.get("success", True) and results.get("failed", 0) == 0:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
