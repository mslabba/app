#!/usr/bin/env python3
"""
Debug script to test safe bid calculation logic
"""

class MockCategory:
    def __init__(self, id, name, min_players, base_price):
        self.id = id
        self.name = name
        self.min_players = min_players
        self.base_price = base_price

def test_safe_bid_calculation():
    """Test the safe bid calculation with your scenario"""
    
    # Your event setup
    categories = [
        MockCategory("a_plus", "A+", 1, 20000),
        MockCategory("a", "A", 4, 10000), 
        MockCategory("b", "B", 4, 5000),
        MockCategory("c", "C", 3, 3000)
    ]
    
    # Your current players
    team_players = [
        {"name": "A+ Player", "category_id": "a_plus", "sold_price": 25000},
        {"name": "A Player", "category_id": "a", "sold_price": 10000},
        {"name": "B Player", "category_id": "b", "sold_price": 85000}
    ]
    
    # Team data
    total_budget = 200000
    total_spent = 25000 + 10000 + 85000  # 120000
    remaining_budget = total_budget - total_spent  # 80000
    
    print("=== SAFE BID CALCULATION TEST ===")
    print(f"Total Budget: ₹{total_budget:,}")
    print(f"Total Spent: ₹{total_spent:,}")
    print(f"Remaining Budget: ₹{remaining_budget:,}")
    print()
    
    # Count players by category
    player_count_by_category = {}
    for category in categories:
        player_count_by_category[category.id] = 0
    
    for player in team_players:
        category_id = player.get('category_id')
        if category_id in player_count_by_category:
            player_count_by_category[category_id] += 1
    
    print("Current Players by Category:")
    for cat_id, count in player_count_by_category.items():
        print(f"  {cat_id}: {count} players")
    print()
    
    # Calculate obligations
    total_obligations = 0
    print("Base Price Obligations:")
    for category in categories:
        current_count = player_count_by_category.get(category.id, 0)
        remaining_needed = max(0, category.min_players - current_count)
        obligation = remaining_needed * category.base_price
        total_obligations += obligation
        
        print(f"  {category.name}: {current_count}/{category.min_players} players")
        print(f"    Need {remaining_needed} more at ₹{category.base_price:,} each = ₹{obligation:,}")
    
    print(f"\nTotal Obligations: ₹{total_obligations:,}")
    
    # Calculate safe bid
    safe_bid = max(0, remaining_budget - total_obligations)
    buffer = max(10000, int(total_obligations * 0.1))
    safe_bid_with_buffer = max(0, safe_bid - buffer)
    
    print(f"Safe Bid (no buffer): ₹{safe_bid:,}")
    print(f"Buffer Amount: ₹{buffer:,}")
    print(f"Safe Bid (with buffer): ₹{safe_bid_with_buffer:,}")
    
    print(f"\n=== EXPECTED vs ACTUAL ===")
    print(f"Expected Safe Bid: ₹26,000")
    print(f"Calculated Safe Bid: ₹{safe_bid:,}")
    print(f"Match: {'✓' if safe_bid == 26000 else '✗'}")

if __name__ == "__main__":
    test_safe_bid_calculation()