import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Settings, Share2, Copy, DollarSign, Users } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import FloatingMenu from '@/components/FloatingMenu';
import { Switch } from '@/components/ui/switch';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EventManagement = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    logo_url: '',
    banner_url: '',
    rules: {
      min_squad_size: 11,
      max_squad_size: 18,
      min_bid_increment: 50000,
      timer_duration: 60,
      rtm_cards_per_team: 2
    },
    payment_settings: {
      collect_payment: false,
      registration_fee: null
    },
    has_registration_limit: false,
    registration_limit: null
  });

  useEffect(() => {
    if (token) {
      fetchEvents();
    }
  }, [token]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/auctions`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setEvents(response.data);
    } catch (error) {
      toast.error('Failed to load auctions');
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingEvent) {
        await axios.put(`${API}/auctions/${editingEvent.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Auction updated successfully!');
      } else {
        await axios.post(`${API}/auctions`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Auction created successfully!');
      }
      fetchEvents();
      resetForm();
    } catch (error) {
      toast.error(editingEvent ? 'Failed to update auction' : 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      date: event.date,
      description: event.description || '',
      logo_url: event.logo_url || '',
      banner_url: event.banner_url || '',
      rules: event.rules,
      payment_settings: event.payment_settings || {
        collect_payment: false,
        registration_fee: null
      },
      has_registration_limit: event.has_registration_limit || false,
      registration_limit: event.registration_limit || null
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setIsDialogOpen(false);
    setFormData({
      name: '',
      date: '',
      description: '',
      logo_url: '',
      banner_url: '',
      rules: {
        min_squad_size: 11,
        max_squad_size: 18,
        min_bid_increment: 50000,
        timer_duration: 60,
        rtm_cards_per_team: 2
      },
      payment_settings: {
        collect_payment: false,
        registration_fee: null
      },
      has_registration_limit: false,
      registration_limit: null
    });
  };

  const copyRegistrationLink = (eventId) => {
    const registrationUrl = `${window.location.origin}/auctions/${eventId}/register`;
    navigator.clipboard.writeText(registrationUrl).then(() => {
      toast.success('Registration link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">PowerAuctions - Auction Management</h1>
            <p className="text-white/80">powered by Turgut - Create and manage auctions</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            console.log('Dialog state changing to:', open);
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                className="bg-white text-purple-700 hover:bg-white/90"
                data-testid="create-event-button"
                onClick={() => {
                  console.log('Create Auction button clicked');
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Auction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Edit Auction' : 'Create New Auction'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="event-form">
                <div className="space-y-2">
                  <Label htmlFor="name">Auction Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="event-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="event-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    data-testid="event-description-input"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Auction Images</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUpload
                      label="Auction Logo"
                      value={formData.logo_url}
                      onChange={(url) => setFormData({ ...formData, logo_url: url })}
                      placeholder="Upload auction logo or enter URL"
                      sampleType={{ type: 'events', subtype: 'logos' }}
                    />
                    <ImageUpload
                      label="Auction Banner"
                      value={formData.banner_url}
                      onChange={(url) => setFormData({ ...formData, banner_url: url })}
                      placeholder="Upload auction banner or enter URL"
                      sampleType={{ type: 'events', subtype: 'banners' }}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Auction Rules</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Squad Size</Label>
                      <Input
                        type="number"
                        value={formData.rules.min_squad_size}
                        onChange={(e) => setFormData({
                          ...formData,
                          rules: { ...formData.rules, min_squad_size: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Squad Size</Label>
                      <Input
                        type="number"
                        value={formData.rules.max_squad_size}
                        onChange={(e) => setFormData({
                          ...formData,
                          rules: { ...formData.rules, max_squad_size: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Bid Increment</Label>
                      <Input
                        type="number"
                        value={formData.rules.min_bid_increment}
                        onChange={(e) => setFormData({
                          ...formData,
                          rules: { ...formData.rules, min_bid_increment: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Timer Duration (seconds)</Label>
                      <Input
                        type="number"
                        value={formData.rules.timer_duration}
                        onChange={(e) => setFormData({
                          ...formData,
                          rules: { ...formData.rules, timer_duration: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Payment Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="collect-payment">Collect Payment on Registration</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable payment collection for public player registration
                        </p>
                      </div>
                      <Switch
                        id="collect-payment"
                        checked={formData.payment_settings.collect_payment}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          payment_settings: {
                            ...formData.payment_settings,
                            collect_payment: checked
                          }
                        })}
                      />
                    </div>
                    {formData.payment_settings.collect_payment && (
                      <div className="space-y-2">
                        <Label htmlFor="registration-fee">Registration Fee Amount</Label>
                        <Input
                          id="registration-fee"
                          type="number"
                          placeholder="Enter amount (e.g., 500)"
                          value={formData.payment_settings.registration_fee || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            payment_settings: {
                              ...formData.payment_settings,
                              registration_fee: e.target.value ? parseInt(e.target.value) : null
                            }
                          })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Players will be required to pay this amount during registration
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Registration Limit Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="has-registration-limit">Limit Number of Registrations</Label>
                        <p className="text-sm text-muted-foreground">
                          Set a maximum number of players that can register
                        </p>
                      </div>
                      <Switch
                        id="has-registration-limit"
                        checked={formData.has_registration_limit}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          has_registration_limit: checked,
                          registration_limit: checked ? formData.registration_limit : null
                        })}
                      />
                    </div>
                    {formData.has_registration_limit && (
                      <div className="space-y-2">
                        <Label htmlFor="registration-limit">Maximum Registrations</Label>
                        <Input
                          id="registration-limit"
                          type="number"
                          min="1"
                          placeholder="Enter maximum number of registrations (e.g., 100)"
                          value={formData.registration_limit || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            registration_limit: e.target.value ? parseInt(e.target.value) : null
                          })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Registration will close automatically when this limit is reached
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="submit-event-button">
                  {loading ? (editingEvent ? 'Updating...' : 'Creating...') : (editingEvent ? 'Update Event' : 'Create Event')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="glass border-white/20 card-hover" data-testid={`event-card-${event.id}`}>
              <CardHeader className="pb-3">
                {event.logo_url && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={event.logo_url}
                      alt={`${event.name} logo`}
                      className="w-20 h-20 rounded-xl object-cover border-2 border-white/30 shadow-lg bg-white/10 p-2"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="text-lg font-bold">{event.name}</span>
                  <Calendar className="w-5 h-5" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-white/80">
                  <p className="text-sm">Date: {event.date}</p>
                  <p className="text-sm mt-1">{event.description || 'No description'}</p>
                  {event.organizer_name && (
                    <p className="text-sm mt-2 text-white/90">
                      <span className="font-medium">Organizer:</span> {event.organizer_name}
                      {event.organizer_mobile && (
                        <span className="ml-2 text-green-400">📱 {event.organizer_mobile}</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.status === 'in_progress' ? 'bg-green-500/20 text-green-300' :
                      event.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                      {event.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleEdit(event)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                        onClick={() => window.location.href = `/admin/categories/${event.id}`}
                      >
                        Categories
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-500/20 text-green-300 hover:bg-green-500/30"
                        onClick={() => window.location.href = `/admin/teams/${event.id}`}
                      >
                        Teams
                      </Button>
                      <Button
                        size="sm"
                        className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                        onClick={() => window.location.href = `/admin/players/${event.id}`}
                      >
                        Players
                      </Button>
                      <Button
                        size="sm"
                        className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                        onClick={() => window.location.href = `/admin/registrations/${event.id}`}
                      >
                        Registrations
                      </Button>
                      {event.payment_settings?.collect_payment && (
                        <Button
                          size="sm"
                          className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                          onClick={() => window.location.href = `/admin/events/${event.id}/payments`}
                        >
                          💰 Payments
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                        onClick={() => window.location.href = `/admin/sponsors/${event.id}`}
                      >
                        Sponsors
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        onClick={() => window.location.href = `/admin/auction/${event.id}`}
                      >
                        🎯 Auction Control
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 flex items-center justify-center"
                      onClick={() => copyRegistrationLink(event.id)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Registration Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Floating Menu */}
      <FloatingMenu />
    </div>
  );
};

export default EventManagement;
