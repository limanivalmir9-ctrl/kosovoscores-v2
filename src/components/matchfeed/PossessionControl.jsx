// Possession control buttons for MatchStatusControl (Deep stats only)
import { base44 } from '@/api/base44Client';

export default function PossessionControl({ match, updateMatch, readOnly }) {
  if (!match.deep_stats) return null;

  const isLive = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'].includes(match.status);
  // When switching to HT, freeze accumulated ms — stop counting elapsed

  const current = match.stats_possession_current || 'neutral';

  const switchPossession = async (newHolder) => {
    if (readOnly || !isLive) return;
    const now = Date.now();
    const last = match.stats_possession_last_switch || now;
    const elapsed = now - last;

    let homeMs = match.stats_possession_home_ms || 0;
    let awayMs = match.stats_possession_away_ms || 0;

    // Credit elapsed time to previous holder
    if (current === 'home') homeMs += elapsed;
    else if (current === 'away') awayMs += elapsed;
    // neutral: no credit

    await updateMatch({
      stats_possession_current: newHolder,
      stats_possession_home_ms: homeMs,
      stats_possession_away_ms: awayMs,
      stats_possession_last_switch: now,
    });
  };

  const btnStyle = (team) => ({
    flex: 1,
    padding: '10px 4px',
    borderRadius: '12px',
    border: '2px solid',
    fontWeight: '700',
    fontSize: '11px',
    cursor: readOnly || !isLive ? 'not-allowed' : 'pointer',
    opacity: readOnly || !isLive ? 0.5 : 1,
    transition: 'all 0.15s',
    outline: 'none',
    borderColor: current === team
      ? team === 'home' ? '#e8003d' : team === 'away' ? '#1a1a2e' : '#f59e0b'
      : '#e2e8f0',
    background: current === team
      ? team === 'home' ? 'rgba(232,0,61,0.12)' : team === 'away' ? 'rgba(26,26,46,0.1)' : 'rgba(245,158,11,0.12)'
      : 'white',
    color: current === team
      ? team === 'home' ? '#e8003d' : team === 'away' ? '#1a1a2e' : '#d97706'
      : '#64748b',
    boxShadow: current === team ? `0 0 8px 2px ${team === 'home' ? 'rgba(232,0,61,0.4)' : team === 'away' ? 'rgba(26,26,46,0.3)' : 'rgba(245,158,11,0.4)'}` : 'none',
  });

  return (
    <div className="bg-card rounded-xl border border-border p-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground text-center mb-2">Posedimi i Topit</p>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          style={btnStyle('home')}
          onClick={() => switchPossession('home')}
          disabled={readOnly || !isLive}
        >
          {match.home_team_name || 'Vendas'}
        </button>
        <button
          style={btnStyle('neutral')}
          onClick={() => switchPossession('neutral')}
          disabled={readOnly || !isLive}
        >
          Neutral
        </button>
        <button
          style={btnStyle('away')}
          onClick={() => switchPossession('away')}
          disabled={readOnly || !isLive}
        >
          {match.away_team_name || 'Mysafir'}
        </button>
      </div>
    </div>
  );
}