import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, DollarSign, Users, Clock } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuctionDisplay = () => {
  const { eventId } = useParams();
  const [auctionState, setAuctionState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [teamsSafeBidSummary, setTeamsSafeBidSummary] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (eventId) {
      fetchAuctionData();
      // Auto-refresh every 2 seconds for live updates
      const interval = setInterval(fetchAuctionData, 2000);
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const fetchAuctionData = async () => {
    try {
      // Fetch auction state
      const auctionResponse = await axios.get(`${API}/auction/state/${eventId}`);
      setAuctionState(auctionResponse.data);

      // Fetch current player if there is one
      if (auctionResponse.data.current_player_id) {
        const playerResponse = await axios.get(`${API}/players/${auctionResponse.data.current_player_id}`);
        setCurrentPlayer(playerResponse.data);

        // Fetch teams safe bid summary for current player's category
        const safeBidUrl = playerResponse.data.category
          ? `${API}/auctions/${eventId}/teams-safe-bid-summary?player_category=${encodeURIComponent(playerResponse.data.category)}`
          : `${API}/auctions/${eventId}/teams-safe-bid-summary`;

        const safeBidResponse = await axios.get(safeBidUrl);
        setTeamsSafeBidSummary(safeBidResponse.data);
      } else {
        setCurrentPlayer(null);
        // Fetch general safe bid summary
        const safeBidResponse = await axios.get(`${API}/auctions/${eventId}/teams-safe-bid-summary`);
        setTeamsSafeBidSummary(safeBidResponse.data);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch auction data:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7e22ce 100%)' }}>
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">Live Auction Display</h1>
          <p className="text-white/80 flex items-center justify-center">
            <Clock className="w-4 h-4 mr-2" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Player Section */}
          <div className="lg:col-span-2">
            {currentPlayer && auctionState ? (
              <Card className="glass border-white/20 mb-6">
                <CardHeader>
                  <CardTitle className="text-white text-2xl flex items-center">
                    <Trophy className="w-6 h-6 mr-2" />
                    Current Player
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-2">{currentPlayer.name}</h3>
                      <div className="space-y-2 text-white/80">
                        <p><span className="font-semibold">Position:</span> {currentPlayer.position}</p>
                        <p><span className="font-semibold">Category:</span> {currentPlayer.category}</p>
                        <p><span className="font-semibold">Specialty:</span> {currentPlayer.specialty}</p>
                        <p><span className="font-semibold">Base Price:</span> {formatCurrency(currentPlayer.base_price)}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-yellow-400 mb-2">
                        {formatCurrency(auctionState.current_bid || currentPlayer.base_price)}
                      </div>
                      <p className="text-white/80 text-lg">Current Bid</p>
                      {auctionState.current_team_name && (
                        <Badge className="mt-2 bg-green-600 text-white">
                          Leading: {auctionState.current_team_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass border-white/20 mb-6">
                <CardContent className="py-20 text-center">
                  <Trophy className="w-24 h-24 text-white/40 mx-auto mb-6" />
                  <p className="text-white/80 text-2xl mb-4">No Active Auction</p>
                  <p className="text-white/60">Waiting for the next player...</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Teams Safe Bid Summary */}
          <div>
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Team Bidding Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {teamsSafeBidSummary?.teams?.map((team, index) => (
                    <div
                      key={team.team_id}
                      className={`p-3 rounded-lg border ${team.risk_level === 'low' ? 'bg-green-500/20 border-green-500/50' :
                          team.risk_level === 'medium' ? 'bg-yellow-500/20 border-yellow-500/50' :
                            'bg-red-500/20 border-red-500/50'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white text-sm">{team.team_name}</h4>
                        <Badge
                          className={`text-xs ${team.risk_level === 'low' ? 'bg-green-600' :
                              team.risk_level === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                        >
                          {team.risk_level === 'low' ? '🟢' : team.risk_level === 'medium' ? '🟡' : '🔴'}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-white/80 text-xs">
                        <div className="flex justify-between">
                          <span>Safe Bid:</span>
                          <span className="font-bold text-blue-300">
                            {formatCurrency(team.max_safe_bid_with_buffer)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Remaining:</span>
                          <span>{formatCurrency(team.remaining_budget)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Players:</span>
                          <span>{team.players_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDisplay;
