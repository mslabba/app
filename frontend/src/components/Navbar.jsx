import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { logOut } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Users, TrendingUp, DollarSign, Settings } from 'lucide-react';
import { toast } from 'sonner';

const Navbar = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <nav className="glass border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to={isSuperAdmin ? "/admin" : "/team"} className="flex items-center space-x-2">
              <img
                src="/images/sports/logo-final.png"
                alt="PowerAuctions Logo"
                className="h-10 w-auto"
                onError={(e) => {
                  console.error('Logo failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">Power<span className="text-red-500">Auction</span></span>
                <span className="text-xs text-white/60">Powered by Turgut</span>
              </div>
            </Link>

            {isSuperAdmin && (
              <div className="hidden md:flex items-center space-x-4">
                <Link to="/admin" className="text-white/80 hover:text-white flex items-center space-x-1">
                  <Home className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/admin/events" className="text-white/80 hover:text-white flex items-center space-x-1">
                  <Settings className="w-4 h-4" />
                  <span>Events</span>
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-white text-sm">
              <div className="font-medium">{userProfile?.display_name}</div>
              <div className="text-white/60 text-xs">{userProfile?.role?.replace('_', ' ').toUpperCase()}</div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
