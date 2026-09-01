import { useState, useEffect, useRef } from 'react';
import FootballPitch, { SHOT_ON_ICON, SHOT_OFF_ICON } from './FootballPitch.jsx';
import MatchTimeline from './MatchTimeline.jsx';

function useLiveMinute(match) {
  const [min, setMin] = useState(match?.minute || 0);
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (match?.status === 'first_half' && match.match_start_timestamp)
        setMin(Math.floor((now - match.match_start_timestamp) / 60000));
      else if (match?.status === 'second_half' && match.second_half_start_timestamp)
        setMin(45 + Math.floor((now - match.second_half_start_timestamp) / 60000));
      else
        setMin(match?.minute || 0);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [match?.status, match?.match_start_timestamp, match?.second_half_start_timestamp, match?.minute]);
  return min;
}

// Possession % updated every 5 min. Default 50/50 for first 5 min of match.
function useLivePossession(match) {
  const [pct, setPct] = useState({ home: 50, away: 50 });

  useEffect(() => {
    const compute = () => {
      const isLive = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'].includes(match?.status);
      if (!isLive) { setPct({ home: 50, away: 50 }); return; }

      // Check if at least 5 minutes have passed
      const startTs = match?.match_start_timestamp;
      if (startTs && (Date.now() - startTs) < 5 * 60 * 1000) {
        setPct({ home: 50, away: 50 });
        return;
      }

      let homeMs = match?.stats_possession_home_ms || 0;
      let awayMs = match?.stats_possession_away_ms || 0;
      if (match?.sd_possession && match?.stats_possession_last_switch) {
        const elapsed = Date.now() - match.stats_possession_last_switch;
        if (match.sd_possession === 'home') homeMs += elapsed;
        else awayMs += elapsed;
      }
      const total = homeMs + awayMs;
      if (total === 0) { setPct({ home: 50, away: 50 }); return; }
      const homePct = Math.round((homeMs / total) * 100);
      setPct({ home: homePct, away: 100 - homePct });
    };
    compute();
    const id = setInterval(compute, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [match?.status, match?.sd_possession, match?.stats_possession_last_switch, match?.stats_possession_home_ms, match?.stats_possession_away_ms, match?.match_start_timestamp]);

  return pct;
}

const DEFAULT_HOME_COLOR = '#3b82f6';
const DEFAULT_AWAY_COLOR = '#ef4444';

const SD_EVENT_DISPLAY = {
  corner_home:         { icon: '🚩', getLabel: () => 'Korner',             getTeam: () => 'home' },
  corner_away:         { icon: '🚩', getLabel: () => 'Korner',             getTeam: () => 'away' },
  shot_on_home:        { icon: '🎯', iconUrl: SHOT_ON_ICON, getLabel: () => 'Shut në portë',    getTeam: () => 'home' },
  shot_on_away:        { icon: '🎯', iconUrl: SHOT_ON_ICON, getLabel: () => 'Shut në portë',    getTeam: () => 'away' },
  shot_off_home:       { icon: '💨', iconUrl: SHOT_OFF_ICON, getLabel: () => 'Shut jashtë',     getTeam: () => 'home' },
  shot_off_away:       { icon: '💨', iconUrl: SHOT_OFF_ICON, getLabel: () => 'Shut jashtë',     getTeam: () => 'away' },
  yellow_home:         { icon: '🟨', getLabel: () => 'Karton i verdhë',    getTeam: () => 'home' },
  yellow_away:         { icon: '🟨', getLabel: () => 'Karton i verdhë',    getTeam: () => 'away' },
  red_home:            { icon: '🟥', getLabel: () => 'Karton i kuq',       getTeam: () => 'home' },
  red_away:            { icon: '🟥', getLabel: () => 'Karton i kuq',       getTeam: () => 'away' },
  substitution_home:   { icon: '🔄', getLabel: () => 'Zëvendësim',         getTeam: () => 'home', duration: 6000, isSubstitution: true },
  substitution_away:   { icon: '🔄', getLabel: () => 'Zëvendësim',         getTeam: () => 'away', duration: 6000, isSubstitution: true },
  free_kick_home:      { icon: '⚡', getLabel: () => 'Goditje e Rrezikshme', getTeam: () => 'home' },
  free_kick_away:      { icon: '⚡', getLabel: () => 'Goditje e Rrezikshme', getTeam: () => 'away' },
  var_home:            { icon: null, iconUrl: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/850b9973b_VARCHECK.png', getLabel: () => 'VAR CHECK', getTeam: () => 'home', duration: null, isVar: true },
  var_away:            { icon: null, iconUrl: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/850b9973b_VARCHECK.png', getLabel: () => 'VAR CHECK', getTeam: () => 'away', duration: null, isVar: true },
  offside_home:        { icon: '🚩', getLabel: () => 'Ofsajd',             getTeam: () => 'home' },
  offside_away:        { icon: '🚩', getLabel: () => 'Ofsajd',             getTeam: () => 'away' },
  penalty_home:        { icon: '⚡', getLabel: () => 'Penalti',            getTeam: () => 'home', duration: 30000 },
  penalty_away:        { icon: '⚡', getLabel: () => 'Penalti',            getTeam: () => 'away', duration: 30000 },
  penalty_missed_home: { icon: '❌', getLabel: () => 'Penalti e humbur',   getTeam: () => 'home', duration: 8000 },
  penalty_missed_away: { icon: '❌', getLabel: () => 'Penalti e humbur',   getTeam: () => 'away', duration: 8000 },
  foul_home:           { icon: '🤚', getLabel: () => 'Faul',               getTeam: () => 'home' },
  foul_away:           { icon: '🤚', getLabel: () => 'Faul',               getTeam: () => 'away' },
  injury_home:         { icon: '🚑', getLabel: () => 'Lëndim',             getTeam: () => 'home', duration: null, isInjury: true },
  injury_away:         { icon: '🚑', getLabel: () => 'Lëndim',             getTeam: () => 'away', duration: null, isInjury: true },
};

const WEATHER_ICONS = { sun: '☀️', cloudy: '⛅', rain: '🌧️', snow: '❄️', wind: '💨', fog: '🌫️' };

const STAT_ROWS = [
  { label: 'Posedimi', isPossession: true },
  { label: 'Shuta në portë',    homeKey: 'shot_on_home',     awayKey: 'shot_on_away' },
  { label: 'Shuta jashtë',      homeKey: 'shot_off_home',    awayKey: 'shot_off_away' },
  { label: 'Kornerë',           homeKey: 'corner_home',      awayKey: 'corner_away' },
  { label: 'Faule',             homeKey: 'foul_home',        awayKey: 'foul_away' },
  { label: 'Ofsajde',           homeKey: 'offside_home',     awayKey: 'offside_away' },
  { label: 'Kartona të verdha', homeKey: 'yellow_home',      awayKey: 'yellow_away' },
  { label: 'Kartona të kuq',    homeKey: 'red_home',         awayKey: 'red_away' },
  { label: 'Zëvendësime',       homeKey: 'substitution_home',awayKey: 'substitution_away' },
];

export default function SuperDeepPublicView({ match, events }) {
  const minute = useLiveMinute(match);
  const isLive = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'].includes(match.status);
  const sdStats = match.sd_stats || {};

  const homeColor = match.sd_home_color || DEFAULT_HOME_COLOR;
  const awayColor = match.sd_away_color || DEFAULT_AWAY_COLOR;
  const ballVisible = match.sd_ball_visible !== false;

  const possession = useLivePossession(match);

  const redCards = {
    home: sdStats.red_home || 0,
    away: sdStats.red_away || 0,
  };

  // Goal animation
  const [goalAnim, setGoalAnim] = useState(null);
  const lastGoalEvtRef = useRef(null);
  useEffect(() => {
    const evt = match?.sd_last_event;
    if (!evt || evt.key !== 'goal' || !evt.ts) return;
    const evtId = `goal-${evt.ts}`;
    if (lastGoalEvtRef.current === evtId) return;
    lastGoalEvtRef.current = evtId;
    const team = evt.team || 'home';
    const teamName = team === 'home' ? match.home_team_name : match.away_team_name;
    setGoalAnim({ team, teamName, playerName: evt.player || null });
    setTimeout(() => setGoalAnim(null), 10000);
  }, [match?.sd_last_event?.ts, match?.sd_last_event?.key]);

  // Penalty flash
  const [penaltyFlash, setPenaltyFlash] = useState(false);
  const [penaltyFlashTeam, setPenaltyFlashTeam] = useState(null);
  const lastPenaltyRef = useRef(null);
  useEffect(() => {
    const evt = match?.sd_last_event;
    if (!evt || !evt.ts) return;
    if (!evt.key?.startsWith('penalty_') || evt.key?.includes('missed')) return;
    const evtId = `${evt.key}-${evt.ts}`;
    if (lastPenaltyRef.current === evtId) return;
    lastPenaltyRef.current = evtId;
    setPenaltyFlash(true);
    setPenaltyFlashTeam(evt.team || null);
    // Keep flashing until goal/missed event arrives
  }, [match?.sd_last_event?.ts, match?.sd_last_event?.key]);

  // Stop penalty flash when goal or missed arrives (track by ts to avoid false triggers)
  const lastPenaltyStopRef = useRef(null);
  useEffect(() => {
    const evt = match?.sd_last_event;
    if (!evt || !evt.ts) return;
    const evtId = `${evt.key}-${evt.ts}`;
    if (lastPenaltyStopRef.current === evtId) return;
    if (evt.key === 'goal' || evt.key?.includes('missed')) {
      lastPenaltyStopRef.current = evtId;
      setPenaltyFlash(false);
      setPenaltyFlashTeam(null);
    }
  }, [match?.sd_last_event?.key, match?.sd_last_event?.ts]);

  // Clear ALL banners when server clears sd_last_event (agent dismissed it)
  useEffect(() => {
    const evt = match?.sd_last_event;
    if (!evt || !evt.key) {
      setSdLastEvent(null);
    }
  }, [match?.sd_last_event?.key, match?.sd_last_event?.ts]);

  // SD event banner
  const [sdLastEvent, setSdLastEvent] = useState(null);
  const lastSdEventRef = useRef(null);
  useEffect(() => {
    const evt = match?.sd_last_event;
    if (!evt || !evt.key || !evt.ts) return;
    if (evt.key === 'goal') return;
    const evtId = `${evt.key}-${evt.ts}`;
    if (lastSdEventRef.current === evtId) return;
    lastSdEventRef.current = evtId;
    const disp = SD_EVENT_DISPLAY[evt.key];
    if (!disp) return;
    const team = disp.getTeam();
    const teamName = team === 'home' ? match.home_team_name : match.away_team_name;
    const teamColor = team === 'home' ? homeColor : awayColor;
    let playerOut = null, playerIn = null, playerName = null;
    if (disp.isSubstitution && evt.player && evt.player.includes('→')) {
      const parts = evt.player.split('→');
      playerOut = parts[0]?.trim() || null;
      playerIn = parts[1]?.trim() || null;
    } else if (!disp.isVar) {
      playerName = evt.player || null;
    }
    // VAR: use varLabel, no playerName (avoid duplicate text)
    const label = disp.isVar && evt.varLabel ? evt.varLabel : disp.getLabel();
    const displayTeamName = disp.isVar ? null : teamName;
    setSdLastEvent({ icon: disp.icon, iconUrl: disp.iconUrl || null, label, teamName: displayTeamName, teamColor, playerName, playerOut, playerIn, isVar: disp.isVar || false, isInjury: disp.isInjury || false });
    // VAR and Injury: no auto-dismiss — stays until cleared on server
    if (!disp.isVar && !disp.isInjury) {
      const duration = disp.duration || 4000;
      const timer = setTimeout(() => setSdLastEvent(null), duration);
      return () => clearTimeout(timer);
    }
  }, [match?.sd_last_event?.ts, match?.sd_last_event?.key]);

  // Show weather & referees on pitch when scheduled (same logic as agent panel)
  const isPreMatch = match.status === 'scheduled';
  const showWeather = isPreMatch && !isLive;
  const referees = isPreMatch ? { main: match.referee_main, assistant1: match.referee_assistant1, assistant2: match.referee_assistant2 } : null;

  if (!match.super_deep) return null;

  return (
    <div className="mt-4 space-y-3">
      {/* Badge */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/50 rounded-full px-3 py-1">
          <span className="text-yellow-500 text-xs font-black">⚡</span>
          <span className="text-xs font-bold text-yellow-600">SUPERDEEP LIVE</span>
        </div>
        {isLive && (
          <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded-full px-2 py-0.5">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-red-500">{minute}'</span>
          </div>
        )}
        {showWeather && (
          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-400/30 rounded-full px-2 py-0.5">
            {match.sd_weather && <span>{WEATHER_ICONS[match.sd_weather] || ''}</span>}
            {match.sd_temp != null && <span className="text-[10px] font-bold text-blue-600">{match.sd_temp}°C</span>}
          </div>
        )}
      </div>

      {/* Pitch */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <FootballPitch
          homeSide={match.sd_home_side || 'left'}
          possession={match.sd_possession}
          homeTeamName={match.home_team_name}
          awayTeamName={match.away_team_name}
          readOnly={true}
          homeColor={homeColor}
          awayColor={awayColor}
          ballPos={match.sd_ball_pos || null}
          cornerArrow={match.sd_corner_arrow || null}
          showGoalAnimation={goalAnim}
          sdLastEvent={sdLastEvent}
          ballVisible={ballVisible && match.status !== 'half_time'}
          matchStatus={match.status}
          sdStats={sdStats}
          halfTimeStats={true}
          penaltyFlash={penaltyFlash}
          penaltyTeam={penaltyFlashTeam}
          showWeatherOnPitch={showWeather && (match.sd_weather || match.sd_temp != null) ? { weather: match.sd_weather, temp: match.sd_temp } : null}
          referees={referees}
          redCards={redCards}
        />
        {match.sd_possession && match.status !== 'scheduled' && (
          <div className="px-3 py-2 text-xs text-center font-semibold text-muted-foreground">
            Posedimi:{' '}
            <span className="font-bold" style={{ color: match.sd_possession === 'home' ? homeColor : awayColor }}>
              {match.sd_possession === 'home' ? match.home_team_name : match.away_team_name}
            </span>
          </div>
        )}
      </div>

      {/* Timeline */}
      {events && events.length > 0 && (
        <MatchTimeline events={events} match={match} />
      )}

      {/* Stats */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Statistikat</h3>
        <div className="flex justify-between text-[10px] font-bold mb-2">
          <span style={{ color: homeColor }}>{match.home_team_name}</span>
          <span style={{ color: awayColor }}>{match.away_team_name}</span>
        </div>
        <div className="space-y-2.5">
          {STAT_ROWS.map(row => {
            if (row.isPossession) {
              return (
                <div key="possession">
                  <div className="flex justify-between text-[11px] font-bold mb-0.5">
                    <span className="text-foreground font-black">{possession.home}%</span>
                    <span className="text-muted-foreground text-[10px]">Posedimi</span>
                    <span className="text-foreground font-black">{possession.away}%</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                    <div className="transition-all duration-1000" style={{ width: `${possession.home}%`, background: homeColor }} />
                    <div className="transition-all duration-1000 ml-auto" style={{ width: `${possession.away}%`, background: awayColor }} />
                  </div>
                </div>
              );
            }
            const h = sdStats[row.homeKey] || 0;
            const a = sdStats[row.awayKey] || 0;
            const total = h + a || 1;
            return (
              <div key={row.label}>
                <div className="flex justify-between text-[11px] font-bold mb-0.5">
                  <span className="text-foreground font-black">{h}</span>
                  <span className="text-muted-foreground text-[10px]">{row.label}</span>
                  <span className="text-foreground font-black">{a}</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                  <div className="transition-all duration-500" style={{ width: `${(h / total) * 100}%`, background: homeColor }} />
                  <div className="transition-all duration-500 ml-auto" style={{ width: `${(a / total) * 100}%`, background: awayColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}