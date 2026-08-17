/**
 * Organizer display board (/display/:eventId) — fixed viewport, sponsors + bids.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target } from 'lucide-react';
import { convertGoogleDriveUrl } from '@/utils/imageUtils';
import { formatTimer, useAuctionCountdown } from '@/lib/auctionTimer';
import SoldOverlay from '@/components/broadcast/SoldOverlay';
import BroadcastShell from '@/components/broadcast/BroadcastShell';
import PlayerSpinner from '@/components/PlayerSpinner';
import { cn } from '@/lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatCurrency = (amount) => {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

const AuctionDisplay = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [sponsors, setSponsors] = useState([]);
  const [auctionState, setAuctionState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [categories, setCategories] = useState([]);
  const [teamsSafeBidSummary, setTeamsSafeBidSummary] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [soldFlash, setSoldFlash] = useState(null);
  const prevPlayerRef = useRef(null);
  const prevBidRef = useRef(null);

  useEffect(() => {
    if (!eventId) return undefined;
    let cancelled = false;

    const fetchAuctionData = async () => {
      try {
        const [auctionResponse, catsResponse, eventResponse, sponsorsResponse] =
          await Promise.all([
            axios.get(`${API}/auction/state/${eventId}`),
            axios.get(`${API}/auctions/${eventId}/categories`).catch(() => ({ data: [] })),
            axios.get(`${API}/auctions/${eventId}`).catch(() => ({ data: null })),
            axios.get(`${API}/sponsors/event/${eventId}`).catch(() => ({ data: [] })),
          ]);
        if (cancelled) return;

        const state = auctionResponse.data;
        setAuctionState(state);
        setCategories(Array.isArray(catsResponse.data) ? catsResponse.data : []);
        if (eventResponse.data) setEvent(eventResponse.data);
        const sp = Array.isArray(sponsorsResponse.data) ? sponsorsResponse.data : [];
        setSponsors(sp.filter((s) => s.is_active !== false));

        const lr = state?.last_result;
        if (lr?.type && lr?.at) {
          const age = Date.now() - new Date(lr.at).getTime();
          if (age < 12000 && age >= 0) {
            setSoldFlash({
              type: lr.type,
              playerName: lr.player_name,
              teamName: lr.team_name,
              price: lr.price,
              photoUrl: convertGoogleDriveUrl(lr.photo_url),
              key: lr.at,
            });
          }
        }

        if (state.current_player_id) {
          const playerResponse = await axios.get(
            `${API}/players/${state.current_player_id}`
          );
          if (cancelled) return;
          setCurrentPlayer(playerResponse.data);
          prevPlayerRef.current = playerResponse.data;

          try {
            const safeBidResponse = await axios.get(
              `${API}/auctions/${eventId}/teams-safe-bid-summary`
            );
            if (!cancelled) setTeamsSafeBidSummary(safeBidResponse.data);
          } catch {
            // optional
          }
        } else {
          if (prevPlayerRef.current && !lr) {
            const p = prevPlayerRef.current;
            if (p.status === 'sold' || prevBidRef.current?.team) {
              setSoldFlash({
                type: 'sold',
                playerName: p.name,
                teamName: prevBidRef.current?.team || p.sold_to_team_name,
                price: prevBidRef.current?.bid || p.sold_price,
                photoUrl: convertGoogleDriveUrl(p.photo_url),
                key: String(Date.now()),
              });
            }
          }
          setCurrentPlayer(null);
        }

        if (state.current_bid != null) {
          prevBidRef.current = {
            bid: state.current_bid,
            team: state.current_team_name,
          };
        }

        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch auction data:', error);
      }
    };

    fetchAuctionData();
    const interval = setInterval(fetchAuctionData, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [eventId]);

  useEffect(() => {
    if (!soldFlash) return undefined;
    const t = setTimeout(() => setSoldFlash(null), 10000);
    return () => clearTimeout(t);
  }, [soldFlash?.key]);

  const categoryName = useMemo(() => {
    if (!currentPlayer?.category_id) return currentPlayer?.category || '—';
    return (
      categories.find((c) => c.id === currentPlayer.category_id)?.name ||
      currentPlayer.category ||
      '—'
    );
  }, [currentPlayer, categories]);

  const photoSrc = convertGoogleDriveUrl(
    currentPlayer?.photo_url || currentPlayer?.image_url || soldFlash?.photoUrl
  );

  const secondsLeft = useAuctionCountdown(
    auctionState?.timer_started_at,
    auctionState?.timer_duration || 60,
    null
  );

  const showTimer =
    currentPlayer &&
    auctionState?.status === 'in_progress' &&
    auctionState?.timer_started_at &&
    secondsLeft != null;

  const bidAmount =
    auctionState?.current_bid ?? currentPlayer?.base_price ?? currentPlayer?.current_price;

  const latestBids = Array.isArray(auctionState?.bid_history)
    ? [...auctionState.bid_history].slice(-2).reverse()
    : [];

  const teams = teamsSafeBidSummary?.teams || [];
  const spin = auctionState?.spin;
  // Latch spin so 1.5s polling does not remount/restart the wheel
  const latchedSpinRef = useRef(null);
  const [latchedSpin, setLatchedSpin] = useState(null);
  useEffect(() => {
    const active =
      spin?.winner_id && Array.isArray(spin?.players) && spin.players.length >= 2;
    if (active) {
      const key = `${spin.winner_id}|${spin.started_at || ''}`;
      if (latchedSpinRef.current?.key !== key) {
        latchedSpinRef.current = {
          key,
          spin: {
            winner_id: spin.winner_id,
            started_at: spin.started_at,
            players: spin.players.map((p) => ({ ...p })),
          },
          at: Date.now(),
        };
        setLatchedSpin(latchedSpinRef.current.spin);
      }
      return undefined;
    }
    if (latchedSpinRef.current) {
      const elapsed = Date.now() - (latchedSpinRef.current.at || 0);
      const remaining = Math.max(300, 10500 - elapsed);
      const t = setTimeout(() => {
        latchedSpinRef.current = null;
        setLatchedSpin(null);
      }, remaining);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [spin]);
  const showSpin = Boolean(latchedSpin?.winner_id);

  return (
    <BroadcastShell
      event={event || { name: 'Live auction', logo_url: null }}
      sponsors={sponsors}
      footerLeft="Display board"
      footerRight={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : undefined}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {showSpin && latchedSpin && (
          <PlayerSpinner
            key={latchedSpinRef.current?.key || latchedSpin.winner_id}
            players={latchedSpin.players}
            winnerId={latchedSpin.winner_id}
            spinKey={latchedSpin.started_at || latchedSpin.winner_id}
          />
        )}
        {soldFlash && !showSpin && (
          <SoldOverlay
            key={soldFlash.key || `${soldFlash.playerName}-${soldFlash.price}`}
            type={soldFlash.type}
            playerName={soldFlash.playerName}
            teamName={soldFlash.teamName}
            price={soldFlash.price}
            photoUrl={soldFlash.photoUrl}
          />
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-12 lg:gap-4">
          {/* Main player panel */}
          <div className="flex min-h-0 flex-col overflow-hidden lg:col-span-8">
            {currentPlayer && auctionState ? (
              <div
                key={currentPlayer.id || currentPlayer.name}
                className="block-enter flex min-h-0 flex-1 flex-col rounded-2xl border border-white/15 bg-black/30 p-3 sm:p-4"
              >
                <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center text-sm font-semibold text-white/80">
                    <Trophy className="mr-1.5 h-4 w-4 text-red-300" />
                    On the block
                  </span>
                  {showTimer && (
                    <span
                      className={cn(
                        'rounded-xl px-3 py-1 font-mono text-xl font-bold tabular-nums ring-1 sm:text-2xl',
                        secondsLeft <= 10
                          ? 'bg-red-600/40 text-red-100 ring-red-400/50'
                          : 'bg-white/10 text-white ring-white/20'
                      )}
                    >
                      {formatTimer(secondsLeft)}
                    </span>
                  )}
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 items-center gap-3 overflow-hidden md:grid-cols-2 md:gap-4">
                  <div className="flex min-h-0 items-center justify-center">
                    <div className="relative aspect-square h-full max-h-[min(40vh,320px)] w-full max-w-[min(40vh,320px)]">
                      <div
                        className="block-ring-pulse pointer-events-none absolute -inset-1 rounded-[1.25rem] ring-2 ring-red-400/50"
                        aria-hidden
                      />
                      <div className="block-photo-enter relative h-full w-full overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/15">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={currentPlayer.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl font-black text-white/25">
                            {(currentPlayer.name || '?').charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col justify-center gap-2 overflow-hidden">
                    <h2
                      className="block-fade-up truncate text-3xl font-black sm:text-4xl md:text-5xl"
                      style={{ animationDelay: '0.12s' }}
                    >
                      {currentPlayer.name}
                    </h2>
                    <p
                      className="block-fade-up truncate text-sm text-white/65"
                      style={{ animationDelay: '0.2s' }}
                    >
                      {[currentPlayer.position, categoryName, currentPlayer.specialty]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p
                      className="block-fade-up text-xs text-white/45"
                      style={{ animationDelay: '0.24s' }}
                    >
                      Base {formatCurrency(currentPlayer.base_price)}
                    </p>

                    <div
                      className="block-fade-up rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 sm:px-4 sm:py-3"
                      style={{ animationDelay: '0.3s' }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
                        Current bid
                      </p>
                      <p className="text-4xl font-black tabular-nums text-amber-300 sm:text-5xl md:text-6xl">
                        {formatCurrency(bidAmount)}
                      </p>
                      {auctionState.current_team_name && (
                        <Badge className="mt-1.5 bg-emerald-600 text-white">
                          Leading: {auctionState.current_team_name}
                        </Badge>
                      )}
                    </div>

                    {latestBids.length > 0 && (
                      <div
                        className="block-fade-up rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        style={{ animationDelay: '0.4s' }}
                      >
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-white/40">
                          Latest bids
                        </p>
                        <ul className="space-y-0.5 text-sm">
                          {latestBids.map((b, i) => (
                            <li
                              key={`${b.timestamp || i}-${b.amount}-${b.team_name}`}
                              className="flex justify-between gap-2 text-white/80"
                            >
                              <span className="truncate">{b.team_name || 'Team'}</span>
                              <span className="shrink-0 font-bold tabular-nums text-amber-200">
                                {formatCurrency(b.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 text-center">
                <Trophy className="mb-3 h-12 w-12 text-white/30" />
                <p className="text-xl text-white/70">No active player</p>
                <p className="mt-1 text-sm text-white/45">Waiting for the next player…</p>
              </div>
            )}
          </div>

          {/* Teams sidebar — no page scroll; internal scroll only if many teams */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-3 lg:col-span-4">
            <h3 className="mb-2 flex shrink-0 items-center text-sm font-semibold text-white">
              <Target className="mr-1.5 h-4 w-4 text-red-300" />
              Team capacity
            </h3>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-0.5">
              {teams.map((team) => (
                <div
                  key={team.team_id}
                  className={cn(
                    'rounded-lg border p-2',
                    team.risk_level === 'low' && 'border-emerald-500/40 bg-emerald-500/10',
                    team.risk_level === 'medium' && 'border-amber-500/40 bg-amber-500/10',
                    team.risk_level === 'high' && 'border-red-500/40 bg-red-500/10',
                    !team.risk_level && 'border-white/10 bg-white/5'
                  )}
                >
                  <div className="mb-0.5 flex justify-between gap-2">
                    <h4 className="truncate text-xs font-semibold text-white">
                      {team.team_name}
                    </h4>
                    <span className="shrink-0 text-[10px] text-white/45">
                      {team.risk_level || ''}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[11px] text-white/70">
                    <div className="flex justify-between">
                      <span>Safe bid</span>
                      <span className="font-bold text-sky-300">
                        {formatCurrency(
                          team.max_safe_bid_with_buffer ?? team.max_safe_bid
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining</span>
                      <span>
                        {formatCurrency(team.remaining_budget ?? team.remaining)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {!teams.length && (
                <p className="py-6 text-center text-xs text-white/40">No team data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </BroadcastShell>
  );
};

export default AuctionDisplay;
