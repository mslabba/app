#!/usr/bin/env python3
"""
Quick Config - Set backend URL and event ID directly in test files
Use this if you want to skip the interactive setup
"""

import sys
import os
import re

# EDIT THESE VALUES
BACKEND_URL = "https://power-auction-app-production.up.railway.app"
EVENT_ID = "your-event-id-here"  # Get from Firebase Console -> events collection

# Files to update
FILES_TO_UPDATE = [
    'simple_load_test.py',
    'monitor_auction.py'
]

def update_file(filepath, backend_url, event_id):
    """Update backend URL and event ID in a file"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Update BACKEND_URL
        content = re.sub(
            r'BACKEND_URL = ["\'].*?["\']',
            f'BACKEND_URL = "{backend_url}"',
            content
        )
        
        # Update EVENT_ID
        content = re.sub(
            r'EVENT_ID = ["\'].*?["\']',
            f'EVENT_ID = "{event_id}"',
            content
        )
        
        with open(filepath, 'w') as f:
            f.write(content)
        
        return True
    except Exception as e:
        print(f"Error updating {filepath}: {e}")
        return False

def main():
    print("="*80)
    print("QUICK CONFIG - Update Load Test Files")
    print("="*80)
    print()
    
    # Check if values are set
    if EVENT_ID == "your-event-id-here":
        print("⚠️  Please edit this file and set your EVENT_ID first!")
        print(f"   File: {__file__}")
        print()
        print("   1. Get your Event ID from Firebase Console:")
        print("      https://console.firebase.google.com")
        print("      → Firestore Database → events collection")
        print()
        print("   2. Edit this file and update EVENT_ID")
        print()
        print("   3. Run this script again")
        print()
        sys.exit(1)
    
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Event ID: {EVENT_ID}")
    print()
    
    # Confirm
    response = input("Update files with these values? (y/n): ").strip().lower()
    if response != 'y':
        print("Cancelled.")
        sys.exit(0)
    
    print()
    print("Updating files...")
    print()
    
    updated = 0
    for filename in FILES_TO_UPDATE:
        filepath = os.path.join(os.path.dirname(__file__), filename)
        if os.path.exists(filepath):
            if update_file(filepath, BACKEND_URL, EVENT_ID):
                print(f"✅ Updated: {filename}")
                updated += 1
            else:
                print(f"❌ Failed: {filename}")
        else:
            print(f"⚠️  Not found: {filename}")
    
    print()
    print("="*80)
    
    if updated > 0:
        print(f"✅ Successfully updated {updated} file(s)!")
        print()
        print("You can now run:")
        print("  python3 simple_load_test.py")
        print("  python3 monitor_auction.py")
    else:
        print("❌ No files were updated")
    
    print("="*80)

if __name__ == "__main__":
    main()
