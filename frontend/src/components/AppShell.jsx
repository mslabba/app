import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Calendar,
  Gavel,
  Users,
  Trophy,
  Tag,
  UserPlus,
  DollarSign,
  BarChart3,
  Settings,
  Landmark,
  Shield,
  LogOut,
  MonitorPlay,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { logOut } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Product AppShell — replaces rainbow FloatingMenu + thin Navbar.
 * Role-aware sidebar + top bar. Event-scoped links when :eventId is in the route.
 */
const AppShell = ({ children, title, subtitle, hideSidebar = false }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userProfile, isSuperAdmin, isEventOrganizer, isTeamAdmin } = useAuth();
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();

  // Infer eventId from path if not a named param (e.g. nested)
  const activeEventId = useMemo(() => {
    if (eventId) return eventId;
    const m = location.pathname.match(
      /\/admin\/(?:categories|teams|players|priority-players|sold-players|registrations|auction|sponsors|analytics|events)\/([^/]+)/
    );
    return m?.[1] || null;
  }, [eventId, location.pathname]);

  const isOrganizer = isSuperAdmin || isEventOrganizer;

  const navSections = useMemo(() => {
    const sections = [];

    if (isOrganizer) {
      sections.push({
        id: 'main',
        label: 'Overview',
        items: [
          { to: '/admin', label: 'Dashboard', icon: Home, end: true },
          { to: '/admin/events', label: 'Auctions', icon: Calendar },
          { to: '/admin/settings', label: 'Bank settings', icon: Landmark },
          ...(isSuperAdmin
            ? [
                { to: '/admin/users', label: 'Users', icon: Shield },
                {
                  to: '/admin/payment-settings',
                  label: 'Payment gateway',
                  icon: DollarSign,
                },
              ]
            : []),
        ],
      });

      if (activeEventId) {
        sections.push({
          id: 'event',
          label: 'This auction',
          items: [
            {
              to: `/admin/auction/${activeEventId}`,
              label: 'Live control',
              icon: Gavel,
            },
            {
              to: `/display/${activeEventId}`,
              label: 'Display board',
              icon: MonitorPlay,
              externalTab: true,
            },
            {
              to: `/admin/teams/${activeEventId}`,
              label: 'Teams',
              icon: Users,
            },
            {
              to: `/admin/players/${activeEventId}`,
              label: 'Players',
              icon: Trophy,
            },
            {
              to: `/admin/categories/${activeEventId}`,
              label: 'Categories',
              icon: Tag,
            },
            {
              to: `/admin/registrations/${activeEventId}`,
              label: 'Registrations',
              icon: UserPlus,
            },
            {
              to: `/admin/sponsors/${activeEventId}`,
              label: 'Sponsors',
              icon: DollarSign,
            },
            {
              to: `/admin/analytics/${activeEventId}`,
              label: 'Analytics',
              icon: BarChart3,
            },
            {
              to: `/admin/events/${activeEventId}/payments`,
              label: 'Payments',
              icon: DollarSign,
            },
            {
              to: `/admin/sold-players/${activeEventId}`,
              label: 'Sold players',
              icon: Trophy,
            },
            {
              to: `/admin/priority-players/${activeEventId}`,
              label: 'Priority list',
              icon: Settings,
            },
          ],
        });
      }
    } else if (isTeamAdmin || userProfile?.role === 'team_admin') {
      sections.push({
        id: 'team',
        label: 'Team',
        items: [{ to: '/team', label: 'Team dashboard', icon: Home, end: true }],
      });
    }

    return sections;
  }, [isOrganizer, isSuperAdmin, isTeamAdmin, activeEventId, userProfile?.role]);

  const handleLogout = async () => {
    try {
      await logOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Failed to logout');
    }
  };

  const homeTo = isOrganizer ? '/admin' : '/team';

  const NavItem = ({ item, onNavigate }) => {
    const Icon = item.icon;
    if (item.externalTab) {
      return (
        <a
          href={item.to}
          target="_blank"
          rel="noreferrer"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <Icon className="h-4 w-4 shrink-0 opacity-80" />
          <span className="flex-1">{item.label}</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
        </a>
      );
    }
    return (
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
            isActive
              ? 'bg-red-600/90 text-white shadow-sm shadow-red-900/30'
              : 'text-white/75 hover:bg-white/10 hover:text-white'
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0 opacity-90" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const SidebarBody = ({ onNavigate }) => (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-5">
        <Link to={homeTo} className="flex items-center gap-3" onClick={onNavigate}>
          <img
            src="/images/sports/logo-final.png"
            alt="PowerAuction"
            className="h-9 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-white">
              Power<span className="text-red-500">Auction</span>
            </div>
            <div className="text-[11px] text-white/50">Powered by Turgut</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.id}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to + item.label} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}

        {!isOrganizer && !isTeamAdmin && (
          <p className="px-3 text-xs text-white/50">No navigation items for this role.</p>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 truncate text-sm text-white">
          <div className="font-medium">{userProfile?.display_name || 'User'}</div>
          <div className="text-xs uppercase tracking-wide text-white/50">
            {(userProfile?.role || '').replace(/_/g, ' ')}
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-white/20 bg-white/5 text-white hover:bg-white/15"
          data-testid="logout-button"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="app-bg min-h-screen">
      {/* Desktop sidebar */}
      {!hideSidebar && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl lg:block">
          <SidebarBody />
        </aside>
      )}

      {/* Mobile drawer */}
      {!hideSidebar && mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-[min(100%,18rem)] border-r border-white/10 bg-[#100c0e] shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-md p-2 text-white/70 hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={cn(!hideSidebar && 'lg:pl-64')}>
        {/* Top bar (mobile + context) */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3">
            {!hideSidebar && (
              <button
                type="button"
                className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                data-testid="app-shell-menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              {title ? (
                <>
                  <h1 className="truncate text-lg font-semibold text-white">{title}</h1>
                  {subtitle && (
                    <p className="truncate text-xs text-white/55">{subtitle}</p>
                  )}
                </>
              ) : (
                <div className="lg:hidden">
                  <span className="font-semibold text-white">
                    Power<span className="text-red-500">Auction</span>
                  </span>
                </div>
              )}
            </div>
            {activeEventId && isOrganizer && (
              <Link
                to={`/admin/auction/${activeEventId}`}
                className="hidden items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow sm:inline-flex"
              >
                <Gavel className="h-3.5 w-3.5" />
                Live
              </Link>
            )}
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
