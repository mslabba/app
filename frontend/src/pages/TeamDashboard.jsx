import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gavel, Users, DollarSign, Trophy, Clock, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TeamDashboard = () => {
  const { token, userProfile } = useAuth();
  const [events, setEvents] = useState([]);
  const [team, setTeam] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch events
      const eventsResponse = await axios.get(`${API}/events`);
      setEvents(eventsResponse.data);

      // If user has a team, fetch team data
      if (userProfile?.team_id) {
        const teamResponse = await axios.get(`${API}/teams/${userProfile.team_id}`);
        setTeam(teamResponse.data);

        // Fetch auction state for team's event
        const auctionResponse = await axios.get(`${API}/auction/state/${teamResponse.data.event_id}`);
        setAuctionState(auctionResponse.data);

        // If there's a current player, fetch player details
        if (auctionResponse.data.current_player_id) {
          const playerResponse = await axios.get(`${API}/players/${auctionResponse.data.current_player_id}`);
          setCurrentPlayer(playerResponse.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
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
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

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
                      <div className="space-y-2">
                        {[50000, 100000, 250000, 500000].map((increment) => {
                          const bidAmount = (auctionState.current_bid || currentPlayer.base_price) + increment;
                          return (
                            <Button
                              key={increment}
                              onClick={() => placeBid(bidAmount)}
                              className="w-full bg-white text-purple-700 hover:bg-white/90"
                              disabled={bidAmount > team.remaining}
                            >
                              Bid ₹{bidAmount.toLocaleString()} (+₹{increment.toLocaleString()})
                            </Button>
                          );
                        })}
                      </div>
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
    </div>
  );
};

export default TeamDashboard;
