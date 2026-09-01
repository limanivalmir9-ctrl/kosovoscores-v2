// Top-5 referee leaderboard row. valueKey drives the metric + badge styling.
export default function RefereeLeaderboard({ rows, valueKey }) {
  if (!rows || rows.length === 0) {
    return <p className="text-center text-xs text-muted-foreground py-6">Ende pa të dhëna</p>;
  }
  const badge = () => {
    if (valueKey === 'yellow') return <span className="w-2.5 h-3.5 rounded-sm bg-yellow-400 border border-yellow-500/50 inline-block" />;
    if (valueKey === 'red') return <span className="w-2.5 h-3.5 rounded-sm bg-red-500 border border-red-600/50 inline-block" />;
    return <span className="text-[11px]">⚽</span>;
  };
  const color = valueKey === 'yellow' ? '#ca8a04' : valueKey === 'red' ? '#dc2626' : 'hsl(var(--primary))';
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 bg-card rounded-xl border border-border p-2.5">
          <span className="text-xs font-black text-muted-foreground w-5 text-center shrink-0">{i + 1}</span>
          {r.photo ? (
            <img src={r.photo} alt="" className="w-9 h-9 rounded-full object-cover border border-border shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted border border-border shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground">
              {(r.name || '?')[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold truncate block">{r.name}</span>
            {r.matches != null && (
              <span className="text-[10px] text-gray-500 leading-tight" style={{ opacity: 0.7 }}>
                {r.matches} Ndeshje
              </span>
            )}
          </div>
          <span className="flex items-center gap-1.5 text-sm font-black shrink-0" style={{ color }}>
            {badge()}
            {r[valueKey]}
          </span>
        </div>
      ))}
    </div>
  );
}