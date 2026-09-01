import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ShotsControl({ match, updateMatch, readOnly }) {
  if (!match.deep_stats) return null;

  const isLive = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'].includes(match.status);

  const handleShotsUp = async (team) => {
    if (readOnly || !isLive) return;
    const key = team === 'home' ? 'stats_home_shots' : 'stats_away_shots';
    const current = match[key] || 0;
    await updateMatch({ [key]: current + 1 });
  };

  const handleShotsDown = async (team) => {
    if (readOnly || !isLive) return;
    const key = team === 'home' ? 'stats_home_shots' : 'stats_away_shots';
    const current = match[key] || 0;
    if (current > 0) {
      await updateMatch({ [key]: current - 1 });
    }
  };

  const handleCornersUp = async (team) => {
    if (readOnly || !isLive) return;
    const key = team === 'home' ? 'stats_home_corners' : 'stats_away_corners';
    const current = match[key] || 0;
    await updateMatch({ [key]: current + 1 });
  };

  const handleCornersDown = async (team) => {
    if (readOnly || !isLive) return;
    const key = team === 'home' ? 'stats_home_corners' : 'stats_away_corners';
    const current = match[key] || 0;
    if (current > 0) {
      await updateMatch({ [key]: current - 1 });
    }
  };

  const handleShotsOffUp = async (team) => {
    if (readOnly || !isLive) return;
    const key = team === 'home' ? 'stats_home_shots_off' : 'stats_away_shots_off';
    const current = match[key] || 0;
    await updateMatch({ [key]: current + 1 });
  };

  const handleShotsOffDown = async (team) => {
    if (readOnly || !isLive) return;
    const key = team === 'home' ? 'stats_home_shots_off' : 'stats_away_shots_off';
    const current = match[key] || 0;
    if (current > 0) {
      await updateMatch({ [key]: current - 1 });
    }
  };

  const StatButton = ({ onClick, disabled, children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1 rounded transition-colors',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase text-muted-foreground text-center mb-3">Statistika</p>

      {/* Shots on target */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-muted-foreground">🎯 Shutat</span>
          <div className="flex items-center gap-1 ml-auto">
            <StatButton onClick={() => handleShotsDown('home')} disabled={readOnly || !isLive}>
              <ChevronDown className="w-4 h-4" />
            </StatButton>
            <span className="text-sm font-bold w-6 text-center">{match.stats_home_shots || 0}</span>
            <StatButton onClick={() => handleShotsUp('home')} disabled={readOnly || !isLive}>
              <ChevronUp className="w-4 h-4" />
            </StatButton>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1 ml-auto">
            <StatButton onClick={() => handleShotsDown('away')} disabled={readOnly || !isLive}>
              <ChevronDown className="w-4 h-4" />
            </StatButton>
            <span className="text-sm font-bold w-6 text-center">{match.stats_away_shots || 0}</span>
            <StatButton onClick={() => handleShotsUp('away')} disabled={readOnly || !isLive}>
              <ChevronUp className="w-4 h-4" />
            </StatButton>
          </div>
        </div>
      </div>

      {/* Shots off target */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-muted-foreground">❌ Jasht Goli</span>
          <div className="flex items-center gap-1 ml-auto">
            <StatButton onClick={() => handleShotsOffDown('home')} disabled={readOnly || !isLive}>
              <ChevronDown className="w-4 h-4" />
            </StatButton>
            <span className="text-sm font-bold w-6 text-center">{match.stats_home_shots_off || 0}</span>
            <StatButton onClick={() => handleShotsOffUp('home')} disabled={readOnly || !isLive}>
              <ChevronUp className="w-4 h-4" />
            </StatButton>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1 ml-auto">
            <StatButton onClick={() => handleShotsOffDown('away')} disabled={readOnly || !isLive}>
              <ChevronDown className="w-4 h-4" />
            </StatButton>
            <span className="text-sm font-bold w-6 text-center">{match.stats_away_shots_off || 0}</span>
            <StatButton onClick={() => handleShotsOffUp('away')} disabled={readOnly || !isLive}>
              <ChevronUp className="w-4 h-4" />
            </StatButton>
          </div>
        </div>
      </div>

      {/* Corners */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-muted-foreground">⚡ Korner</span>
          <div className="flex items-center gap-1 ml-auto">
            <StatButton onClick={() => handleCornersDown('home')} disabled={readOnly || !isLive}>
              <ChevronDown className="w-4 h-4" />
            </StatButton>
            <span className="text-sm font-bold w-6 text-center">{match.stats_home_corners || 0}</span>
            <StatButton onClick={() => handleCornersUp('home')} disabled={readOnly || !isLive}>
              <ChevronUp className="w-4 h-4" />
            </StatButton>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1 ml-auto">
            <StatButton onClick={() => handleCornersDown('away')} disabled={readOnly || !isLive}>
              <ChevronDown className="w-4 h-4" />
            </StatButton>
            <span className="text-sm font-bold w-6 text-center">{match.stats_away_corners || 0}</span>
            <StatButton onClick={() => handleCornersUp('away')} disabled={readOnly || !isLive}>
              <ChevronUp className="w-4 h-4" />
            </StatButton>
          </div>
        </div>
      </div>
    </div>
  );
}