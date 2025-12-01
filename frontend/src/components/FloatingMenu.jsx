import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Users,
  Trophy,
  UserPlus,
  Settings,
  BarChart3,
  Gavel,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Shield
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const FloatingMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { currentUser, userProfile, isSuperAdmin, isEventOrganizer } = useAuth();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: isSuperAdmin || isEventOrganizer ? '/admin' : '/team',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Main Dashboard'
    },
    {
      id: 'events',
      label: 'Auctions',
      icon: Calendar,
      path: '/admin/events',
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Manage Auctions',
      requiresRole: ['super_admin']
    },
    ...(eventId ? [
      {
        id: 'auction-control',
        label: 'Auction Control',
        icon: Gavel,
        path: `/admin/auction/${eventId}`,
        color: 'bg-red-500 hover:bg-red-600',
        description: 'Live Auction Control',
        requiresRole: ['super_admin', 'auctioneer']
      },
      {
        id: 'teams',
        label: 'Teams',
        icon: Users,
        path: `/admin/teams/${eventId}`,
        color: 'bg-green-500 hover:bg-green-600',
        description: 'Manage Teams'
      },
      {
        id: 'players',
        label: 'Players',
        icon: Trophy,
        path: `/admin/players/${eventId}`,
        color: 'bg-orange-500 hover:bg-orange-600',
        description: 'Manage Players'
      },
      {
        id: 'categories',
        label: 'Categories',
        icon: Tag,
        path: `/admin/categories/${eventId}`,
        color: 'bg-cyan-500 hover:bg-cyan-600',
        description: 'Player Categories'
      },
      {
        id: 'registrations',
        label: 'Registrations',
        icon: UserPlus,
        path: `/admin/registrations/${eventId}`,
        color: 'bg-indigo-500 hover:bg-indigo-600',
        description: 'Player Registrations'
      },
      {
        id: 'sponsors',
        label: 'Sponsors',
        icon: DollarSign,
        path: `/admin/sponsors/${eventId}`,
        color: 'bg-yellow-500 hover:bg-yellow-600',
        description: 'Event Sponsors'
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        path: `/admin/analytics/${eventId}`,
        color: 'bg-pink-500 hover:bg-pink-600',
        description: 'Auction Analytics'
      }
    ] : []),
    ...(isSuperAdmin ? [
      {
        id: 'admin',
        label: 'Admin Panel',
        icon: Shield,
        path: '/admin',
        color: 'bg-red-600 hover:bg-red-700',
        description: 'System Administration'
      }
    ] : [])
  ];

  const handleMenuClick = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.requiresRole) return true;
    return item.requiresRole.includes(userProfile?.role);
  });

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${isOpen
            ? 'bg-red-500 hover:bg-red-600 rotate-180'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-110'
            }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white mx-auto" />
          ) : (
            <Menu className="w-6 h-6 text-white mx-auto" />
          )}
        </button>
      </div>

      {/* Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Items */}
          <div className="absolute bottom-24 right-6 space-y-3">
            {filteredMenuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center space-x-3 animate-in slide-in-from-right duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Menu item label */}
                  <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-600">{item.description}</div>
                  </div>

                  {/* Menu item button */}
                  <button
                    onClick={() => handleMenuClick(item.path)}
                    className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${item.color}`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 text-white mx-auto" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingMenu;