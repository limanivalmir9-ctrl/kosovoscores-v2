import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  'Kampion-CHL': { bg: 'bg-green-500/10', border: 'border-l-green-500' },
  'Kampion': { bg: 'bg-green-500/10', border: 'border-l-green-500' },
  'Kampion, UEFA Youth League': { bg: 'bg-green-500/10', border: 'border-l-green-500' },
  'Promovim': { bg: 'bg-green-500/10', border: 'border-l-green-500' },
  'UECL Qual.': { bg: 'bg-blue-300/10', border: 'border-l-blue-300' },
  'Playoff': { bg: 'bg-yellow-500/10', border: 'border-l-yellow-500' },
  'Playoff/OUT': { bg: 'bg-purple-500/10', border: 'border-l-purple-500' },
  'Renie nga liga': { bg: 'bg-red-500/10', border: 'border-l-red-500' },
};

export default function StandingsTable({ standings, competition }) {
  const sorted = [...standings].sort((a, b) => (a.position || 999) - (b.position || 999));
  const statusPositions = competition?.status_positions || [];

  const getStatusForPosition = (pos) => {
    const sp = statusPositions.find(s => s.position === pos);
    return sp?.status || null;
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-0.5 px-2 py-2 bg-muted/50 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Ekipi</div>
        <div className="col-span-1 text-center text-[9px]">NL</div>
        <div className="col-span-1 text-center text-[9px]">F</div>
        <div className="col-span-1 text-center text-[9px]">B</div>
        <div className="col-span-1 text-center text-[9px]">H</div>
        <div className="col-span-1 text-center text-[9px]">GD</div>
        <div className="col-span-1 text-center font-black">P</div>
      </div>

      {sorted.map((row, i) => {
        const displayPos = i + 1;
        const status = getStatusForPosition(displayPos);
        const colors = status ? STATUS_COLORS[status] : null;

        return (
          <div
            key={row.id}
            className={cn(
              'grid grid-cols-12 gap-0.5 px-2 py-2 text-xs border-t border-border/50 items-center border-l-2',
              colors?.bg || 'bg-transparent',
              colors?.border || 'border-l-transparent'
            )}
          >
            <div className="col-span-1 font-bold text-muted-foreground text-[10px]">{displayPos}</div>
            <div className="col-span-5 flex items-center gap-1 min-w-0">
              <Link to={`/team/${row.club_id}`} className="flex items-center gap-1 min-w-0 hover:opacity-75 transition-opacity">
                {row.club_logo ? (
                  <img src={row.club_logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-muted flex-shrink-0" />
                )}
                <span className="font-semibold text-[11px] leading-tight break-words min-w-0">{row.club_name || '—'}</span>
              </Link>
            </div>
            <div className="col-span-1 text-center text-muted-foreground text-[10px]">{row.played || 0}</div>
            <div className="col-span-1 text-center text-muted-foreground text-[10px]">{row.won || 0}</div>
            <div className="col-span-1 text-center text-muted-foreground text-[10px]">{row.drawn || 0}</div>
            <div className="col-span-1 text-center text-muted-foreground text-[10px]">{row.lost || 0}</div>
            <div className="col-span-1 text-center text-muted-foreground text-[10px]">{row.goal_difference || 0}</div>
            <div className="col-span-1 text-center font-black text-[11px]">{row.points || 0}</div>
          </div>
        );
      })}

      {sorted.length === 0 && (
        <div className="text-center py-8 text-xs text-muted-foreground">Tabela nuk është krijuar ende</div>
      )}

      {/* Legend */}
      {statusPositions.length > 0 && (
        <div className="px-3 py-2 border-t border-border flex flex-wrap gap-3">
          {[...new Set(statusPositions.map(s => s.status))].map(status => {
            const colors = STATUS_COLORS[status];
            return (
              <div key={status} className="flex items-center gap-1">
                <div className={cn('w-2 h-2 rounded-full', colors?.border?.replace('border-l-', 'bg-'))} />
                <span className="text-[10px] text-muted-foreground">{status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}