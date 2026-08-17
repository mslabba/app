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
  // Prefer logos first, show up to 8 in strip
  const withLogo = list.filter((s) => s.logo_url);
  const strip = (withLogo.length ? withLogo : list).slice(0, 8);

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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/30 text-sm font-black sm:h-11 sm:w-11 sm:text-base">
              PA
            </div>
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

        {strip.length > 0 && (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            <span className="hidden shrink-0 text-[9px] font-semibold uppercase tracking-widest text-white/35 sm:inline">
              Sponsors
            </span>
            <div className="flex max-w-[55vw] items-center justify-end gap-2 overflow-hidden sm:max-w-none sm:gap-3">
              {strip.map((s) =>
                s.logo_url ? (
                  <div
                    key={s.id || s.name}
                    className="flex h-8 max-w-[5.5rem] items-center justify-center rounded-md bg-white/95 px-1.5 py-0.5 sm:h-9 sm:max-w-[7rem]"
                    title={s.name || 'Sponsor'}
                  >
                    <img
                      src={s.logo_url}
                      alt={s.name || 'Sponsor'}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <span
                    key={s.id || s.name}
                    className="rounded bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70"
                  >
                    {s.name}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main: fills remaining height, no page scroll */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
        {children}
      </main>

      {/* Compact footer; overflow sponsors can sit here if many */}
      <footer className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-4 py-1.5 text-[10px] text-white/40 sm:px-6">
        <span className="truncate">{footerLeft || 'PowerAuction'}</span>
        {strip.length > 0 && (
          <div className="flex items-center gap-2 sm:hidden">
            {strip.slice(0, 3).map((s) =>
              s.logo_url ? (
                <img
                  key={`f-${s.id || s.name}`}
                  src={s.logo_url}
                  alt=""
                  className="h-5 max-w-[3.5rem] object-contain opacity-90"
                />
              ) : null
            )}
          </div>
        )}
        <span className="shrink-0">{footerRight}</span>
      </footer>
    </div>
  );
}
