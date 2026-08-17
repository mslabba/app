/**
 * Live Auction Control — rebuilt for stability.
 *
 * Intentional scope (keep this page light):
 *  - Start / pause auction
 *  - Pick next player (search / category / random) among AVAILABLE only
 *  - Sell to team or mark unsold
 *  - Local countdown timer
 *  - Compact team budgets for sale selection
 *  - Recent bid history from auction state
 *
 * Moved off this page (use dedicated routes):
 *  - Full sold / unsold rosters → /admin/sold-players/:eventId
 *  - Full team management → /admin/teams/:eventId
 *  - Player pool editing → /admin/players/:eventId
 *  - Public display / sponsors → /display/:eventId
 *  - Spinning wheel (optional) → control + public + display when enabled
 *  - Safe-bid deep analysis → teams / analytics pages
 */
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  Timer,
  Users,
  Trophy,
  Gavel,
  RefreshCw,
  ExternalLink,
  Search,
  Shuffle,
  CheckCircle2,
  XCircle,
  MonitorPlay,
  UserPlus,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { convertGoogleDriveUrl } from '@/utils/imageUtils';
import SoldOverlay from '@/components/broadcast/SoldOverlay';
import PlayerSpinner from '@/components/PlayerSpinner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_MS = 8000;
const MAX_SELECT_OPTIONS = 80;
const WHEEL_LS_KEY = 'powerauction_enable_wheel';
const WHEEL_MAX_PLAYERS = 40;

const money = (n) => `₹${Number(n ?? 0).toLocaleString()}`;

const statusMeta = (status) => {
  switch (status) {
    case 'in_progress':
      return { label: 'Live', className: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30' };
    case 'paused':
      return { label: 'Paused', className: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30' };
    case 'completed':
      return { label: 'Completed', className: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30' };
    default:
      return { label: 'Not started', className: 'bg-white/10 text-white/70 ring-1 ring-white/15' };
  }
};

/** Isolated timer — only this subtree re-renders each second. */
const CountdownTimer = memo(function CountdownTimer({
  active,
  seconds,
  onTick,
  onExpire,
}) {
  const activeRef = useRef(active);
  const onTickRef = useRef(onTick);
  const onExpireRef = useRef(onExpire);
  activeRef.current = active;
  onTickRef.current = onTick;
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => {
      if (!activeRef.current) return;
      onTickRef.current((prev) => {
        if (prev <= 1) {
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  const danger = seconds > 0 && seconds <= 10;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-2xl font-bold tabular-nums ring-1',
        danger
          ? 'bg-red-600/25 text-red-200 ring-red-400/40'
          : 'bg-white/10 text-white ring-white/15'
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <Timer className="h-5 w-5 shrink-0 opacity-80" />
      {String(Math.floor(seconds / 60)).padStart(2, '0')}:
      {String(seconds % 60).padStart(2, '0')}
    </div>
  );
});

/** Compact team chip for sell selection. */
const TeamChip = memo(function TeamChip({ team, selected, disabled, onSelect }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(team.id)}
      className={cn(
        'flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
        selected
          ? 'border-red-400/60 bg-red-600/20 ring-1 ring-red-400/30'
          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt=""
          className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: team.color || '#e11d2e' }}
        >
          {(team.name || '?').charAt(0)}
        </div>
      )}
      <span className="w-full truncate text-[11px] font-medium text-white/90">{team.name}</span>
      <span className="text-[10px] text-emerald-300/90">{money(team.remaining)}</span>
    </button>
  );
});

function shallowAuctionEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.status === b.status &&
    a.current_player_id === b.current_player_id &&
    a.current_bid === b.current_bid &&
    a.current_team_id === b.current_team_id &&
    a.current_team_name === b.current_team_name &&
    (a.bid_history?.length || 0) === (b.bid_history?.length || 0) &&
    (a.spin?.winner_id || null) === (b.spin?.winner_id || null) &&
    (a.spin?.started_at || null) === (b.spin?.started_at || null)
  );
}

function toWheelPlayers(list, winnerId) {
  const base = Array.isArray(list) ? list.slice(0, WHEEL_MAX_PLAYERS) : [];
  let players = base.map((p) => ({
    id: p.id,
    name: p.name,
    photo_url: p.photo_url || p.image_url || null,
    position: p.position,
    base_price: p.base_price,
  }));
  if (winnerId && !players.some((p) => p.id === winnerId)) {
    const extra = list?.find((p) => p.id === winnerId);
    if (extra) {
      players = [
        {
          id: extra.id,
          name: extra.name,
          photo_url: extra.photo_url || extra.image_url || null,
          position: extra.position,
          base_price: extra.base_price,
        },
        ...players,
      ].slice(0, WHEEL_MAX_PLAYERS);
    }
  }
  return players;
}

const AuctionControl = () => {
  const { eventId } = useParams();
  const { currentUser, token, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [soldFlash, setSoldFlash] = useState(null);

  // Spinning wheel — enabled flag persists like the old control room
  const [enableWheel, setEnableWheel] = useState(() => {
    try {
      const saved = localStorage.getItem(WHEEL_LS_KEY);
      return saved != null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [wheelSession, setWheelSession] = useState(null); // { winnerId, players, key }
  const wheelSessionRef = useRef(null);

  const tokenRef = useRef(token);
  const busyRef = useRef(false);
  tokenRef.current = token;
  busyRef.current = busy;

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${tokenRef.current}` }),
    []
  );

  const defaultTimer = event?.rules?.timer_duration || 60;

  // —— data loaders (stable, minimal) ——
  const loadAuctionState = useCallback(async () => {
    if (!eventId || !tokenRef.current) return null;
    const { data } = await axios.get(`${API}/auction/state/${eventId}`, {
      headers: authHeaders(),
    });
    setAuctionState((prev) => (shallowAuctionEqual(prev, data) ? prev : data));
    return data;
  }, [eventId, authHeaders]);

  const loadCurrentPlayer = useCallback(
    async (playerId, allAvailable) => {
      if (!playerId) {
        setCurrentPlayer(null);
        return;
      }
      const fromList = (allAvailable || []).find((p) => p.id === playerId);
      if (fromList) {
        setCurrentPlayer((prev) => (prev?.id === fromList.id ? prev : fromList));
        return;
      }
      // Already showing this player (e.g. status=current, not in available list)
      let skipFetch = false;
      setCurrentPlayer((prev) => {
        if (prev?.id === playerId) {
          skipFetch = true;
          return prev;
        }
        return prev;
      });
      if (skipFetch) return;
      try {
        const { data } = await axios.get(`${API}/players/${playerId}`, {
          headers: authHeaders(),
        });
        setCurrentPlayer(data || null);
      } catch {
        setCurrentPlayer(null);
      }
    },
    [authHeaders]
  );

  const loadAvailablePlayers = useCallback(async () => {
    if (!eventId || !tokenRef.current) return [];
    // Available + on_hold (skipped without sale) can be put back on the block
    const { data } = await axios.get(`${API}/auctions/${eventId}/players`, {
      headers: authHeaders(),
      params: { status: 'available,on_hold' },
    });
    const list = Array.isArray(data) ? data : [];
    setAvailablePlayers(list);
    return list;
  }, [eventId, authHeaders]);

  const loadTeams = useCallback(async () => {
    if (!eventId || !tokenRef.current) return;
    const { data } = await axios.get(`${API}/teams/event/${eventId}`, {
      headers: authHeaders(),
    });
    setTeams(Array.isArray(data) ? data : []);
  }, [eventId, authHeaders]);

  // force:true — always refresh after an action (busy flag would otherwise skip)
  const refreshCore = useCallback(async ({ force = false } = {}) => {
    if (busyRef.current && !force) return;
    try {
      const [state, available] = await Promise.all([
        loadAuctionState(),
        loadAvailablePlayers(),
      ]);
      // Teams change less often; still refresh but don't block player resolve
      loadTeams().catch(() => {});
      await loadCurrentPlayer(state?.current_player_id, available);
      if (state?.current_team_id) {
        setSelectedTeamId((prev) => prev || state.current_team_id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [loadAuctionState, loadAvailablePlayers, loadTeams, loadCurrentPlayer]);

  // Initial boot
  useEffect(() => {
    if (!eventId || !token || authLoading || !currentUser) return undefined;
    let cancelled = false;

    (async () => {
      setBootLoading(true);
      try {
        const [eventRes, catsRes, state, available] = await Promise.all([
          axios.get(`${API}/auctions/${eventId}`, { headers: authHeaders() }),
          axios.get(`${API}/auctions/${eventId}/categories`, { headers: authHeaders() }),
          loadAuctionState(),
          loadAvailablePlayers(),
        ]);
        if (cancelled) return;
        await loadTeams();
        setEvent(eventRes.data);
        setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
        const duration = eventRes.data?.rules?.timer_duration || 60;
        setTimerSeconds(duration);
        await loadCurrentPlayer(state?.current_player_id, available);
        if (state?.current_bid) setSalePrice(String(state.current_bid));
        if (state?.current_team_id) setSelectedTeamId(state.current_team_id);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load auction control');
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, token, authLoading, currentUser, authHeaders, loadAuctionState, loadAvailablePlayers, loadTeams, loadCurrentPlayer]);

  // Light polling — auction state + available players only (skip when tab hidden / busy)
  const refreshCoreRef = useRef(refreshCore);
  refreshCoreRef.current = refreshCore;
  useEffect(() => {
    if (!eventId || !token || authLoading || !currentUser) return undefined;
    const id = setInterval(() => {
      if (document.hidden || busyRef.current) return;
      refreshCoreRef.current();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [eventId, token, authLoading, currentUser]);

  // When the on-block player changes, seed price and reset the local timer.
  const onBlockPlayerId = currentPlayer?.id;
  const lastSeededPlayerRef = useRef(null);
  useEffect(() => {
    if (!onBlockPlayerId) {
      lastSeededPlayerRef.current = null;
      return;
    }
    if (lastSeededPlayerRef.current === onBlockPlayerId) return;
    lastSeededPlayerRef.current = onBlockPlayerId;
    const seedPrice =
      auctionState?.current_bid != null
        ? String(auctionState.current_bid)
        : String(currentPlayer?.base_price || '');
    setSalePrice(seedPrice);
    setTimerSeconds(defaultTimer);
    setTimerActive(false);
  }, [onBlockPlayerId, auctionState?.current_bid, currentPlayer?.base_price, defaultTimer]);

  const filteredPlayers = useMemo(() => {
    let list = availablePlayers;
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category_id === categoryFilter);
    }
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.position?.toLowerCase().includes(q) ||
          p.specialty?.toLowerCase().includes(q)
      );
    }
    // Priority first, available before on_hold, then name — cap for DOM stability
    return [...list]
      .sort((a, b) => {
        if (a.is_priority && !b.is_priority) return -1;
        if (!a.is_priority && b.is_priority) return 1;
        const aHold = a.status === 'on_hold' ? 1 : 0;
        const bHold = b.status === 'on_hold' ? 1 : 0;
        if (aHold !== bHold) return aHold - bHold;
        return (a.name || '').localeCompare(b.name || '');
      })
      .slice(0, MAX_SELECT_OPTIONS);
  }, [availablePlayers, categoryFilter, searchTerm]);

  const categoryName = useCallback(
    (id) => categories.find((c) => c.id === id)?.name || '—',
    [categories]
  );

  const recentBids = useMemo(() => {
    const h = auctionState?.bid_history;
    if (!Array.isArray(h)) return [];
    return h.slice(-8).reverse();
  }, [auctionState?.bid_history]);

  const meta = statusMeta(auctionState?.status);

  // —— actions ——
  const withBusy = async (fn, errMsg) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e.response?.data?.detail || errMsg || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const startAuction = () =>
    withBusy(async () => {
      await axios.post(`${API}/auction/start/${eventId}`, {}, { headers: authHeaders() });
      toast.success('Auction started');
      await refreshCore({ force: true });
    }, 'Failed to start');

  const pauseAuction = () =>
    withBusy(async () => {
      await axios.post(`${API}/auction/pause/${eventId}`, {}, { headers: authHeaders() });
      setTimerActive(false);
      toast.success('Auction paused');
      await refreshCore({ force: true });
    }, 'Failed to pause');

  const applyPlayerOnBlockLocally = useCallback(
    (playerId, playerSnap) => {
      const snap =
        playerSnap ||
        availablePlayers.find((p) => p.id === playerId) ||
        filteredPlayers.find((p) => p.id === playerId);
      if (snap) {
        setCurrentPlayer({ ...snap, status: 'current' });
      }
      setAuctionState((prev) =>
        prev
          ? {
              ...prev,
              current_player_id: playerId,
              current_bid: snap?.base_price ?? prev.current_bid ?? 0,
              current_team_id: null,
              current_team_name: null,
              spin: null,
            }
          : prev
      );
      setSelectedPlayerId('');
      setSalePrice(snap?.base_price != null ? String(snap.base_price) : '');
      setSelectedTeamId('');
      setTimerActive(false);
      setTimerSeconds(defaultTimer);
    },
    [availablePlayers, filteredPlayers, defaultTimer]
  );

  const commitNextPlayer = async (playerId, playerSnap) => {
    const previous = currentPlayer;
    // Optimistic UI so control matches public boards immediately
    applyPlayerOnBlockLocally(playerId, playerSnap);
    // Optimistically move previous on-block player to on_hold in the local pool
    if (previous?.id && previous.id !== playerId) {
      setAvailablePlayers((list) => {
        const rest = list.filter((p) => p.id !== playerId);
        const held = { ...previous, status: 'on_hold' };
        if (rest.some((p) => p.id === held.id)) {
          return rest.map((p) => (p.id === held.id ? held : p));
        }
        return [...rest, held];
      });
    }
    const { data } = await axios.post(
      `${API}/auction/next-player/${eventId}?player_id=${playerId}`,
      {},
      { headers: authHeaders() }
    );
    const held = data?.held_players || [];
    if (held.length) {
      const names = held.map((h) => h.player_name).filter(Boolean).join(', ');
      toast.success(
        playerSnap?.name
          ? `${playerSnap.name} is on the block · ${names} on hold`
          : 'Player is on the block'
      );
    } else {
      toast.success(
        playerSnap?.name
          ? `${playerSnap.name} is on the block`
          : 'Player is on the block'
      );
    }
    await refreshCore({ force: true });
  };

  const startWheelForPlayer = async (winnerId) => {
    const poolSource =
      filteredPlayers.length >= 2 ? filteredPlayers : availablePlayers;
    const players = toWheelPlayers(poolSource, winnerId);
    if (players.length < 2) {
      toast.error('Need at least 2 available players for the wheel');
      return false;
    }
    if (!players.some((p) => p.id === winnerId)) {
      toast.error('Selected player is not in the wheel pool');
      return false;
    }
    // Broadcast spin so display + public boards animate together
    try {
      await axios.post(
        `${API}/auction/spin/${eventId}`,
        { winner_id: winnerId, players },
        { headers: authHeaders() }
      );
    } catch (e) {
      // Still show local wheel even if broadcast fails
      console.warn('Spin broadcast failed', e);
      toast.message('Wheel started locally (broadcast unavailable)');
    }
    const session = {
      winnerId,
      players,
      key: `${winnerId}-${Date.now()}`,
    };
    wheelSessionRef.current = session;
    setWheelSession(session);
    setAuctionState((prev) =>
      prev
        ? {
            ...prev,
            spin: {
              winner_id: winnerId,
              players,
              started_at: new Date().toISOString(),
            },
          }
        : prev
    );
    return true;
  };

  const setNextPlayer = (playerId) =>
    withBusy(async () => {
      if (!playerId) {
        toast.error('Select a player first');
        return;
      }
      const snap =
        availablePlayers.find((p) => p.id === playerId) ||
        filteredPlayers.find((p) => p.id === playerId);

      // Wheel enabled → animate first, then put on block
      if (enableWheel) {
        const ok = await startWheelForPlayer(playerId);
        if (!ok) {
          // Fallback to immediate put-on-block if wheel can't run
          await commitNextPlayer(playerId, snap);
        }
        return;
      }

      await commitNextPlayer(playerId, snap);
    }, 'Failed to set player');

  const onWheelComplete = () =>
    withBusy(async () => {
      const session = wheelSessionRef.current;
      wheelSessionRef.current = null;
      setWheelSession(null);
      if (!session?.winnerId) return;
      const snap =
        availablePlayers.find((p) => p.id === session.winnerId) ||
        session.players.find((p) => p.id === session.winnerId);
      await commitNextPlayer(session.winnerId, snap);
    }, 'Failed to set player after spin');

  const pickRandom = () => {
    if (filteredPlayers.length === 0) {
      toast.error('No available players in this filter');
      return;
    }
    const priority = filteredPlayers.filter((p) => p.is_priority);
    const pool = priority.length ? priority : filteredPlayers;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSelectedPlayerId(pick.id);
    toast.message(`Selected ${pick.name}`);
  };

  const spinRandomToBlock = () =>
    withBusy(async () => {
      if (filteredPlayers.length === 0) {
        toast.error('No available players in this filter');
        return;
      }
      const priority = filteredPlayers.filter((p) => p.is_priority);
      const pool = priority.length ? priority : filteredPlayers;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setSelectedPlayerId(pick.id);
      if (enableWheel) {
        const ok = await startWheelForPlayer(pick.id);
        if (!ok) await commitNextPlayer(pick.id, pick);
      } else {
        await commitNextPlayer(pick.id, pick);
      }
    }, 'Failed to spin next player');

  const toggleWheel = () => {
    setEnableWheel((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(WHEEL_LS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      toast.message(next ? 'Spinning wheel ON' : 'Spinning wheel OFF');
      return next;
    });
  };

  const recordBid = () =>
    withBusy(async () => {
      if (!currentPlayer) {
        toast.error('No player on the block');
        return;
      }
      if (!selectedTeamId) {
        toast.error('Select the bidding team');
        return;
      }
      const amount = parseInt(salePrice, 10);
      if (!amount || amount <= 0) {
        toast.error('Enter a bid amount');
        return;
      }
      const minBid = (auctionState?.current_bid || currentPlayer.base_price || 0) + 0;
      // Must be strictly higher than current bid if one exists
      if (auctionState?.current_bid != null && amount <= auctionState.current_bid) {
        toast.error(`Bid must be higher than ${money(auctionState.current_bid)}`);
        return;
      }
      if (amount < (currentPlayer.base_price || 0)) {
        toast.error(`Bid must be at least base price ${money(currentPlayer.base_price)}`);
        return;
      }
      await axios.post(
        `${API}/bids/organizer-place`,
        {
          player_id: currentPlayer.id,
          event_id: eventId,
          team_id: selectedTeamId,
          amount,
        },
        { headers: authHeaders() }
      );
      const teamName = teams.find((t) => t.id === selectedTeamId)?.name || 'Team';
      toast.success(`Bid recorded: ${teamName} · ${money(amount)}`);
      // Reset timer locally for next call window
      setTimerSeconds(defaultTimer);
      setTimerActive(true);
      await refreshCore({ force: true });
    }, 'Failed to record bid');

  const sellPlayer = () =>
    withBusy(async () => {
      if (!currentPlayer) {
        toast.error('No player on the block');
        return;
      }
      if (!selectedTeamId) {
        toast.error('Select a team');
        return;
      }
      const price = parseInt(salePrice, 10);
      const min = currentPlayer.base_price || 0;
      if (!price || price < min) {
        toast.error(`Price must be at least ${money(min)}`);
        return;
      }
      const soldPlayerSnap = { ...currentPlayer };
      const teamName = teams.find((t) => t.id === selectedTeamId)?.name || 'Team';
      await axios.post(
        `${API}/players/${currentPlayer.id}/sell?team_id=${selectedTeamId}&price=${price}&event_id=${eventId}`,
        {},
        { headers: authHeaders() }
      );
      setSoldFlash({
        type: 'sold',
        playerName: soldPlayerSnap.name,
        teamName,
        price,
        photoUrl: convertGoogleDriveUrl(soldPlayerSnap.photo_url || soldPlayerSnap.image_url),
        key: String(Date.now()),
      });
      toast.success(`${soldPlayerSnap.name} sold to ${teamName} for ${money(price)}`);
      setTimerActive(false);
      setSalePrice('');
      setSelectedTeamId('');
      setCurrentPlayer(null);
      await refreshCore({ force: true });
    }, 'Sale failed');

  const markUnsold = () =>
    withBusy(async () => {
      if (!currentPlayer) {
        toast.error('No player on the block');
        return;
      }
      if (!window.confirm(`Mark ${currentPlayer.name} as unsold?`)) return;
      const snap = { ...currentPlayer };
      await axios.post(
        `${API}/players/${currentPlayer.id}/mark-unsold?event_id=${eventId}`,
        {},
        { headers: authHeaders() }
      );
      setSoldFlash({
        type: 'unsold',
        playerName: snap.name,
        teamName: null,
        price: null,
        photoUrl: convertGoogleDriveUrl(snap.photo_url || snap.image_url),
        key: String(Date.now()),
      });
      toast.success(`${snap.name} marked unsold`);
      setTimerActive(false);
      setSalePrice('');
      setSelectedTeamId('');
      setCurrentPlayer(null);
      await refreshCore({ force: true });
    }, 'Failed to mark unsold');

  // Clear SOLD flash after ~10s
  useEffect(() => {
    if (!soldFlash) return undefined;
    const t = setTimeout(() => setSoldFlash(null), 10000);
    return () => clearTimeout(t);
  }, [soldFlash?.key]);

  const onTimerExpire = useCallback(() => {
    setTimerActive(false);
    toast.info('Timer ended — finalize the sale or mark unsold');
  }, []);

  if (authLoading || !currentUser) {
    return (
      <AppShell title="Live control">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </AppShell>
    );
  }

  if (bootLoading) {
    return (
      <AppShell title="Live control" subtitle="Loading…">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-sm text-white/60">Loading live control…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Live control" subtitle={event?.name}>
      <div className="relative container mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {soldFlash && (
          <SoldOverlay
            key={soldFlash.key || `${soldFlash.type}-${soldFlash.playerName}-${soldFlash.price}`}
            type={soldFlash.type}
            playerName={soldFlash.playerName}
            teamName={soldFlash.teamName}
            price={soldFlash.price}
            photoUrl={soldFlash.photoUrl}
            className="fixed inset-0 z-50"
            onDismiss={() => setSoldFlash(null)}
          />
        )}
        {wheelSession && (
          <PlayerSpinner
            key={wheelSession.key}
            players={wheelSession.players}
            winnerId={wheelSession.winnerId}
            spinKey={wheelSession.key}
            onComplete={onWheelComplete}
          />
        )}
        <PageHeader
          title="Live control"
          description={
            event
              ? `${event.name} · operator console (display board is separate)`
              : 'Operator console'
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <a href={`/display/${eventId}`} target="_blank" rel="noreferrer">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <MonitorPlay className="mr-1.5 h-4 w-4" />
                  Display board
                  <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
                </Button>
              </a>
              <Link to={`/admin/sold-players/${eventId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Trophy className="mr-1.5 h-4 w-4" />
                  Sold / unsold
                </Button>
              </Link>
              <Link to={`/admin/teams/${eventId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Users className="mr-1.5 h-4 w-4" />
                  Teams
                </Button>
              </Link>
              <Link to={`/admin/players/${eventId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Players
                </Button>
              </Link>
              <Link to={`/admin/events/${eventId}/settings`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Settings className="mr-1.5 h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                disabled={busy}
                onClick={() => refreshCore()}
              >
                <RefreshCw className={cn('mr-1.5 h-4 w-4', busy && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          }
        />

        {/* Status bar */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', meta.className)}>
              {meta.label}
            </span>
            <span className="text-sm text-white/55">
              {availablePlayers.length} available in pool
              {categoryFilter !== 'all' || searchTerm
                ? ` · showing ${filteredPlayers.length}${filteredPlayers.length >= MAX_SELECT_OPTIONS ? '+' : ''}`
                : ''}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CountdownTimer
              active={timerActive}
              seconds={timerSeconds}
              onTick={setTimerSeconds}
              onExpire={onTimerExpire}
            />
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => {
                if (timerSeconds <= 0) setTimerSeconds(defaultTimer);
                setTimerActive((a) => !a);
              }}
            >
              {timerActive ? (
                <>
                  <Pause className="mr-1 h-3.5 w-3.5" /> Pause timer
                </>
              ) : (
                <>
                  <Play className="mr-1 h-3.5 w-3.5" /> Start timer
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => {
                setTimerActive(false);
                setTimerSeconds(defaultTimer);
              }}
            >
              Reset
            </Button>
            {(auctionState?.status === 'not_started' || auctionState?.status === 'paused') && (
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={busy}
                onClick={startAuction}
              >
                <Play className="mr-1 h-3.5 w-3.5" />
                {auctionState?.status === 'paused' ? 'Resume' : 'Start auction'}
              </Button>
            )}
            {auctionState?.status === 'in_progress' && (
              <Button
                size="sm"
                className="bg-amber-600 text-white hover:bg-amber-700"
                disabled={busy}
                onClick={pauseAuction}
              >
                <Pause className="mr-1 h-3.5 w-3.5" />
                Pause auction
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Current player + sale */}
          <div className="space-y-6 lg:col-span-3">
            <Card className="glass border-white/15">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Gavel className="h-5 w-5 text-red-300" />
                  On the block
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!currentPlayer ? (
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-14 text-center">
                    <Gavel className="mx-auto mb-3 h-10 w-10 text-white/25" />
                    <p className="text-white/70">No player selected</p>
                    <p className="mt-1 text-sm text-white/45">
                      Pick the next player from the panel on the right.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <div className="mx-auto shrink-0 sm:mx-0">
                      {currentPlayer.photo_url || currentPlayer.image_url ? (
                        <img
                          src={convertGoogleDriveUrl(
                            currentPlayer.photo_url || currentPlayer.image_url
                          )}
                          alt=""
                          className="h-40 w-40 rounded-2xl object-cover ring-1 ring-white/20"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-white/10 text-4xl font-bold text-white/50 ring-1 ring-white/15">
                          {(currentPlayer.name || '?').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <h2 className="text-2xl font-bold text-white">{currentPlayer.name}</h2>
                        <p className="text-sm text-white/55">
                          {currentPlayer.position || 'Player'}
                          {currentPlayer.specialty ? ` · ${currentPlayer.specialty}` : ''}
                          {' · '}
                          {categoryName(currentPlayer.category_id)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-white/10 text-white ring-1 ring-white/15">
                          Base {money(currentPlayer.base_price)}
                        </Badge>
                        {auctionState?.current_bid != null && (
                          <Badge className="bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                            Bid {money(auctionState.current_bid)}
                            {auctionState.current_team_name
                              ? ` · ${auctionState.current_team_name}`
                              : ''}
                          </Badge>
                        )}
                        {currentPlayer.is_priority && (
                          <Badge className="bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25">
                            Priority
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-white/70">Sale price</Label>
                          <Input
                            type="number"
                            min={currentPlayer.base_price || 0}
                            value={salePrice}
                            onChange={(e) => setSalePrice(e.target.value)}
                            className="border-white/20 bg-white/5 text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-white/70">Team</Label>
                          <Select value={selectedTeamId || undefined} onValueChange={setSelectedTeamId}>
                            <SelectTrigger className="border-white/20 bg-white/5 text-white">
                              <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                            <SelectContent>
                              {teams.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} ({money(t.remaining)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          className="bg-amber-600 text-white hover:bg-amber-700"
                          disabled={busy}
                          onClick={recordBid}
                          title="Record a bid call for the selected team (updates public boards)"
                        >
                          <TrendingUp className="mr-1.5 h-4 w-4" />
                          Record bid
                        </Button>
                        <Button
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={busy}
                          onClick={sellPlayer}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Confirm sale
                        </Button>
                        <Button
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                          disabled={busy}
                          onClick={markUnsold}
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Mark unsold
                        </Button>
                      </div>
                      <p className="text-[11px] text-white/40">
                        Use <strong className="text-white/55">Record bid</strong> for each call so
                        display boards show amount + team. Then Confirm sale when hammer falls.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team grid for quick pick */}
            <Card className="glass border-white/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">Teams · remaining budget</CardTitle>
                <p className="text-xs text-white/45">
                  Tap a team to sell to. Full budgets and squads live under Teams.
                </p>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <p className="text-sm text-white/50">No teams yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {teams.map((team) => (
                      <TeamChip
                        key={team.id}
                        team={team}
                        selected={selectedTeamId === team.id}
                        disabled={
                          !!currentPlayer &&
                          (team.remaining ?? 0) < (currentPlayer.base_price || 0)
                        }
                        onSelect={setSelectedTeamId}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bid call trail for this lot */}
            <Card className="glass border-white/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">Bid calls (this player)</CardTitle>
              </CardHeader>
              <CardContent>
                {recentBids.length === 0 ? (
                  <p className="text-sm text-white/45">
                    No bids yet — select team, set amount, click Record bid.
                  </p>
                ) : (
                  <ul className="max-h-48 divide-y divide-white/10 overflow-y-auto">
                    {[...recentBids].reverse().map((bid, i) => (
                      <li
                        key={`${bid.timestamp || i}-${bid.amount}-${bid.team_id || bid.team_name}`}
                        className="flex items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-white/75">
                          <span className="mr-2 text-white/35">{recentBids.length - i}.</span>
                          {bid.team_name || bid.team_id || 'Team'}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-emerald-300">
                          {money(bid.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Next player panel */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="glass border-white/15">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Next player</CardTitle>
                <p className="text-xs text-white/45">
                  Available and on-hold players (max {MAX_SELECT_OPTIONS} in view). Skipping a
                  player without sale moves them to On Hold.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-white/70">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="border-white/20 bg-white/5 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Name, position…"
                      className="border-white/20 bg-white/5 pl-9 text-white placeholder:text-white/35"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70">Player</Label>
                  <Select
                    value={selectedPlayerId || undefined}
                    onValueChange={setSelectedPlayerId}
                  >
                    <SelectTrigger className="border-white/20 bg-white/5 text-white">
                      <SelectValue placeholder={`${filteredPlayers.length} available`} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {filteredPlayers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.is_priority ? '★ ' : ''}
                          {p.status === 'on_hold' ? '⏸ ' : ''}
                          {p.name}
                          {p.status === 'on_hold' ? ' (on hold)' : ''}
                          {p.base_price != null ? ` · ${money(p.base_price)}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-white/80">Spinning wheel</p>
                    <p className="text-[10px] text-white/45">
                      Shows on control, display &amp; public boards
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleWheel}
                    className={cn(
                      'rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition',
                      enableWheel
                        ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                        : 'border-white/15 bg-white/5 text-white/50'
                    )}
                    aria-pressed={enableWheel}
                  >
                    {enableWheel ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={pickRandom}
                    disabled={busy || !!wheelSession || filteredPlayers.length === 0}
                  >
                    <Shuffle className="mr-1.5 h-4 w-4" />
                    Random from filter
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      'border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20',
                      !enableWheel && 'opacity-80'
                    )}
                    onClick={spinRandomToBlock}
                    disabled={busy || !!wheelSession || filteredPlayers.length === 0}
                  >
                    <Shuffle className="mr-1.5 h-4 w-4" />
                    {enableWheel ? 'Spin random to block' : 'Random to block'}
                  </Button>
                  <Button
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={busy || !!wheelSession || !selectedPlayerId}
                    onClick={() => setNextPlayer(selectedPlayerId)}
                  >
                    {enableWheel ? 'Spin onto the block' : 'Put on the block'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="space-y-2 pt-5 text-sm text-white/55">
                <p className="font-medium text-white/80">Keep this page light</p>
                <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed">
                  <li>
                    <Link className="text-red-300 hover:underline" to={`/admin/sold-players/${eventId}`}>
                      Sold players
                    </Link>{' '}
                    — re-open unsold, rosters
                  </li>
                  <li>
                    <Link className="text-red-300 hover:underline" to={`/admin/teams/${eventId}`}>
                      Teams
                    </Link>{' '}
                    — budgets, admins, share links
                  </li>
                  <li>
                    <a
                      className="text-red-300 hover:underline"
                      href={`/display/${eventId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Display board
                    </a>{' '}
                    — audience / projector view
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default AuctionControl;
