import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Tags, Edit, Trash2, Folder } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CategoryManagement = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [event, setEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    min_players: '',
    max_players: '',
    color: '#3B82F6',
    base_price_min: '',
    base_price_max: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API}/events/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Failed to fetch event:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/events/${eventId}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const categoryData = {
        ...formData,
        event_id: eventId,
        min_players: parseInt(formData.min_players) || 1,
        max_players: parseInt(formData.max_players) || 50,
        base_price_min: parseInt(formData.base_price_min) || 10000,
        base_price_max: parseInt(formData.base_price_max) || 1000000,
      };

      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}`, categoryData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Category updated successfully!');
      } else {
        await axios.post(`${API}/categories`, categoryData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Category added successfully!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      min_players: category.min_players?.toString() || '',
      max_players: category.max_players?.toString() || '',
      color: category.color || '#3B82F6',
      base_price_min: category.base_price_min?.toString() || '',
      base_price_max: category.base_price_max?.toString() || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This will also delete all players in this category.')) return;

    try {
      await axios.delete(`${API}/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Category deleted successfully!');
      fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      min_players: '',
      max_players: '',
      color: '#3B82F6',
      base_price_min: '',
      base_price_max: ''
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">PowerAuctions - Category Management</h1>
          {event && (
            <p className="text-white/80">Managing categories for: <span className="font-semibold">{event.name}</span></p>
          )}
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="text-white/60">
            <p>Categories define player types (e.g., Batsmen, Bowlers, All-rounders)</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-white text-purple-700 hover:bg-white/90"
                onClick={resetForm}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Batsmen, Bowlers, All-rounders"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_players">Min Players *</Label>
                    <Input
                      id="min_players"
                      type="number"
                      value={formData.min_players}
                      onChange={(e) => handleChange('min_players', e.target.value)}
                      placeholder="e.g., 1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_players">Max Players *</Label>
                    <Input
                      id="max_players"
                      type="number"
                      value={formData.max_players}
                      onChange={(e) => handleChange('max_players', e.target.value)}
                      placeholder="e.g., 50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="color">Category Color *</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="base_price_min">Min Base Price (₹) *</Label>
                    <Input
                      id="base_price_min"
                      type="number"
                      value={formData.base_price_min}
                      onChange={(e) => handleChange('base_price_min', e.target.value)}
                      placeholder="e.g., 50000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="base_price_max">Max Base Price (₹) *</Label>
                    <Input
                      id="base_price_max"
                      type="number"
                      value={formData.base_price_max}
                      onChange={(e) => handleChange('base_price_max', e.target.value)}
                      placeholder="e.g., 500000"
                      required
                    />
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
                    {loading ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Tags className="w-5 h-5 mr-2" />
              Categories ({categories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/60 text-lg">No categories added yet</p>
                <p className="text-white/40 text-sm mt-2">Add categories to organize your players</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <Card key={category.id} className="bg-white/10 border-white/20">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div 
                              className="w-4 h-4 rounded-full mr-2" 
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <h3 className="text-white font-semibold text-lg">{category.name}</h3>
                          </div>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-white/80">
                        <div className="flex justify-between">
                          <span>Player Range:</span>
                          <span>{category.min_players} - {category.max_players}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min Price:</span>
                          <span>₹{category.base_price_min?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Price:</span>
                          <span>₹{category.base_price_max?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/20 pt-2 mt-2">
                          <span>Players:</span>
                          <Badge variant="secondary" className="text-xs">
                            {category.player_count || 0}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CategoryManagement;
