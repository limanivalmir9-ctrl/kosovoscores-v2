import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export default function PossessionSlider({ match, updateMatch, readOnly }) {
  const isLive = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'].includes(match?.status);
  const current = match?.stats_possession_current || 'neutral';
  const [sliderValue, setSliderValue] = useState(
    current === 'home' ? 0 : current === 'away' ? 100 : 50
  );
  const sliderRef = useRef(null);

  useEffect(() => {
    setSliderValue(current === 'home' ? 0 : current === 'away' ? 100 : 50);
  }, [current]);

  if (!match?.deep_stats) return null;

  const handleSliderChange = async (e) => {
    const val = parseInt(e.target.value);
    setSliderValue(val);

    let newHolder = 'neutral';
    if (val < 40) newHolder = 'home';
    else if (val > 60) newHolder = 'away';

    if (newHolder !== current && !readOnly && isLive) {
      const now = Date.now();
      const last = match.stats_possession_last_switch || now;
      const elapsed = now - last;

      let homeMs = match.stats_possession_home_ms || 0;
      let awayMs = match.stats_possession_away_ms || 0;

      if (current === 'home') homeMs += elapsed;
      else if (current === 'away') awayMs += elapsed;

      await updateMatch({
        stats_possession_current: newHolder,
        stats_possession_home_ms: homeMs,
        stats_possession_away_ms: awayMs,
        stats_possession_last_switch: now,
      });
    }
  };

  const homePercent = match.stats_possession_home_ms || 0;
  const awayPercent = match.stats_possession_away_ms || 0;
  const total = homePercent + awayPercent || 1;
  const homeDisplayPercent = Math.round((homePercent / total) * 100);
  const awayDisplayPercent = Math.round((awayPercent / total) * 100);

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground text-center">Posedimi i Topit</p>

      {/* Slider */}
      <div className="space-y-3">
        <div className="relative h-16 flex items-center">
          {/* Track background */}
          <div className="absolute w-full h-8 bg-gradient-to-r from-red-500/20 via-slate-300/30 to-blue-500/20 rounded-lg"></div>

          {/* Team labels */}
          <div className="absolute left-0 top-0 text-xs font-bold text-red-600">
            {match.home_team_name || 'Vendas'}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-0 text-xs font-bold text-slate-600">
            Neutral
          </div>
          <div className="absolute right-0 top-0 text-xs font-bold text-blue-600">
            {match.away_team_name || 'Mysafir'}
          </div>

          {/* Slider input */}
          <input
            ref={sliderRef}
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSliderChange}
            disabled={readOnly || !isLive}
            className="absolute w-full h-8 appearance-none bg-transparent cursor-pointer rounded-lg z-10"
            style={{
              opacity: readOnly || !isLive ? 0.5 : 1,
            }}
          />

          {/* Ball indicator */}
          <div
            className="absolute w-7 h-7 rounded-full bg-white border-2 border-yellow-400 shadow-lg z-20 transform -translate-x-1/2 -translate-y-1/3 transition-all"
            style={{
              left: `${sliderValue}%`,
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-lg">⚽</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-xs font-semibold text-muted-foreground px-1">
          <span>{homeDisplayPercent}%</span>
          <span>Posse</span>
          <span>{awayDisplayPercent}%</span>
        </div>
      </div>
    </div>
  );
}