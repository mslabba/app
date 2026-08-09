/**
 * @deprecated Prefer AppShell for authenticated product pages.
 * Thin legacy top bar retained only if a page still imports Navbar directly.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { logOut } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

const Navbar = () => {
  const { userProfile, isSuperAdmin, isEventOrganizer } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Failed to logout');
    }
  };

  const home = isSuperAdmin || isEventOrganizer ? '/admin' : '/team';

  return (
    <nav className="sticky top-0 z-50 border-b border-white/15 bg-black/35 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to={home} className="flex items-center gap-2">
          <img
            src="/images/sports/logo-final.png"
            alt="PowerAuction"
            className="h-9 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="text-lg font-bold text-white">
            Power<span className="text-red-500">Auction</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-sm text-white sm:block">
            <div className="font-medium">{userProfile?.display_name}</div>
            <div className="text-xs uppercase text-white/55">
              {(userProfile?.role || '').replace(/_/g, ' ')}
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
            data-testid="logout-button"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
