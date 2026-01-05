"""
Generate Demo Players for Auction

This script generates 50 demo players with dummy images for testing/demo purposes.
Uses UI Avatars API for generating dummy player photos.

Usage:
    python generate_demo_players.py --event-id YOUR_EVENT_ID --token YOUR_AUTH_TOKEN

Optional:
    --count 50  (number of players to generate, default: 50)
    --api-url https://your-api.com/api  (override API URL)
"""

import requests
import argparse
import sys
import random
import time
from urllib.parse import quote

# Default API URL
DEFAULT_API_URL = "https://power-auction-app-production.up.railway.app/api"

# Sample data for generating realistic demo players
FIRST_NAMES = [
    "Rahul", "Virat", "Rohit", "Jasprit", "KL", "Hardik", "Rishabh", "Shubman",
    "Mohammed", "Ravindra", "Yuzvendra", "Shreyas", "Ravichandran", "Axar",
    "Prithvi", "Ishan", "Suryakumar", "Arshdeep", "Kuldeep", "Washington",
    "Deepak", "Shardul", "Bhuvneshwar", "Umesh", "Shikhar", "Ajinkya",
    "Cheteshwar", "Mayank", "Devdutt", "Ruturaj", "Sanju", "Nitish",
    "Rinku", "Tilak", "Yashasvi", "Abhishek", "Shivam", "Ravi", "Venkatesh",
    "Mukesh", "Prasidh", "Khaleel", "Avesh", "Harshal", "Jaydev", "Varun",
    "Rahul", "Manish", "Kedar", "Dinesh"
]

LAST_NAMES = [
    "Sharma", "Kohli", "Bumrah", "Rahul", "Pandya", "Pant", "Gill", "Shami",
    "Jadeja", "Chahal", "Iyer", "Ashwin", "Patel", "Shaw", "Kishan", "Yadav",
    "Singh", "Yadav", "Kumar", "Sundar", "Chahar", "Thakur", "Kumar", "Yadav",
    "Dhawan", "Rahane", "Pujara", "Agarwal", "Padikkal", "Gaikwad", "Samson",
    "Rana", "Singh", "Varma", "Jaiswal", "Sharma", "Dube", "Bishnoi", "Iyer",
    "Kumar", "Krishna", "Ahmed", "Khan", "Patel", "Unadkat", "Chakravarthy",
    "Tewatia", "Pandey", "Jadhav", "Karthik"
]

POSITIONS = [
    "Batsman", "Bowler", "All-rounder", "Wicket-keeper", "Opening Batsman",
    "Middle Order", "Fast Bowler", "Spin Bowler", "Finisher"
]

SPECIALTIES = [
    "Power Hitting", "Consistent Run Scorer", "Death Bowling", "Swing Bowling",
    "Spin Wizard", "Defensive Batsman", "Aggressive Opener", "Yorker Specialist",
    "Fielding Expert", "Match Winner", "Game Changer", "Explosive Batsman"
]

PREVIOUS_TEAMS = [
    "Mumbai Indians", "Chennai Super Kings", "Royal Challengers", "Kolkata Knight Riders",
    "Delhi Capitals", "Punjab Kings", "Rajasthan Royals", "Sunrisers Hyderabad",
    "Gujarat Titans", "Lucknow Super Giants", "Local Club", "State Team", "Academy Team"
]

def generate_avatar_url(name: str) -> str:
    """
    Generate a dummy avatar URL using UI Avatars API.
    Creates colorful, unique avatars based on the player's name.
    """
    # Clean the name
    name_parts = name.split()
    initials = ''.join([part[0] for part in name_parts[:2]]).upper()
    
    # Random background colors for variety
    bg_colors = [
        "3B82F6", "8B5CF6", "10B981", "F59E0B", "EF4444", 
        "EC4899", "14B8A6", "F97316", "6366F1", "84CC16"
    ]
    bg = random.choice(bg_colors)
    
    # Create UI Avatars URL
    # Format: https://ui-avatars.com/api/?name=John+Doe&background=3B82F6&color=fff&size=256
    url = f"https://ui-avatars.com/api/?name={quote(name)}&background={bg}&color=fff&size=256&bold=true"
    
    return url

def generate_player(index: int, category_id: str, base_prices: list) -> dict:
    """Generate a single demo player with realistic data."""
    
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    full_name = f"{first_name} {last_name} {index}"  # Add index to make unique
    
    player = {
        "name": full_name,
        "category_id": category_id,
        "base_price": random.choice(base_prices),
        "photo_url": generate_avatar_url(full_name),
        "age": random.randint(18, 35),
        "position": random.choice(POSITIONS),
        "specialty": random.choice(SPECIALTIES),
        "previous_team": random.choice(PREVIOUS_TEAMS),
        "stats": {
            "matches": random.randint(10, 150),
            "runs": random.randint(100, 5000) if random.random() > 0.3 else None,
            "wickets": random.randint(5, 200) if random.random() > 0.3 else None,
            "goals": None,
            "assists": None
        }
    }
    
    return player

def fetch_categories(api_url: str, event_id: str, token: str) -> list:
    """Fetch categories for the event."""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{api_url}/auctions/{event_id}/categories", headers=headers)
        response.raise_for_status()
        categories = response.json()
        
        if not categories:
            print("❌ No categories found for this event. Please create categories first.")
            sys.exit(1)
        
        print(f"✅ Found {len(categories)} categories")
        for cat in categories:
            print(f"   - {cat['name']} (Base Price: ₹{cat['base_price']:,})")
        
        return categories
    except Exception as e:
        print(f"❌ Failed to fetch categories: {e}")
        sys.exit(1)

def create_player(api_url: str, player_data: dict, token: str) -> bool:
    """Create a single player via API."""
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        response = requests.post(f"{api_url}/players", json=player_data, headers=headers)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"   ⚠️  Failed to create {player_data['name']}: {str(e)[:100]}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Generate demo players for auction')
    parser.add_argument('--event-id', required=True, help='Event ID (UUID)')
    parser.add_argument('--token', required=True, help='Authentication token')
    parser.add_argument('--count', type=int, default=50, help='Number of players to generate (default: 50)')
    parser.add_argument('--api-url', default=DEFAULT_API_URL, help='API base URL')
    
    args = parser.parse_args()
    
    print("\n🎭 Demo Player Generator")
    print("=" * 50)
    print(f"Event ID: {args.event_id}")
    print(f"Players to generate: {args.count}")
    print(f"API URL: {args.api_url}")
    print("=" * 50)
    
    # Fetch categories first
    print("\n📋 Fetching categories...")
    categories = fetch_categories(args.api_url, args.event_id, args.token)
    
    # Prepare base prices from categories
    base_prices = [cat['base_price'] for cat in categories]
    
    # Generate and create players
    print(f"\n🎯 Generating {args.count} demo players...")
    print("-" * 50)
    
    success_count = 0
    failed_count = 0
    
    for i in range(1, args.count + 1):
        # Distribute players across categories
        category = categories[(i - 1) % len(categories)]
        
        # Generate player data
        player_data = generate_player(i, category['id'], base_prices)
        
        # Create player
        print(f"[{i}/{args.count}] Creating {player_data['name']}... ", end="")
        
        if create_player(args.api_url, player_data, args.token):
            print("✅")
            success_count += 1
        else:
            print("❌")
            failed_count += 1
        
        # Small delay to avoid overwhelming the server
        time.sleep(0.2)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Summary")
    print("=" * 50)
    print(f"✅ Successfully created: {success_count} players")
    print(f"❌ Failed: {failed_count} players")
    print(f"📝 Total: {args.count} players")
    
    if success_count > 0:
        print("\n🎉 Demo players created successfully!")
        print(f"🔗 View them at: https://thepowerauction.com/admin/players/{args.event_id}")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    main()
