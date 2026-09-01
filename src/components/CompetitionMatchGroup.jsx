import { memo } from 'react';
import { Link } from 'react-router-dom';
import MatchCard from './MatchCard';

// Map Tailwind color name → hex for inline styles (avoids purge issues)
const COLOR_MAP = {
  'blue-500': '#3b82f6',
  'yellow-500': '#eab308',
  'green-500': '#22c55e',
  'red-500': '#ef4444',
  'purple-500': '#a855f7',
  'orange-500': '#f97316',
  'pink-500': '#ec4899',
  'cyan-500': '#06b6d4',
  'blue-300': '#93c5fd',
};

const BG_ALPHA = '15'; // hex alpha for background tint (~8% opacity)

function CompetitionMatchGroup({ competition, matches, topAd, bottomAd }) {
  const colorKey = competition?.color || 'blue-500';
  const hexColor = COLOR_MAP[colorKey] || '#3b82f6';
  const bgColor = hexColor + BG_ALPHA; // e.g. #3b82f615

  return (
    <div className="mb-4 rounded-2xl overflow-hidden border border-border/50 shadow-sm" style={{ borderLeft: `4px solid ${hexColor}`, backgroundColor: bgColor }}>
      {/* Competition Header — clickable → league table */}
      <Link to={competition?.id ? `/ligat/${competition.id}` : '/ligat'} className="flex items-center gap-2.5 px-4 py-3 bg-card/70 backdrop-blur-sm hover:bg-card transition-colors">
        {competition?.logo &&
        <img src={competition.logo} alt="" className="w-5 h-5 rounded object-cover" loading="lazy" decoding="async" />
        }
        <span className="text-xs font-bold uppercase tracking-wide text-foreground flex-1 hover:text-primary transition-colors">
          {competition?.name || 'Competition'}
        </span>
        <div className="flex items-center gap-2">
          {competition?.season &&
          <span className="text-[10px] text-muted-foreground">{competition.season}</span>
          }
        </div>
      </Link>

      {/* Matches */}
      <div className="bg-transparent px-3 py-3 space-y-2.5">
        {matches.filter(Boolean).map((match) => {
          // Deep-clone via JSON to strip SDK proxy wrappers that cause undefined access errors
          let safeMatch;
          try {safeMatch = JSON.parse(JSON.stringify(match));} catch {safeMatch = match;}
          return <MatchCard key={safeMatch.id} match={safeMatch} />;
        })}
        {matches.length === 0 &&
        <p className="text-xs text-muted-foreground text-center py-4">Nuk ka ndeshje</p>
        }
      </div>
    </div>);

}

// Skip re-render when the competition is the same and no match's id/status/score
// changed — the parent rebuilds the group list on every poll, but unchanged
// groups (the common case) short-circuit here.
function areEqual(prev, next) {
  if (prev.competition?.id !== next.competition?.id) return false;
  if (prev.matches === next.matches && prev.topAd === next.topAd && prev.bottomAd === next.bottomAd) return true;
  const a = prev.matches || [], b = next.matches || [];
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (!x || !y) { if (x !== y) return false; continue; }
    if (x.id !== y.id || x.status !== y.status || x.home_score !== y.home_score || x.away_score !== y.away_score || x.minute !== y.minute) return false;
  }
  if (prev.topAd?.id !== next.topAd?.id) return false;
  if (prev.bottomAd?.id !== next.bottomAd?.id) return false;
  return true;
}

export default memo(CompetitionMatchGroup, areEqual);