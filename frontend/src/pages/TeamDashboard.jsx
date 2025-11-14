import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gavel, Users, DollarSign, Trophy, Clock, User, Target, Calculator } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import FloatingMenu from '@/components/FloatingMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TeamDashboard = () => {
  const { token, userProfile, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [team, setTeam] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [budgetAnalysis, setBudgetAnalysis] = useState(null);
  const [maxSafeBid, setMaxSafeBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('TeamDashboard useEffect - authLoading:', authLoading, 'userProfile:', userProfile, 'token:', !!token);

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, userProfile, token]);

  const fetchData = async () => {
    try {
      console.log('TeamDashboard fetchData started');
      setError(null);

      // Fetch events
      console.log('Fetching events...');
      const eventsResponse = await axios.get(`${API}/events`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setEvents(eventsResponse.data);
      console.log('Events fetched:', eventsResponse.data);

      // If user has a team, fetch team data
      if (userProfile?.team_id) {
        console.log('User has team_id:', userProfile.team_id);
        const teamResponse = await axios.get(`${API}/teams/${userProfile.team_id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setTeam(teamResponse.data);
        console.log('Team fetched:', teamResponse.data);

        // Fetch auction state for team's event
        console.log('Fetching auction state for event:', teamResponse.data.event_id);
        const auctionResponse = await axios.get(`${API}/auction/state/${teamResponse.data.event_id}`);
        setAuctionState(auctionResponse.data);
        console.log('Auction state fetched:', auctionResponse.data);

        // If there's a current player, fetch player details
        if (auctionResponse.data.current_player_id) {
          console.log('Fetching current player:', auctionResponse.data.current_player_id);
          const playerResponse = await axios.get(`${API}/players/${auctionResponse.data.current_player_id}`);
          setCurrentPlayer(playerResponse.data);
          console.log('Current player fetched:', playerResponse.data);

          // Fetch max safe bid for current player's category
          console.log('Fetching max safe bid...');
          const maxBidResponse = await axios.get(`${API}/teams/${userProfile.team_id}/max-safe-bid/${teamResponse.data.event_id}?player_category=${encodeURIComponent(playerResponse.data.category || '')}`);
          setMaxSafeBid(maxBidResponse.data);
          console.log('Max safe bid fetched:', maxBidResponse.data);
        } else {
          setMaxSafeBid(null);
        }

        // Fetch budget analysis with base price obligations
        console.log('Fetching budget analysis...');
        const budgetResponse = await axios.get(`${API}/teams/${userProfile.team_id}/budget-analysis/${teamResponse.data.event_id}`);
        setBudgetAnalysis(budgetResponse.data);
        console.log('Budget analysis fetched:', budgetResponse.data);
      } else {
        console.log('User has no team_id, userProfile:', userProfile);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError(error.message);
      toast.error('Failed to load dashboard data: ' + error.message);
    } finally {
      console.log('TeamDashboard fetchData completed, setting loading to false');
      setLoading(false);
    }
  };

  const placeBid = async (amount) => {
    if (!currentPlayer || !auctionState) return;

    try {
      await axios.post(`${API}/bids/place`, {
        player_id: currentPlayer.id,
        event_id: auctionState.event_id,
        amount: amount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Bid placed successfully!');
      fetchData(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place bid');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 rounded-lg border border-red-500/30">
              <p className="text-red-200">Error: {error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">PowerAuctions - Team Dashboard</h1>
          {team ? (
            <p className="text-white/80">Welcome to {team.name}</p>
          ) : (
            <p className="text-white/80">You are not assigned to any team yet</p>
          )}
        </div>

        {!team ? (
          <Card className="glass border-white/20">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/80 text-lg">No Team Assigned</p>
              <p className="text-white/60 text-sm mt-2">Contact the super admin to assign you to a team</p>

              {/* Debug info */}
              <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30 text-left">
                <h3 className="text-white font-semibold mb-2">Debug Info:</h3>
                <p className="text-white/80 text-sm">User Profile: {JSON.stringify(userProfile, null, 2)}</p>
                <div className="mt-4 flex gap-2 justify-center">
                  <Button
                    onClick={() => window.location.href = '/test'}
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    Debug Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-sm">Budget Remaining</p>
                      <h3 className="text-2xl font-bold text-white">₹{team.remaining?.toLocaleString()}</h3>
                    </div>
                    <DollarSign className="w-8 h-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-sm">Players Acquired</p>
                      <h3 className="text-2xl font-bold text-white">{team.players_count}</h3>
                    </div>
                    <Trophy className="w-8 h-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-sm">Total Spent</p>
                      <h3 className="text-2xl font-bold text-white">₹{team.spent?.toLocaleString()}</h3>
                    </div>
                    <Gavel className="w-8 h-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>

              {/* Base Price Obligations */}
              <Card className="glass border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-sm">Effective Budget</p>
                      <h3 className={`text-2xl font-bold ${budgetAnalysis?.budget_analysis?.can_bid ? 'text-green-400' : 'text-red-400'}`}>
                        ₹{budgetAnalysis?.budget_analysis?.effective_budget?.toLocaleString() || '0'}
                      </h3>
                      {budgetAnalysis?.budget_analysis?.base_price_obligations > 0 && (
                        <p className="text-yellow-300 text-xs mt-1">
                          ₹{budgetAnalysis.budget_analysis.base_price_obligations.toLocaleString()} reserved
                        </p>
                      )}
                    </div>
                    <Target className="w-8 h-8 text-white/60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Base Price Requirements Breakdown */}
            {budgetAnalysis?.base_price_requirements && (
              <Card className="glass border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    Squad Requirements & Base Price Obligations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.values(budgetAnalysis.category_breakdown).map((categoryInfo) => (
                      <div
                        key={categoryInfo.category_name}
                        className={`p-4 rounded-lg border ${categoryInfo.remaining_needed > 0
                          ? 'border-yellow-500/50 bg-yellow-500/10'
                          : 'border-green-500/50 bg-green-500/10'
                          }`}
                      >
                        <h4 className="font-semibold text-white mb-2">{categoryInfo.category_name}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-white/80">
                            <span>Required:</span>
                            <span>{categoryInfo.min_required}</span>
                          </div>
                          <div className="flex justify-between text-white/80">
                            <span>Current:</span>
                            <span>{categoryInfo.current_count}</span>
                          </div>
                          <div className="flex justify-between text-white/80">
                            <span>Still need:</span>
                            <span className={categoryInfo.remaining_needed > 0 ? 'text-yellow-300' : 'text-green-300'}>
                              {categoryInfo.remaining_needed}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold pt-2 border-t border-white/20">
                            <span className="text-white">Base Price:</span>
                            <span className="text-white">₹{categoryInfo.base_price?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-yellow-300">
                            <span>Obligation:</span>
                            <span>₹{categoryInfo.remaining_obligation?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {budgetAnalysis.base_price_requirements.total_base_price_obligation > 0 && (
                    <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-semibold">Total Base Price Obligation</h4>
                          <p className="text-white/60 text-sm">
                            Amount reserved for minimum squad requirements
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-yellow-300">
                            ₹{budgetAnalysis.base_price_requirements.total_base_price_obligation.toLocaleString()}
                          </div>
                          <div className="text-sm text-white/60">
                            Remaining for bidding: ₹{budgetAnalysis.budget_analysis.effective_budget.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Maximum Bidding Capacity Overview */}
            {maxSafeBid && (
              <Card className="glass border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Bidding Capacity Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <h4 className="text-green-300 font-semibold mb-2">Safe Bidding Range</h4>
                      <div className="text-2xl font-bold text-white">
                        ₹{maxSafeBid.max_safe_bid_with_buffer.toLocaleString()}
                      </div>
                      <div className="text-sm text-green-200 mt-1">
                        Includes safety buffer
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                      <h4 className="text-yellow-300 font-semibold mb-2">Maximum Possible</h4>
                      <div className="text-2xl font-bold text-white">
                        ₹{maxSafeBid.max_safe_bid.toLocaleString()}
                      </div>
                      <div className="text-sm text-yellow-200 mt-1">
                        Without safety buffer
                      </div>
                    </div>

                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                      <h4 className="text-red-300 font-semibold mb-2">Reserved Amount</h4>
                      <div className="text-2xl font-bold text-white">
                        ₹{maxSafeBid.base_price_obligations.toLocaleString()}
                      </div>
                      <div className="text-sm text-red-200 mt-1">
                        For squad requirements
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-sm text-white/80">
                      <strong>Strategy:</strong> Bids up to ₹{maxSafeBid.max_safe_bid_with_buffer.toLocaleString()} are safe and leave enough budget for future squad requirements.
                      Higher bids may risk your ability to complete the minimum squad.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Auction */}
            {auctionState && auctionState.status === 'in_progress' && currentPlayer ? (
              <Card className="glass border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Live Auction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-4">
                        <User className="w-8 h-8 text-white/60 mr-3" />
                        <div>
                          <h3 className="text-xl font-bold text-white">{currentPlayer.name}</h3>
                          <p className="text-white/60">{currentPlayer.position} • {currentPlayer.specialty}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white/60">Base Price:</span>
                          <span className="text-white">₹{currentPlayer.base_price?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Current Bid:</span>
                          <span className="text-white font-bold">₹{auctionState.current_bid?.toLocaleString()}</span>
                        </div>
                        {auctionState.current_team_name && (
                          <div className="flex justify-between">
                            <span className="text-white/60">Leading Team:</span>
                            <Badge variant="secondary">{auctionState.current_team_name}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white mb-3">Place Your Bid</h4>

                      {/* Max Safe Bid Information */}
                      {maxSafeBid && (
                        <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white/80 text-sm">Safe Bidding Limit</span>
                            <span className="text-blue-300 font-semibold">
                              ₹{maxSafeBid.recommendation.suggested_max_bid.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-white/60">
                            {maxSafeBid.recommendation.message}
                          </div>
                          <div className="text-xs text-white/50 mt-1">
                            Reserves ₹{maxSafeBid.base_price_obligations.toLocaleString()} for squad obligations
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {[50000, 100000, 250000, 500000].map((increment) => {
                          const bidAmount = (auctionState.current_bid || currentPlayer.base_price) + increment;
                          const effectiveBudget = budgetAnalysis?.budget_analysis?.effective_budget || team.remaining;
                          const maxSafeBidAmount = maxSafeBid?.max_safe_bid_with_buffer || effectiveBudget;

                          const canAfford = bidAmount <= effectiveBudget;
                          const isSafeBid = bidAmount <= maxSafeBidAmount;

                          let buttonClass = '';
                          let buttonTitle = '';

                          if (!canAfford) {
                            buttonClass = 'bg-red-500 text-white cursor-not-allowed';
                            buttonTitle = 'Exceeds total budget';
                          } else if (isSafeBid) {
                            buttonClass = 'bg-green-600 text-white hover:bg-green-700';
                            buttonTitle = 'Safe bid - leaves buffer for squad requirements';
                          } else {
                            buttonClass = 'bg-yellow-600 text-white hover:bg-yellow-700';
                            buttonTitle = 'Risky bid - may not leave enough for squad requirements';
                          }

                          return (
                            <Button
                              key={increment}
                              onClick={() => placeBid(bidAmount)}
                              className={`w-full ${buttonClass}`}
                              disabled={!canAfford}
                              title={buttonTitle}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>Bid ₹{bidAmount.toLocaleString()} (+₹{increment.toLocaleString()})</span>
                                <span className="text-xs">
                                  {!canAfford ? '❌' : isSafeBid ? '✅' : '⚠️'}
                                </span>
                              </div>
                            </Button>
                          );
                        })}
                      </div>

                      {/* Bidding Strategy Info */}
                      {maxSafeBid && (
                        <div className="mt-4 text-xs text-white/60 space-y-1">
                          <div>• Green: Safe bids with buffer</div>
                          <div>• Yellow: Risky - may affect future signings</div>
                          <div>• Red: Exceeds total budget</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass border-white/20">
                <CardContent className="py-12 text-center">
                  <Gavel className="w-16 h-16 text-white/40 mx-auto mb-4" />
                  <p className="text-white/80 text-lg">No Active Auction</p>
                  <p className="text-white/60 text-sm mt-2">Wait for the auction to start</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Floating Menu */}
      <FloatingMenu />
    </div>
  );
};

export default TeamDashboard;
