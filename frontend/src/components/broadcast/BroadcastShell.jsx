import { cn } from '@/lib/utils';

/**
 * Fixed full-viewport broadcast chrome for OBS/vMix.
 * No page scroll — everything fits in 100vh.
 */
export default function BroadcastShell({
  children,
  className,
  event,
  sponsors,
  footerLeft,
  footerRight,
}) {
  const list = (sponsors || []).filter((s) => s && (s.logo_url || s.name));
  // Repeat so the ticker track is always wider than the screen, then duplicate for a seamless loop
  const reps = list.length ? Math.max(1, Math.ceil(8 / list.length)) : 0;
  const base = Array.from({ length: reps }, () => list).flat();
  const tickerSeconds = Math.max(20, base.length * 4);

  return (
    <div
      className={cn(
        'fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden text-white',
        'bg-[#0a0809]',
        className
      )}
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(176,16,32,0.35) 0%, transparent 55%), linear-gradient(160deg, #0a0809 0%, #1a1214 45%, #2a0e14 100%)',
      }}
    >
      {/* Header: event + sponsors */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2 sm:px-6 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {event?.logo_url ? (
            <img
              src={event.logo_url}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/20 sm:h-11 sm:w-11"
            />
          ) : (
            <img
              src="/images/sports/logo-final.png"
              alt="PowerAuction"
              className="h-9 w-9 shrink-0 rounded-lg bg-white/95 object-contain p-1 ring-1 ring-white/20 sm:h-11 sm:w-11"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight sm:text-xl">
              {event?.name || 'PowerAuction'}
            </p>
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/40 sm:text-[10px]">
              Live auction
            </p>
          </div>
        </div>

        <img
          src="/images/sports/logo-final.png"
          alt="PowerAuction"
          title="PowerAuction"
          className="h-7 w-auto shrink-0 opacity-90 sm:h-8"
        />
      </header>

      {list.length > 0 && (
        <div className="sponsor-ticker relative z-10 shrink-0 overflow-hidden border-b border-white/10 bg-black/30 py-1.5 sm:py-2">
          <div
            className="sponsor-ticker-track flex w-max items-center"
            style={{ animationDuration: `${tickerSeconds}s` }}
          >
            {[0, 1].map((copy) =>
              base.map((s, i) => (
                <div
                  key={`${copy}-${i}-${s.id || s.name}`}
                  aria-hidden={copy === 1 ? true : undefined}
                  className="mr-3 flex h-10 shrink-0 items-center gap-2 rounded-lg bg-white/95 sm:mr-4 px-3 shadow-md ring-1 ring-white/30 sm:h-12"
                  title={s.name || 'Sponsor'}
                >
                  {s.logo_url && (
                    <img
                      src={s.logo_url}
                      alt={s.name || 'Sponsor'}
                      className="h-7 max-w-[7rem] object-contain sm:h-9 sm:max-w-[9rem]"
                    />
                  )}
                  {(!s.logo_url || s.name) && (
                    <span className="whitespace-nowrap text-xs font-bold uppercase tracking-wide text-gray-800 sm:text-sm">
                      {s.name}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main: fills remaining height, no page scroll */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
        {children}
      </main>

      {/* Compact footer; overflow sponsors can sit here if many */}
      <footer className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-4 py-1.5 text-[10px] text-white/40 sm:px-6">
        <span className="truncate">{footerLeft || 'PowerAuction'}</span>
        <span className="shrink-0">{footerRight}</span>
      </footer>
    </div>
  );
}
