import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Normalize a color to {r,g,b}. Handles #rgb, #rrggbb.
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  if (isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function relLuminance({ r, g, b }) {
  const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
// If home & away colors are identical or too close to distinguish, force a
// clearly different away color so the two teams' event circles never match.
function ensureTeamColors(home, away) {
  const h = hexToRgb(home) || hexToRgb('#3b82f6');
  const a = hexToRgb(away) || hexToRgb('#ef4444');
  if (!h || !a) return [home || '#3b82f6', away || '#ef4444'];
  const same = home && away && home.toLowerCase() === away.toLowerCase();
  const lumDiff = Math.abs(relLuminance(h) - relLuminance(a));
  // Contrast ratio between the two (>=4.5 = clearly distinguishable)
  const lighter = Math.max(relLuminance(h), relLuminance(a));
  const darker = Math.min(relLuminance(h), relLuminance(a));
  const contrast = (lighter + 0.05) / (darker + 0.05);
  if (same || contrast < 2.5) {
    // Pick a palette fallback that contrasts with home
    const palette = ['#ef4444', '#22c55e', '#a855f7', '#f97316', '#0ea5e9', '#eab308'];
    const homeLum = relLuminance(h);
    let best = palette[0], bestContrast = 0;
    palette.forEach(c => {
      const rgb = hexToRgb(c);
      if (!rgb) return;
      const cl = relLuminance(rgb);
      const lo = Math.min(homeLum, cl), hi = Math.max(homeLum, cl);
      const cr = (hi + 0.05) / (lo + 0.05);
      if (cr > bestContrast) { bestContrast = cr; best = c; }
    });
    return [home || '#3b82f6', best];
  }
  return [home || '#3b82f6', away || '#ef4444'];
}

const ICON_URLS = {
  yellow_card: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/574698bbe_KARTONIVERDH.png',
  second_yellow: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/9c7628b09_YELLOWRED.png',
  red_card: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/d88111f76_DIREKTRED.png',
  substitution: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/4bec831e1_SUBSTITUTION.png',
  missed_penalty: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/91e20eecb_MISSEDPENALTY.png',
  var_canceled: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/494882784_VARLOGO.png',
};

function getMinuteLabel(e) {
  if (e.extra_time_minute) return `${e.minute}+${e.extra_time_minute}'`;
  return e.minute ? `${e.minute}'` : '';
}

function EventIcon({ type, size = 16 }) {
  if (type === 'goal' || type === 'penalty_goal' || type === 'own_goal') {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>⚽</span>;
  }
  if (type === 'hydration') return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>💧</span>;
  if (type === 'var_penalty_awarded') return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>🎯</span>;
  if (type === 'var_no_penalty') return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>❌</span>;
  if (ICON_URLS[type]) {
    return <img src={ICON_URLS[type]} alt={type} style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }} />;
  }
  return null;
}

function TimelineEvent({ event, homeColor, awayColor, playerEntityId, playerEntityIdMap }) {
  const isHome = event.team === 'home';
  const isGoal = ['goal', 'penalty_goal', 'own_goal'].includes(event.type);
  const isOG = event.type === 'own_goal' || event.is_own_goal;
  const isSub = event.type === 'substitution';
  const isPenaltyGoal = event.type === 'penalty_goal';
  const teamColor = isHome ? homeColor : awayColor;
  const minuteLabel = getMinuteLabel(event);

  const displayName = (() => {
    if (event.type === 'var_canceled') return `Gol i Anuluar${event.cancellation_reason ? ` (${event.cancellation_reason})` : ''}`;
    if (isSub) return event.player_in_name || event.player_name || '';
    if (isOG && event.player_name && !event.player_name.includes('(AG)')) return `${event.player_name} (AG)`;
    return event.player_name || '';
  })();

  const lookupId = (id, name) => (id && playerEntityIdMap[id]) || (name && playerEntityIdMap[`name:${name}`]) || null;
  const playerOutId = lookupId(event.player_out_id, event.player_out_name);
  const assistId = lookupId(event.assist_player_id, event.assist_player_name);

  const renderName = (name, entityId, className, isGoalFlag, isOGFlag) => {
    if (!name) return null;
    if (entityId) {
      return (
        <Link to={`/player/${entityId}`} onClick={e => e.stopPropagation()} className={cn(
          'hover:text-primary hover:underline transition-colors', className
        )}>
          {name}
        </Link>
      );
    }
    return <span className={className}>{name}</span>;
  };

  const scoreBox = isGoal && event.home_score_after !== undefined ? (
    <span
      className="text-[10px] font-black px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ background: teamColor, color: 'white' }}
    >
      {event.home_score_after}:{event.away_score_after}
    </span>
  ) : null;

  const nameEl = playerEntityId && displayName ? (
    <Link to={`/player/${playerEntityId}`} onClick={e => e.stopPropagation()} className={cn(
      'text-[10px] leading-tight font-semibold truncate max-w-[140px] hover:text-primary hover:underline transition-colors',
      isGoal && 'font-black',
      isOG && 'text-red-500'
    )}>
      {displayName}
    </Link>
  ) : (
    <span className={cn(
      'text-[10px] leading-tight font-semibold truncate max-w-[140px]',
      isGoal && 'font-black',
      isOG && 'text-red-500'
    )}>
      {displayName}
    </span>
  );

  const content = (
    <div className={cn('flex flex-col', isHome ? 'items-end' : 'items-start')}>
      {isGoal && scoreBox ? (
        // Scorer name + score box on one line: home → [name][box], away → [box][name]
        <div className={cn('flex items-center gap-1.5', isHome ? 'flex-row' : 'flex-row-reverse')}>
          {nameEl}
          {scoreBox}
        </div>
      ) : nameEl}
      {isSub && event.player_out_name && (
        <span className="text-[9px] text-gray-400 leading-tight flex items-center gap-0.5">
          ({renderName(event.player_out_name, playerOutId, 'hover:text-primary hover:underline transition-colors')})
          {event.is_injury && <Plus className="w-2.5 h-2.5 text-red-500 inline-block shrink-0" />}
        </span>
      )}
      {isPenaltyGoal && (
        <span className="text-[9px] text-muted-foreground">(Penalti)</span>
      )}
      {event.type === 'missed_penalty' && (
        <span className="text-[10px] text-gray-400 font-medium leading-tight">(Penalti e Humbur)</span>
      )}
      {isGoal && event.assist_player_name && (
        <span className="text-[9px] text-muted-foreground">
          ass. {renderName(event.assist_player_name, assistId, 'hover:text-primary hover:underline transition-colors')}
        </span>
      )}
    </div>
  );

  return (
    <div className="relative flex items-center min-h-[44px] py-1">
      {/* Left side — home content */}
      <div className="w-[calc(50%-18px)] pr-1.5 flex justify-end">
        {isHome && content}
      </div>

      {/* Center icon — circle vertically centered exactly on the row center so the
          name/score row aligns with the circle's middle. Minute label sits below. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: teamColor }}
        >
          {isGoal ? (
            <EventIcon type={event.type} size={14} />
          ) : (
            <div className="w-[27px] h-[27px] rounded-full bg-card flex items-center justify-center">
              <EventIcon type={event.type} size={14} />
            </div>
          )}
        </div>
      </div>
      <span className="absolute left-1/2 top-1/2 mt-4 -translate-x-1/2 text-[8px] font-bold text-muted-foreground z-10 whitespace-nowrap">{minuteLabel}</span>

      {/* Right side — away content */}
      <div className="w-[calc(50%-18px)] ml-auto pl-1.5 flex justify-start">
        {!isHome && content}
      </div>
    </div>
  );
}

function Separator({ label }) {
  return (
    <div className="flex items-center gap-2 py-1 my-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[9px] font-bold text-muted-foreground px-1 opacity-70">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ExtraTimeBoard({ minutes, minute }) {
  return (
    <div className="relative flex items-center min-h-[44px] py-1">
      <div className="w-[calc(50%-18px)]" />
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
        {/* Black semafor box with red digital number */}
        <div className="rounded overflow-hidden shadow-md border border-gray-600" style={{ width: '32px' }}>
          <div className="bg-black flex items-center justify-center py-0.5">
            <span
              className="font-black leading-none tracking-wider"
              style={{ color: '#ff0000', fontSize: '13px', fontFamily: '"Orbitron", monospace', textShadow: '0 0 3px rgba(255,0,0,0.7), 0 0 1px rgba(255,80,80,0.9)', letterSpacing: '0.5px' }}
            >
              +{minutes}
            </span>
          </div>
        </div>
        <span className="text-[8px] font-bold text-muted-foreground mt-0.5">{minute}'</span>
      </div>
      <div className="w-[calc(50%-18px)] ml-auto" />
    </div>
  );
}

// Ikona e bilbilit të referit (imazh i dedikuar me sfond transparent)
const WHISTLE_ICON_URL = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/87b6b9e8c_whistle_icon_transparent.png';

function WhistleIcon({ className }) {
  return (
    <img src={WHISTLE_ICON_URL} alt="bilbil" className={className} style={{ objectFit: 'contain' }} aria-hidden="true" />
  );
}

// Shenjat sintetike të ndeshjes (Fillim / HT / FT) — rreth i artë i fortë me ikonën e bilbilit
function MatchMarker({ label }) {
  return (
    <div className="relative flex items-center min-h-[44px] py-1">
      <div className="w-[calc(50%-18px)]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm ring-1 ring-amber-900/20" style={{ background: '#FFA000' }}>
          <WhistleIcon className="w-5 h-5" />
        </div>
      </div>
      <span className="absolute left-1/2 top-1/2 mt-4 -translate-x-1/2 text-[8px] font-black text-amber-800 z-10 whitespace-nowrap">{label}</span>
      <div className="w-[calc(50%-18px)] ml-auto" />
    </div>
  );
}

export default function MatchTimeline({ events, match, homeColor: homeColorProp, awayColor: awayColorProp, playerEntityIdMap = {} }) {
  const [homeColor, awayColor] = ensureTeamColors(
    homeColorProp || match.sd_home_color || '#3b82f6',
    awayColorProp || match.sd_away_color || '#ef4444'
  );

  const relevantTypes = ['goal', 'penalty_goal', 'own_goal', 'yellow_card', 'second_yellow', 'red_card', 'substitution', 'missed_penalty', 'var_canceled', 'hydration', 'var_penalty_awarded', 'var_no_penalty'];
  const filtered = [...events]
    .filter(e => relevantTypes.includes(e.type))
    .sort((a, b) => {
      const mA = (a.minute || 0) * 10000 + (a.extra_time_minute || 0);
      const mB = (b.minute || 0) * 10000 + (b.extra_time_minute || 0);
      if (mA !== mB) return mA - mB;
      return (a.event_timestamp || 0) - (b.event_timestamp || 0);
    });

  // Gjendja e ndeshjes përcakton cilat shenja sintetike shfaqen
  const STARTED = ['first_half','half_time','second_half','awaiting_extra_time','extra_time_first_half','extra_time_half_time','extra_time_second_half','penalties','full_time','official_result','interrupted'];
  const HALF_TIME_REACHED = ['half_time','second_half','awaiting_extra_time','extra_time_first_half','extra_time_half_time','extra_time_second_half','penalties','full_time','official_result'];
  const FINISHED = ['full_time','official_result'];
  const hasStarted = STARTED.includes(match.status);
  const halfTimeReached = HALF_TIME_REACHED.includes(match.status);
  const isFinished = FINISHED.includes(match.status);

  if (filtered.length === 0 && !hasStarted) return null;

  // Split by half, then separate stoppage-time events (minute 45+X / 90+X) from regular ones
  const firstHalfRegular = filtered.filter(e => {
    const m = e.minute || 0;
    return m < 45 || (m === 45 && !e.extra_time_minute);
  });
  const firstHalfStoppageEv = filtered.filter(e => (e.minute || 0) === 45 && e.extra_time_minute);
  const secondHalfRegular = filtered.filter(e => {
    const m = e.minute || 0;
    return (m > 45 && m < 90) || (m === 90 && !e.extra_time_minute);
  });
  const secondHalfStoppageEv = filtered.filter(e => (e.minute || 0) === 90 && e.extra_time_minute);
  const extra = filtered.filter(e => (e.minute || 0) > 90);

  // Minutat shtesë (stoppage): admin_et për ndeshjet e përfunduara, extra_time për live
  const firstHalfStoppage = match.admin_et_first_half || match.extra_time_first_half || 0;
  const secondHalfStoppage = match.admin_et_second_half || match.extra_time_second_half || 0;

  const hasSecondHalf = secondHalfRegular.length > 0 || secondHalfStoppageEv.length > 0 || secondHalfStoppage > 0;

  return (
    <div className="mt-3 bg-card rounded-2xl border border-border overflow-hidden max-md:[zoom:1.15] max-md:origin-top md:[zoom:1.2] md:origin-top">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm">⏱</span>
          <span className="text-xs font-black uppercase tracking-wide text-foreground">Timeline</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex px-3 pt-2 pb-1">
        <div className="flex-1 text-center">
          <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-muted/40 border border-border/50" style={{ color: homeColor }}>
            {match.home_team_name}
          </span>
        </div>
        <div className="w-10" />
        <div className="flex-1 text-center">
          <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-muted/40 border border-border/50" style={{ color: awayColor }}>
            {match.away_team_name}
          </span>
        </div>
      </div>

      {/* Vertical line + events */}
      <div className="relative px-3 pb-3">
        {/* Vertical center line — exactly at 50% */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 pointer-events-none" />

        <div className="space-y-1">
          {hasStarted && <MatchMarker label="1'" />}
          {firstHalfRegular.map((e, i) => (
            <TimelineEvent key={e.id || i} event={e} homeColor={homeColor} awayColor={awayColor} playerEntityId={playerEntityIdMap[e.player_id] || playerEntityIdMap[e.player_in_id] || playerEntityIdMap[`name:${e.player_name}`]} playerEntityIdMap={playerEntityIdMap} />
          ))}
          {firstHalfStoppage > 0 && <ExtraTimeBoard minutes={firstHalfStoppage} minute={45} />}
          {firstHalfStoppageEv.map((e, i) => (
            <TimelineEvent key={e.id || i} event={e} homeColor={homeColor} awayColor={awayColor} playerEntityId={playerEntityIdMap[e.player_id] || playerEntityIdMap[e.player_in_id] || playerEntityIdMap[`name:${e.player_name}`]} playerEntityIdMap={playerEntityIdMap} />
          ))}
          {halfTimeReached && <MatchMarker label="HT" />}
          {halfTimeReached && <Separator label="Pjesa e dytë" />}
          {secondHalfRegular.map((e, i) => (
            <TimelineEvent key={e.id || i} event={e} homeColor={homeColor} awayColor={awayColor} playerEntityId={playerEntityIdMap[e.player_id] || playerEntityIdMap[e.player_in_id] || playerEntityIdMap[`name:${e.player_name}`]} playerEntityIdMap={playerEntityIdMap} />
          ))}
          {secondHalfStoppage > 0 && <ExtraTimeBoard minutes={secondHalfStoppage} minute={90} />}
          {secondHalfStoppageEv.map((e, i) => (
            <TimelineEvent key={e.id || i} event={e} homeColor={homeColor} awayColor={awayColor} playerEntityId={playerEntityIdMap[e.player_id] || playerEntityIdMap[e.player_in_id] || playerEntityIdMap[`name:${e.player_name}`]} playerEntityIdMap={playerEntityIdMap} />
          ))}
          {extra.length > 0 && (
            <>
              <Separator label="— Vazhdime —" />
              {extra.map((e, i) => (
                <TimelineEvent key={e.id || i} event={e} homeColor={homeColor} awayColor={awayColor} playerEntityId={playerEntityIdMap[e.player_id] || playerEntityIdMap[e.player_in_id] || playerEntityIdMap[`name:${e.player_name}`]} playerEntityIdMap={playerEntityIdMap} />
              ))}
            </>
          )}
          {isFinished && <MatchMarker label="FT" />}
        </div>
      </div>
    </div>
  );
}