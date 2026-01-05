import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Filter, Mail, Phone, Calendar, Shield, ArrowLeft, Edit, Trash2, Plus, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import FloatingMenu from '@/components/FloatingMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserManagement = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    display_name: '',
    mobile_number: '',
    role: 'event_organizer'
  });
  const [createFormData, setCreateFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    mobile_number: '',
    role: 'event_organizer'
  });

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsers(response.data);
      console.log('Users loaded successfully:', response.data.length);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error(error.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!token) return;

    // Validation
    if (!createFormData.email || !createFormData.password || !createFormData.display_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (createFormData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await axios.post(`${API}/auth/users/create`, createFormData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('User created successfully!');
      setIsCreateDialogOpen(false);
      setCreateFormData({
        email: '',
        password: '',
        display_name: '',
        mobile_number: '',
        role: 'event_organizer'
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditFormData({
      display_name: user.display_name || '',
      mobile_number: user.mobile_number || '',
      role: user.role || 'event_organizer'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !token) return;

    try {
      await axios.put(`${API}/auth/users/${editingUser.id}`, editFormData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('User updated successfully!');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.display_name || user.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/auth/users/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('User deleted successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mobile_number?.includes(searchQuery);

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500/20 text-red-300 border-red-400/40';
      case 'event_organizer':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/40';
      case 'team_admin':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/40';
      case 'auctioneer':
        return 'bg-green-500/20 text-green-300 border-green-400/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-400/40';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const roleStats = {
    total: users.length,
    super_admin: users.filter(u => u.role === 'super_admin').length,
    event_organizer: users.filter(u => u.role === 'event_organizer').length,
    team_admin: users.filter(u => u.role === 'team_admin').length,
    auctioneer: users.filter(u => u.role === 'auctioneer').length,
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            className="mb-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
              <p className="text-white/80">Manage all registered users and their roles</p>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create New User
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Users</p>
                <h3 className="text-3xl font-bold text-white">{roleStats.total}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-white/60 text-sm">Super Admins</p>
                <h3 className="text-3xl font-bold text-red-300">{roleStats.super_admin}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-white/60 text-sm">Organizers</p>
                <h3 className="text-3xl font-bold text-purple-300">{roleStats.event_organizer}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-white/60 text-sm">Team Admins</p>
                <h3 className="text-3xl font-bold text-blue-300">{roleStats.team_admin}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-white/60 text-sm">Auctioneers</p>
                <h3 className="text-3xl font-bold text-green-300">{roleStats.auctioneer}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass border-white/20 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
                  <Input
                    placeholder="Search by name, email, or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="event_organizer">Event Organizer</SelectItem>
                    <SelectItem value="team_admin">Team Admin</SelectItem>
                    <SelectItem value="auctioneer">Auctioneer</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                All Users
              </span>
              <span className="text-sm font-normal text-white/60">
                Showing {filteredUsers.length} of {users.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white/60">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-lg">
                  {searchQuery || roleFilter !== 'all' ? 'No users found matching your filters' : 'No users registered yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/10 rounded-lg border border-white/10 hover:bg-white/15 transition-all gap-4"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mr-4 flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {user.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-lg truncate">
                          {user.display_name || 'Unknown User'}
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center text-white/60 text-sm">
                            <Mail className="w-3 h-3 mr-2 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.mobile_number && (
                            <div className="flex items-center text-white/50 text-sm">
                              <Phone className="w-3 h-3 mr-2 flex-shrink-0" />
                              <span>{user.mobile_number}</span>
                            </div>
                          )}
                          {user.created_at && (
                            <div className="flex items-center text-white/50 text-xs">
                              <Calendar className="w-3 h-3 mr-2 flex-shrink-0" />
                              <span>Joined {formatDate(user.created_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge className={`${getRoleBadgeColor(user.role)} border`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role?.replace('_', ' ').toUpperCase() || 'USER'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                        className="bg-blue-500/20 border-blue-400/40 text-blue-300 hover:bg-blue-500/30"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteUser(user)}
                        className="bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                Edit User
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-white/80">
                  Email (Read-only)
                </Label>
                <Input
                  id="edit-email"
                  value={editingUser?.email || ''}
                  disabled
                  className="bg-white/5 border-white/20 text-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-display-name" className="text-white/80">
                  Display Name
                </Label>
                <Input
                  id="edit-display-name"
                  value={editFormData.display_name}
                  onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Enter display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mobile" className="text-white/80">
                  Mobile Number
                </Label>
                <Input
                  id="edit-mobile"
                  value={editFormData.mobile_number}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile_number: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Enter mobile number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-white/80">
                  Role
                </Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="event_organizer">Event Organizer</SelectItem>
                    <SelectItem value="team_admin">Team Admin</SelectItem>
                    <SelectItem value="auctioneer">Auctioneer</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateUser}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white flex items-center">
                <UserPlus className="w-6 h-6 mr-2" />
                Create New User
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-email" className="text-white/80">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password" className="text-white/80">
                  Password <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-display-name" className="text-white/80">
                  Display Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="create-display-name"
                  value={createFormData.display_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, display_name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-mobile" className="text-white/80">
                  Mobile Number
                </Label>
                <Input
                  id="create-mobile"
                  value={createFormData.mobile_number}
                  onChange={(e) => setCreateFormData({ ...createFormData, mobile_number: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Enter mobile number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role" className="text-white/80">
                  Role <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={createFormData.role}
                  onValueChange={(value) => setCreateFormData({ ...createFormData, role: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="event_organizer">Event Organizer</SelectItem>
                    <SelectItem value="team_admin">Team Admin</SelectItem>
                    <SelectItem value="auctioneer">Auctioneer</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                className="bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <FloatingMenu />
    </div>
  );
};

export default UserManagement;
