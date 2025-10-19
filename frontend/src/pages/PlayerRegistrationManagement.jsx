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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  Download
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlayerRegistrationManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkBasePrice, setBulkBasePrice] = useState('');
  const [viewingRegistration, setViewingRegistration] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [registrationsRes, playersRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/events/${eventId}/registrations`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/events/${eventId}/players`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/events/${eventId}/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setRegistrations(registrationsRes.data);
      setPlayers(playersRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSelect = (registrationId, checked) => {
    if (checked) {
      setSelectedRegistrations([...selectedRegistrations, registrationId]);
    } else {
      setSelectedRegistrations(selectedRegistrations.filter(id => id !== registrationId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const pendingIds = registrations
        .filter(reg => reg.status === 'pending_approval')
        .map(reg => reg.id);
      setSelectedRegistrations(pendingIds);
    } else {
      setSelectedRegistrations([]);
    }
  };

  const handleCategoryChange = (categoryId, isBulk = true) => {
    const selectedCategory = categories.find(c => c.id === categoryId);
    const basePrice = selectedCategory ? selectedCategory.base_price_min : '';
    
    if (isBulk) {
      setBulkCategory(categoryId);
      setBulkBasePrice(basePrice.toString());
      
      if (selectedCategory) {
        toast.info(`Base price auto-filled to ₹${basePrice.toLocaleString()} (category minimum)`);
      }
    }
    
    return basePrice;
  };

  const handleBulkApprove = async () => {
    if (!bulkCategory || !bulkBasePrice) {
      toast.error('Please select category and base price for bulk approval');
      return;
    }

    try {
      setLoading(true);
      console.log('Bulk approval data:', {
        category_id: bulkCategory,
        base_price: parseInt(bulkBasePrice)
      });
      
      const promises = selectedRegistrations.map(regId =>
        axios.post(`${API}/registrations/${regId}/approve`, {
          category_id: bulkCategory,
          base_price: parseInt(bulkBasePrice)
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedRegistrations.length} registrations approved successfully!`);
      setSelectedRegistrations([]);
      setBulkCategory('');
      setBulkBasePrice('');
      fetchData();
    } catch (error) {
      console.error('Bulk approval failed:', error);
      toast.error('Failed to approve registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleIndividualApprove = async (registrationId, categoryId, basePrice) => {
    try {
      console.log('Individual approval data:', {
        registrationId,
        category_id: categoryId,
        base_price: parseInt(basePrice)
      });
      
      await axios.post(`${API}/registrations/${registrationId}/approve`, {
        category_id: categoryId,
        base_price: parseInt(basePrice)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Registration approved successfully!');
      fetchData();
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('Failed to approve registration');
    }
  };

  const handleReject = async (registrationId) => {
    try {
      await axios.post(`${API}/registrations/${registrationId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Registration rejected');
      fetchData();
    } catch (error) {
      console.error('Rejection failed:', error);
      toast.error('Failed to reject registration');
    }
  };

  const viewRegistration = (registration) => {
    setViewingRegistration(registration);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_approval: { color: 'bg-yellow-500', text: 'Pending', icon: Clock },
      approved: { color: 'bg-green-500', text: 'Approved', icon: CheckCircle },
      rejected: { color: 'bg-red-500', text: 'Rejected', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending_approval;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const pendingRegistrations = registrations.filter(reg => reg.status === 'pending_approval');
  const approvedRegistrations = registrations.filter(reg => reg.status === 'approved');
  const rejectedRegistrations = registrations.filter(reg => reg.status === 'rejected');

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Player Registration Management</h1>
            <p className="text-white/80">Manage player registrations and approved players</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Pending ({pendingRegistrations.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approved ({approvedRegistrations.length})
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Players ({players.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center">
              <XCircle className="w-4 h-4 mr-2" />
              Rejected ({rejectedRegistrations.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Registrations Tab */}
          <TabsContent value="pending">
            <Card className="glass border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Pending Registrations
                  </CardTitle>
                  {selectedRegistrations.length > 0 && (
                    <div className="flex items-center space-x-4">
                      <Select value={bulkCategory} onValueChange={(value) => handleCategoryChange(value, true)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name} (₹{category.base_price_min?.toLocaleString()} - ₹{category.base_price_max?.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Base price"
                          value={bulkBasePrice}
                          onChange={(e) => setBulkBasePrice(e.target.value)}
                          className="w-32"
                        />
                        {bulkCategory && (
                          <div className="absolute top-full left-0 mt-1 text-xs text-white/70 whitespace-nowrap">
                            Range: ₹{categories.find(c => c.id === bulkCategory)?.base_price_min?.toLocaleString()} - ₹{categories.find(c => c.id === bulkCategory)?.base_price_max?.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={handleBulkApprove}
                        disabled={loading || !bulkCategory || !bulkBasePrice}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Approve Selected ({selectedRegistrations.length})
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pendingRegistrations.length > 0 && (
                  <div className="mb-4 flex items-center space-x-2">
                    <Checkbox
                      checked={selectedRegistrations.length === pendingRegistrations.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label>Select All</Label>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingRegistrations.map((registration) => (
                    <Card key={registration.id} className="bg-white/95 backdrop-blur-sm border-white/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedRegistrations.includes(registration.id)}
                              onCheckedChange={(checked) => handleRegistrationSelect(registration.id, checked)}
                            />
                            <div>
                              <h3 className="font-semibold text-gray-800">{registration.name}</h3>
                              <p className="text-sm text-gray-600">
                                {registration.age && `Age: ${registration.age}`}
                                {registration.position && ` • ${registration.position}`}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(registration.status)}
                        </div>

                        {registration.photo_url && (
                          <img
                            src={registration.photo_url}
                            alt={registration.name}
                            className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                          />
                        )}

                        <div className="text-sm text-gray-700 mb-3">
                          {registration.email && <div>📧 {registration.email}</div>}
                          {registration.contact_number && <div>📱 {registration.contact_number}</div>}
                          {registration.previous_team && <div>🏆 {registration.previous_team}</div>}
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewRegistration(registration)}
                            className="flex-1"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(registration.id)}
                          >
                            <UserX className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {pendingRegistrations.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending registrations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approved Registrations Tab */}
          <TabsContent value="approved">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Approved Registrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {approvedRegistrations.map((registration) => (
                    <Card key={registration.id} className="bg-white/10 border-white/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-white">{registration.name}</h3>
                            <p className="text-sm text-white/70">
                              Approved: {new Date(registration.approved_at).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(registration.status)}
                        </div>

                        {registration.photo_url && (
                          <img
                            src={registration.photo_url}
                            alt={registration.name}
                            className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                          />
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewRegistration(registration)}
                          className="w-full"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {approvedRegistrations.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No approved registrations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Active Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => (
                    <Card key={player.id} className="bg-white/95 backdrop-blur-sm border-white/30">
                      <CardContent className="p-4">
                        <div className="text-center">
                          {player.photo_url && (
                            <img
                              src={player.photo_url}
                              alt={player.name}
                              className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                            />
                          )}
                          <h3 className="font-semibold text-gray-800 mb-1">{player.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Base Price: ₹{player.base_price?.toLocaleString()}
                          </p>
                          <Badge variant="outline" className="text-gray-700 border-gray-300">
                            {categories.find(c => c.id === player.category_id)?.name || 'Unknown'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {players.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No players added yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rejected Registrations Tab */}
          <TabsContent value="rejected">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <XCircle className="w-5 h-5 mr-2" />
                  Rejected Registrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rejectedRegistrations.map((registration) => (
                    <Card key={registration.id} className="bg-white/10 border-white/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-white">{registration.name}</h3>
                            <p className="text-sm text-white/70">
                              {registration.age && `Age: ${registration.age}`}
                            </p>
                          </div>
                          {getStatusBadge(registration.status)}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewRegistration(registration)}
                          className="w-full"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {rejectedRegistrations.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No rejected registrations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Registration Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registration Details</DialogTitle>
            </DialogHeader>
            {viewingRegistration && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  {viewingRegistration.photo_url && (
                    <img
                      src={viewingRegistration.photo_url}
                      alt={viewingRegistration.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{viewingRegistration.name}</h3>
                    <p className="text-gray-600">
                      {viewingRegistration.age && `Age: ${viewingRegistration.age}`}
                      {viewingRegistration.position && ` • Position: ${viewingRegistration.position}`}
                    </p>
                    {getStatusBadge(viewingRegistration.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Contact Information</Label>
                    <div className="mt-2 space-y-1">
                      {viewingRegistration.email && <p>📧 {viewingRegistration.email}</p>}
                      {viewingRegistration.contact_number && <p>📱 {viewingRegistration.contact_number}</p>}
                    </div>
                  </div>
                  <div>
                    <Label className="font-semibold">Playing Information</Label>
                    <div className="mt-2 space-y-1">
                      {viewingRegistration.specialty && <p>⚡ {viewingRegistration.specialty}</p>}
                      {viewingRegistration.previous_team && <p>🏆 {viewingRegistration.previous_team}</p>}
                    </div>
                  </div>
                </div>

                {viewingRegistration.cricheroes_link && (
                  <div>
                    <Label className="font-semibold">CricHeroes Profile</Label>
                    <a
                      href={viewingRegistration.cricheroes_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block mt-1"
                    >
                      {viewingRegistration.cricheroes_link}
                    </a>
                  </div>
                )}

                {viewingRegistration.stats && (
                  <div>
                    <Label className="font-semibold">Career Statistics</Label>
                    <div className="mt-2 grid grid-cols-3 gap-4">
                      {viewingRegistration.stats.matches && (
                        <div className="text-center">
                          <div className="font-bold">{viewingRegistration.stats.matches}</div>
                          <div className="text-sm text-gray-600">Matches</div>
                        </div>
                      )}
                      {viewingRegistration.stats.runs && (
                        <div className="text-center">
                          <div className="font-bold">{viewingRegistration.stats.runs}</div>
                          <div className="text-sm text-gray-600">Runs/Goals</div>
                        </div>
                      )}
                      {viewingRegistration.stats.wickets && (
                        <div className="text-center">
                          <div className="font-bold">{viewingRegistration.stats.wickets}</div>
                          <div className="text-sm text-gray-600">Wickets/Assists</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewingRegistration.status === 'pending_approval' && (
                  <div className="flex space-x-4 pt-4 border-t">
                    <div className="flex space-x-2 flex-1">
                      <Select onValueChange={(value) => handleCategoryChange(value, true)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name} (₹{category.base_price_min?.toLocaleString()} - ₹{category.base_price_max?.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Base price"
                          value={bulkBasePrice}
                          onChange={(e) => setBulkBasePrice(e.target.value)}
                          className="w-32"
                        />
                        {bulkCategory && (
                          <div className="absolute top-full left-0 mt-1 text-xs text-gray-500 whitespace-nowrap">
                            Range: ₹{categories.find(c => c.id === bulkCategory)?.base_price_min?.toLocaleString()} - ₹{categories.find(c => c.id === bulkCategory)?.base_price_max?.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleIndividualApprove(viewingRegistration.id, bulkCategory, bulkBasePrice)}
                      disabled={!bulkCategory || !bulkBasePrice}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(viewingRegistration.id)}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PlayerRegistrationManagement;
