import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Users,
  TrendingUp,
  Plus,
  Play,
  Gavel,
  Tag,
  UserPlus,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import {
  getOnboardingState,
  markOnboardingDismissed,
  shouldForceOnboarding,
} from '@/lib/onboarding';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusBadge = (status) => {
  const s = (status || 'not_started').toLowerCase();
  if (s === 'in_progress') return 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30';
  if (s === 'completed') return 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30';
  if (s === 'paused') return 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30';
  return 'bg-white/10 text-white/70 ring-1 ring-white/15';
};

const StatCard = ({ label, value, icon: Icon, to, testId }) => {
  const inner = (
    <Card
      className={`glass border-white/15 ${to ? 'card-hover cursor-pointer transition hover:border-red-400/40' : ''}`}
      data-testid={testId}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/55">{label}</p>
            <h3 className="mt-1 text-3xl font-bold text-white">{value}</h3>
          </div>
          <div className="rounded-xl bg-red-600/15 p-3 ring-1 ring-red-500/20">
            <Icon className="h-7 w-7 text-red-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const SuperAdminDashboard = () => {
  const { token, isSuperAdmin, isEventOrganizer, userProfile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showSetupBanner, setShowSetupBanner] = useState(false);

  useEffect(() => {
    if (token) {
      fetchEvents();
      if (isSuperAdmin) fetchUsers();
      else setUsersLoading(false);
    }
    // Re-run when role/profile is known so first-login redirect works
  }, [token, isSuperAdmin, isEventOrganizer, userProfile?.uid, userProfile?.id]);

  const fetchEvents = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/auctions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = response.data || [];
      setEvents(list);

      const uid = userProfile?.uid || userProfile?.id;
      if (
        shouldForceOnboarding({
          isEventOrganizer,
          isSuperAdmin,
          eventCount: list.length,
          uid,
        })
      ) {
        navigate('/admin/onboarding', { replace: true });
        return;
      }

      const onboarding = getOnboardingState(uid);
      if (
        isEventOrganizer &&
        !isSuperAdmin &&
        !onboarding.completed &&
        !onboarding.dismissed &&
        list.length === 0
      ) {
        setShowSetupBanner(true);
      } else if (
        isEventOrganizer &&
        !isSuperAdmin &&
        !onboarding.completed &&
        !onboarding.dismissed
      ) {
        setShowSetupBanner(true);
      } else {
        setShowSetupBanner(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const dismissSetupBanner = () => {
    const uid = userProfile?.uid || userProfile?.id;
    markOnboardingDismissed(uid);
    setShowSetupBanner(false);
  };

  const fetchUsers = async () => {
    if (!token) {
      setUsersLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const activeCount = events.filter((e) => e.status === 'in_progress').length;
  const completedCount = events.filter((e) => e.status === 'completed').length;

  return (
    <AppShell title="Dashboard" subtitle="Overview of your auctions">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Dashboard"
          description="Create auctions, manage teams and players, then run live control."
          actions={
            <div className="flex flex-wrap gap-2">
              {showSetupBanner && (
                <Link to="/admin/onboarding">
                  <Button
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    data-testid="resume-onboarding-button"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Continue setup
                  </Button>
                </Link>
              )}
              <Link to="/admin/events">
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  data-testid="create-event-button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New auction
                </Button>
              </Link>
            </div>
          }
        />

        {showSetupBanner && !loading && (
          <div
            className="mb-6 flex flex-col gap-3 rounded-xl border border-red-400/30 bg-red-600/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            data-testid="onboarding-banner"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-red-600/20 p-2 ring-1 ring-red-400/30">
                <Sparkles className="h-5 w-5 text-red-300" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {events.length === 0
                    ? 'Finish setting up your first auction'
                    : 'Complete your auction setup'}
                </p>
                <p className="mt-0.5 text-sm text-white/60">
                  Guided steps: create auction → categories (or open / Default) → teams → rules.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link to="/admin/onboarding">
                <Button className="bg-red-600 text-white hover:bg-red-700">
                  {events.length === 0 ? 'Start setup' : 'Continue setup'}
                </Button>
              </Link>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-white/50 hover:bg-white/10 hover:text-white"
                onClick={dismissSetupBanner}
                aria-label="Dismiss setup banner"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          data-testid="admin-dashboard"
        >
          <StatCard
            label="Total auctions"
            value={loading ? '…' : events.length}
            icon={Calendar}
            to="/admin/events"
            testId="events-card"
          />
          {isSuperAdmin && (
            <StatCard
              label="Registered users"
              value={usersLoading ? '…' : users.length}
              icon={Users}
              to="/admin/users"
            />
          )}
          <StatCard label="Live now" value={loading ? '…' : activeCount} icon={Play} />
          <StatCard
            label="Completed"
            value={loading ? '…' : completedCount}
            icon={TrendingUp}
          />
        </div>

        <Card className="glass border-white/15">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-white">Recent auctions</CardTitle>
            <Link
              to="/admin/events"
              className="text-sm font-medium text-red-300 hover:text-red-200"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 py-12 text-center">
                <Gavel className="mx-auto mb-3 h-12 w-12 text-white/35" />
                <p className="text-white/70">No auctions yet</p>
                <p className="mt-1 text-sm text-white/45">
                  Use the guided setup to create your auction, categories, and teams.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Link to="/admin/onboarding">
                    <Button className="bg-red-600 text-white hover:bg-red-700">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start guided setup
                    </Button>
                  </Link>
                  <Link to="/admin/events">
                    <Button
                      variant="outline"
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create auction only
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 6).map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                    data-testid={`event-item-${event.id}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {event.logo_url ? (
                        <img
                          src={event.logo_url}
                          alt=""
                          className="h-11 w-11 rounded-lg border border-white/15 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600/20 ring-1 ring-red-500/25">
                          <Calendar className="h-5 w-5 text-red-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold text-white">{event.name}</h4>
                        <p className="text-sm text-white/50">{event.date}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadge(event.status)}`}
                      >
                        {(event.status || 'not_started').replace(/_/g, ' ')}
                      </span>
                      <Link to={`/admin/categories/${event.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                        >
                          <Tag className="mr-1 h-3.5 w-3.5" />
                          Categories
                        </Button>
                      </Link>
                      <Link to={`/admin/teams/${event.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                        >
                          <Users className="mr-1 h-3.5 w-3.5" />
                          Teams
                        </Button>
                      </Link>
                      <Link to={`/admin/players/${event.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                        >
                          <UserPlus className="mr-1 h-3.5 w-3.5" />
                          Players
                        </Button>
                      </Link>
                      <Link to={`/admin/auction/${event.id}`}>
                        <Button size="sm" className="bg-red-600 text-white hover:bg-red-700">
                          <Play className="mr-1 h-3.5 w-3.5" />
                          Control
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <Card className="glass mt-8 border-white/15" id="users-section">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Latest users
                </span>
                <Link
                  to="/admin/users"
                  className="text-sm font-normal text-red-300 hover:text-red-200"
                >
                  Manage users
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                </div>
              ) : users.length === 0 ? (
                <p className="py-6 text-center text-white/55">No users registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {users.slice(0, 8).map((user) => (
                    <div
                      key={user.id || user.uid}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-sm font-bold text-white">
                          {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-white">
                            {user.display_name || 'Unknown'}
                          </div>
                          <div className="truncate text-xs text-white/50">{user.email}</div>
                        </div>
                      </div>
                      <span className="ml-3 shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                        {(user.role || 'user').replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default SuperAdminDashboard;
