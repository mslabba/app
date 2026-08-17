import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Layers,
  LayoutList,
  Plus,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import {
  getOnboardingState,
  markOnboardingComplete,
  markOnboardingDismissed,
  setOnboardingState,
} from '@/lib/onboarding';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'event', label: 'Auction', icon: Calendar },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
];

const emptyEventForm = () => ({
  name: '',
  date: '',
  description: '',
  logo_url: '',
  banner_url: '',
  rules: {
    min_squad_size: 11,
    max_squad_size: 18,
    min_bid_increment: 50000,
    timer_duration: 60,
    rtm_cards_per_team: 2,
  },
  payment_settings: {
    collect_payment: false,
    registration_fee: null,
  },
  has_registration_limit: false,
  registration_limit: null,
});

const emptyCategoryDraft = () => ({
  name: '',
  description: '',
  min_players: 1,
  max_players: 50,
  color: '#e11d2e',
  base_price: 50000,
});

const emptyTeamDraft = () => ({
  name: '',
  budget: 10000000,
  max_squad_size: 18,
  color: '#e11d2e',
});

const OrganizerOnboarding = () => {
  const navigate = useNavigate();
  const { token, userProfile, isEventOrganizer, isSuperAdmin } = useAuth();
  const uid = userProfile?.uid || userProfile?.id;

  const [bootstrapping, setBootstrapping] = useState(true);
  const [step, setStep] = useState('welcome');
  const [saving, setSaving] = useState(false);

  const [eventId, setEventId] = useState(null);
  const [eventName, setEventName] = useState('');
  const [eventForm, setEventForm] = useState(emptyEventForm);

  const [categoryMode, setCategoryMode] = useState(null); // 'open' | 'custom'
  const [categories, setCategories] = useState([]);
  const [categoryDraft, setCategoryDraft] = useState(emptyCategoryDraft);

  const [teams, setTeams] = useState([]);
  const [teamDraft, setTeamDraft] = useState(emptyTeamDraft);

  const [rulesForm, setRulesForm] = useState(emptyEventForm().rules);

  const stepIndex = useMemo(
    () => Math.max(0, STEPS.findIndex((s) => s.id === step)),
    [step]
  );
  const progressValue = ((stepIndex + 1) / STEPS.length) * 100;

  const persist = useCallback(
    (patch) => {
      if (!uid) return;
      setOnboardingState(uid, patch);
    },
    [uid]
  );

  const goTo = useCallback(
    (nextStep) => {
      setStep(nextStep);
      persist({ step: nextStep, eventId });
    },
    [persist, eventId]
  );

  const loadEventContext = useCallback(
    async (id) => {
      if (!id || !token) return;
      try {
        const [eventRes, catRes, teamRes] = await Promise.all([
          axios.get(`${API}/auctions/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API}/auctions/${id}/categories`),
          axios.get(`${API}/teams/event/${id}`),
        ]);
        const event = eventRes.data;
        setEventId(event.id);
        setEventName(event.name || '');
        setEventForm({
          name: event.name || '',
          date: event.date || '',
          description: event.description || '',
          logo_url: event.logo_url || '',
          banner_url: event.banner_url || '',
          rules: {
            min_squad_size: event.rules?.min_squad_size ?? 11,
            max_squad_size: event.rules?.max_squad_size ?? 18,
            min_bid_increment: event.rules?.min_bid_increment ?? 50000,
            timer_duration: event.rules?.timer_duration ?? 60,
            rtm_cards_per_team: event.rules?.rtm_cards_per_team ?? 2,
          },
          payment_settings: event.payment_settings || {
            collect_payment: false,
            registration_fee: null,
          },
          has_registration_limit: event.has_registration_limit || false,
          registration_limit: event.registration_limit || null,
        });
        setRulesForm({
          min_squad_size: event.rules?.min_squad_size ?? 11,
          max_squad_size: event.rules?.max_squad_size ?? 18,
          min_bid_increment: event.rules?.min_bid_increment ?? 50000,
          timer_duration: event.rules?.timer_duration ?? 60,
          rtm_cards_per_team: event.rules?.rtm_cards_per_team ?? 2,
        });
        setCategories(catRes.data || []);
        setTeams(teamRes.data || []);
        if ((catRes.data || []).length > 0) {
          const onlyDefault =
            catRes.data.length === 1 &&
            String(catRes.data[0].name || '').toLowerCase() === 'default';
          setCategoryMode(onlyDefault ? 'open' : 'custom');
        }
      } catch (err) {
        console.error('Failed to load onboarding event context', err);
      }
    },
    [token]
  );

  // Bootstrap: restore progress or detect existing auctions
  useEffect(() => {
    if (!token || !uid) return;

    let cancelled = false;

    const bootstrap = async () => {
      setBootstrapping(true);
      try {
        const saved = getOnboardingState(uid);
        const eventsRes = await axios.get(`${API}/auctions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;

        const events = eventsRes.data || [];

        if (saved.completed) {
          // Allow revisiting completed onboarding if they navigated here intentionally
        }

        if (saved.eventId) {
          setEventId(saved.eventId);
          await loadEventContext(saved.eventId);
          setStep(saved.step || 'welcome');
          if (saved.categoryMode) setCategoryMode(saved.categoryMode);
        } else if (events.length > 0) {
          // Resume with first owned auction that may need setup
          const first = events[0];
          setEventId(first.id);
          await loadEventContext(first.id);
          // Jump past event creation if they already have one
          const nextStep =
            saved.step && saved.step !== 'welcome' && saved.step !== 'event'
              ? saved.step
              : 'categories';
          setStep(nextStep);
          persist({ eventId: first.id, step: nextStep });
        } else {
          setStep(saved.step || 'welcome');
        }
      } catch (err) {
        console.error(err);
        toast.error('Could not load setup progress');
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token, uid, loadEventContext, persist]);

  const handleSkip = () => {
    markOnboardingDismissed(uid);
    toast.message('You can resume setup anytime from the dashboard');
    navigate('/admin');
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.name.trim() || !eventForm.date) {
      toast.error('Auction name and date are required');
      return;
    }
    setSaving(true);
    try {
      if (eventId) {
        await axios.put(
          `${API}/auctions/${eventId}`,
          {
            name: eventForm.name.trim(),
            date: eventForm.date,
            description: eventForm.description || null,
            rules: eventForm.rules,
            payment_settings: eventForm.payment_settings,
            has_registration_limit: eventForm.has_registration_limit,
            registration_limit: eventForm.registration_limit,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEventName(eventForm.name.trim());
        setRulesForm(eventForm.rules);
        toast.success('Auction updated');
      } else {
        const res = await axios.post(
          `${API}/auctions`,
          {
            name: eventForm.name.trim(),
            date: eventForm.date,
            description: eventForm.description || null,
            rules: eventForm.rules,
            payment_settings: eventForm.payment_settings,
            has_registration_limit: eventForm.has_registration_limit,
            registration_limit: eventForm.registration_limit,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const created = res.data;
        setEventId(created.id);
        setEventName(created.name);
        setRulesForm(created.rules || eventForm.rules);
        persist({ eventId: created.id, step: 'categories' });
        toast.success('Auction created');
      }
      goTo('categories');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save auction');
    } finally {
      setSaving(false);
    }
  };

  const ensureDefaultCategory = async () => {
    if (!eventId) throw new Error('No auction yet');
    // Reuse existing Default if present
    const existing = categories.find(
      (c) => String(c.name || '').toLowerCase() === 'default'
    );
    if (existing) return existing;

    const payload = {
      name: 'Default',
      description: 'Open auction — all players use this category',
      event_id: eventId,
      min_players: 1,
      max_players: 200,
      color: '#e11d2e',
      base_price: rulesForm.min_bid_increment || 50000,
    };
    const res = await axios.post(`${API}/categories`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  };

  const handleCategoryModeOpen = async () => {
    if (!eventId) {
      toast.error('Create an auction first');
      goTo('event');
      return;
    }
    setSaving(true);
    try {
      const cat = await ensureDefaultCategory();
      setCategories((prev) => {
        if (prev.some((c) => c.id === cat.id)) return prev;
        return [...prev, cat];
      });
      setCategoryMode('open');
      persist({ categoryMode: 'open', step: 'teams', eventId });
      toast.success('Open auction ready — Default category created');
      goTo('teams');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to set up open auction');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!eventId) {
      toast.error('Create an auction first');
      return;
    }
    if (!categoryDraft.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    const minP = parseInt(categoryDraft.min_players, 10) || 1;
    const maxP = parseInt(categoryDraft.max_players, 10) || 50;
    const base = parseInt(categoryDraft.base_price, 10) || 50000;
    if (minP > maxP) {
      toast.error('Max players must be ≥ min players');
      return;
    }
    if (base <= 0) {
      toast.error('Base price must be greater than zero');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: categoryDraft.name.trim(),
        description: categoryDraft.description.trim() || null,
        event_id: eventId,
        min_players: minP,
        max_players: maxP,
        color: categoryDraft.color || '#e11d2e',
        base_price: base,
      };
      const res = await axios.post(`${API}/categories`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories((prev) => [...prev, res.data]);
      setCategoryMode('custom');
      setCategoryDraft(emptyCategoryDraft());
      persist({ categoryMode: 'custom', eventId });
      toast.success(`Category “${res.data.name}” added`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Remove category “${category.name}”?`)) return;
    setSaving(true);
    try {
      await axios.delete(`${API}/categories/${category.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      toast.success('Category removed');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove category');
    } finally {
      setSaving(false);
    }
  };

  const continueFromCategories = () => {
    if (categories.length === 0) {
      toast.error('Add at least one category, or choose open auction');
      return;
    }
    persist({ categoryMode: categoryMode || 'custom', step: 'teams', eventId });
    goTo('teams');
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!eventId) {
      toast.error('Create an auction first');
      return;
    }
    if (!teamDraft.name.trim()) {
      toast.error('Team name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: teamDraft.name.trim(),
        budget: parseInt(teamDraft.budget, 10) || 10000000,
        max_squad_size: parseInt(teamDraft.max_squad_size, 10) || 18,
        color: teamDraft.color || '#e11d2e',
        logo_url: '',
        admin_email: '',
        event_id: eventId,
      };
      const res = await axios.post(`${API}/teams`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeams((prev) => [...prev, res.data]);
      setTeamDraft(emptyTeamDraft());
      toast.success(`Team “${res.data.name}” added`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add team');
    } finally {
      setSaving(false);
    }
  };

  const continueFromTeams = () => {
    if (teams.length === 0) {
      toast.error('Add at least one team to continue');
      return;
    }
    persist({ step: 'settings', eventId });
    goTo('settings');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!eventId) {
      toast.error('Create an auction first');
      return;
    }
    if (!eventForm.date) {
      toast.error('Auction date is missing — go back and set the date');
      goTo('event');
      return;
    }
    setSaving(true);
    try {
      await axios.put(
        `${API}/auctions/${eventId}`,
        {
          name: (eventForm.name || eventName || '').trim(),
          date: eventForm.date,
          description: eventForm.description || null,
          logo_url: eventForm.logo_url || null,
          banner_url: eventForm.banner_url || null,
          rules: {
            min_squad_size: parseInt(rulesForm.min_squad_size, 10) || 11,
            max_squad_size: parseInt(rulesForm.max_squad_size, 10) || 18,
            min_bid_increment: parseInt(rulesForm.min_bid_increment, 10) || 50000,
            timer_duration: parseInt(rulesForm.timer_duration, 10) || 60,
            rtm_cards_per_team: parseInt(rulesForm.rtm_cards_per_team, 10) || 2,
          },
          payment_settings: eventForm.payment_settings || {
            collect_payment: false,
            registration_fee: null,
          },
          has_registration_limit: !!eventForm.has_registration_limit,
          registration_limit: eventForm.registration_limit ?? null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Auction settings saved');
      markOnboardingComplete(uid, eventId);
      goTo('done');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const finishToDashboard = () => {
    markOnboardingComplete(uid, eventId);
    navigate('/admin');
  };

  if (!isEventOrganizer && !isSuperAdmin) {
    return (
      <AppShell title="Setup" subtitle="Organizer onboarding">
        <div className="container mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-white/70">This setup guide is for event organizers.</p>
          <Link to="/dashboard">
            <Button className="mt-4 bg-red-600 text-white hover:bg-red-700">Go to dashboard</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  if (bootstrapping) {
    return (
      <AppShell title="Setup" subtitle="Preparing your guided setup">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
            <p className="text-white/70">Loading setup…</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Get started" subtitle="Guided auction setup">
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-300/90">
              Organizer onboarding
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              {step === 'done' ? 'You are ready' : 'Set up your first auction'}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {eventName
                ? `Working on “${eventName}”`
                : 'A short guided path — auction → categories → teams → rules'}
            </p>
          </div>
          {step !== 'done' && (
            <Button
              type="button"
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={handleSkip}
              data-testid="onboarding-skip"
            >
              <X className="mr-1 h-4 w-4" />
              Skip for now
            </Button>
          )}
        </div>

        {/* Step rail */}
        <div className="mb-6">
          <Progress value={progressValue} className="mb-4 h-1.5 bg-white/10" />
          <ol className="flex flex-wrap gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = s.id === step;
              const done = i < stepIndex;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={i > stepIndex && !eventId && s.id !== 'welcome'}
                    onClick={() => {
                      // Allow going back freely; forward only if prior work exists
                      if (i <= stepIndex || (eventId && i <= STEPS.findIndex((x) => x.id === 'settings'))) {
                        if (s.id === 'event' || s.id === 'welcome' || eventId) {
                          goTo(s.id);
                        }
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                      active && 'bg-red-600 text-white ring-1 ring-red-400/40',
                      done && !active && 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25',
                      !active && !done && 'bg-white/5 text-white/45 ring-1 ring-white/10'
                    )}
                  >
                    {done && !active ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* WELCOME */}
        {step === 'welcome' && (
          <Card className="glass border-white/15" data-testid="onboarding-welcome">
            <CardContent className="space-y-6 pt-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/20 ring-1 ring-red-500/30">
                <Gavel className="h-8 w-8 text-red-300" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                  Welcome{userProfile?.display_name ? `, ${userProfile.display_name}` : ''}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
                  We will walk you through creating an auction, choosing how players are grouped,
                  adding teams, and locking in bid rules — so you can go live with confidence.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Calendar, title: '1. Auction', body: 'Name, date, basics' },
                  { icon: Tag, title: '2. Categories', body: 'Open or custom groups' },
                  { icon: Users, title: '3. Teams & rules', body: 'Budgets and bidding' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
                  >
                    <item.icon className="mx-auto mb-2 h-5 w-5 text-red-300" />
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-white/50">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => goTo(eventId ? 'categories' : 'event')}
                  data-testid="onboarding-start"
                >
                  {eventId ? 'Continue setup' : 'Start setup'}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* EVENT */}
        {step === 'event' && (
          <Card className="glass border-white/15" data-testid="onboarding-event">
            <CardHeader>
              <CardTitle className="text-white">
                {eventId ? 'Your auction' : 'Create your auction'}
              </CardTitle>
              <p className="text-sm text-white/55">
                This is the event teams and players will join. You can edit details later.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-name" className="text-white/80">
                    Auction name
                  </Label>
                  <Input
                    id="ob-name"
                    value={eventForm.name}
                    onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                    placeholder="e.g. Summer Premier League 2026"
                    required
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/35"
                    data-testid="onboarding-event-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-date" className="text-white/80">
                    Auction date
                  </Label>
                  <Input
                    id="ob-date"
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    required
                    className="border-white/20 bg-white/5 text-white"
                    data-testid="onboarding-event-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-desc" className="text-white/80">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="ob-desc"
                    rows={3}
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Short blurb for your teams and registrants"
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white/80">Min squad size</Label>
                    <Input
                      type="number"
                      min={1}
                      value={eventForm.rules.min_squad_size}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          rules: {
                            ...eventForm.rules,
                            min_squad_size: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                      className="border-white/20 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Max squad size</Label>
                    <Input
                      type="number"
                      min={1}
                      value={eventForm.rules.max_squad_size}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          rules: {
                            ...eventForm.rules,
                            max_squad_size: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                      className="border-white/20 bg-white/5 text-white"
                    />
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => goTo('welcome')}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-red-600 text-white hover:bg-red-700"
                    data-testid="onboarding-event-next"
                  >
                    {saving ? 'Saving…' : eventId ? 'Save & continue' : 'Create & continue'}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* CATEGORIES */}
        {step === 'categories' && (
          <div className="space-y-4" data-testid="onboarding-categories">
            <Card className="glass border-white/15">
              <CardHeader>
                <CardTitle className="text-white">How should players be grouped?</CardTitle>
                <p className="text-sm text-white/55">
                  Categories set base prices and squad slots (e.g. Batsman, Bowler). If your auction
                  is open with no categories, we create a single <strong className="text-white/80">Default</strong> category for you.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleCategoryModeOpen}
                  disabled={saving || !eventId}
                  className={cn(
                    'rounded-xl border p-5 text-left transition hover:border-red-400/40 hover:bg-red-600/10',
                    categoryMode === 'open'
                      ? 'border-red-400/50 bg-red-600/15 ring-1 ring-red-400/30'
                      : 'border-white/15 bg-white/5'
                  )}
                  data-testid="onboarding-open-auction"
                >
                  <LayoutList className="mb-3 h-6 w-6 text-red-300" />
                  <p className="font-semibold text-white">Open auction</p>
                  <p className="mt-1 text-xs text-white/55">
                    No player categories. We auto-create a <span className="text-white/80">Default</span> category
                    so bidding still works.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryMode('custom');
                    persist({ categoryMode: 'custom', eventId });
                  }}
                  disabled={!eventId}
                  className={cn(
                    'rounded-xl border p-5 text-left transition hover:border-red-400/40 hover:bg-red-600/10',
                    categoryMode === 'custom'
                      ? 'border-red-400/50 bg-red-600/15 ring-1 ring-red-400/30'
                      : 'border-white/15 bg-white/5'
                  )}
                  data-testid="onboarding-custom-categories"
                >
                  <Layers className="mb-3 h-6 w-6 text-red-300" />
                  <p className="font-semibold text-white">Use categories</p>
                  <p className="mt-1 text-xs text-white/55">
                    Create groups like Platinum / Gold or role-based pools with their own base prices.
                  </p>
                </button>
              </CardContent>
            </Card>

            {categoryMode === 'custom' && (
              <Card className="glass border-white/15">
                <CardHeader>
                  <CardTitle className="text-base text-white">Add categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categories.length > 0 && (
                    <ul className="space-y-2">
                      {categories.map((cat) => (
                        <li
                          key={cat.id}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.color || '#e11d2e' }}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{cat.name}</p>
                              <p className="text-xs text-white/45">
                                Base {Number(cat.base_price || 0).toLocaleString()} · {cat.min_players}–
                                {cat.max_players} players
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-white/50 hover:text-red-300"
                            onClick={() => handleDeleteCategory(cat)}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form onSubmit={handleAddCategory} className="space-y-3 rounded-xl border border-dashed border-white/15 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-white/80">Name</Label>
                        <Input
                          value={categoryDraft.name}
                          onChange={(e) =>
                            setCategoryDraft({ ...categoryDraft, name: e.target.value })
                          }
                          placeholder="e.g. All-rounder"
                          className="border-white/20 bg-white/5 text-white placeholder:text-white/35"
                          data-testid="onboarding-category-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/80">Base price</Label>
                        <Input
                          type="number"
                          min={1}
                          value={categoryDraft.base_price}
                          onChange={(e) =>
                            setCategoryDraft({ ...categoryDraft, base_price: e.target.value })
                          }
                          className="border-white/20 bg-white/5 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/80">Color</Label>
                        <Input
                          type="color"
                          value={categoryDraft.color}
                          onChange={(e) =>
                            setCategoryDraft({ ...categoryDraft, color: e.target.value })
                          }
                          className="h-10 border-white/20 bg-white/5 p-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/80">Min players</Label>
                        <Input
                          type="number"
                          min={0}
                          value={categoryDraft.min_players}
                          onChange={(e) =>
                            setCategoryDraft({ ...categoryDraft, min_players: e.target.value })
                          }
                          className="border-white/20 bg-white/5 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/80">Max players</Label>
                        <Input
                          type="number"
                          min={1}
                          value={categoryDraft.max_players}
                          onChange={(e) =>
                            setCategoryDraft({ ...categoryDraft, max_players: e.target.value })
                          }
                          className="border-white/20 bg-white/5 text-white"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={saving}
                      variant="outline"
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add category
                    </Button>
                  </form>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => goTo('event')}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={continueFromCategories}
                      data-testid="onboarding-categories-next"
                    >
                      Continue to teams
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {categoryMode === 'open' && categories.length > 0 && (
              <Card className="glass border-white/15">
                <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-medium text-white">Default category is ready</p>
                      <p className="text-sm text-white/55">
                        Open auction mode — all players share one pool with base price{' '}
                        {Number(categories[0]?.base_price || 0).toLocaleString()}.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => goTo('event')}
                    >
                      Back
                    </Button>
                    <Button
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={() => goTo('teams')}
                    >
                      Continue
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!categoryMode && (
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => goTo('event')}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TEAMS */}
        {step === 'teams' && (
          <Card className="glass border-white/15" data-testid="onboarding-teams">
            <CardHeader>
              <CardTitle className="text-white">Add teams</CardTitle>
              <p className="text-sm text-white/55">
                Create the franchises that will bid. You can assign team admins later from Team management.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {teams.length > 0 && (
                <ul className="space-y-2">
                  {teams.map((team) => (
                    <li
                      key={team.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: team.color || '#e11d2e' }}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">{team.name}</p>
                          <p className="text-xs text-white/45">
                            Budget {Number(team.budget || 0).toLocaleString()} · max squad{' '}
                            {team.max_squad_size}
                          </p>
                        </div>
                      </div>
                      <Users className="h-4 w-4 text-white/35" />
                    </li>
                  ))}
                </ul>
              )}

              <form
                onSubmit={handleAddTeam}
                className="space-y-3 rounded-xl border border-dashed border-white/15 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-white/80">Team name</Label>
                    <Input
                      value={teamDraft.name}
                      onChange={(e) => setTeamDraft({ ...teamDraft, name: e.target.value })}
                      placeholder="e.g. Thunder Strikers"
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/35"
                      data-testid="onboarding-team-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Budget</Label>
                    <Input
                      type="number"
                      min={0}
                      value={teamDraft.budget}
                      onChange={(e) => setTeamDraft({ ...teamDraft, budget: e.target.value })}
                      className="border-white/20 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Max squad size</Label>
                    <Input
                      type="number"
                      min={1}
                      value={teamDraft.max_squad_size}
                      onChange={(e) =>
                        setTeamDraft({ ...teamDraft, max_squad_size: e.target.value })
                      }
                      className="border-white/20 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Color</Label>
                    <Input
                      type="color"
                      value={teamDraft.color}
                      onChange={(e) => setTeamDraft({ ...teamDraft, color: e.target.value })}
                      className="h-10 border-white/20 bg-white/5 p-1"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  data-testid="onboarding-add-team"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add team
                </Button>
              </form>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => goTo('categories')}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={continueFromTeams}
                  data-testid="onboarding-teams-next"
                >
                  Continue to settings
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SETTINGS */}
        {step === 'settings' && (
          <Card className="glass border-white/15" data-testid="onboarding-settings">
            <CardHeader>
              <CardTitle className="text-white">Configure auction rules</CardTitle>
              <p className="text-sm text-white/55">
                These control live bidding. You can change them anytime before the auction starts.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white/80">Min squad size</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rulesForm.min_squad_size}
                      onChange={(e) =>
                        setRulesForm({ ...rulesForm, min_squad_size: e.target.value })
                      }
                      className="border-white/20 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Max squad size</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rulesForm.max_squad_size}
                      onChange={(e) =>
                        setRulesForm({ ...rulesForm, max_squad_size: e.target.value })
                      }
                      className="border-white/20 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Min bid increment</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rulesForm.min_bid_increment}
                      onChange={(e) =>
                        setRulesForm({ ...rulesForm, min_bid_increment: e.target.value })
                      }
                      className="border-white/20 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Timer (seconds)</Label>
                    <Input
                      type="number"
                      min={5}
                      value={rulesForm.timer_duration}
                      onChange={(e) =>
                        setRulesForm({ ...rulesForm, timer_duration: e.target.value })
                      }
                      className="border-white/20 bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">RTM cards per team</Label>
                    <Input
                      type="number"
                      min={0}
                      value={rulesForm.rtm_cards_per_team}
                      onChange={(e) =>
                        setRulesForm({ ...rulesForm, rtm_cards_per_team: e.target.value })
                      }
                      className="border-white/20 bg-white/5 text-white"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-white/80">Collect registration payment</Label>
                      <p className="text-xs text-white/45">
                        Optional fee when players register publicly
                      </p>
                    </div>
                    <Switch
                      checked={!!eventForm.payment_settings?.collect_payment}
                      onCheckedChange={(checked) =>
                        setEventForm({
                          ...eventForm,
                          payment_settings: {
                            ...eventForm.payment_settings,
                            collect_payment: checked,
                          },
                        })
                      }
                    />
                  </div>
                  {eventForm.payment_settings?.collect_payment && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-white/80">Registration fee</Label>
                      <Input
                        type="number"
                        min={1}
                        value={eventForm.payment_settings.registration_fee || ''}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            payment_settings: {
                              ...eventForm.payment_settings,
                              registration_fee: e.target.value
                                ? parseInt(e.target.value, 10)
                                : null,
                            },
                          })
                        }
                        className="border-white/20 bg-white/5 text-white"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => goTo('teams')}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-red-600 text-white hover:bg-red-700"
                    data-testid="onboarding-finish"
                  >
                    {saving ? 'Saving…' : 'Finish setup'}
                    <Check className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* DONE */}
        {step === 'done' && (
          <Card className="glass border-white/15" data-testid="onboarding-done">
            <CardContent className="space-y-6 pt-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Setup complete</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
                  {eventName ? `“${eventName}”` : 'Your auction'} has categories, teams, and rules.
                  Next up: add players (or open public registration) and go live.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {eventId && (
                  <>
                    <Link to={`/admin/players/${eventId}`}>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-red-400/40">
                        <Trophy className="mb-2 h-5 w-5 text-red-300" />
                        <p className="font-medium text-white">Add players</p>
                        <p className="text-xs text-white/50">Import or create the player pool</p>
                      </div>
                    </Link>
                    <Link to={`/admin/teams/${eventId}`}>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-red-400/40">
                        <Users className="mb-2 h-5 w-5 text-red-300" />
                        <p className="font-medium text-white">Manage teams</p>
                        <p className="text-xs text-white/50">Assign admins and tweak budgets</p>
                      </div>
                    </Link>
                    <Link to={`/admin/auction/${eventId}`}>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-red-400/40">
                        <Gavel className="mb-2 h-5 w-5 text-red-300" />
                        <p className="font-medium text-white">Live control</p>
                        <p className="text-xs text-white/50">Run the auction when ready</p>
                      </div>
                    </Link>
                    <Link to="/admin/settings">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-red-400/40">
                        <Settings className="mb-2 h-5 w-5 text-red-300" />
                        <p className="font-medium text-white">Bank settings</p>
                        <p className="text-xs text-white/50">Payout details for registration fees</p>
                      </div>
                    </Link>
                  </>
                )}
              </div>

              <div className="flex justify-center">
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={finishToDashboard}
                  data-testid="onboarding-go-dashboard"
                >
                  Go to dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default OrganizerOnboarding;
