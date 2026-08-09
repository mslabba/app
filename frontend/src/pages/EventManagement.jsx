import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Settings, Share2, Gavel, Users, Tag, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
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
    <AppShell title="Auctions" subtitle="Create and manage your events">
      <div className="container mx-auto px-4 py-8 sm:px-6">
        <PageHeader
          title="Auctions"
          description={`${events.length} auction${events.length === 1 ? '' : 's'} · create, configure, and open live control`}
          actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                data-testid="create-event-button"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create auction
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
          }
        />

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 py-16 text-center">
            <Calendar className="mx-auto mb-4 h-14 w-14 text-white/30" />
            <p className="text-lg text-white/75">No auctions yet</p>
            <p className="mt-1 text-sm text-white/45">Create an auction to add categories, teams, and players.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="glass border-white/15" data-testid={`event-card-${event.id}`}>
              <CardHeader className="pb-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  {event.logo_url ? (
                    <img
                      src={event.logo_url}
                      alt=""
                      className="h-14 w-14 rounded-xl border border-white/20 object-cover bg-white/5"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-600/15 ring-1 ring-red-500/25">
                      <Calendar className="h-6 w-6 text-red-300" />
                    </div>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${event.status === 'in_progress' ? 'bg-emerald-500/20 text-emerald-300' :
                      event.status === 'completed' ? 'bg-sky-500/20 text-sky-300' :
                        'bg-white/10 text-white/65'
                      }`}>
                      {(event.status || 'not_started').replace(/_/g, ' ')}
                  </span>
                </div>
                <CardTitle className="text-lg font-bold text-white">{event.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-white/70">
                  <p>Date: {event.date}</p>
                  <p className="mt-1 line-clamp-2 text-white/55">{event.description || 'No description'}</p>
                  {event.organizer_name && (
                    <p className="mt-2 text-white/80">
                      <span className="font-medium">Organizer:</span> {event.organizer_name}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => handleEdit(event)}>
                    <Settings className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Link to={`/admin/auction/${event.id}`}>
                    <Button size="sm" className="bg-red-600 text-white hover:bg-red-700">
                      <Gavel className="mr-1 h-3.5 w-3.5" />
                      Live control
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link to={`/admin/categories/${event.id}`}>
                    <Button size="sm" variant="outline" className="w-full border-white/15 bg-white/5 text-white/85 hover:bg-white/10">
                      <Tag className="mr-1 h-3.5 w-3.5" /> Categories
                    </Button>
                  </Link>
                  <Link to={`/admin/teams/${event.id}`}>
                    <Button size="sm" variant="outline" className="w-full border-white/15 bg-white/5 text-white/85 hover:bg-white/10">
                      <Users className="mr-1 h-3.5 w-3.5" /> Teams
                    </Button>
                  </Link>
                  <Link to={`/admin/players/${event.id}`}>
                    <Button size="sm" variant="outline" className="w-full border-white/15 bg-white/5 text-white/85 hover:bg-white/10">
                      Players
                    </Button>
                  </Link>
                  <Link to={`/admin/registrations/${event.id}`}>
                    <Button size="sm" variant="outline" className="w-full border-white/15 bg-white/5 text-white/85 hover:bg-white/10">
                      <UserPlus className="mr-1 h-3.5 w-3.5" /> Regs
                    </Button>
                  </Link>
                  {event.payment_settings?.collect_payment && (
                    <Link to={`/admin/events/${event.id}/payments`} className="col-span-2">
                      <Button size="sm" variant="outline" className="w-full border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20">
                        Payments
                      </Button>
                    </Link>
                  )}
                  <Link to={`/admin/sponsors/${event.id}`} className="col-span-2">
                    <Button size="sm" variant="outline" className="w-full border-white/15 bg-white/5 text-white/85 hover:bg-white/10">
                      Sponsors
                    </Button>
                  </Link>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                  onClick={() => copyRegistrationLink(event.id)}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Copy registration link
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </AppShell>
  );
};

export default EventManagement;
