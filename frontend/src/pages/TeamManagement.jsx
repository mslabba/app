import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, DollarSign } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TeamManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [event, setEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    budget: 10000000,
    max_squad_size: 18,
    color: '#667eea',
    logo_url: ''
  });

  useEffect(() => {
    fetchEvent();
    fetchTeams();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API}/events/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      toast.error('Failed to load event');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API}/teams/event/${eventId}`);
      setTeams(response.data);
    } catch (error) {
      toast.error('Failed to load teams');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/teams`, {
        ...formData,
        event_id: eventId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Team created successfully!');
      setIsDialogOpen(false);
      fetchTeams();
      resetForm();
    } catch (error) {
      toast.error('Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      budget: 10000000,
      max_squad_size: 18,
      color: '#667eea',
      logo_url: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Team Management</h1>
            <p className="text-white/80">{event?.name || 'Loading...'}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-purple-700 hover:bg-white/90" data-testid="create-team-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="team-form">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    data-testid="team-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (₹)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_squad_size">Max Squad Size</Label>
                  <Input
                    id="max_squad_size"
                    type="number"
                    value={formData.max_squad_size}
                    onChange={(e) => setFormData({...formData, max_squad_size: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Team Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="submit-team-button">
                  {loading ? 'Creating...' : 'Create Team'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="glass border-white/20 card-hover" style={{ borderTopColor: team.color, borderTopWidth: '4px' }}>
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>{team.name}</span>
                  <Users className="w-5 h-5" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Total Budget</span>
                    <span className="text-white font-semibold">{formatCurrency(team.budget)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Spent</span>
                    <span className="text-red-400 font-semibold">{formatCurrency(team.spent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Remaining</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(team.remaining)}</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${(team.spent / team.budget) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-white/60 text-sm">Players: {team.players_count}/{team.max_squad_size}</span>
                  <DollarSign className="w-5 h-5 text-white/60" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {teams.length === 0 && (
          <Card className="glass border-white/20">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 mb-4">No teams created yet</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-white text-purple-700 hover:bg-white/90">
                <Plus className="w-4 h-4 mr-2" />
                Create First Team
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
