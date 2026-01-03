import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Edit, Trash2, User, Unlock, RotateCcw, Search, Filter, Download } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import FloatingMenu from '@/components/FloatingMenu';
import { convertGoogleDriveUrl } from '@/utils/imageUtils';
import jsPDF from 'jspdf';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlayerManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [event, setEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    base_price: '',
    age: '',
    position: '',
    specialty: '',
    previous_team: '',
    photo_url: '',
    cricheroes_link: '',
    contact_number: '',
    stats: {
      matches: '',
      runs: '',
      wickets: '',
      goals: '',
      assists: ''
    }
  });

  useEffect(() => {
    fetchEvent();
    fetchPlayers();
    fetchCategories();
    fetchTeams();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to fetch event details');
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Failed to fetch players:', error);
      toast.error('Failed to load players');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/auctions/${eventId}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API}/teams/event/${eventId}`);
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const playerData = {
        ...formData,
        base_price: parseInt(formData.base_price),
        age: formData.age ? parseInt(formData.age) : null,
        stats: {
          matches: formData.stats.matches ? parseInt(formData.stats.matches) : null,
          runs: formData.stats.runs ? parseInt(formData.stats.runs) : null,
          wickets: formData.stats.wickets ? parseInt(formData.stats.wickets) : null,
          goals: formData.stats.goals ? parseInt(formData.stats.goals) : null,
          assists: formData.stats.assists ? parseInt(formData.stats.assists) : null,
        }
      };

      if (editingPlayer) {
        await axios.put(`${API}/players/${editingPlayer.id}`, playerData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Player updated successfully!');
      } else {
        await axios.post(`${API}/players`, playerData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Player added successfully!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save player');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      category_id: player.category_id,
      base_price: player.base_price.toString(),
      age: player.age?.toString() || '',
      position: player.position || '',
      specialty: player.specialty || '',
      previous_team: player.previous_team || '',
      photo_url: player.photo_url || '',
      cricheroes_link: player.cricheroes_link || '',
      contact_number: player.contact_number || '',
      stats: {
        matches: player.stats?.matches?.toString() || '',
        runs: player.stats?.runs?.toString() || '',
        wickets: player.stats?.wickets?.toString() || '',
        goals: player.stats?.goals?.toString() || '',
        assists: player.stats?.assists?.toString() || ''
      }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      await axios.delete(`${API}/players/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Player deleted successfully!');
      fetchPlayers();
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  const handleReleasePlayer = async (player) => {
    const teamName = getTeamName(player.sold_to_team_id);
    if (!confirm(`Are you sure you want to release ${player.name} from ${teamName}? This will refund ₹${player.sold_price?.toLocaleString()} to the team.`)) return;

    try {
      await axios.post(`${API}/players/${player.id}/release`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${player.name} released successfully! Budget refunded to ${teamName}.`);
      fetchPlayers();
      fetchTeams(); // Refresh teams to update budgets
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release player');
    }
  };

  const handleMakeAvailable = async (player) => {
    if (!confirm(`Are you sure you want to make ${player.name} available for bidding? This will remove them from the current auction slot.`)) return;

    try {
      await axios.post(`${API}/players/${player.id}/make-available`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${player.name} is now available for bidding again!`);
      fetchPlayers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to make player available');
    }
  };

  const resetForm = () => {
    setEditingPlayer(null);
    setFormData({
      name: '',
      category_id: '',
      base_price: '',
      age: '',
      position: '',
      specialty: '',
      previous_team: '',
      photo_url: '',
      cricheroes_link: '',
      contact_number: '',
      stats: {
        matches: '',
        runs: '',
        wickets: '',
        goals: '',
        assists: ''
      }
    });
  };

  const handleChange = (field, value) => {
    if (field.startsWith('stats.')) {
      const statField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        stats: { ...prev.stats, [statField]: value }
      }));
    } else if (field === 'category_id') {
      // Auto-fill base price when category changes
      const selectedCategory = categories.find(c => c.id === value);
      const basePrice = selectedCategory ? selectedCategory.base_price : '';

      setFormData(prev => ({
        ...prev,
        [field]: value,
        base_price: basePrice.toString()
      }));

      if (selectedCategory) {
        toast.info(`Base price auto-filled to ₹${basePrice.toLocaleString()} (category base price)`);
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getCategoryBasePrice = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';
    return `₹${category.base_price?.toLocaleString()}`;
  };

  // Filter and search players
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.previous_team?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || player.category_id === selectedCategory;

    const matchesStatus = selectedStatus === 'all' || player.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const generatePlayerCardsPDF = async () => {
    try {
      const playersToExport = filteredPlayers.length > 0 ? filteredPlayers : players;
      toast.info(`Loading ${playersToExport.length} player images...`);

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Card dimensions - calculate based on actual content height needed
      const cardsPerRow = 4;
      const rowsPerPage = 6;
      const cardWidth = (pageWidth - 20) / cardsPerRow; // 20mm for margins
      const cardHeight = 35; // Fixed height of 35mm
      const margin = 10;
      const cardPadding = 2;
      const headerHeight = 25; // Space for logo and title
      const marginTop = headerHeight + 5; // Top margin after header
      const gapBetweenRows = 3; // Small gap between rows

      // Helper function to load logo
      const loadLogo = () => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
              const base64 = canvas.toDataURL('image/png');
              resolve(base64);
            } catch (e) {
              console.error('Error converting logo:', e);
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = '/images/sports/logo-transparent.png'; // Use transparent logo
        });
      };

      // Helper function to load event logo
      const loadEventLogo = (logoUrl) => {
        if (!logoUrl) return Promise.resolve(null);

        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
              const base64 = canvas.toDataURL('image/png', 0.8);
              resolve(base64);
            } catch (e) {
              console.error('Error converting event logo:', e);
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = logoUrl;
        });
      };

      // Load logos
      const logoData = await loadLogo();
      const eventLogoData = event?.logo_url ? await loadEventLogo(event.logo_url) : null;

      // Helper function to sleep/delay
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      // Helper function to load image as base64 with timeout
      const loadImageAsBase64 = (url, timeout = 5000) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          const timeoutId = setTimeout(() => {
            img.src = ''; // Cancel loading
            resolve(null);
          }, timeout);

          img.onload = () => {
            clearTimeout(timeoutId);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
              const base64 = canvas.toDataURL('image/jpeg', 0.6);
              resolve(base64);
            } catch (e) {
              console.error('Error converting image:', e);
              resolve(null);
            }
          };

          img.onerror = () => {
            clearTimeout(timeoutId);
            resolve(null);
          };

          img.src = url;
        });
      };

      // Pre-load all images with delays to avoid rate limiting
      const imageCache = {};
      for (let i = 0; i < playersToExport.length; i++) {
        const player = playersToExport[i];
        if (player.photo_url) {
          try {
            // Use smaller image size to reduce load
            const convertedUrl = convertGoogleDriveUrl(player.photo_url).replace('=w400', '=w200');
            const imageData = await loadImageAsBase64(convertedUrl);
            imageCache[player.id] = imageData;

            // Add delay after each image to avoid rate limiting (except last one)
            if (i < playersToExport.length - 1) {
              await sleep(1000); // 1 second delay between each image
            }
          } catch (error) {
            console.error('Error loading image for', player.name, error);
            imageCache[player.id] = null;
          }
        }
      }

      toast.info('Generating PDF...');

      // Function to draw header on each page
      const drawHeader = () => {
        let currentX = margin;

        // Add PowerAuction logo (left side)
        if (logoData) {
          const logoWidth = 18;
          const logoHeight = 14;
          doc.addImage(logoData, 'PNG', currentX, 5, logoWidth, logoHeight);
          currentX += logoWidth + 3;
        }

        // Add event logo (after PowerAuction logo)
        if (eventLogoData) {
          const eventLogoWidth = 16;
          const eventLogoHeight = 14;
          doc.addImage(eventLogoData, 'PNG', currentX, 5, eventLogoWidth, eventLogoHeight);
          currentX += eventLogoWidth + 5;
        }

        // Add titles
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(102, 45, 145); // Purple color
        const mainTitle = event?.name || 'PowerAuction';
        doc.text(mainTitle, currentX, 10, { align: 'left' });

        // Add subtitle
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Player Cards', currentX, 15, { align: 'left' });

        // Add date on the right side
        const dateText = new Date().toLocaleDateString();
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(dateText, pageWidth - margin, 12, { align: 'right' });

        // Add horizontal line below header
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, headerHeight - 2, pageWidth - margin, headerHeight - 2);
      };

      // Draw header on first page
      drawHeader();

      for (let i = 0; i < playersToExport.length; i++) {
        const player = playersToExport[i];

        // Calculate position on page
        const cardIndex = i % (cardsPerRow * rowsPerPage);
        const row = Math.floor(cardIndex / cardsPerRow);
        const col = cardIndex % cardsPerRow;

        // Add new page if needed
        if (i > 0 && cardIndex === 0) {
          doc.addPage();
          drawHeader(); // Add header to new page
        }

        const x = margin + col * cardWidth;
        const y = marginTop + row * (cardHeight + gapBetweenRows); // Use fixed height + gap

        // Draw card border with rounded corners
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2);

        // Add player photo if available
        const photoY = y + cardPadding + 1;
        const photoSize = 18; // 18mm square photo
        const photoX = x + (cardWidth - photoSize) / 2;

        // Use cached image or draw placeholder
        const imageData = imageCache[player.id];
        if (imageData) {
          // Add subtle shadow effect
          doc.setFillColor(240, 240, 240);
          doc.roundedRect(photoX + 0.5, photoY + 0.5, photoSize, photoSize, 1, 1, 'F');
          doc.addImage(imageData, 'JPEG', photoX, photoY, photoSize, photoSize);
        } else {
          // Draw placeholder circle with initial
          doc.setFillColor(128, 90, 213); // Purple
          doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(13);
          doc.setFont(undefined, 'bold');
          doc.text(player.name.charAt(0).toUpperCase(), photoX + photoSize / 2, photoY + photoSize / 2 + 2.8, { align: 'center' });
        }

        // Player name
        const textStartY = photoY + photoSize + 4;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8.5);
        doc.setFont(undefined, 'bold');
        const nameLines = doc.splitTextToSize(player.name, cardWidth - 2 * cardPadding);
        doc.text(nameLines, x + cardWidth / 2, textStartY, { align: 'center', maxWidth: cardWidth - 2 * cardPadding });

        // Position
        let currentY = textStartY + (nameLines.length * 3);
        if (player.position) {
          doc.setFontSize(7);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(80, 80, 80);
          doc.text(player.position, x + cardWidth / 2, currentY, { align: 'center', maxWidth: cardWidth - 2 * cardPadding });
          currentY += 2.5;
        }

        // Specialty
        if (player.specialty) {
          doc.setFontSize(7);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(100, 100, 100);
          const specialtyLines = doc.splitTextToSize(player.specialty, cardWidth - 2 * cardPadding);
          doc.text(specialtyLines, x + cardWidth / 2, currentY, { align: 'center', maxWidth: cardWidth - 2 * cardPadding });
          currentY += (specialtyLines.length * 2.5);
        }

        // Mobile Number
        if (player.contact_number) {
          doc.setFontSize(6.5);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(player.contact_number, x + cardWidth / 2, currentY, { align: 'center', maxWidth: cardWidth - 2 * cardPadding });
        }
      }

      // Save the PDF
      const isFiltered = searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all';
      const statusText = selectedStatus !== 'all' ? `-${selectedStatus}` : '';
      const fileName = `players${statusText}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      const filterMessage = isFiltered ? ' (filtered results)' : '';
      toast.success(`PDF generated with ${playersToExport.length} players${filterMessage}!`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">PowerAuctions - Player Management</h1>
          <div className="flex gap-3">
            <Button
              onClick={generatePlayerCardsPDF}
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={players.length === 0}
              title={filteredPlayers.length < players.length ? `Export ${filteredPlayers.length} filtered players` : `Export all ${players.length} players`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF {filteredPlayers.length < players.length && `(${filteredPlayers.length})`}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              console.log('Player Dialog state changing to:', open);
              setIsDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button
                  className="bg-white text-purple-700 hover:bg-white/90"
                  onClick={() => {
                    console.log('Add Player button clicked');
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Player
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPlayer ? 'Edit Player' : 'Add New Player'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Player Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formData.category_id} onValueChange={(value) => handleChange('category_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="base_price">Base Price (₹) *</Label>
                      <Input
                        id="base_price"
                        type="number"
                        value={formData.base_price}
                        onChange={(e) => handleChange('base_price', e.target.value)}
                        required
                      />
                      {formData.category_id && (
                        <p className="text-xs text-gray-500 mt-1">
                          Category base price: {getCategoryBasePrice(formData.category_id)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => handleChange('age', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => handleChange('position', e.target.value)}
                        placeholder="e.g., Batsman, Forward"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="specialty">Specialty</Label>
                      <Input
                        id="specialty"
                        value={formData.specialty}
                        onChange={(e) => handleChange('specialty', e.target.value)}
                        placeholder="e.g., Right-hand bat, Left-foot"
                      />
                    </div>
                    <div>
                      <Label htmlFor="previous_team">Previous Team</Label>
                      <Input
                        id="previous_team"
                        value={formData.previous_team}
                        onChange={(e) => handleChange('previous_team', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cricheroes_link">CricHeroes Profile Link</Label>
                      <Input
                        id="cricheroes_link"
                        value={formData.cricheroes_link}
                        onChange={(e) => handleChange('cricheroes_link', e.target.value)}
                        placeholder="https://cricheroes.com/profile/..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_number">Mobile Number</Label>
                      <Input
                        id="contact_number"
                        value={formData.contact_number}
                        onChange={(e) => handleChange('contact_number', e.target.value)}
                        placeholder="e.g., +91 98765 43210"
                      />
                    </div>
                  </div>

                  <ImageUpload
                    label="Player Photo"
                    value={formData.photo_url}
                    onChange={(url) => handleChange('photo_url', url)}
                    placeholder="Upload player photo or enter URL"
                    sampleType={{ type: 'players', subtype: 'photos' }}
                  />

                  <div>
                    <Label>Player Statistics</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <Label htmlFor="matches">Matches</Label>
                        <Input
                          id="matches"
                          type="number"
                          value={formData.stats.matches}
                          onChange={(e) => handleChange('stats.matches', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="runs">Runs/Goals</Label>
                        <Input
                          id="runs"
                          type="number"
                          value={formData.stats.runs || formData.stats.goals}
                          onChange={(e) => handleChange('stats.runs', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="wickets">Wickets/Assists</Label>
                        <Input
                          id="wickets"
                          type="number"
                          value={formData.stats.wickets || formData.stats.assists}
                          onChange={(e) => handleChange('stats.wickets', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : editingPlayer ? 'Update Player' : 'Add Player'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Section */}
        <Card className="glass border-white/20 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                  <Input
                    type="text"
                    placeholder="Search by name, position, or previous team..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="md:w-64">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="md:w-48">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="unsold">Unsold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Results Count */}
            {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
              <div className="mt-3 text-white/80 text-sm">
                Showing {filteredPlayers.length} of {players.length} players
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Players ({filteredPlayers.length})</span>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
                  Available: {filteredPlayers.filter(p => p.status === 'available').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>
                  Current: {filteredPlayers.filter(p => p.status === 'current').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
                  Sold: {filteredPlayers.filter(p => p.status === 'sold').length}
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-400 mr-1"></span>
                  Unsold: {filteredPlayers.filter(p => p.status === 'unsold').length}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No players added yet</p>
                <p className="text-white/40 text-sm mt-2">Add players to start the auction</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No players found</p>
                <p className="text-white/40 text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlayers.map((player) => (
                  <Card key={player.id} className="bg-white/10 border-white/20">
                    <CardContent className="p-4">
                      {player.photo_url ? (
                        <div className="flex justify-center mb-4">
                          <div className="relative w-20 h-20">
                            <img
                              src={convertGoogleDriveUrl(player.photo_url)}
                              alt={`${player.name} photo`}
                              className="w-20 h-20 rounded-xl object-cover border-2 border-white/30 shadow-lg bg-white/10 p-1"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                // Try alternative URL format
                                const fileIdMatch = player.photo_url.match(/id=([a-zA-Z0-9_-]+)/);
                                if (fileIdMatch && !e.target.dataset.retried) {
                                  e.target.dataset.retried = 'true';
                                  e.target.src = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
                                } else if (fileIdMatch && !e.target.dataset.retriedSecond) {
                                  e.target.dataset.retriedSecond = 'true';
                                  e.target.src = `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
                                } else {
                                  // Show placeholder
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }
                              }}
                            />
                            <div
                              className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30 shadow-lg"
                              style={{ display: 'none' }}
                            >
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center mb-4">
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30 shadow-lg">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}
                      <div className="mb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-center flex-1">
                            <h3 className="text-white font-bold text-lg mb-1">{player.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryName(player.category_id)}
                            </Badge>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              onClick={() => handleEdit(player)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30"
                              onClick={() => handleDelete(player.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-white/80">
                        <div>Base Price: ₹{player.base_price?.toLocaleString()}</div>
                        {player.position && <div>Position: {player.position}</div>}
                        {player.age && <div>Age: {player.age}</div>}
                        {player.previous_team && <div>Previous: {player.previous_team}</div>}
                        {player.contact_number && <div>Mobile: {player.contact_number}</div>}

                        {/* Player Status */}
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${player.status === 'available' ? 'bg-green-400' :
                            player.status === 'sold' ? 'bg-blue-400' :
                              player.status === 'current' ? 'bg-yellow-400' :
                                'bg-gray-400'
                            }`}></span>
                          {player.status?.replace('_', ' ').toUpperCase()}
                        </div>

                        {/* Current Player Information */}
                        {player.status === 'current' && (
                          <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
                            <div className="font-semibold text-yellow-300 mb-2">Currently in Auction:</div>
                            <div>This player is currently being auctioned</div>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-green-500/20 border-green-400/40 text-green-300 hover:bg-green-500/30"
                                onClick={() => handleMakeAvailable(player)}
                                title="Make player available for future bidding"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Make Available
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Sold Player Information */}
                        {player.status === 'sold' && (
                          <div className="mt-3 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                            <div className="font-semibold text-blue-300 mb-2">Sold Details:</div>
                            <div>Team: {getTeamName(player.sold_to_team_id)}</div>
                            <div>Sold Price: ₹{player.sold_price?.toLocaleString()}</div>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-yellow-500/20 border-yellow-400/40 text-yellow-300 hover:bg-yellow-500/30"
                                onClick={() => handleReleasePlayer(player)}
                                title="Release player back to auction pool"
                              >
                                <Unlock className="w-3 h-3 mr-1" />
                                Release Player
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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

export default PlayerManagement;
