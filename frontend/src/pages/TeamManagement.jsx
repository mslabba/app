import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, DollarSign, Edit } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TeamManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [event, setEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    budget: 10000000,
    max_squad_size: 18,
    color: '#667eea',
    logo_url: '',
    admin_email: ''
  });
  const [availableAdmins, setAvailableAdmins] = useState([]);

  useEffect(() => {
    fetchEvent();
    fetchTeams();
    fetchAvailableAdmins();
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

  const fetchAvailableAdmins = async () => {
    try {
      const response = await axios.get(`${API}/users/available-admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableAdmins(response.data);
    } catch (error) {
      console.error('Failed to load available admins:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTeam) {
        await axios.put(`${API}/teams/${editingTeam.id}`, {
          ...formData,
          event_id: eventId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Team updated successfully!');
      } else {
        await axios.post(`${API}/teams`, {
          ...formData,
          event_id: eventId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Team created successfully!');
      }
      fetchTeams();
      fetchAvailableAdmins(); // Refresh available admins
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || (editingTeam ? 'Failed to update team' : 'Failed to create team'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      budget: team.budget,
      max_squad_size: team.max_squad_size,
      color: team.color || '#667eea',
      logo_url: team.logo_url || '',
      admin_email: team.admin_email || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTeam(null);
    setIsDialogOpen(false);
    setFormData({
      name: '',
      budget: 10000000,
      max_squad_size: 18,
      color: '#667eea',
      logo_url: '',
      admin_email: ''
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
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">PowerAuctions - Team Management</h1>
            <p className="text-white/80">{event?.name || 'Loading...'}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-white text-purple-700 hover:bg-white/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
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
                <div className="space-y-2">
                  <Label htmlFor="admin_email">Team Admin (Optional)</Label>
                  <Select value={formData.admin_email || "none"} onValueChange={(value) => setFormData({...formData, admin_email: value === "none" ? "" : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team admin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No admin assigned</SelectItem>
                      {availableAdmins.map((admin) => (
                        <SelectItem key={admin.uid} value={admin.email}>
                          {admin.display_name} ({admin.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ImageUpload
                  label="Team Logo"
                  value={formData.logo_url}
                  onChange={(url) => setFormData({...formData, logo_url: url})}
                  placeholder="Upload team logo or enter URL"
                  sampleType={{ type: 'teams', subtype: 'logos' }}
                />
                <Button type="submit" className="w-full" disabled={loading} data-testid="submit-team-button">
                  {loading ? (editingTeam ? 'Updating...' : 'Creating...') : (editingTeam ? 'Update Team' : 'Create Team')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="glass border-white/20 card-hover" style={{ borderTopColor: team.color, borderTopWidth: '4px' }}>
              <CardHeader className="pb-3">
                {team.logo_url && (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={team.logo_url} 
                      alt={`${team.name} logo`}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white/30 shadow-lg bg-white/10 p-1"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg font-bold">{team.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleEdit(team)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Users className="w-5 h-5" />
                  </div>
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
                <div className="space-y-1 pt-2 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Players: {team.players_count}/{team.max_squad_size}</span>
                    <DollarSign className="w-5 h-5 text-white/60" />
                  </div>
                  {team.admin_email && (
                    <div className="text-white/60 text-xs">
                      Admin: {team.admin_email}
                    </div>
                  )}
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
