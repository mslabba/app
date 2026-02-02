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
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  FileText
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import FloatingMenu from '@/components/FloatingMenu';
import { generateRegistrationsPDF } from '@/utils/pdfGenerator';
import { convertGoogleDriveUrl } from '@/utils/imageUtils';
import { exportRegistrationsToExcel, exportAllToExcel } from '@/utils/excelExporter';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlayerRegistrationManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkBasePrice, setBulkBasePrice] = useState('');
  const [viewingRegistration, setViewingRegistration] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [registrationsRes, playersRes, categoriesRes, eventRes] = await Promise.all([
        axios.get(`${API}/auctions/${eventId}/registrations`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/auctions/${eventId}/players`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/auctions/${eventId}/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/auctions/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setRegistrations(registrationsRes.data);
      setPlayers(playersRes.data);
      setCategories(categoriesRes.data);
      setEvent(eventRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = (statusFilter) => {
    try {
      toast.info('Generating Excel...');
      const filename = exportRegistrationsToExcel(registrations, players, categories, event, statusFilter);
      toast.success(`Excel exported: ${filename}`);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      toast.error(error.message || 'Failed to export Excel');
    }
  };

  const handleExportAllExcel = () => {
    try {
      toast.info('Generating Excel with all sheets...');
      const filename = exportAllToExcel(registrations, players, categories, event);
      toast.success(`Excel exported: ${filename}`);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      toast.error(error.message || 'Failed to export Excel');
    }
  };

  const handleExportPDF = async (statusFilter) => {
    try {
      toast.info('Generating PDF...');
      await generateRegistrationsPDF(registrations, event, statusFilter);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
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
    const basePrice = selectedCategory ? selectedCategory.base_price : '';

    if (isBulk) {
      setBulkCategory(categoryId);
      setBulkBasePrice(basePrice.toString());

      if (selectedCategory) {
        toast.info(`Base price auto-filled to ₹${basePrice.toLocaleString()} (category base price)`);
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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setUploadFile(file);
      setUploadResults(null);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await axios.post(
        `${API}/auctions/${eventId}/bulk-upload-players`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setUploadResults(response.data);

      if (response.data.created_count > 0) {
        toast.success(`Successfully uploaded ${response.data.created_count} players!`);
        fetchData(); // Refresh the player list
      }

      if (response.data.error_count > 0) {
        toast.warning(`${response.data.error_count} rows had errors. Check the results below.`);
      }

      // Clear the file input
      setUploadFile(null);
    } catch (error) {
      console.error('Bulk upload failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload players');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    // Create sample data
    const sampleData = [
      {
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@example.com',
        position: 'Forward',
        specialty: 'Striker',
        photo_url: 'https://drive.google.com/open?id=1OO-3zEgPBsOhDrfLhynaB2Zz6cwus1Nu',
        age: 25,
        previous_team: 'Team A'
      },
      {
        name: 'Jane Smith',
        phone: '9876543211',
        email: 'jane@example.com',
        position: 'Midfielder',
        specialty: 'Playmaker',
        photo_url: '',
        age: 23,
        previous_team: ''
      }
    ];

    // Convert to CSV format (Excel can open CSV files)
    const headers = Object.keys(sampleData[0]).join(',');
    const rows = sampleData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'player_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Template downloaded! You can open it in Excel.');
  };

  const handlePlayerSelect = (playerId, checked) => {
    if (checked) {
      setSelectedPlayers([...selectedPlayers, playerId]);
    } else {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    }
  };

  const handleSelectAllPlayers = (checked) => {
    if (checked) {
      const allPlayerIds = players.map(player => player.id);
      setSelectedPlayers(allPlayerIds);
    } else {
      setSelectedPlayers([]);
    }
  };

  const handleBulkDeletePlayers = async () => {
    if (selectedPlayers.length === 0) {
      toast.error('No players selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedPlayers.length} player(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const deletePromises = selectedPlayers.map(playerId =>
        axios.delete(`${API}/players/${playerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      await Promise.all(deletePromises);
      toast.success(`Successfully deleted ${selectedPlayers.length} player(s)`);
      setSelectedPlayers([]);
      fetchData(); // Refresh the player list
    } catch (error) {
      console.error('Failed to delete players:', error);
      toast.error('Failed to delete some players');
    } finally {
      setIsDeleting(false);
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
          <div className="flex space-x-3">
            <Button
              size="lg"
              variant="outline"
              className="bg-green-600/80 border-green-500 text-white hover:bg-green-700"
              onClick={handleExportAllExcel}
              disabled={registrations.length === 0 && players.length === 0}
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Export All to Excel
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => handleExportPDF('all')}
              disabled={registrations.length === 0}
            >
              <Download className="w-5 h-5 mr-2" />
              Export PDF
            </Button>
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
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-white flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Pending Registrations
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-600/80 border-green-500 text-white hover:bg-green-700"
                      onClick={() => handleExportExcel('pending_approval')}
                      disabled={pendingRegistrations.length === 0}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleExportPDF('pending_approval')}
                      disabled={pendingRegistrations.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  {selectedRegistrations.length > 0 && (
                    <div className="flex items-center space-x-4">
                      <Select value={bulkCategory} onValueChange={(value) => handleCategoryChange(value, true)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name} (₹{category.base_price?.toLocaleString()})
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
                            Base Price: ₹{categories.find(c => c.id === bulkCategory)?.base_price?.toLocaleString()}
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
                            src={convertGoogleDriveUrl(registration.photo_url)}
                            alt={registration.name}
                            className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}

                        <div className="text-sm text-gray-700 mb-3">
                          {registration.email && <div>📧 {registration.email}</div>}
                          {registration.contact_number && <div>📱 {registration.contact_number}</div>}
                          {registration.district && <div>📍 {registration.district}</div>}
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
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Approved Registrations
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-600/80 border-green-500 text-white hover:bg-green-700"
                      onClick={() => handleExportExcel('approved')}
                      disabled={approvedRegistrations.length === 0}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleExportPDF('approved')}
                      disabled={approvedRegistrations.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
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
                            src={convertGoogleDriveUrl(registration.photo_url)}
                            alt={registration.name}
                            className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}

                        <div className="text-sm text-white/90 mb-3">
                          {registration.email && <div>📧 {registration.email}</div>}
                          {registration.contact_number && <div>📱 {registration.contact_number}</div>}
                          {registration.district && <div>📍 {registration.district}</div>}
                          {registration.previous_team && <div>🏆 {registration.previous_team}</div>}
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
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-white flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Active Players
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-600/80 border-green-500 text-white hover:bg-green-700"
                      onClick={() => handleExportExcel('players')}
                      disabled={players.length === 0}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                  <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Bulk Upload Players
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center text-xl">
                          <Upload className="w-6 h-6 mr-2" />
                          Bulk Upload Players from Excel
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-6 py-4">
                        {/* Instructions */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-semibold text-blue-900 mb-2">📋 Excel Format Requirements:</h3>
                          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                            <li><strong>Required columns:</strong> name, phone, email, position, specialty</li>
                            <li><strong>Optional columns:</strong> photo_url, age, previous_team, category_id, base_price</li>
                            <li><strong>Photo URL:</strong> Can be Google Drive link (e.g., https://drive.google.com/open?id=FILE_ID)</li>
                            <li>If category_id or base_price is not provided, default category will be used</li>
                          </ul>
                        </div>

                        {/* Download Template Button */}
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            onClick={downloadSampleTemplate}
                            className="w-full max-w-md"
                          >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Download Sample Template
                          </Button>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                          <Label htmlFor="excel-file" className="text-base font-semibold">
                            Upload Excel File
                          </Label>
                          <Input
                            id="excel-file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            disabled={isUploading}
                            className="cursor-pointer"
                          />
                          {uploadFile && (
                            <p className="text-sm text-green-600 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Selected: {uploadFile.name}
                            </p>
                          )}
                        </div>

                        {/* Upload Button */}
                        <Button
                          onClick={handleBulkUpload}
                          disabled={!uploadFile || isUploading}
                          className="w-full"
                        >
                          {isUploading ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Players
                            </>
                          )}
                        </Button>

                        {/* Upload Results */}
                        {uploadResults && (
                          <div className="mt-6 space-y-4">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <h3 className="font-semibold text-gray-900 mb-3">Upload Results</h3>

                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                                  <p className="text-2xl font-bold text-green-700">{uploadResults.created_count}</p>
                                  <p className="text-sm text-green-600">Players Created</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
                                  <p className="text-2xl font-bold text-red-700">{uploadResults.error_count}</p>
                                  <p className="text-sm text-red-600">Errors</p>
                                </div>
                              </div>

                              {uploadResults.errors && uploadResults.errors.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
                                  <div className="max-h-40 overflow-y-auto space-y-2">
                                    {uploadResults.errors.map((error, index) => (
                                      <div key={index} className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                                        <p className="font-medium text-red-900">Row {error.row}: {error.name}</p>
                                        <p className="text-red-700">{error.error}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {uploadResults.created_players && uploadResults.created_players.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-semibold text-green-800 mb-2">
                                    Successfully Created Players ({uploadResults.created_players.length}):
                                  </h4>
                                  <div className="max-h-40 overflow-y-auto">
                                    <ul className="text-sm text-gray-700 space-y-1">
                                      {uploadResults.created_players.slice(0, 10).map((player, index) => (
                                        <li key={index} className="flex items-center">
                                          <CheckCircle className="w-3 h-3 mr-2 text-green-600" />
                                          {player.name}
                                        </li>
                                      ))}
                                      {uploadResults.created_players.length > 10 && (
                                        <li className="text-gray-500 italic">
                                          ... and {uploadResults.created_players.length - 10} more
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Bulk Actions Toolbar */}
                {players.length > 0 && (
                  <div className="mb-4 flex items-center justify-between bg-white/10 border-white/20 rounded-lg p-3">
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        id="select-all-players"
                        checked={selectedPlayers.length === players.length && players.length > 0}
                        onCheckedChange={handleSelectAllPlayers}
                        className="border-white/40"
                      />
                      <label
                        htmlFor="select-all-players"
                        className="text-sm text-white font-medium cursor-pointer"
                      >
                        Select All ({selectedPlayers.length} of {players.length})
                      </label>
                    </div>
                    {selectedPlayers.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDeletePlayers}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Selected ({selectedPlayers.length})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => (
                    <Card key={player.id} className="bg-white/95 backdrop-blur-sm border-white/30 relative">
                      <CardContent className="p-4">
                        {/* Checkbox in top-right corner */}
                        <div className="absolute top-2 right-2">
                          <Checkbox
                            id={`player-${player.id}`}
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={(checked) => handlePlayerSelect(player.id, checked)}
                            className="border-gray-400"
                          />
                        </div>

                        <div className="text-center">
                          {player.photo_url ? (
                            <div className="relative w-20 h-20 mx-auto mb-3">
                              <img
                                src={convertGoogleDriveUrl(player.photo_url)}
                                alt={player.name}
                                className="w-20 h-20 rounded-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  console.log('Image load error for:', player.name, player.photo_url);
                                  // Try alternative URL format
                                  const fileIdMatch = player.photo_url.match(/id=([a-zA-Z0-9_-]+)/);
                                  if (fileIdMatch && !e.target.dataset.retried) {
                                    e.target.dataset.retried = 'true';
                                    // Try lh3.googleusercontent.com format (better CORS support)
                                    const altUrl = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
                                    console.log('Retrying with alternative URL:', altUrl);
                                    e.target.src = altUrl;
                                  } else if (fileIdMatch && !e.target.dataset.retriedSecond) {
                                    // Try uc?export=view format
                                    e.target.dataset.retriedSecond = 'true';
                                    const altUrl2 = `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
                                    console.log('Retrying with second alternative URL:', altUrl2);
                                    e.target.src = altUrl2;
                                  } else {
                                    // Show placeholder after all attempts
                                    console.log('All formats failed, showing placeholder');
                                    e.target.style.display = 'none';
                                    if (e.target.nextElementSibling) {
                                      e.target.nextElementSibling.style.display = 'flex';
                                    }
                                  }
                                }}
                                onLoad={() => {
                                  console.log('Image loaded successfully:', player.name);
                                }}
                              />
                              <div
                                className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-2xl"
                                style={{ display: 'none' }}
                              >
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <h3 className="font-semibold text-gray-800 mb-1">{player.name}</h3>
                          <p className="text-sm text-gray-600 mb-1">
                            Base Price: ₹{player.base_price?.toLocaleString()}
                          </p>
                          {player.contact_number && (
                            <p className="text-sm text-gray-600 mb-2">
                              📱 {player.contact_number}
                            </p>
                          )}
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
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    Rejected Registrations
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-600/80 border-green-500 text-white hover:bg-green-700"
                      onClick={() => handleExportExcel('rejected')}
                      disabled={rejectedRegistrations.length === 0}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleExportPDF('rejected')}
                      disabled={rejectedRegistrations.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
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
                      src={convertGoogleDriveUrl(viewingRegistration.photo_url)}
                      alt={viewingRegistration.name}
                      className="w-20 h-20 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
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
                      {viewingRegistration.district && <p>📍 {viewingRegistration.district}</p>}
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

                {viewingRegistration.identity_proof_url && (
                  <div>
                    <Label className="font-semibold">Identity Proof</Label>
                    {viewingRegistration.identity_proof_url.toLowerCase().includes('.pdf') ||
                      viewingRegistration.identity_proof_url.includes('firebasestorage') && viewingRegistration.identity_proof_url.includes('%2F') ? (
                      <div className="mt-2 space-y-3">
                        {/* Embedded PDF Viewer - Firebase URLs work directly */}
                        <div className="border rounded-lg overflow-hidden bg-gray-100">
                          {viewingRegistration.identity_proof_url.includes('firebasestorage') ? (
                            <iframe
                              src={viewingRegistration.identity_proof_url}
                              className="w-full h-80"
                              title="Identity Proof PDF"
                              frameBorder="0"
                            />
                          ) : (
                            <iframe
                              src={`https://docs.google.com/gview?url=${encodeURIComponent(viewingRegistration.identity_proof_url)}&embedded=true`}
                              className="w-full h-80"
                              title="Identity Proof PDF"
                              frameBorder="0"
                            />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(viewingRegistration.identity_proof_url, '_blank')}
                          >
                            🔗 Open in New Tab
                          </Button>
                          <a
                            href={viewingRegistration.identity_proof_url}
                            download
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                            >
                              📥 Download PDF
                            </Button>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <a
                          href={convertGoogleDriveUrl(viewingRegistration.identity_proof_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={convertGoogleDriveUrl(viewingRegistration.identity_proof_url)}
                            alt="Identity Proof"
                            className="w-48 h-auto border rounded-lg hover:opacity-80 transition-opacity"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                )}

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
                              {category.name} (₹{category.base_price?.toLocaleString()})
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
                            Base Price: ₹{categories.find(c => c.id === bulkCategory)?.base_price?.toLocaleString()}
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

      {/* Floating Menu */}
      <FloatingMenu />
    </div>
  );
};

export default PlayerRegistrationManagement;
