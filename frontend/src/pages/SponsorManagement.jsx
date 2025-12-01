import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  DollarSign,
  Star,
  Globe,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import ImageUpload from '@/components/ImageUpload';
import FloatingMenu from '@/components/FloatingMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SponsorManagement = () => {
  const { eventId } = useParams();
  const { currentUser, token } = useAuth();
  const [event, setEvent] = useState(null);
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    sponsorship_amount: '',
    tier: 'bronze',
    is_active: true
  });

  useEffect(() => {
    if (eventId && currentUser && token) {
      fetchData();
    }
  }, [eventId, currentUser, token]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchEvent(),
        fetchSponsors()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load sponsor data');
    }
  };

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvent(response.data);
    } catch (error) {
      console.error('Failed to fetch event:', error);
    }
  };

  const fetchSponsors = async () => {
    try {
      const response = await axios.get(`${API}/sponsors/event/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSponsors(response.data);
    } catch (error) {
      console.error('Failed to fetch sponsors:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter sponsor name');
      return;
    }

    try {
      setLoading(true);

      const sponsorData = {
        ...formData,
        event_id: eventId,
        sponsorship_amount: formData.sponsorship_amount ? parseInt(formData.sponsorship_amount) : null
      };

      if (editingSponsor) {
        await axios.put(`${API}/sponsors/${editingSponsor.id}`, sponsorData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Sponsor updated successfully!');
      } else {
        await axios.post(`${API}/sponsors`, sponsorData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Sponsor created successfully!');
      }

      setIsModalOpen(false);
      resetForm();
      fetchSponsors();
    } catch (error) {
      console.error('Failed to save sponsor:', error);
      toast.error('Failed to save sponsor');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      description: sponsor.description || '',
      logo_url: sponsor.logo_url || '',
      website: sponsor.website || '',
      contact_email: sponsor.contact_email || '',
      contact_phone: sponsor.contact_phone || '',
      address: sponsor.address || '',
      sponsorship_amount: sponsor.sponsorship_amount?.toString() || '',
      tier: sponsor.tier || 'bronze',
      is_active: sponsor.is_active !== false
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (sponsorId) => {
    if (!window.confirm('Are you sure you want to delete this sponsor?')) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API}/sponsors/${sponsorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Sponsor deleted successfully!');
      fetchSponsors();
    } catch (error) {
      console.error('Failed to delete sponsor:', error);
      toast.error('Failed to delete sponsor');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      logo_url: '',
      website: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      sponsorship_amount: '',
      tier: 'bronze',
      is_active: true
    });
    setEditingSponsor(null);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'platinum': return 'bg-gray-300 text-gray-800';
      case 'gold': return 'bg-yellow-500 text-white';
      case 'silver': return 'bg-gray-400 text-white';
      case 'bronze': return 'bg-orange-600 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'platinum': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '⭐';
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Sponsor Management</h1>
            {event && <p className="text-white/80 text-lg">{event.name}</p>}
          </div>
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            console.log('Sponsor Dialog state changing to:', open);
            setIsModalOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  console.log('Add Sponsor button clicked');
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Sponsor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Sponsor Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Enter sponsor name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier">Sponsorship Tier</Label>
                      <Select value={formData.tier} onValueChange={(value) => handleChange('tier', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="platinum">💎 Platinum</SelectItem>
                          <SelectItem value="gold">🥇 Gold</SelectItem>
                          <SelectItem value="silver">🥈 Silver</SelectItem>
                          <SelectItem value="bronze">🥉 Bronze</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Brief description about the sponsor"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Logo</h3>
                  <ImageUpload
                    label="Upload Sponsor Logo"
                    value={formData.logo_url}
                    onChange={(url) => handleChange('logo_url', url)}
                    placeholder="Upload logo or enter URL"
                    sampleType={{ type: 'sponsors', subtype: 'logos' }}
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => handleChange('website', e.target.value)}
                        placeholder="https://sponsor-website.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => handleChange('contact_email', e.target.value)}
                        placeholder="contact@sponsor.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) => handleChange('contact_phone', e.target.value)}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sponsorship_amount">Sponsorship Amount</Label>
                      <Input
                        id="sponsorship_amount"
                        type="number"
                        value={formData.sponsorship_amount}
                        onChange={(e) => handleChange('sponsorship_amount', e.target.value)}
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Sponsor address"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Saving...' : editingSponsor ? 'Update Sponsor' : 'Create Sponsor'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sponsors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sponsors.map((sponsor) => (
            <Card key={sponsor.id} className="bg-white/95 backdrop-blur-sm border-white/30">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-800">{sponsor.name}</h3>
                      <Badge className={`${getTierColor(sponsor.tier)} text-xs`}>
                        {getTierIcon(sponsor.tier)} {sponsor.tier?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(sponsor)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(sponsor.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {sponsor.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {sponsor.description}
                  </p>
                )}

                <div className="space-y-2 text-sm text-gray-600">
                  {sponsor.website && (
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4" />
                      <a
                        href={sponsor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {sponsor.website}
                      </a>
                    </div>
                  )}
                  {sponsor.contact_email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{sponsor.contact_email}</span>
                    </div>
                  )}
                  {sponsor.contact_phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>{sponsor.contact_phone}</span>
                    </div>
                  )}
                  {sponsor.sponsorship_amount && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-green-600">
                        ₹{sponsor.sponsorship_amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sponsors.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm border-white/30">
            <CardContent className="py-12 text-center">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">No sponsors added yet</p>
              <p className="text-gray-500 text-sm mb-6">Add sponsors to showcase them during the auction</p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Sponsor
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating Menu */}
      <FloatingMenu />
    </div>
  );
};

export default SponsorManagement;
