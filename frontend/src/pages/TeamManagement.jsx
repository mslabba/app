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
import { Plus, Users, DollarSign, Edit, Eye, RefreshCw, Share2, Copy, ExternalLink, Download } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import FloatingMenu from '@/components/FloatingMenu';
import { generateTeamRosterPDF } from '@/utils/pdfGenerator';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TeamManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [event, setEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPlayersDialogOpen, setIsPlayersDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [categories, setCategories] = useState([]);
  const [shareDialog, setShareDialog] = useState({ open: false, team: null, link: null, generating: false });
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
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories/event/${eventId}`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const fetchTeamPlayers = async (teamId) => {
    setLoadingPlayers(true);
    try {
      const response = await axios.get(`${API}/teams/${teamId}/players`);
      setTeamPlayers(response.data);
    } catch (error) {
      toast.error('Failed to load team players');
      console.error('Failed to load team players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleViewPlayers = (team) => {
    setSelectedTeam(team);
    setIsPlayersDialogOpen(true);
    fetchTeamPlayers(team.id);
  };

  const handleRefreshPlayers = async () => {
    if (selectedTeam) {
      try {
        await Promise.all([
          fetchTeamPlayers(selectedTeam.id),
          fetchTeams() // Refresh teams data to get updated statistics
        ]);
        toast.success('Data refreshed successfully');
      } catch (error) {
        toast.error('Failed to refresh data');
      }
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

  const handleGenerateShareLink = async (team) => {
    setShareDialog({ open: true, team, link: null, generating: true });

    try {
      // Call backend API to generate secure public link
      const response = await axios.post(`${API}/teams/${team.id}/generate-public-link`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Use the current domain instead of the backend response
      const publicLink = `${window.location.origin}/public/team/${team.id}/stats?token=${response.data.token}`;

      setShareDialog(prev => ({ ...prev, link: publicLink, generating: false }));
      toast.success('Public link generated successfully!');
    } catch (error) {
      console.error('Failed to generate public link:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      // Fallback to demo link for testing
      const timestamp = Date.now();
      const demoString = `${team.id}-${timestamp}`;
      const demoToken = btoa(demoString);
      const fallbackLink = `${window.location.origin}/public/team/${team.id}/stats?token=${demoToken}`;

      console.log('Demo token details:', {
        teamId: team.id,
        teamName: team.name,
        timestamp,
        demoString,
        demoToken: demoToken.substring(0, 20) + '...',
        fallbackLink
      });

      setShareDialog(prev => ({ ...prev, link: fallbackLink, generating: false }));
      toast.success('Demo public link generated (for testing)!');
    }
  }; const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy link');
    }
  };

  const openInNewTab = (url) => {
    window.open(url, '_blank');
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const groupPlayersByCategory = () => {
    if (!teamPlayers.length || !categories.length) return {};

    const groupedPlayers = {};

    // Initialize groups with categories
    categories.forEach(category => {
      groupedPlayers[category.id] = {
        category,
        players: [],
        count: 0,
        minRequired: category.min_players,
        maxAllowed: category.max_players
      };
    });

    // Group players by category
    teamPlayers.forEach(player => {
      if (player.category_id && groupedPlayers[player.category_id]) {
        groupedPlayers[player.category_id].players.push(player);
        groupedPlayers[player.category_id].count++;
      }
    });

    return groupedPlayers;
  };

  const getCategoryStatus = (count, minRequired, maxAllowed) => {
    if (count < minRequired) {
      return { status: 'insufficient', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    } else if (count > maxAllowed) {
      return { status: 'exceeded', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    } else {
      return { status: 'optimal', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            console.log('Team Dialog state changing to:', open);
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                className="bg-white text-purple-700 hover:bg-white/90"
                onClick={() => {
                  console.log('Create Team button clicked');
                  setIsDialogOpen(true);
                }}
              >
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_squad_size">Max Squad Size</Label>
                  <Input
                    id="max_squad_size"
                    type="number"
                    value={formData.max_squad_size}
                    onChange={(e) => setFormData({ ...formData, max_squad_size: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Team Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_email">Team Admin (Optional)</Label>
                  <Select value={formData.admin_email || "none"} onValueChange={(value) => setFormData({ ...formData, admin_email: value === "none" ? "" : value })}>
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
                  onChange={(url) => setFormData({ ...formData, logo_url: url })}
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

        {/* Players Dialog */}
        <Dialog open={isPlayersDialogOpen} onOpenChange={setIsPlayersDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {selectedTeam?.name} - Squad ({teamPlayers.length}/{selectedTeam?.max_squad_size})
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateTeamRosterPDF(selectedTeam, teamPlayers, categories, event)}
                    disabled={loadingPlayers || teamPlayers.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshPlayers}
                    disabled={loadingPlayers}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingPlayers ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              {loadingPlayers ? (
                <div className="flex justify-center py-8">
                  <div className="text-gray-500">Loading players...</div>
                </div>
              ) : teamPlayers.length > 0 ? (
                <div className="space-y-6">
                  {/* Category Overview */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Squad Composition by Category</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.values(groupPlayersByCategory()).map((categoryGroup) => {
                        const statusInfo = getCategoryStatus(
                          categoryGroup.count,
                          categoryGroup.minRequired,
                          categoryGroup.maxAllowed
                        );
                        return (
                          <div
                            key={categoryGroup.category.id}
                            className={`p-3 rounded-lg border-2 ${statusInfo.bgColor} ${statusInfo.borderColor}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-medium text-gray-900">{categoryGroup.category.name}</h5>
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: categoryGroup.category.color }}
                              />
                            </div>
                            <div className={`text-sm ${statusInfo.color} font-medium`}>
                              {categoryGroup.count}/{categoryGroup.minRequired}-{categoryGroup.maxAllowed}
                            </div>
                            <div className="text-xs text-gray-600">
                              {categoryGroup.count < categoryGroup.minRequired ?
                                `Need ${categoryGroup.minRequired - categoryGroup.count} more` :
                                categoryGroup.count > categoryGroup.maxAllowed ?
                                  `${categoryGroup.count - categoryGroup.maxAllowed} over limit` :
                                  'Requirement met'
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Players grouped by Category */}
                  {Object.values(groupPlayersByCategory()).map((categoryGroup) => (
                    categoryGroup.players.length > 0 && (
                      <div key={categoryGroup.category.id} className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: categoryGroup.category.color }}
                          />
                          <h4 className="font-semibold text-gray-900">
                            {categoryGroup.category.name} ({categoryGroup.players.length})
                          </h4>
                          <span className="text-sm text-gray-500">
                            Min: {categoryGroup.minRequired} | Max: {categoryGroup.maxAllowed}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryGroup.players.map((player) => (
                            <Card key={player.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  {player.photo_url ? (
                                    <img
                                      src={player.photo_url}
                                      alt={player.name}
                                      className="w-12 h-12 rounded-full object-cover border-2"
                                      style={{ borderColor: categoryGroup.category.color }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2"
                                      style={{
                                        backgroundColor: categoryGroup.category.color,
                                        borderColor: categoryGroup.category.color
                                      }}
                                    >
                                      {player.name.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{player.name}</h3>
                                    <p className="text-sm text-gray-600">{player.position}</p>
                                    {player.specialty && (
                                      <p className="text-xs text-gray-500">{player.specialty}</p>
                                    )}
                                    <div className="mt-2 space-y-1">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Base:</span>
                                        <span className="font-medium">{formatCurrency(player.base_price)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Sold:</span>
                                        <span className="font-bold text-green-600">
                                          {formatCurrency(player.sold_price || player.base_price)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                      {player.age && <span>Age: {player.age}</span>}
                                      {player.jersey_number && <span>#{player.jersey_number}</span>}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )
                  ))}

                  {/* Uncategorized Players (if any) */}
                  {teamPlayers.filter(p => !p.category_id).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 pb-2 border-b">
                        Uncategorized Players ({teamPlayers.filter(p => !p.category_id).length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teamPlayers.filter(p => !p.category_id).map((player) => (
                          <Card key={player.id} className="border border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {player.photo_url ? (
                                  <img
                                    src={player.photo_url}
                                    alt={player.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                                    {player.name.charAt(0)}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">{player.name}</h3>
                                  <p className="text-sm text-gray-600">{player.position}</p>
                                  <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Base:</span>
                                      <span className="font-medium">{formatCurrency(player.base_price)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Sold:</span>
                                      <span className="font-bold text-green-600">
                                        {formatCurrency(player.sold_price || player.base_price)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No players bought yet</p>
                  <p className="text-sm text-gray-400">
                    This team hasn't purchased any players during the auction.
                  </p>
                </div>
              )}

              {/* Team Summary */}
              {selectedTeam && (
                <div className="border-t pt-4 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Team Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{teamPlayers.length}</div>
                      <div className="text-sm text-gray-600">Players</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(selectedTeam.spent)}</div>
                      <div className="text-sm text-gray-600">Spent</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedTeam.remaining)}</div>
                      <div className="text-sm text-gray-600">Remaining</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-800">
                        {selectedTeam.max_squad_size - teamPlayers.length}
                      </div>
                      <div className="text-sm text-gray-600">Slots Left</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
                      onClick={() => handleViewPlayers(team)}
                      title="View Players"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleEdit(team)}
                      title="Edit Team"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleGenerateShareLink(team)}
                      title="Generate Public Statistics Link"
                    >
                      <Share2 className="w-3 h-3" />
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

      {/* Share Link Dialog */}
      <Dialog open={shareDialog.open} onOpenChange={(open) => setShareDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              <span>Share Team Statistics</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {shareDialog.team && (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">{shareDialog.team.name}</h3>
                <p className="text-sm text-gray-600">Generate a public link for real-time auction statistics</p>
              </div>
            )}

            {shareDialog.generating ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Generating secure link...</p>
              </div>
            ) : shareDialog.link ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Public Statistics Link
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={shareDialog.link}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(shareDialog.link)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openInNewTab(shareDialog.link)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 mt-0.5"></div>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Share this link with team owner</p>
                      <ul className="text-xs space-y-1">
                        <li>✅ Real-time budget and player updates</li>
                        <li>✅ Category-wise player breakdown</li>
                        <li>✅ No login required</li>
                        <li>✅ Auto-refreshes every 5 seconds</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    className="flex-1"
                    onClick={() => copyToClipboard(shareDialog.link)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openInNewTab(shareDialog.link)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600">Click "Generate Link" to create a shareable statistics page</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Menu */}
      <FloatingMenu />
    </div>
  );
};

export default TeamManagement;
