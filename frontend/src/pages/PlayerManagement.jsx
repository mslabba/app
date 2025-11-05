import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Edit, Trash2, User, Unlock, RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import FloatingMenu from '@/components/FloatingMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlayerManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    base_price: '',
    age: '',
    position: '',
    specialty: '',
    previous_team: '',
    photo_url: '',
    cricheroes_link: '',
    stats: {
      matches: '',
      runs: '',
      wickets: '',
      goals: '',
      assists: ''
    }
  });

  useEffect(() => {
    fetchPlayers();
    fetchCategories();
    fetchTeams();
  }, [eventId]);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/events/${eventId}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Failed to fetch players:', error);
      toast.error('Failed to load players');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/events/${eventId}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const playerData = {
        ...formData,
        base_price: parseInt(formData.base_price),
        age: formData.age ? parseInt(formData.age) : null,
        stats: {
          matches: formData.stats.matches ? parseInt(formData.stats.matches) : null,
          runs: formData.stats.runs ? parseInt(formData.stats.runs) : null,
          wickets: formData.stats.wickets ? parseInt(formData.stats.wickets) : null,
          goals: formData.stats.goals ? parseInt(formData.stats.goals) : null,
          assists: formData.stats.assists ? parseInt(formData.stats.assists) : null,
        }
      };

      if (editingPlayer) {
        await axios.put(`${API}/players/${editingPlayer.id}`, playerData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Player updated successfully!');
      } else {
        await axios.post(`${API}/players`, playerData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Player added successfully!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save player');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      category_id: player.category_id,
      base_price: player.base_price.toString(),
      age: player.age?.toString() || '',
      position: player.position || '',
      specialty: player.specialty || '',
      previous_team: player.previous_team || '',
      photo_url: player.photo_url || '',
      cricheroes_link: player.cricheroes_link || '',
      stats: {
        matches: player.stats?.matches?.toString() || '',
        runs: player.stats?.runs?.toString() || '',
        wickets: player.stats?.wickets?.toString() || '',
        goals: player.stats?.goals?.toString() || '',
        assists: player.stats?.assists?.toString() || ''
      }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      await axios.delete(`${API}/players/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Player deleted successfully!');
      fetchPlayers();
    } catch (error) {
      toast.error('Failed to delete player');
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
      fetchPlayers();
      fetchTeams(); // Refresh teams to update budgets
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release player');
    }
  };

  const handleMakeAvailable = async (player) => {
    if (!confirm(`Are you sure you want to make ${player.name} available for bidding? This will remove them from the current auction slot.`)) return;

    try {
      await axios.post(`${API}/players/${player.id}/make-available`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${player.name} is now available for bidding again!`);
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to make player available');
    }
  };

  const resetForm = () => {
    setEditingPlayer(null);
    setFormData({
      name: '',
      category_id: '',
      base_price: '',
      age: '',
      position: '',
      specialty: '',
      previous_team: '',
      photo_url: '',
      cricheroes_link: '',
      stats: {
        matches: '',
        runs: '',
        wickets: '',
        goals: '',
        assists: ''
      }
    });
  };

  const handleChange = (field, value) => {
    if (field.startsWith('stats.')) {
      const statField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        stats: { ...prev.stats, [statField]: value }
      }));
    } else if (field === 'category_id') {
      // Auto-fill base price when category changes
      const selectedCategory = categories.find(c => c.id === value);
      const basePrice = selectedCategory ? selectedCategory.base_price_min : '';

      setFormData(prev => ({
        ...prev,
        [field]: value,
        base_price: basePrice.toString()
      }));

      if (selectedCategory) {
        toast.info(`Base price auto-filled to ₹${basePrice.toLocaleString()} (category minimum)`);
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getCategoryPriceRange = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';
    return `₹${category.base_price_min?.toLocaleString()} - ₹${category.base_price_max?.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">PowerAuctions - Player Management</h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            console.log('Player Dialog state changing to:', open);
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button
                className="bg-white text-purple-700 hover:bg-white/90"
                onClick={() => {
                  console.log('Add Player button clicked');
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlayer ? 'Edit Player' : 'Add New Player'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Player Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category_id} onValueChange={(value) => handleChange('category_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="base_price">Base Price (₹) *</Label>
                    <Input
                      id="base_price"
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => handleChange('base_price', e.target.value)}
                      required
                    />
                    {formData.category_id && (
                      <p className="text-xs text-gray-500 mt-1">
                        Category range: {getCategoryPriceRange(formData.category_id)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleChange('age', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleChange('position', e.target.value)}
                      placeholder="e.g., Batsman, Forward"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => handleChange('specialty', e.target.value)}
                      placeholder="e.g., Right-hand bat, Left-foot"
                    />
                  </div>
                  <div>
                    <Label htmlFor="previous_team">Previous Team</Label>
                    <Input
                      id="previous_team"
                      value={formData.previous_team}
                      onChange={(e) => handleChange('previous_team', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cricheroes_link">CricHeroes Profile Link</Label>
                  <Input
                    id="cricheroes_link"
                    value={formData.cricheroes_link}
                    onChange={(e) => handleChange('cricheroes_link', e.target.value)}
                    placeholder="https://cricheroes.com/profile/..."
                  />
                </div>

                <ImageUpload
                  label="Player Photo"
                  value={formData.photo_url}
                  onChange={(url) => handleChange('photo_url', url)}
                  placeholder="Upload player photo or enter URL"
                  sampleType={{ type: 'players', subtype: 'photos' }}
                />

                <div>
                  <Label>Player Statistics</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <Label htmlFor="matches">Matches</Label>
                      <Input
                        id="matches"
                        type="number"
                        value={formData.stats.matches}
                        onChange={(e) => handleChange('stats.matches', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="runs">Runs/Goals</Label>
                      <Input
                        id="runs"
                        type="number"
                        value={formData.stats.runs || formData.stats.goals}
                        onChange={(e) => handleChange('stats.runs', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="wickets">Wickets/Assists</Label>
                      <Input
                        id="wickets"
                        type="number"
                        value={formData.stats.wickets || formData.stats.assists}
                        onChange={(e) => handleChange('stats.wickets', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingPlayer ? 'Update Player' : 'Add Player'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Players ({players.length})</span>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
                  Available: {players.filter(p => p.status === 'available').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>
                  Current: {players.filter(p => p.status === 'current').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
                  Sold: {players.filter(p => p.status === 'sold').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-400 mr-1"></span>
                  Unsold: {players.filter(p => p.status === 'unsold').length}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No players added yet</p>
                <p className="text-white/40 text-sm mt-2">Add players to start the auction</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player) => (
                  <Card key={player.id} className="bg-white/10 border-white/20">
                    <CardContent className="p-4">
                      {player.photo_url && (
                        <div className="flex justify-center mb-4">
                          <img
                            src={player.photo_url}
                            alt={`${player.name} photo`}
                            className="w-20 h-20 rounded-xl object-cover border-2 border-white/30 shadow-lg bg-white/10 p-1"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="mb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-center flex-1">
                            <h3 className="text-white font-bold text-lg mb-1">{player.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryName(player.category_id)}
                            </Badge>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              onClick={() => handleEdit(player)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30"
                              onClick={() => handleDelete(player.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-white/80">
                        <div>Base Price: ₹{player.base_price?.toLocaleString()}</div>
                        {player.position && <div>Position: {player.position}</div>}
                        {player.age && <div>Age: {player.age}</div>}
                        {player.previous_team && <div>Previous: {player.previous_team}</div>}

                        {/* Player Status */}
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${player.status === 'available' ? 'bg-green-400' :
                            player.status === 'sold' ? 'bg-blue-400' :
                              player.status === 'current' ? 'bg-yellow-400' :
                                'bg-gray-400'
                            }`}></span>
                          {player.status?.replace('_', ' ').toUpperCase()}
                        </div>

                        {/* Current Player Information */}
                        {player.status === 'current' && (
                          <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
                            <div className="font-semibold text-yellow-300 mb-2">Currently in Auction:</div>
                            <div>This player is currently being auctioned</div>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-green-500/20 border-green-400/40 text-green-300 hover:bg-green-500/30"
                                onClick={() => handleMakeAvailable(player)}
                                title="Make player available for future bidding"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Make Available
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Sold Player Information */}
                        {player.status === 'sold' && (
                          <div className="mt-3 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                            <div className="font-semibold text-blue-300 mb-2">Sold Details:</div>
                            <div>Team: {getTeamName(player.sold_to_team_id)}</div>
                            <div>Sold Price: ₹{player.sold_price?.toLocaleString()}</div>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-yellow-500/20 border-yellow-400/40 text-yellow-300 hover:bg-yellow-500/30"
                                onClick={() => handleReleasePlayer(player)}
                                title="Release player back to auction pool"
                              >
                                <Unlock className="w-3 h-3 mr-1" />
                                Release Player
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Floating Menu */}
      <FloatingMenu />
    </div>
  );
};

export default PlayerManagement;
