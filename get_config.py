#!/usr/bin/env python3
"""
Helper script to find your backend URL and event ID
Run this to get the information you need for load testing
"""

import subprocess
import json
import sys

print("="*80)
print("AUCTION APP - Load Test Configuration Helper")
print("="*80)
print()

# Try to get Railway URL
print("🔍 Looking for your backend URL...")
print()

try:
    # Try to get Railway domain
    result = subprocess.run(
        ['railway', 'domain'],
        cwd='/Users/mslabba/Sites/auction-app/backend',
        capture_output=True,
        text=True,
        timeout=10
    )
    
    if result.returncode == 0 and result.stdout.strip():
        # Parse the Railway output - it may contain extra text
        raw_output = result.stdout.strip()
        
        # Extract URL from Railway output (handles multi-line output)
        lines = raw_output.split('\n')
        backend_url = None
        
        for line in lines:
            # Look for lines that look like URLs
            line = line.strip()
            if line.startswith('https://') or line.startswith('http://'):
                backend_url = line
                break
            elif '://' in line:
                # Handle format like "🚀 https://domain.com"
                parts = line.split()
                for part in parts:
                    if part.startswith('https://') or part.startswith('http://'):
                        backend_url = part
                        break
            elif '.' in line and not line.startswith('Domains'):
                # Plain domain without protocol
                if not line.startswith('http'):
                    backend_url = f"https://{line}"
                else:
                    backend_url = line
                break
        
        if backend_url:
            # Clean up any trailing characters
            backend_url = backend_url.rstrip('/')
            print(f"✅ Backend URL found: {backend_url}")
            print()
        else:
            print("⚠️  Could not parse Railway URL")
            print(f"   Raw output: {raw_output}")
            print()
            backend_url = input("   Please enter your backend URL: ").strip()
            print()
    else:
        print("⚠️  Could not get Railway URL automatically")
        print("   You can find it in your Railway dashboard:")
        print("   https://railway.app/dashboard")
        print()
        backend_url = input("   Please enter your backend URL: ").strip()
        print()
        
except FileNotFoundError:
    print("ℹ️  Railway CLI not found. Please enter your backend URL manually.")
    print("   (You can find it at: https://railway.app/dashboard)")
    print()
    backend_url = input("   Backend URL: ").strip()
    print()
except Exception as e:
    print(f"⚠️  Error: {e}")
    print()
    backend_url = input("   Please enter your backend URL: ").strip()
    print()

# Ensure backend_url is clean
backend_url = backend_url.strip().rstrip('/')

# Test backend connection
print("🔌 Testing backend connection...")

try:
    import requests
except ImportError:
    print("⚠️  'requests' library not installed. Installing now...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'requests'])
    import requests

try:
    # Try to reach the public test endpoint
    test_url = f"{backend_url}/api/public/test"
    print(f"   Testing: {test_url}")
    
    response = requests.get(test_url, timeout=10)
    if response.status_code == 200:
        print(f"✅ Backend is reachable!")
        try:
            data = response.json()
            if data.get('success'):
                print(f"   Message: {data.get('message', 'OK')}")
        except:
            pass
    else:
        print(f"⚠️  Backend responded with status {response.status_code}")
        print(f"   Response: {response.text[:200]}")
except requests.exceptions.RequestException as e:
    print(f"❌ Cannot reach backend: {e}")
    print(f"   URL attempted: {backend_url}/api/public/test")
    print("   Make sure your backend is deployed and running")
    
    # Don't exit - let user continue if they want
    cont = input("\n   Continue anyway? (y/n): ").strip().lower()
    if cont != 'y':
        sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    print(f"   URL attempted: {backend_url}/api/public/test")
    
    # Don't exit - let user continue if they want
    cont = input("\n   Continue anyway? (y/n): ").strip().lower()
    if cont != 'y':
        sys.exit(1)

print()

# Get event information
print("="*80)
print("EVENT INFORMATION")
print("="*80)
print()
print("To find your Event ID:")
print("1. Go to Firebase Console: https://console.firebase.google.com")
print("2. Select your project")
print("3. Go to Firestore Database")
print("4. Open the 'events' collection")
print("5. Copy the document ID of your test event")
print()

event_id = input("Enter your Event ID: ").strip()

if event_id:
    # Try to fetch event details
    print()
    print("🔍 Fetching event details...")
    
    try:
        response = requests.get(f"{backend_url}/api/events/{event_id}", timeout=10)
        if response.status_code == 200:
            event_data = response.json()
            print(f"✅ Event found: {event_data.get('name', 'Unknown')}")
            print(f"   Description: {event_data.get('description', 'N/A')}")
            print(f"   Status: {event_data.get('status', 'N/A')}")
        else:
            print(f"⚠️  Event not accessible (status {response.status_code})")
            print("   This might be normal if authentication is required")
    except Exception as e:
        print(f"⚠️  Could not fetch event: {e}")

print()
print("="*80)
print("CONFIGURATION")
print("="*80)
print()
print("Use these values in your load test scripts:")
print()
print(f"BACKEND_URL = \"{backend_url}\"")
print(f"EVENT_ID = \"{event_id}\"")
print()

# Ask if user wants to update files automatically
update = input("Do you want to automatically update the load test files? (y/n): ").strip().lower()

if update == 'y':
    import os
    
    files_to_update = [
        '/Users/mslabba/Sites/auction-app/simple_load_test.py',
        '/Users/mslabba/Sites/auction-app/monitor_auction.py'
    ]
    
    for file_path in files_to_update:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Update BACKEND_URL
                import re
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
                
                with open(file_path, 'w') as f:
                    f.write(content)
                
                print(f"✅ Updated: {os.path.basename(file_path)}")
            except Exception as e:
                print(f"❌ Failed to update {os.path.basename(file_path)}: {e}")
    
    print()
    print("✅ Files updated successfully!")

print()
print("="*80)
print("NEXT STEPS")
print("="*80)
print()
print("1. Run a quick test:")
print("   python3 simple_load_test.py")
print()
print("2. Monitor your auction:")
print("   python3 monitor_auction.py")
print()
print("3. Run advanced test with Locust:")
print(f"   locust -f load_test.py --host={backend_url}")
print("   Then open: http://localhost:8089")
print()
print("4. Read the guides:")
print("   - LOAD_TEST_QUICKSTART.md (quick reference)")
print("   - LOAD_TESTING_GUIDE.md (detailed guide)")
print()
print("="*80)
print()
print("Good luck with your auction! 🎯")
print()
