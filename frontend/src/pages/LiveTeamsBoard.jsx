import { useParams } from 'react-router-dom';
import BroadcastShell from '@/components/broadcast/BroadcastShell';
import { formatInr, usePublicLiveBoard } from '@/lib/publicLiveApi';
import { cn } from '@/lib/utils';

function teamGridClass(n) {
  if (n <= 2) return 'grid-cols-1 md:grid-cols-2';
  if (n <= 4) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
  if (n <= 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  if (n <= 8) return 'grid-cols-2 lg:grid-cols-4';
  return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
}

function TeamCard({ team, highlight, compact }) {
  const cats = team.categories || [];
  return (
    <article
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border bg-black/25 p-2 shadow backdrop-blur-sm sm:p-2.5',
        highlight
          ? 'border-amber-400/60 ring-1 ring-amber-400/40'
          : 'border-white/10'
      )}
      style={{
        borderTopColor: team.color || undefined,
        borderTopWidth: team.color ? 3 : undefined,
      }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt=""
            className={cn(
              'shrink-0 rounded-lg object-cover ring-1 ring-white/15',
              compact ? 'h-8 w-8' : 'h-9 w-9'
            )}
          />
        ) : (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg text-sm font-black text-white',
              compact ? 'h-8 w-8' : 'h-9 w-9'
            )}
            style={{ backgroundColor: team.color || '#e11d2e' }}
          >
            {(team.name || '?').charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className={cn('truncate font-bold leading-tight', compact ? 'text-xs' : 'text-sm')}>
            {team.name}
          </h2>
          {highlight && (
            <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-300">
              Current bid
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-white/5 px-1.5 py-1">
          <p className="text-[8px] uppercase tracking-wide text-white/40">Players</p>
          <p className={cn('font-bold tabular-nums', compact ? 'text-sm' : 'text-base')}>
            {team.players_count}
            {team.max_squad_size ? (
              <span className="text-[10px] font-normal text-white/40">/{team.max_squad_size}</span>
            ) : null}
          </p>
        </div>
        <div className="rounded-lg bg-white/5 px-1.5 py-1">
          <p className="text-[8px] uppercase tracking-wide text-white/40">Remaining</p>
          <p
            className={cn(
              'font-bold tabular-nums text-emerald-300',
              compact ? 'text-[11px]' : 'text-xs sm:text-sm'
            )}
          >
            {formatInr(team.remaining)}
          </p>
        </div>
        <div className="rounded-lg bg-white/5 px-1.5 py-1">
          <p className="text-[8px] uppercase tracking-wide text-white/40">Spent</p>
          <p className={cn('font-semibold tabular-nums text-white/80', compact ? 'text-[11px]' : 'text-xs')}>
            {formatInr(team.spent)}
          </p>
        </div>
        <div className="rounded-lg bg-white/5 px-1.5 py-1">
          <p className="text-[8px] uppercase tracking-wide text-white/40">Used</p>
          <p className={cn('font-semibold tabular-nums', compact ? 'text-[11px]' : 'text-xs')}>
            {team.purse_utilization_pct ?? 0}%
          </p>
        </div>
      </div>

      {cats.length > 0 && (
        <div className="mt-1.5 min-h-0 space-y-0.5 overflow-hidden">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-white/40">
            Categories
          </p>
          <ul className="space-y-0.5">
            {cats.slice(0, compact ? 2 : 3).map((c) => (
              <li
                key={c.category_id}
                className="flex items-center justify-between gap-1 text-[10px]"
              >
                <span className="flex min-w-0 items-center gap-1 truncate">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color || '#888' }}
                  />
                  <span className="truncate text-white/80">{c.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-white/90">
                  {c.selected}/{c.min_required || '–'}
                  {c.remaining_needed > 0 ? (
                    <span className="ml-0.5 text-amber-300">need {c.remaining_needed}</span>
                  ) : (
                    <span className="ml-0.5 text-emerald-400">ok</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export default function LiveTeamsBoard() {
  const { publicToken } = useParams();
  const { data, error, loading, lastUpdated } = usePublicLiveBoard(
    publicToken,
    'teams',
    3500
  );

  if (loading && !data) {
    return (
      <BroadcastShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-2 border-white/20 border-t-red-500" />
          <p className="text-white/60">Loading team board…</p>
        </div>
      </BroadcastShell>
    );
  }

  if (error && !data) {
    return (
      <BroadcastShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-2xl font-bold">Broadcast unavailable</p>
          <p className="max-w-md text-white/55">{error}</p>
        </div>
      </BroadcastShell>
    );
  }

  const teams = data?.teams || [];
  const n = teams.length;
  const compact = n >= 8;
  const currentId = data?.current_team_id;

  return (
    <BroadcastShell
      event={data?.event}
      sponsors={data?.sponsors}
      footerLeft={
        error
          ? `Warning: ${error}`
          : `${n} team${n === 1 ? '' : 's'} · ${(data?.auction_status || '').replace(/_/g, ' ')}`
      }
      footerRight={
        lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {data?.current_team_name && data?.current_bid != null && (
          <div className="mb-2 flex shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/80">
              Live bid
            </span>
            <span className="text-base font-bold text-white sm:text-lg">
              {formatInr(data.current_bid)}
            </span>
            <span className="text-sm text-white/70">· {data.current_team_name}</span>
          </div>
        )}

        {n === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-white/50">
            No teams in this auction yet
          </div>
        ) : (
          <div
            className={cn(
              'grid min-h-0 flex-1 gap-2 overflow-hidden sm:gap-2.5',
              teamGridClass(n)
            )}
          >
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                highlight={team.id === currentId}
                compact={compact || n >= 6}
              />
            ))}
          </div>
        )}
      </div>
    </BroadcastShell>
  );
}
