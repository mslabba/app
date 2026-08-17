import { useEffect, useMemo, useRef, useState } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { logOut } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#100c0e]';

/**
 * Product AppShell — role-aware sidebar + top bar.
 * B9: skip link, aria, Escape-to-close, focus-visible rings, reduced motion friendly.
 */
const AppShell = ({ children, title, subtitle, hideSidebar = false }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userProfile, isSuperAdmin, isEventOrganizer, isTeamAdmin } = useAuth();
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();
  const closeBtnRef = useRef(null);
  const menuBtnRef = useRef(null);

  const activeEventId = useMemo(() => {
    if (eventId) return eventId;
    const m = location.pathname.match(
      /\/admin\/(?:categories|teams|players|priority-players|sold-players|registrations|auction|sponsors|analytics|events)\/([^/]+)/
    );
    return m?.[1] || null;
  }, [eventId, location.pathname]);

  const isOrganizer = isSuperAdmin || isEventOrganizer;

  useEffect(() => {
    // Close mobile drawer on route change
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    // Prevent body scroll while drawer open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus close control for keyboard users
    requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const navSections = useMemo(() => {
    const sections = [];

    if (isOrganizer) {
      sections.push({
        id: 'main',
        label: 'Overview',
        items: [
          { to: '/admin', label: 'Dashboard', icon: Home, end: true },
          { to: '/admin/events', label: 'Auctions', icon: Calendar },
          ...(isEventOrganizer && !isSuperAdmin
            ? [{ to: '/admin/onboarding', label: 'Setup guide', icon: Sparkles }]
            : []),
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
              to: `/admin/events/${activeEventId}/settings`,
              label: 'Auction settings',
              icon: Settings,
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
  }, [isOrganizer, isSuperAdmin, isEventOrganizer, isTeamAdmin, activeEventId, userProfile?.role]);

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
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white',
            focusRing
          )}
        >
          <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span className="flex-1">{item.label}</span>
          <span className="sr-only">(opens in new tab)</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden />
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
            focusRing,
            isActive
              ? 'bg-red-600/90 text-white shadow-sm shadow-red-900/30'
              : 'text-white/75 hover:bg-white/10 hover:text-white'
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const SidebarBody = ({ onNavigate, navId }) => (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-5">
        <Link
          to={homeTo}
          className={cn('flex items-center gap-3 rounded-md', focusRing)}
          onClick={onNavigate}
        >
          <img
            src="/images/sports/logo-final.png"
            alt=""
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

      <nav
        id={navId}
        className="flex-1 space-y-6 overflow-y-auto px-3 py-4"
        aria-label="Primary"
      >
        {navSections.map((section) => (
          <div key={section.id}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to + item.label}>
                  <NavItem item={item} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
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
          className={cn(
            'w-full border-white/20 bg-white/5 text-white hover:bg-white/15',
            focusRing
          )}
          data-testid="logout-button"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="app-bg min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-red-800"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      {!hideSidebar && (
        <aside
          className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl lg:block"
          aria-label="Application sidebar"
        >
          <SidebarBody navId="desktop-primary-nav" />
        </aside>
      )}

      {/* Mobile drawer */}
      {!hideSidebar && mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-[min(100%,18rem)] border-r border-white/10 bg-[#100c0e] shadow-2xl">
            <button
              ref={closeBtnRef}
              type="button"
              className={cn(
                'absolute right-3 top-3 rounded-md p-2 text-white/70 hover:bg-white/10',
                focusRing
              )}
              onClick={() => {
                setMobileOpen(false);
                menuBtnRef.current?.focus();
              }}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <SidebarBody
              navId="mobile-primary-nav"
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={cn(!hideSidebar && 'lg:pl-64')}>
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3">
            {!hideSidebar && (
              <button
                ref={menuBtnRef}
                type="button"
                className={cn(
                  'rounded-lg p-2 text-white hover:bg-white/10 lg:hidden',
                  focusRing
                )}
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-primary-nav"
                data-testid="app-shell-menu"
              >
                <Menu className="h-5 w-5" aria-hidden />
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
                className={cn(
                  'hidden items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow sm:inline-flex',
                  focusRing
                )}
              >
                <Gavel className="h-3.5 w-3.5" aria-hidden />
                Live
              </Link>
            )}
          </div>
        </header>

        <main id="main-content" className="min-h-[calc(100vh-3.5rem)]" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
