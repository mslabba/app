"""
Simple Load Test for Auction App
This script simulates concurrent bidding from multiple teams
Run this before your live auction to test system performance
"""
import requests
import concurrent.futures
import time
import random
from datetime import datetime

# CONFIGURATION - Update these before running
BACKEND_URL = "https://power-auction-app-production.up.railway.app"  # Update with your Railway backend URL
EVENT_ID = "418af494-59d5-4997-8530-23b2017fa970"  # Update with your actual event ID
NUM_CONCURRENT_USERS = 20  # Simulate 20 concurrent users
TEST_DURATION_SECONDS = 120  # Run test for 2 minutes

# Test accounts - you'll need to create these or use existing ones
TEST_TEAMS = [
    {"email": "team1@test.com", "password": "test123", "team_id": "team1_id"},
    {"email": "team2@test.com", "password": "test123", "team_id": "team2_id"},
    # Add more test teams as needed
]


class LoadTester:
    def __init__(self, backend_url, event_id):
        self.backend_url = backend_url.rstrip('/')
        self.event_id = event_id
        self.session = requests.Session()
        self.stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'bids_placed': 0,
            'bids_failed': 0,
            'response_times': []
        }
    
    def make_request(self, method, endpoint, **kwargs):
        """Make HTTP request and track stats"""
        start_time = time.time()
        try:
            url = f"{self.backend_url}{endpoint}"
            response = self.session.request(method, url, **kwargs)
            elapsed = (time.time() - start_time) * 1000  # Convert to ms
            
            self.stats['total_requests'] += 1
            self.stats['response_times'].append(elapsed)
            
            if response.status_code < 400:
                self.stats['successful_requests'] += 1
            else:
                self.stats['failed_requests'] += 1
            
            return response
        except Exception as e:
            self.stats['failed_requests'] += 1
            print(f"Request error: {e}")
            return None
    
    def get_auction_state(self):
        """Get current auction state"""
        return self.make_request('GET', f'/api/auction/state/{self.event_id}')
    
    def get_players(self):
        """Get available players"""
        return self.make_request('GET', f'/api/players/event/{self.event_id}')
    
    def place_bid(self, player_id, team_id, amount, headers):
        """Place a bid"""
        payload = {
            "event_id": self.event_id,
            "player_id": player_id,
            "team_id": team_id,
            "amount": amount
        }
        response = self.make_request('POST', '/api/bids/place', json=payload, headers=headers)
        
        if response and response.status_code == 200:
            self.stats['bids_placed'] += 1
        else:
            self.stats['bids_failed'] += 1
        
        return response
    
    def get_team_budget(self, team_id, headers):
        """Get team budget analysis"""
        return self.make_request(
            'GET',
            f'/api/teams/{team_id}/budget-analysis/{self.event_id}',
            headers=headers
        )
    
    def simulate_user_activity(self, team_info, duration_seconds):
        """Simulate a single user's activity during the auction"""
        end_time = time.time() + duration_seconds
        headers = {}  # You'd need to add auth token here if using authenticated endpoints
        
        print(f"Starting simulation for {team_info['email']}")
        
        while time.time() < end_time:
            try:
                # Random user actions
                action = random.choices(
                    ['get_state', 'get_players', 'place_bid', 'get_budget'],
                    weights=[40, 20, 30, 10]  # Weighted probability
                )[0]
                
                if action == 'get_state':
                    self.get_auction_state()
                
                elif action == 'get_players':
                    self.get_players()
                
                elif action == 'place_bid':
                    # Get current auction state first
                    state_response = self.get_auction_state()
                    if state_response and state_response.status_code == 200:
                        state_data = state_response.json()
                        
                        if state_data.get('status') == 'IN_PROGRESS':
                            current_player_id = state_data.get('current_player_id')
                            current_bid = state_data.get('current_bid', 10000)
                            
                            if current_player_id:
                                # Place bid with random increment
                                bid_amount = current_bid + random.choice([1000, 2000, 3000, 5000])
                                self.place_bid(
                                    current_player_id,
                                    team_info['team_id'],
                                    bid_amount,
                                    headers
                                )
                
                elif action == 'get_budget':
                    self.get_team_budget(team_info['team_id'], headers)
                
                # Wait random time between actions (0.5-2 seconds)
                time.sleep(random.uniform(0.5, 2.0))
                
            except Exception as e:
                print(f"Error in user simulation: {e}")
                time.sleep(1)
        
        print(f"Completed simulation for {team_info['email']}")
    
    def print_stats(self):
        """Print load test statistics"""
        print("\n" + "="*80)
        print("LOAD TEST RESULTS")
        print("="*80)
        print(f"Total Requests: {self.stats['total_requests']}")
        print(f"Successful: {self.stats['successful_requests']}")
        print(f"Failed: {self.stats['failed_requests']}")
        print(f"Success Rate: {(self.stats['successful_requests']/self.stats['total_requests']*100):.2f}%")
        print(f"\nBids Placed: {self.stats['bids_placed']}")
        print(f"Bids Failed: {self.stats['bids_failed']}")
        
        if self.stats['response_times']:
            response_times = self.stats['response_times']
            print(f"\nResponse Times:")
            print(f"  Average: {sum(response_times)/len(response_times):.2f}ms")
            print(f"  Min: {min(response_times):.2f}ms")
            print(f"  Max: {max(response_times):.2f}ms")
            print(f"  Median: {sorted(response_times)[len(response_times)//2]:.2f}ms")
        
        print(f"\nRequests per second: {self.stats['total_requests']/TEST_DURATION_SECONDS:.2f}")
        print("="*80 + "\n")


def run_load_test():
    """Run the load test with concurrent users"""
    print("\n" + "="*80)
    print("AUCTION APP LOAD TEST")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Event ID: {EVENT_ID}")
    print(f"Concurrent Users: {NUM_CONCURRENT_USERS}")
    print(f"Test Duration: {TEST_DURATION_SECONDS} seconds")
    print("="*80)
    print("\nStarting load test...\n")
    
    tester = LoadTester(BACKEND_URL, EVENT_ID)
    start_time = time.time()
    
    # Create test teams if not enough provided
    test_teams = TEST_TEAMS.copy()
    while len(test_teams) < NUM_CONCURRENT_USERS:
        test_teams.append({
            "email": f"test_team_{len(test_teams)+1}@test.com",
            "password": "test123",
            "team_id": f"team_{len(test_teams)+1}"
        })
    
    # Run concurrent user simulations
    with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_CONCURRENT_USERS) as executor:
        futures = [
            executor.submit(tester.simulate_user_activity, team, TEST_DURATION_SECONDS)
            for team in test_teams[:NUM_CONCURRENT_USERS]
        ]
        
        # Wait for all to complete
        concurrent.futures.wait(futures)
    
    elapsed_time = time.time() - start_time
    print(f"\nTest completed in {elapsed_time:.2f} seconds")
    
    # Print statistics
    tester.print_stats()


if __name__ == "__main__":
    # Validate configuration
    if "your-backend-url" in BACKEND_URL.lower() or "your-event-id" in EVENT_ID.lower():
        print("\n⚠️  IMPORTANT: Update the configuration variables before running!")
        print("   - BACKEND_URL: Your Railway backend URL")
        print("   - EVENT_ID: Your actual event ID")
        print("   - TEST_TEAMS: Create test team accounts\n")
        print("Edit the file and update BACKEND_URL and EVENT_ID at the top.")
        exit(1)
    
    # Show configuration
    print("\n" + "="*80)
    print("LOAD TEST CONFIGURATION")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Event ID: {EVENT_ID}")
    print(f"Concurrent Users: {NUM_CONCURRENT_USERS}")
    print(f"Test Duration: {TEST_DURATION_SECONDS} seconds")
    print("="*80)
    
    response = input("\nStart load test? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        run_load_test()
    else:
        print("\nLoad test cancelled.")
