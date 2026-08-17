import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import BroadcastShell from '@/components/broadcast/BroadcastShell';
import SoldOverlay from '@/components/broadcast/SoldOverlay';
import PlayerSpinner from '@/components/PlayerSpinner';
import { formatInr, usePublicLiveBoard } from '@/lib/publicLiveApi';
import { formatTimer, useAuctionCountdown } from '@/lib/auctionTimer';
import { convertGoogleDriveUrl } from '@/utils/imageUtils';
import { cn } from '@/lib/utils';

const stateLabel = {
  waiting: 'Preparing',
  selected: 'On the block',
  bidding: 'Live bidding',
  sold: 'SOLD',
  unsold: 'UNSOLD',
  paused: 'Paused',
  completed: 'Auction complete',
  no_player: 'Waiting for next player',
  spinning: 'Selecting player…',
  loading: 'Connecting…',
};

export default function LivePlayerBoard() {
  const { publicToken } = useParams();
  const { data, error, loading, lastUpdated } = usePublicLiveBoard(
    publicToken,
    'player',
    1500
  );
  const [bidPulse, setBidPulse] = useState(false);
  const [prevBid, setPrevBid] = useState(null);

  const auction = data?.auction || {};
  const player = data?.player;
  const display = data?.display_state || 'no_player';
  const bid = auction.current_bid ?? player?.base_price;

  useEffect(() => {
    if (bid == null) return;
    if (prevBid != null && bid !== prevBid) {
      setBidPulse(true);
      const t = setTimeout(() => setBidPulse(false), 600);
      return () => clearTimeout(t);
    }
    setPrevBid(bid);
  }, [bid, prevBid]);

  useEffect(() => {
    if (bid != null) setPrevBid(bid);
  }, [bid]);

  const secondsLeft = useAuctionCountdown(
    auction.timer_started_at,
    auction.timer_duration,
    data?.server_time
  );

  const showTimer =
    player &&
    display !== 'sold' &&
    display !== 'unsold' &&
    display !== 'waiting' &&
    display !== 'no_player' &&
    auction.timer_started_at &&
    secondsLeft != null;

  const photoSrc = convertGoogleDriveUrl(player?.photo_url);
  const status = (auction.status || '').toLowerCase();
  const stats = player?.stats || {};
  const statEntries = Object.entries(stats).filter(([, v]) => v != null).slice(0, 4);
  const showSoldFrame = display === 'sold' || display === 'unsold';
  const spin = auction.spin;
  // Latch spin session so polling re-renders don't remount/restart the wheel
  const latchedSpinRef = useRef(null);
  const [latchedSpin, setLatchedSpin] = useState(null);
  useEffect(() => {
    const active =
      spin?.winner_id && Array.isArray(spin?.players) && spin.players.length >= 2;
    if (active) {
      const key = `${spin.winner_id}|${spin.started_at || ''}`;
      if (latchedSpinRef.current?.key !== key) {
        // Snapshot once per spin — freeze players array so polls can't restart animation
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
    // Spin ended on server — keep local wheel until full animation window (~10.5s)
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
  const latestBids = Array.isArray(auction.bid_history)
    ? [...auction.bid_history].slice(-2).reverse()
    : [];

  if (loading && !data) {
    return (
      <BroadcastShell>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-red-500" />
        </div>
      </BroadcastShell>
    );
  }

  if (error && !data) {
    return (
      <BroadcastShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-xl font-bold">Broadcast unavailable</p>
          <p className="max-w-md text-sm text-white/55">{error}</p>
        </div>
      </BroadcastShell>
    );
  }

  return (
    <BroadcastShell
      event={data?.event}
      sponsors={data?.sponsors}
      footerLeft={error ? `Warning: ${error}` : stateLabel[display] || display}
      footerRight={
        lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : undefined
      }
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {showSpin && latchedSpin?.winner_id && (
          <PlayerSpinner
            key={latchedSpinRef.current?.key || latchedSpin.winner_id}
            players={latchedSpin.players}
            winnerId={latchedSpin.winner_id}
            spinKey={latchedSpin.started_at || latchedSpin.winner_id}
          />
        )}
        {showSoldFrame && player && !showSpin && (
          <SoldOverlay
            key={`${player.id || player.name}-${display}-${player.sold_price ?? bid}`}
            type={display === 'unsold' ? 'unsold' : 'sold'}
            playerName={player.name}
            teamName={player.sold_to_team_name || auction.current_team_name}
            price={player.sold_price ?? bid}
            photoUrl={photoSrc}
          />
        )}

        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest sm:text-xs',
              display === 'sold' && 'bg-emerald-500 text-white',
              display === 'unsold' && 'bg-slate-500 text-white',
              display === 'bidding' && 'bg-red-600 text-white',
              display === 'paused' && 'bg-amber-500 text-black',
              display === 'completed' && 'bg-sky-600 text-white',
              !['sold', 'unsold', 'bidding', 'paused', 'completed'].includes(display) &&
                'bg-white/10 text-white/80 ring-1 ring-white/15'
            )}
          >
            {stateLabel[display] || status || 'Live'}
          </span>
          {showTimer && (
            <span
              className={cn(
                'rounded-xl px-4 py-1.5 font-mono text-2xl font-bold tabular-nums ring-1 sm:text-3xl',
                secondsLeft <= 10
                  ? 'bg-red-600/50 text-white ring-red-400/60'
                  : 'bg-white/10 text-white ring-white/20'
              )}
            >
              {formatTimer(secondsLeft)}
            </span>
          )}
        </div>

        {(display === 'waiting' ||
          display === 'no_player' ||
          display === 'completed' ||
          display === 'paused') &&
          !player && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
              <p className="text-2xl font-bold text-white/80 sm:text-4xl">
                {display === 'completed'
                  ? 'Auction complete'
                  : display === 'paused'
                    ? 'Auction paused'
                    : 'Waiting for next player'}
              </p>
              <p className="text-sm text-white/45">Stand by</p>
            </div>
          )}

        {player && !showSoldFrame && (
          <div
            key={player.id || player.name}
            className="block-enter grid min-h-0 flex-1 grid-cols-1 items-center gap-3 overflow-hidden lg:grid-cols-12 lg:gap-6"
          >
            {/* Photo — constrained height so viewport fits */}
            <div className="flex min-h-0 items-center justify-center lg:col-span-5">
              <div className="relative mx-auto aspect-square h-full max-h-[min(42vh,380px)] w-full max-w-[min(42vh,380px)]">
                {/* Soft entry ring */}
                <div
                  className="block-ring-pulse pointer-events-none absolute -inset-1 rounded-[1.25rem] ring-2 ring-red-400/50"
                  aria-hidden
                />
                <div className="block-photo-enter relative h-full w-full overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/15">
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-6xl font-black text-white/20">
                      {(player.name || '?').charAt(0)}
                    </div>
                  )}
                  {player.category_name && (
                    <span
                      className="absolute bottom-2 left-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow sm:text-xs"
                      style={{ backgroundColor: player.category_color || '#e11d2e' }}
                    >
                      {player.category_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col justify-center gap-2 overflow-hidden lg:col-span-7">
              <h1
                className="block-fade-up truncate text-3xl font-black tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
                style={{ animationDelay: '0.12s' }}
              >
                {player.name}
              </h1>
              <p
                className="block-fade-up truncate text-sm text-white/55 sm:text-base"
                style={{ animationDelay: '0.2s' }}
              >
                {[
                  player.position,
                  player.specialty,
                  player.age != null ? `Age ${player.age}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Player'}
              </p>

              <div
                className={cn(
                  'block-fade-up rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition sm:px-6 sm:py-4',
                  bidPulse && 'border-amber-400/50 ring-2 ring-amber-400/40'
                )}
                style={{ animationDelay: '0.28s' }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  Current bid
                </p>
                <p
                  className={cn(
                    'font-black tabular-nums text-amber-300',
                    'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
                    bidPulse && 'text-amber-200'
                  )}
                >
                  {formatInr(bid)}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm sm:text-base">
                  {auction.current_team_name && (
                    <span className="text-white/80">
                      Leading:{' '}
                      <span className="font-bold text-white">{auction.current_team_name}</span>
                    </span>
                  )}
                  {player.base_price != null && (
                    <span className="text-white/40">Base {formatInr(player.base_price)}</span>
                  )}
                </div>
              </div>

              <div
                className="block-fade-up grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2"
                style={{ animationDelay: '0.38s' }}
              >
                {latestBids.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-white/40">
                      Latest bids
                    </p>
                    <ul className="space-y-0.5">
                      {latestBids.map((b, i) => (
                        <li
                          key={`${b.timestamp || i}-${b.amount}-${b.team_name}`}
                          className="flex justify-between gap-2 text-sm"
                        >
                          <span className="truncate text-white/75">{b.team_name || 'Team'}</span>
                          <span className="shrink-0 font-bold tabular-nums text-amber-200">
                            {formatInr(b.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {statEntries.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
                    {statEntries.map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center"
                      >
                        <p className="text-base font-bold tabular-nums sm:text-lg">{v}</p>
                        <p className="text-[9px] uppercase tracking-wide text-white/40">{k}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </BroadcastShell>
  );
}
