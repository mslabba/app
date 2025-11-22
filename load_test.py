"""
Load Testing Script for Sports Auction App
Simulates multiple users bidding on players in a live auction
"""
import json
import random
import time
from locust import HttpUser, task, between, events
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AuctionUser(HttpUser):
    """Simulates a team admin participating in the auction"""
    
    # Wait between 1-3 seconds between tasks to simulate real user behavior
    wait_time = between(1, 3)
    
    def on_start(self):
        """Setup: Create user account and login"""
        self.event_id = None
        self.team_id = None
        self.auth_token = None
        self.headers = {}
        
        # You'll need to set these via environment variables or command line
        # For now, using mock data - replace with actual test accounts
        self.user_email = f"team_test_{random.randint(1000, 9999)}@test.com"
        self.user_password = "TestPassword123!"
        self.display_name = f"Team{random.randint(1, 20)}"
        
        logger.info(f"Starting user session: {self.user_email}")
    
    def register_and_login(self, event_id: str):
        """Register and authenticate user"""
        try:
            # Register user
            register_payload = {
                "email": self.user_email,
                "password": self.user_password,
                "display_name": self.display_name,
                "role": "team_admin",
                "team_id": None
            }
            
            with self.client.post(
                "/api/auth/register",
                json=register_payload,
                catch_response=True
            ) as response:
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data.get('custom_token')
                    self.headers = {
                        "Authorization": f"Bearer {self.auth_token}",
                        "Content-Type": "application/json"
                    }
                    response.success()
                    logger.info(f"User registered: {self.user_email}")
                else:
                    response.failure(f"Registration failed: {response.text}")
        except Exception as e:
            logger.error(f"Registration error: {e}")
    
    @task(5)
    def get_auction_state(self):
        """Frequently check auction state"""
        if not self.event_id:
            return
        
        with self.client.get(
            f"/api/auction/state/{self.event_id}",
            headers=self.headers,
            catch_response=True,
            name="/api/auction/state/[event_id]"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to get auction state: {response.status_code}")
    
    @task(3)
    def view_available_players(self):
        """View list of available players"""
        if not self.event_id:
            return
        
        with self.client.get(
            f"/api/players/event/{self.event_id}?status=available",
            headers=self.headers,
            catch_response=True,
            name="/api/players/event/[event_id]"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to get players: {response.status_code}")
    
    @task(2)
    def get_team_budget(self):
        """Check team's budget and spending"""
        if not self.team_id or not self.event_id:
            return
        
        with self.client.get(
            f"/api/teams/{self.team_id}/budget-analysis/{self.event_id}",
            headers=self.headers,
            catch_response=True,
            name="/api/teams/[team_id]/budget-analysis/[event_id]"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to get budget: {response.status_code}")
    
    @task(10)
    def place_bid(self):
        """Place a bid on the current player"""
        if not self.event_id or not self.team_id:
            return
        
        # First get current auction state
        try:
            state_response = self.client.get(
                f"/api/auction/state/{self.event_id}",
                headers=self.headers
            )
            
            if state_response.status_code != 200:
                return
            
            state_data = state_response.json()
            
            if state_data.get('status') != 'IN_PROGRESS':
                return
            
            current_player_id = state_data.get('current_player_id')
            current_bid = state_data.get('current_bid', 0)
            
            if not current_player_id:
                return
            
            # Calculate bid amount (add random increment between 1000-5000)
            bid_increment = random.choice([1000, 2000, 3000, 5000])
            bid_amount = current_bid + bid_increment
            
            # Place bid
            bid_payload = {
                "event_id": self.event_id,
                "player_id": current_player_id,
                "team_id": self.team_id,
                "amount": bid_amount
            }
            
            with self.client.post(
                "/api/bids/place",
                json=bid_payload,
                headers=self.headers,
                catch_response=True,
                name="/api/bids/place"
            ) as response:
                if response.status_code == 200:
                    response.success()
                    logger.debug(f"Bid placed: {bid_amount}")
                elif response.status_code == 400:
                    # Expected failures (outbid, insufficient funds, etc.)
                    response.success()
                else:
                    response.failure(f"Bid failed: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Bid placement error: {e}")
    
    @task(2)
    def get_my_squad(self):
        """View team's acquired players"""
        if not self.team_id:
            return
        
        with self.client.get(
            f"/api/teams/{self.team_id}/players",
            headers=self.headers,
            catch_response=True,
            name="/api/teams/[team_id]/players"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to get squad: {response.status_code}")
    
    @task(1)
    def get_all_teams(self):
        """View all teams in the event"""
        if not self.event_id:
            return
        
        with self.client.get(
            f"/api/teams/event/{self.event_id}",
            headers=self.headers,
            catch_response=True,
            name="/api/teams/event/[event_id]"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to get teams: {response.status_code}")


class AuctionOrganizer(HttpUser):
    """Simulates the auction organizer controlling the auction flow"""
    
    wait_time = between(5, 10)  # Wait longer between actions
    
    def on_start(self):
        """Setup organizer account"""
        self.event_id = None
        self.auth_token = None
        self.headers = {}
        self.current_player_index = 0
        
        logger.info("Starting organizer session")
    
    @task
    def control_auction_flow(self):
        """Move to next player periodically"""
        if not self.event_id:
            return
        
        # Get list of players
        try:
            players_response = self.client.get(
                f"/api/players/event/{self.event_id}",
                headers=self.headers
            )
            
            if players_response.status_code == 200:
                players = players_response.json()
                available_players = [p for p in players if p['status'] == 'available']
                
                if available_players and self.current_player_index < len(available_players):
                    next_player = available_players[self.current_player_index]
                    
                    # Set next player
                    with self.client.post(
                        f"/api/auction/next-player/{self.event_id}",
                        json={"player_id": next_player['id']},
                        headers=self.headers,
                        catch_response=True,
                        name="/api/auction/next-player/[event_id]"
                    ) as response:
                        if response.status_code == 200:
                            response.success()
                            self.current_player_index += 1
                            logger.info(f"Set next player: {next_player['name']}")
                        else:
                            response.failure(f"Failed to set next player: {response.status_code}")
        except Exception as e:
            logger.error(f"Auction control error: {e}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Print test information when starting"""
    print("\n" + "="*80)
    print("AUCTION APP LOAD TEST")
    print("="*80)
    print(f"Target host: {environment.host}")
    print(f"Number of users to simulate: {environment.runner.target_user_count if hasattr(environment.runner, 'target_user_count') else 'N/A'}")
    print("="*80 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Print summary when test completes"""
    print("\n" + "="*80)
    print("LOAD TEST COMPLETED")
    print("="*80)
    stats = environment.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Failed requests: {stats.total.num_failures}")
    print(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    print(f"Min response time: {stats.total.min_response_time:.2f}ms")
    print(f"Max response time: {stats.total.max_response_time:.2f}ms")
    print(f"Requests per second: {stats.total.total_rps:.2f}")
    print("="*80 + "\n")
