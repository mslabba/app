import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PromoteToAdmin = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token, userProfile } = useAuth();

  const handlePromote = async () => {
    if (!token) {
      toast.error('Please login first');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/promote-to-admin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Successfully promoted to Super Admin! Please refresh the page.');
      
      // Redirect to admin dashboard after a short delay
      setTimeout(() => {
        window.location.reload(); // Refresh to update auth context
      }, 2000);
      
    } catch (error) {
      console.error('Promotion error:', error);
      toast.error(error.response?.data?.detail || 'Failed to promote user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="w-full max-w-md">
        <Card className="glass border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">Promote to Super Admin</CardTitle>
            <CardDescription className="text-white/80">
              Click below to promote your account to Super Admin role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {userProfile && (
              <div className="bg-white/10 rounded-lg p-4 space-y-2">
                <p className="text-white/60 text-sm">Current User:</p>
                <p className="text-white font-semibold">{userProfile.email}</p>
                <p className="text-white/60 text-sm">Current Role:</p>
                <p className="text-white font-semibold">{userProfile.role}</p>
              </div>
            )}

            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                ⚠️ This is a temporary development feature. In production, admin roles should be assigned through proper user management.
              </p>
            </div>

            <Button
              onClick={handlePromote}
              disabled={loading || userProfile?.role === 'super_admin'}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 font-semibold"
            >
              {loading ? 'Promoting...' : 
               userProfile?.role === 'super_admin' ? 'Already Super Admin' : 
               'Promote to Super Admin'}
            </Button>

            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromoteToAdmin;
