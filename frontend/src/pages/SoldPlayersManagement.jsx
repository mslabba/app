import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Unlock, Trophy, DollarSign, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import FloatingMenu from '@/components/FloatingMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SoldPlayersManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [soldPlayers, setSoldPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSoldPlayers(),
        fetchTeams(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSoldPlayers = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}/players`);
      const soldPlayersData = response.data.filter(player => player.status === 'sold');
      setSoldPlayers(soldPlayersData);
    } catch (error) {
      console.error('Failed to fetch sold players:', error);
      toast.error('Failed to load sold players');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API}/teams/event/${eventId}`);
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleReleasePlayer = async (player) => {
    const teamName = getTeamName(player.sold_to_team_id);
    if (!confirm(`Are you sure you want to release ${player.name} from ${teamName}? This will refund ₹${player.sold_price?.toLocaleString()} to the team.`)) return;

    try {
      await axios.post(`${API}/players/${player.id}/release`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${player.name} released successfully! Budget refunded to ${teamName}.`);
      fetchData(); // Refresh all data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release player');
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getTeamColor = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.color || '#6366f1';
  };

  const getTotalValue = () => {
    return soldPlayers.reduce((total, player) => total + (player.sold_price || 0), 0);
  };

  const getTeamStats = () => {
    const teamStats = teams.map(team => {
      const teamPlayers = soldPlayers.filter(p => p.sold_to_team_id === team.id);
      const totalSpent = teamPlayers.reduce((total, p) => total + (p.sold_price || 0), 0);
      return {
        ...team,
        playersCount: teamPlayers.length,
        totalSpent
      };
    });
    return teamStats.sort((a, b) => b.totalSpent - a.totalSpent);
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-white">Loading sold players...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Sold Players Management</h1>
            <p className="text-white/80">Manage players sold in the auction</p>
          </div>
          <Button onClick={fetchData} disabled={loading} className="bg-white text-purple-700 hover:bg-white/90">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total Sold</p>
                  <h3 className="text-2xl font-bold text-white">{soldPlayers.length}</h3>
                </div>
                <Trophy className="w-8 h-8 text-white/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total Value</p>
                  <h3 className="text-2xl font-bold text-white">₹{getTotalValue().toLocaleString()}</h3>
                </div>
                <DollarSign className="w-8 h-8 text-white/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Average Price</p>
                  <h3 className="text-2xl font-bold text-white">
                    ₹{soldPlayers.length > 0 ? Math.round(getTotalValue() / soldPlayers.length).toLocaleString() : '0'}
                  </h3>
                </div>
                <Trophy className="w-8 h-8 text-white/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Teams with Players</p>
                  <h3 className="text-2xl font-bold text-white">
                    {teams.filter(team => soldPlayers.some(p => p.sold_to_team_id === team.id)).length}
                  </h3>
                </div>
                <Users className="w-8 h-8 text-white/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sold Players List */}
          <div className="lg:col-span-2">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Sold Players ({soldPlayers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {soldPlayers.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-16 h-16 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60">No players sold yet</p>
                    <p className="text-white/40 text-sm mt-2">Players will appear here once they are sold in the auction</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {soldPlayers.map((player) => (
                      <Card key={player.id} className="bg-white/10 border-white/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {player.photo_url && (
                              <img
                                src={player.photo_url}
                                alt={`${player.name} photo`}
                                className="w-16 h-16 rounded-lg object-cover border-2 border-white/30 shadow-lg bg-white/10 p-1"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}

                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-white font-bold text-lg">{player.name}</h3>
                                  <Badge variant="secondary" className="text-xs mb-1">
                                    {getCategoryName(player.category_id)}
                                  </Badge>
                                  {player.position && (
                                    <p className="text-white/60 text-sm">{player.position}</p>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm text-white/80 mb-3">
                                <div>
                                  <div>Base Price: ₹{player.base_price?.toLocaleString()}</div>
                                  <div className="font-semibold text-green-300">
                                    Sold Price: ₹{player.sold_price?.toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div
                                    className="font-semibold"
                                    style={{ color: getTeamColor(player.sold_to_team_id) }}
                                  >
                                    Team: {getTeamName(player.sold_to_team_id)}
                                  </div>
                                  {player.age && <div>Age: {player.age}</div>}
                                </div>
                              </div>

                              {/* Release Button */}
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-yellow-500/20 border-yellow-400/40 text-yellow-300 hover:bg-yellow-500/30"
                                  onClick={() => handleReleasePlayer(player)}
                                  title="Release player back to auction pool"
                                >
                                  <Unlock className="w-3 h-3 mr-2" />
                                  Release Player
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Stats */}
          <div className="lg:col-span-1">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Team Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTeamStats().map((team) => (
                    <div
                      key={team.id}
                      className="p-3 rounded-lg bg-white/5 border border-white/10"
                      style={{ borderLeftColor: team.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-white">{team.name}</div>
                          <div className="text-sm text-white/60">
                            {team.playersCount} players
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-400">
                            ₹{team.totalSpent?.toLocaleString()}
                          </div>
                          <div className="text-xs text-white/60">spent</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-white/60">
                        Remaining: ₹{team.remaining?.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating Menu */}
      <FloatingMenu />
    </div>
  );
};

export default SoldPlayersManagement;