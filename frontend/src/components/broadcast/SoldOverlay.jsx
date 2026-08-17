import { useMemo } from 'react';
import { formatInr } from '@/lib/publicLiveApi';
import { cn } from '@/lib/utils';
import { X, Sparkles, Trophy } from 'lucide-react';

/**
 * Full-screen SOLD / UNSOLD celebration for broadcast + control.
 * Light visual effects (particles, confetti, rings, stamp, shimmer) — no harsh flashing.
 * Pass onDismiss on auction control so the operator can close it manually.
 */
export default function SoldOverlay({
  type = 'sold',
  playerName,
  teamName,
  price,
  photoUrl,
  className,
  onDismiss,
}) {
  const isSold = type === 'sold';

  // Burst particles from center
  const particles = useMemo(() => {
    const colors = isSold
      ? ['#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa', '#f87171', '#ffffff']
      : ['#94a3b8', '#cbd5e1', '#64748b', '#e2e8f0'];
    return Array.from({ length: isSold ? 32 : 12 }, (_, i) => {
      const angle = (i / 32) * Math.PI * 2 + (i % 3) * 0.35;
      const dist = 130 + (i % 7) * 42;
      return {
        id: i,
        color: colors[i % colors.length],
        size: 6 + (i % 5) * 2,
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist - 50}px`,
        rot: `${(i * 47) % 360}deg`,
        delay: `${(i % 10) * 0.035}s`,
        shape: i % 3 === 0 ? 'round' : 'rect',
      };
    });
  }, [isSold]);

  // Falling confetti stream (sold only)
  const confetti = useMemo(() => {
    if (!isSold) return [];
    const colors = ['#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa', '#f87171', '#fde68a', '#fff'];
    return Array.from({ length: 36 }, (_, i) => ({
      id: `c-${i}`,
      color: colors[i % colors.length],
      left: `${(i * 2.7 + (i % 5) * 3) % 100}%`,
      size: 5 + (i % 4) * 2,
      delay: `${(i % 12) * 0.08}s`,
      duration: `${2.2 + (i % 6) * 0.25}s`,
      drift: `${((i % 7) - 3) * 18}px`,
      spin: `${360 + (i % 5) * 120}deg`,
      shape: i % 4 === 0 ? 'round' : i % 4 === 1 ? 'tall' : 'wide',
    }));
  }, [isSold]);

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden',
        isSold ? 'bg-black/60' : 'bg-black/55',
        'backdrop-blur-[3px]',
        onDismiss ? 'pointer-events-auto' : 'pointer-events-none',
        className
      )}
      role="status"
      aria-live="assertive"
    >
      {/* Soft camera flash — light, not harsh */}
      {isSold && (
        <div
          className="sold-soft-flash pointer-events-none absolute inset-0 z-[1] bg-white"
          aria-hidden
        />
      )}

      {/* Ambient glow + expanding rings */}
      {isSold && (
        <>
          <div
            className="sold-glow pointer-events-none absolute left-1/2 top-1/2 h-[min(70vmin,520px)] w-[min(70vmin,520px)] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(52,211,153,0.5) 0%, rgba(251,191,36,0.22) 42%, transparent 72%)',
            }}
            aria-hidden
          />
          <div
            className="sold-ring pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 rounded-full border-2 border-emerald-400/55"
            aria-hidden
          />
          <div
            className="sold-ring pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 rounded-full border border-amber-300/45"
            style={{ animationDelay: '0.3s' }}
            aria-hidden
          />
          <div
            className="sold-ring pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 rounded-full border border-white/30"
            style={{ animationDelay: '0.6s' }}
            aria-hidden
          />
          <div
            className="sold-ring pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 rounded-full border border-pink-300/25"
            style={{ animationDelay: '0.9s' }}
            aria-hidden
          />
        </>
      )}

      {/* Falling confetti */}
      {isSold && (
        <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden>
          {confetti.map((c) => (
            <span
              key={c.id}
              className="sold-confetti absolute top-0 block"
              style={{
                left: c.left,
                width: c.shape === 'tall' ? c.size * 0.4 : c.size,
                height: c.shape === 'wide' ? c.size * 0.4 : c.size,
                borderRadius: c.shape === 'round' ? '999px' : '1px',
                background: c.color,
                boxShadow: `0 0 6px ${c.color}`,
                animationDelay: c.delay,
                animationDuration: c.duration,
                '--drift': c.drift,
                '--spin': c.spin,
              }}
            />
          ))}
        </div>
      )}

      {/* Burst particles from center */}
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] z-[3] h-0 w-0"
        aria-hidden
      >
        {particles.map((p) => (
          <span
            key={p.id}
            className="sold-float absolute block"
            style={{
              width: p.size,
              height: p.shape === 'round' ? p.size : p.size * 0.45,
              borderRadius: p.shape === 'round' ? '999px' : '2px',
              background: p.color,
              boxShadow: `0 0 8px ${p.color}`,
              '--dx': p.dx,
              '--dy': p.dy,
              '--rot': p.rot,
              animationDelay: p.delay,
              left: 0,
              top: 0,
            }}
          />
        ))}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 z-50 flex items-center gap-2 rounded-full border border-white/25 bg-black/60 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          aria-label="Close sold animation"
        >
          <X className="h-4 w-4" />
          Close
        </button>
      )}

      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center sm:gap-4">
        {photoUrl && (
          <div className="sold-fade-up relative" style={{ animationDelay: '0.05s' }}>
            <div
              className={cn(
                'absolute -inset-2 rounded-3xl opacity-70 blur-md',
                isSold ? 'bg-emerald-400/45' : 'bg-white/20'
              )}
              aria-hidden
            />
            <img
              src={photoUrl}
              alt=""
              className="relative h-24 w-24 rounded-2xl object-cover ring-4 ring-white/40 sm:h-32 sm:w-32 md:h-36 md:w-36"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {isSold && (
          <div
            className="sold-fade-up flex items-center gap-1.5 text-amber-200/90"
            style={{ animationDelay: '0.12s' }}
          >
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] sm:text-xs">
              Hammer down
            </span>
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}

        {/* Stamp-style SOLD badge */}
        <div className="sold-pop relative">
          {isSold && (
            <div
              className="pointer-events-none absolute -inset-x-6 -inset-y-3 -rotate-6 rounded-2xl border-[3px] border-emerald-400/40 sm:-inset-x-10 sm:-inset-y-4"
              aria-hidden
            />
          )}
          <p
            className={cn(
              'relative flex items-center justify-center gap-2 text-6xl font-black tracking-tighter sm:gap-3 sm:text-8xl md:text-9xl',
              isSold
                ? 'sold-shimmer bg-gradient-to-r from-emerald-300 via-amber-200 to-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_50px_rgba(52,211,153,0.55)]'
                : 'text-white/55'
            )}
          >
            {isSold && (
              <Trophy
                className="hidden h-10 w-10 shrink-0 text-amber-300 sm:block sm:h-14 sm:w-14 md:h-16 md:w-16"
                strokeWidth={2.25}
                aria-hidden
              />
            )}
            {isSold ? 'SOLD' : 'UNSOLD'}
          </p>
        </div>

        {playerName && (
          <p
            className="sold-fade-up text-2xl font-bold text-white sm:text-4xl"
            style={{ animationDelay: '0.22s' }}
          >
            {playerName}
          </p>
        )}

        {isSold && teamName && (
          <p
            className="sold-fade-up text-lg text-white/80 sm:text-2xl"
            style={{ animationDelay: '0.34s' }}
          >
            to{' '}
            <span className="rounded-lg bg-white/10 px-2.5 py-0.5 font-semibold text-white ring-1 ring-white/25">
              {teamName}
            </span>
          </p>
        )}

        {isSold && price != null && (
          <p
            className="sold-price-pop text-3xl font-black tabular-nums text-amber-300 sm:text-5xl"
            style={{
              animationDelay: '0.45s',
              textShadow: '0 0 40px rgba(251,191,36,0.5)',
            }}
          >
            {formatInr(price)}
          </p>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="sold-fade-up mt-1 rounded-xl bg-white/15 px-6 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25"
            style={{ animationDelay: '0.55s' }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
