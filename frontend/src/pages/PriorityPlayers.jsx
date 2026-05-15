import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Star, StarOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PriorityPlayers = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [players, setPlayers] = useState([]);
  const [event, setEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvent();
    fetchPlayers();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to fetch event details');
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Failed to fetch players:', error);
      toast.error('Failed to load players');
    }
  };

  const togglePriority = async (player) => {
    try {
      setLoading(true);
      const updatedPlayer = {
        ...player,
        is_priority: !player.is_priority
      };

      await axios.put(`${API}/players/${player.id}`, updatedPlayer, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`${player.name} is ${!player.is_priority ? 'now' : 'no longer'} a priority player.`);
      fetchPlayers();
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast.error('Failed to update player priority');
    } finally {
      setLoading(false);
    }
  };

  // Filter players
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.category_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Sort so priority players are at the top
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (a.is_priority === b.is_priority) {
      return a.name.localeCompare(b.name);
    }
    return a.is_priority ? -1 : 1;
  });

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="outline" 
            className="mr-4 bg-white/10 text-white border-white/20 hover:bg-white/20"
            onClick={() => navigate(`/admin/players/${eventId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Players
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-white">Manage Priority Players</h1>
            {event && <p className="text-white/80">Select players to prioritize in random selection for {event.name}</p>}
          </div>
        </div>

        <Card className="glass border-white/20 mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                type="text"
                placeholder="Search by name or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPlayers.map((player) => (
            <Card 
              key={player.id} 
              className={`border-white/20 transition-all duration-300 ${
                player.is_priority 
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                  : 'bg-white/10'
              }`}
            >
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {player.photo_url ? (
                    <img src={player.photo_url} alt={player.name} className="w-12 h-12 rounded-full object-cover border border-white/20" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                      {player.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-semibold text-lg">{player.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-white/20 text-white text-xs border-none">
                        ₹{player.base_price?.toLocaleString()}
                      </Badge>
                      <span className="text-xs text-white/60">{player.status}</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={() => togglePriority(player)}
                  disabled={loading || player.status === 'sold' || player.status === 'unsold'}
                  variant={player.is_priority ? "default" : "outline"}
                  className={`rounded-full w-10 h-10 p-0 ${
                    player.is_priority 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                  title={player.is_priority ? "Remove from Priority" : "Add to Priority"}
                >
                  {player.is_priority ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {sortedPlayers.length === 0 && (
            <div className="col-span-full text-center py-12 text-white/60">
              No players found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriorityPlayers;
