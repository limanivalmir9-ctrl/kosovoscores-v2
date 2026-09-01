// Real-time match statistics bar shown on MatchDetail when deep_stats is enabled
import { useState, useEffect } from 'react';

function calcPossession(match) {
  let homePossMs = match.stats_possession_home_ms || 0;
  let awayPossMs = match.stats_possession_away_ms || 0;

  // Add live time for the current possession holder
  const current = match.stats_possession_current;
  const lastSwitch = match.stats_possession_last_switch;
  // Only add live elapsed time when match is actively running (not HT, not ET HT, not penalties)
  const liveStatuses = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'];
  if (current && current !== 'neutral' && lastSwitch && liveStatuses.includes(match.status)) {
    const elapsed = Date.now() - lastSwitch;
    if (current === 'home') homePossMs += elapsed;
    else if (current === 'away') awayPossMs += elapsed;
  }

  const totalPossMs = homePossMs + awayPossMs;
  if (totalPossMs === 0) return { homePoss: 50, awayPoss: 50 };
  const homePoss = Math.round((homePossMs / totalPossMs) * 100);
  return { homePoss, awayPoss: 100 - homePoss };
}

export default function MatchStatsBar({ match, events, forceShow }) {
  const [, setTick] = useState(0);

  // Refresh every 15 seconds for live matches
  useEffect(() => {
    const liveStatuses = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'];
    if (!match?.deep_stats || !liveStatuses.includes(match?.status)) return;
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, [match?.status, match?.deep_stats]);

  if (!match.deep_stats && !forceShow) return null;
  if (!match.deep_stats) return <div className="mt-4 bg-card rounded-2xl border border-border p-6 text-center"><p className="text-sm text-muted-foreground">Nuk ka statistika të detajuara për këtë ndeshje</p></div>;

  // Derive stats from match fields + events
  const homeCorners = match.stats_home_corners || 0;
  const awayCorners = match.stats_away_corners || 0;
  const homeShots = match.stats_home_shots || 0;
  const awayShots = match.stats_away_shots || 0;
  const homeShotsOff = match.stats_home_shots_off || 0;
  const awayShotsOff = match.stats_away_shots_off || 0;

  // Yellow & Red cards from events
  const homeYellow = events.filter(e => e.team === 'home' && (e.type === 'yellow_card' || e.type === 'second_yellow')).length;
  const awayYellow = events.filter(e => e.team === 'away' && (e.type === 'yellow_card' || e.type === 'second_yellow')).length;
  const homeRed = (match.home_red_cards || 0);
  const awayRed = (match.away_red_cards || 0);

  // Substitutions from events
  const homeSubs = events.filter(e => e.team === 'home' && e.type === 'substitution').length;
  const awaySubs = events.filter(e => e.team === 'away' && e.type === 'substitution').length;

  // Team colors for stat bars (set by agent before kick-off)
  const homeColor = match.sd_home_color || '#e8003d';
  const awayColor = match.sd_away_color || '#1a1a2e';

  // Live possession calculation (includes elapsed time of current holder)
  const { homePoss, awayPoss } = calcPossession(match);

  const stats = [
    { label: 'Posedimi i Topit', home: `${homePoss}%`, away: `${awayPoss}%`, homeVal: homePoss, awayVal: awayPoss, isPossession: true },
    { label: 'Shuta në Portë', home: homeShots, away: awayShots, homeVal: homeShots, awayVal: awayShots },
    { label: 'Shuta Jashtë Porte', home: homeShotsOff, away: awayShotsOff, homeVal: homeShotsOff, awayVal: awayShotsOff },
    { label: 'Kornerat', home: homeCorners, away: awayCorners, homeVal: homeCorners, awayVal: awayCorners },
    { label: 'Kartona të Verdhë', home: homeYellow, away: awayYellow, homeVal: homeYellow, awayVal: awayYellow },
    { label: 'Kartona të Kuq', home: homeRed, away: awayRed, homeVal: homeRed, awayVal: awayRed },
    { label: 'Zëvendësimet', home: homeSubs, away: awaySubs, homeVal: homeSubs, awayVal: awaySubs },
  ];

  return (
    <div className="mt-4 bg-card rounded-2xl border border-border p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Statistikat</h3>
      <div className="space-y-4">
        {stats.map((stat, i) => {
          const total = stat.homeVal + stat.awayVal;
          const homePercent = total === 0 ? 50 : Math.round((stat.homeVal / total) * 100);
          const awayPercent = 100 - homePercent;
          return (
            <div key={i}>
              {/* Labels row */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-foreground w-10">{stat.home}</span>
                <span className="text-xs font-semibold text-muted-foreground text-center flex-1">{stat.label}</span>
                <span className="text-sm font-bold text-foreground w-10 text-right">{stat.away}</span>
              </div>
              {/* Bar row */}
              <div className="flex items-center gap-1 h-2">
                {/* Home bar (left side, grows right→left) */}
                <div className="flex-1 flex justify-end">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${total === 0 ? 50 : homePercent}%`,
                      background: homeColor,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                {/* Center divider */}
                <div className="w-1 h-3 bg-background flex-shrink-0" />
                {/* Away bar (right side, grows left→right) */}
                <div className="flex-1 flex justify-start">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${total === 0 ? 50 : awayPercent}%`,
                      background: awayColor,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}