import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, Settings } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EventManagement = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    rules: {
      min_squad_size: 11,
      max_squad_size: 18,
      min_bid_increment: 50000,
      timer_duration: 60,
      rtm_cards_per_team: 2
    }
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (error) {
      toast.error('Failed to load events');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/events`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Event created successfully!');
      setIsDialogOpen(false);
      fetchEvents();
      resetForm();
    } catch (error) {
      toast.error('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      description: '',
      rules: {
        min_squad_size: 11,
        max_squad_size: 18,
        min_bid_increment: 50000,
        timer_duration: 60,
        rtm_cards_per_team: 2
      }
    });
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Event Management</h1>
            <p className="text-white/80">Create and manage auction events</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-purple-700 hover:bg-white/90" data-testid="create-event-dialog-trigger">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="event-form">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                    data-testid="event-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    data-testid="event-description-input"
                  />
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
                          rules: {...formData.rules, min_squad_size: parseInt(e.target.value)}
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
                          rules: {...formData.rules, max_squad_size: parseInt(e.target.value)}
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
                          rules: {...formData.rules, min_bid_increment: parseInt(e.target.value)}
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
                          rules: {...formData.rules, timer_duration: parseInt(e.target.value)}
                        })}
                      />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="submit-event-button">
                  {loading ? 'Creating...' : 'Create Event'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="glass border-white/20 card-hover" data-testid={`event-card-${event.id}`}>
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>{event.name}</span>
                  <Calendar className="w-5 h-5" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-white/80">
                  <p className="text-sm">Date: {event.date}</p>
                  <p className="text-sm mt-1">{event.description || 'No description'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    event.status === 'in_progress' ? 'bg-green-500/20 text-green-300' :
                    event.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {event.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <Button 
                    size="sm" 
                    className="bg-white text-purple-700 hover:bg-white/90"
                    onClick={() => window.location.href = `/admin/teams/${event.id}`}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventManagement;
