import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, TrendingUp, Plus, Play, BarChart } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import FloatingMenu from '@/components/FloatingMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchEvents();
    }
  }, [token]);

  const fetchEvents = async () => {
    if (!token) {
      console.log('No token available yet');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching auctions with token:', token ? 'Token present' : 'No token');
      const response = await axios.get(`${API}/auctions`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setEvents(response.data);
      console.log('Auctions loaded successfully:', response.data.length);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8" data-testid="admin-dashboard">
          <h1 className="text-4xl font-bold text-white mb-2">PowerAuctions - Super Admin</h1>
          <p className="text-white/80">powered by Turgut - Manage your sports auctions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/admin/events">
            <Card className="glass border-white/20 card-hover cursor-pointer" data-testid="events-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Total Auctions</p>
                    <h3 className="text-3xl font-bold text-white">{events.length}</h3>
                  </div>
                  <Calendar className="w-12 h-12 text-white/60" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Active Auctions</p>
                  <h3 className="text-3xl font-bold text-white">
                    {events.filter(e => e.status === 'in_progress').length}
                  </h3>
                </div>
                <Play className="w-12 h-12 text-white/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Completed</p>
                  <h3 className="text-3xl font-bold text-white">
                    {events.filter(e => e.status === 'completed').length}
                  </h3>
                </div>
                <TrendingUp className="w-12 h-12 text-white/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Quick Actions</p>
                  <Link to="/admin/events">
                    <Button className="mt-2 bg-white text-purple-700 hover:bg-white/90" data-testid="create-event-button">
                      <Plus className="w-4 h-4 mr-2" />
                      New Auction
                    </Button>
                  </Link>
                </div>
                <BarChart className="w-12 h-12 text-white/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Recent Auctions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/60">No auctions yet. Create your first auction!</p>
                <Link to="/admin/events">
                  <Button className="mt-4 bg-white text-purple-700 hover:bg-white/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Auction
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-white/10 rounded-lg border border-white/10"
                    data-testid={`event-item-${event.id}`}
                  >
                    <div className="flex items-center flex-1">
                      {event.logo_url && (
                        <img
                          src={event.logo_url}
                          alt={`${event.name} logo`}
                          className="w-10 h-10 rounded-lg object-cover mr-3 border border-white/20"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div>
                        <h4 className="text-white font-semibold">{event.name}</h4>
                        <p className="text-white/60 text-sm">{event.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.status === 'in_progress' ? 'bg-green-500/20 text-green-300' :
                        event.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                        {event.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <Link to={`/admin/categories/${event.id}`}>
                        <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                          <Users className="w-4 h-4 mr-1" />
                          Categories
                        </Button>
                      </Link>
                      <Link to={`/admin/teams/${event.id}`}>
                        <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                          <Users className="w-4 h-4 mr-1" />
                          Teams
                        </Button>
                      </Link>
                      <Link to={`/admin/players/${event.id}`}>
                        <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                          <Users className="w-4 h-4 mr-1" />
                          Players
                        </Button>
                      </Link>
                      <Link to={`/admin/sold-players/${event.id}`}>
                        <Button size="sm" variant="outline" className="bg-green-500/20 border-green-400/40 text-green-300 hover:bg-green-500/30">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Sold Players
                        </Button>
                      </Link>
                      <Link to={`/admin/auction/${event.id}`}>
                        <Button size="sm" className="bg-white text-purple-700 hover:bg-white/90">
                          <Play className="w-4 h-4 mr-1" />
                          Control
                        </Button>
                      </Link>
                    </div>
                  </div>
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

export default SuperAdminDashboard;
