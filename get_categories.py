"""
Helper script to list categories and their IDs from your event.
This helps you get the category_id needed for bulk upload.

Usage:
    python get_categories.py --token YOUR_AUTH_TOKEN --event-id YOUR_EVENT_ID
"""

import requests
import argparse
import json
from typing import Dict, List

API_URL = "https://auction-app-backend-production.up.railway.app/api"

def get_categories(event_id: str, token: str, api_url: str = API_URL) -> Dict:
    """Fetch categories for an event."""
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{api_url}/events/{event_id}/categories",
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

def print_categories(categories: List[Dict]):
    """Print categories in a formatted table."""
    
    if not categories:
        print("❌ No categories found for this event")
        return
    
    print("\n" + "="*80)
    print("📋 CATEGORIES FOR YOUR EVENT")
    print("="*80)
    print(f"{'Category Name':<30} {'Category ID':<40} {'Base Price':<10}")
    print("-"*80)
    
    for cat in categories:
        name = cat.get('name', 'Unknown')[:29]
        cat_id = cat.get('id', 'N/A')
        base_price = cat.get('base_price', 'N/A')
        print(f"{name:<30} {cat_id:<40} ₹{base_price}")
    
    print("="*80)
    print(f"\nTotal categories: {len(categories)}")
    print("\n💡 Copy the 'Category ID' value to use in your Excel file")

def save_categories_to_file(categories: List[Dict], filename: str = "categories.json"):
    """Save categories to a JSON file for reference."""
    
    with open(filename, 'w') as f:
        json.dump(categories, f, indent=2)
    
    print(f"\n💾 Categories saved to: {filename}")

def main():
    parser = argparse.ArgumentParser(
        description="Get category IDs from your auction event",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example:
    python get_categories.py --token YOUR_TOKEN --event-id abc-123-xyz
        """
    )
    
    parser.add_argument(
        '--token',
        required=True,
        help='Authentication token from your auction app'
    )
    
    parser.add_argument(
        '--event-id',
        required=True,
        help='Event ID (UUID)'
    )
    
    parser.add_argument(
        '--api-url',
        default=API_URL,
        help=f'Backend API URL (default: {API_URL})'
    )
    
    parser.add_argument(
        '--save',
        action='store_true',
        help='Save categories to categories.json file'
    )
    
    args = parser.parse_args()
    
    print("🎯 Fetching Categories...")
    print(f"Event ID: {args.event_id}")
    print(f"API URL:  {args.api_url}")
    
    # Fetch categories
    result = get_categories(args.event_id, args.token, args.api_url)
    
    if result["success"]:
        categories = result["data"]
        print_categories(categories)
        
        if args.save and categories:
            save_categories_to_file(categories)
        
        print("\n✅ Success! Use these category IDs in your Excel file.")
    else:
        print(f"\n❌ ERROR: {result['error']}")
        print("\n💡 Tips:")
        print("   - Check if your token is valid")
        print("   - Verify the event-id is correct")
        print("   - Ensure you have access to this event")

if __name__ == "__main__":
    main()
