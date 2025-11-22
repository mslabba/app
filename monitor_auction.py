"""
Real-time Auction Monitor
Use this during load testing to see real-time stats
"""
import requests
import time
import sys
from datetime import datetime

BACKEND_URL = "https://power-auction-app-production.up.railway.app"  # Update this
EVENT_ID = "418af494-59d5-4997-8530-23b2017fa970"  # Update this
REFRESH_INTERVAL = 2  # seconds


def clear_screen():
    """Clear terminal screen"""
    print("\033[2J\033[H", end="")


def get_auction_state():
    """Get current auction state"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/auction/state/{EVENT_ID}", timeout=5)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        return {"error": str(e)}
    return None


def get_teams():
    """Get all teams"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/teams/event/{EVENT_ID}", timeout=5)
        if response.status_code == 200:
            return response.json()
    except Exception:
        return []
    return []


def get_players():
    """Get player statistics"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/players/event/{EVENT_ID}", timeout=5)
        if response.status_code == 200:
            players = response.json()
            return {
                'total': len(players),
                'available': len([p for p in players if p['status'] == 'available']),
                'sold': len([p for p in players if p['status'] == 'sold']),
                'current': len([p for p in players if p['status'] == 'current'])
            }
    except Exception:
        return None
    return None


def display_dashboard():
    """Display real-time dashboard"""
    while True:
        clear_screen()
        
        print("="*80)
        print(f"AUCTION MONITOR - {datetime.now().strftime('%H:%M:%S')}")
        print("="*80)
        print()
        
        # Get auction state
        state = get_auction_state()
        if state and 'error' not in state:
            print(f"Status: {state.get('status', 'UNKNOWN')}")
            
            if state.get('current_player_id'):
                print(f"Current Player: {state.get('current_player_id')}")
                print(f"Current Bid: ₹{state.get('current_bid', 0):,}")
                print(f"Bidding Team: {state.get('current_bidder_team_id', 'None')}")
            else:
                print("Current Player: None")
            
            print()
        else:
            print("⚠️  Cannot fetch auction state")
            print()
        
        # Get player stats
        player_stats = get_players()
        if player_stats:
            print("Player Statistics:")
            print(f"  Total: {player_stats['total']}")
            print(f"  Available: {player_stats['available']}")
            print(f"  Sold: {player_stats['sold']}")
            print(f"  Current: {player_stats['current']}")
            print()
        
        # Get team stats
        teams = get_teams()
        if teams:
            print(f"Teams ({len(teams)}):")
            print("-" * 80)
            print(f"{'Team Name':<30} {'Budget':<15} {'Spent':<15} {'Remaining':<15}")
            print("-" * 80)
            
            for team in teams[:10]:  # Show top 10 teams
                name = team.get('name', 'Unknown')[:28]
                budget = team.get('budget', 0)
                spent = team.get('spent', 0)
                remaining = team.get('remaining', 0)
                
                print(f"{name:<30} ₹{budget:>12,} ₹{spent:>12,} ₹{remaining:>12,}")
            
            if len(teams) > 10:
                print(f"\n... and {len(teams) - 10} more teams")
        
        print()
        print("="*80)
        print("Press Ctrl+C to exit")
        print("="*80)
        
        # Wait before next refresh
        time.sleep(REFRESH_INTERVAL)


if __name__ == "__main__":
    print("\nAuction Monitor")
    print("="*80)
    print(f"Backend: {BACKEND_URL}")
    print(f"Event ID: {EVENT_ID}")
    print(f"Refresh: Every {REFRESH_INTERVAL} seconds")
    print("="*80)
    print("\nStarting monitor in 3 seconds...")
    time.sleep(3)
    
    try:
        display_dashboard()
    except KeyboardInterrupt:
        print("\n\nMonitor stopped.")
        sys.exit(0)
