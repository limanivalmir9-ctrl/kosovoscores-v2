import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, memo } from 'react';
import { Bell, BellOff } from 'lucide-react';

function useLiveClock(match) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!match || !match.status) { setDisplay(''); return; }
    const liveStatuses = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'];
    if (!liveStatuses.includes(match.status)) {
      setDisplay('');
      return;
    }

    const tick = () => {
      const now = Date.now();
      let totalSecs;

      if (match.status === 'first_half' && match.match_start_timestamp) {
        totalSecs = Math.floor((now - match.match_start_timestamp) / 1000);
      } else if (match.status === 'second_half' && match.second_half_start_timestamp) {
        totalSecs = Math.floor((now - match.second_half_start_timestamp) / 1000) + 45 * 60;
      } else if (match.status === 'extra_time_first_half' && match.extra_time_start_timestamp) {
        totalSecs = Math.floor((now - match.extra_time_start_timestamp) / 1000) + 90 * 60;
      } else if (match.status === 'extra_time_second_half' && match.extra_time_sh_start_timestamp) {
        totalSecs = Math.floor((now - match.extra_time_sh_start_timestamp) / 1000) + 105 * 60;
      } else {
        totalSecs = (match.minute || 0) * 60;
      }

      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      const base = match.status === 'first_half' ? 45 : match.status === 'second_half' ? 90 : match.status === 'extra_time_first_half' ? 105 : 120;

      if (mins >= base) {
        setDisplay(`${base}+${mins - base}:${String(secs).padStart(2, '0')}`);
      } else {
        setDisplay(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match?.status, match?.match_start_timestamp, match?.second_half_start_timestamp, match?.extra_time_start_timestamp, match?.extra_time_sh_start_timestamp, match?.minute]);

  return display;
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('ks_favorites') || '[]'); } catch { return []; }
}
function setFavorites(ids) {
  localStorage.setItem('ks_favorites', JSON.stringify(ids));
}

function sanitizePenalties(arr) {
  if (!arr || !Array.isArray(arr)) return [];
  try {
    const plain = JSON.parse(JSON.stringify(arr));
    if (!Array.isArray(plain)) return [];
    return plain.filter(item => {
      if (item === null || item === undefined) return false;
      if (typeof item === 'string') return true;
      if (typeof item === 'object' && (item.result || item.player)) return true;
      return false;
    });
  } catch {
    return [];
  }
}

function MatchCard({ match: rawMatch }) {
  // Strip SDK proxy wrappers at the boundary — prevents 'data-collection-item-id' errors
  let match = null;
  try {
    match = rawMatch ? JSON.parse(JSON.stringify(rawMatch)) : null;
  } catch (e) {
    match = null;
  }

  const liveClock = useLiveClock(match);
  const [isFav, setIsFav] = useState(() => match ? getFavorites().includes(match.id) : false);
  const [notifDenied, setNotifDenied] = useState(false);
  const [flashHome, setFlashHome] = useState(false);
  const [flashAway, setFlashAway] = useState(false);
  const [showGol, setShowGol] = useState(false);
  const prevHome = useRef(match?.home_score);
  const prevAway = useRef(match?.away_score);

  useEffect(() => {
    if (!match) return;
    if (match.home_score !== prevHome.current) {
      setFlashHome(true); setShowGol(true);
      setTimeout(() => setFlashHome(false), 1500);
      setTimeout(() => setShowGol(false), 3000);
      prevHome.current = match.home_score;
    }
    if (match.away_score !== prevAway.current) {
      setFlashAway(true); setShowGol(true);
      setTimeout(() => setFlashAway(false), 1500);
      setTimeout(() => setShowGol(false), 3000);
      prevAway.current = match.away_score;
    }
  }, [match?.home_score, match?.away_score]);

  if (!match) return null;

  const isLive = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'].includes(match.status);
  const isHT = match.status === 'half_time';
  const isFT = match.status === 'full_time';
  const isOfficialResult = match.status === 'official_result';
  const isCancelled = match.status === 'cancelled';
  const isInterrupted = match.status === 'interrupted';
  const isPostponed = match.status === 'postponed';
  const isScheduled = match.status === 'scheduled';
  const isActive = isLive || isHT || ['awaiting_extra_time', 'extra_time_half_time', 'penalties'].includes(match.status);



  const getStatusDisplay = () => {
    if (isScheduled) {
      const dateFormatted = match.date ? match.date.split('-').reverse().join('/') : '';
      const timeText = match.time || '--:--';
      return { text: timeText, date: dateFormatted, live: false };
    }
    if (isLive) return { text: liveClock || `${match.minute || 0}'`, live: true };
    if (isHT) return { text: 'HT', live: true };
    if (isFT) {
      if (match.penalty_winner) return { text: 'Pas Penaltive', live: false };
      return { text: 'FT', live: false };
    }
    if (isOfficialResult) return { text: '', live: false, officialResult: true };
    if (match.status === 'cancelled') return { text: 'E ANULUAR', live: false, cancelled: true };
    if (match.status === 'interrupted') return { text: 'E NDËRPRERË', live: false, cancelled: true };
    if (match.status === 'postponed') return { text: 'E SHTYER', live: false, cancelled: true };
    if (match.status === 'awaiting_extra_time') return { text: 'Vazhdimet', live: true };
    if (match.status === 'extra_time_half_time') return { text: 'ET HT', live: true };
    if (match.status === 'penalties') {
      const hg = sanitizePenalties(match.penalty_home).filter(x => (typeof x === 'string' ? x : x?.result) === 'goal').length;
      const ag = sanitizePenalties(match.penalty_away).filter(x => (typeof x === 'string' ? x : x?.result) === 'goal').length;
      return { text: `Pen. ${hg}:${ag}`, live: true };
    }
    return { text: '', live: false };
  };

  const extraTimeLabel = () => {
    if (!isLive) return null;
    const extra = match.status === 'first_half' ? (match.extra_time_first_half || 0) : (match.extra_time_second_half || 0);
    return extra > 0 ? `+${extra}` : null;
  };

  const toggleFav = async (e) => {
    e.preventDefault(); e.stopPropagation();
    const favs = getFavorites();
    const isCurrentlyFav = favs.includes(match.id);
    if (!isCurrentlyFav) {
      // Subscribing — request notification permission first
      if ('Notification' in window && Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        if (result === 'denied') { setNotifDenied(true); return; }
      }
      setNotifDenied(false);
    }
    const next = isCurrentlyFav ? favs.filter(id => id !== match.id) : [...favs, match.id];
    setFavorites(next);
    setIsFav(next.includes(match.id));
  };

  const status = getStatusDisplay();
  const homeRed = match.home_red_cards || 0;
  const awayRed = match.away_red_cards || 0;
  // second_yellow counts as red for display
  const homeRedCards = homeRed;
  const awayRedCards = awayRed;

  return (
    <Link to={`/match/${match.id}`} className="block">
      <div className={cn(
        'relative bg-card rounded-2xl p-3.5 transition-all hover:shadow-lg hover:-translate-y-0.5 border shadow-sm',
        isLive ? 'border-live/40 ring-1 ring-live/10 shadow-live/10' : 'border-border/60'
      )}>
        <button
          onClick={toggleFav}
          title={isFav ? 'Çaktivizo njoftimet' : 'Aktivizo njoftimet'}
          className="absolute top-2 right-2 z-10 p-0.5 group"
        >
          {isFav
            ? <Bell className="w-3.5 h-3.5 text-primary fill-primary/20 transition-colors" />
            : <BellOff className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          }
        </button>
        {notifDenied && (
          <div className="absolute top-7 right-1 z-20 bg-destructive text-destructive-foreground text-[9px] rounded px-1.5 py-0.5 whitespace-nowrap">
            Lejoni njoftimet në browser
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {match.home_team_logo
              ? <img src={match.home_team_logo} alt="" className="w-10 h-10 object-contain" loading="eager" decoding="async" />
              : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><span className="text-xs font-bold">{(match.home_team_name || 'H')[0]}</span></div>
            }
            <span className="text-[11px] font-semibold text-center leading-tight w-full px-1 line-clamp-2">{match.home_team_name || 'Home'}</span>
            {(match.status === 'penalties' || match.penalty_winner) && (
              <div className="flex gap-0.5 justify-center mt-0.5 flex-wrap max-w-[90px]">
                {(() => { const pens = sanitizePenalties(match.penalty_home); return Array.from({ length: Math.max(5, pens.length) }).map((_, i) => {
                  const item = pens[i] ?? null;
                  const r = item ? (typeof item === 'string' ? item : (item?.result ?? null)) : null;
                  return <div key={i} className={`w-2 h-2 rounded-full ${r === 'goal' ? 'bg-green-500' : r === 'miss' ? 'bg-red-500' : 'bg-gray-300'}`} />;
                }); })()}
              </div>
            )}
          </div>

          {/* Score / Time */}
          <div className="flex flex-col items-center min-w-[80px]">
            {match.slow_update && (
              <span className="text-[8px] font-semibold text-red-500 leading-none mb-0.5 whitespace-nowrap">
                Përditësim i ngadaltë
              </span>
            )}
            {(isCancelled || isInterrupted || isPostponed) ? (
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-red-500 text-center leading-tight">{status.text}</span>
                {isInterrupted && match.interrupted_reason && (
                  <span className="text-[10px] font-semibold text-red-500 text-center leading-tight mt-0.5">({match.interrupted_reason})</span>
                )}
              </div>
            ) : isScheduled ? (
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-muted-foreground">{status.text}</span>
                {status.date && <span className="text-[9px] text-muted-foreground mt-0.5">{status.date}</span>}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className={cn('font-black tabular-nums transition-all', isActive ? 'text-live' : 'text-foreground', flashHome ? 'text-[2rem]' : 'text-[1.625rem]')}>
                    {match.home_score ?? 0}
                  </span>
                  <span className="text-muted-foreground font-light text-lg">-</span>
                  <span className={cn('font-black tabular-nums transition-all', isActive ? 'text-live' : 'text-foreground', flashAway ? 'text-[2rem]' : 'text-[1.625rem]')}>
                    {match.away_score ?? 0}
                  </span>
                </div>
                {showGol && <span className="text-[10px] font-black text-live">GOL!</span>}
                {!isOfficialResult && (
                  <span className={cn('text-[10px] font-bold tracking-wide mt-0.5', status.live ? 'text-live' : isFT ? 'text-muted-foreground' : 'text-secondary')}>
                    {status.text}
                  </span>
                )}
                {isOfficialResult && (
                  <span className="text-[9px] font-normal text-red-600 leading-tight text-center whitespace-nowrap mt-0.5">
                    REZULTAT ZYRTAR
                  </span>
                )}
                {extraTimeLabel() && (
                  <span className="text-[10px] font-bold text-live">{extraTimeLabel()}</span>
                )}
              </>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {match.away_team_logo
              ? <img src={match.away_team_logo} alt="" className="w-10 h-10 object-contain" loading="eager" decoding="async" />
              : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><span className="text-xs font-bold">{(match.away_team_name || 'A')[0]}</span></div>
            }
            <span className="text-[11px] font-semibold text-center leading-tight w-full px-1 line-clamp-2">{match.away_team_name || 'Away'}</span>
            {(match.status === 'penalties' || match.penalty_winner) && (
              <div className="flex gap-0.5 justify-center mt-0.5 flex-wrap max-w-[90px]">
                {(() => { const pens = sanitizePenalties(match.penalty_away); return Array.from({ length: Math.max(5, pens.length) }).map((_, i) => {
                  const item = pens[i] ?? null;
                  const r = item ? (typeof item === 'string' ? item : (item?.result ?? null)) : null;
                  return <div key={i} className={`w-2 h-2 rounded-full ${r === 'goal' ? 'bg-green-500' : r === 'miss' ? 'bg-red-500' : 'bg-gray-300'}`} />;
                }); })()}
              </div>
            )}
          </div>
        </div>

        {/* Red cards inline with team names */}
        {(homeRedCards > 0 || awayRedCards > 0) && (
          <div className="flex justify-between px-2 mt-1">
            <div className="flex gap-0.5 items-center">
              {Array.from({ length: homeRedCards }).map((_, i) => (
                <span key={i} style={{ fontSize: '6.4px', lineHeight: 1 }}>🟥</span>
              ))}
            </div>
            <div className="flex gap-0.5 items-center">
              {Array.from({ length: awayRedCards }).map((_, i) => (
                <span key={i} style={{ fontSize: '6.4px', lineHeight: 1 }}>🟥</span>
              ))}
            </div>
          </div>
        )}
        {match.var_review_text && (() => {
          const teamName = match.var_review_team === 'home' ? (match.home_team_name || '') : (match.away_team_name || '');
          const abbr = teamName.substring(3, 6).trim().toUpperCase() || teamName.substring(0, 3).toUpperCase();
          return (
            <div className="flex items-center justify-center gap-1 mt-1.5 opacity-70 animate-pulse-live">
              <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/494882784_VARLOGO.png" alt="VAR" style={{ width: '10px', height: '10px', objectFit: 'contain' }} />
              <span className="text-[9px] font-normal text-primary">
                {match.var_review_text}{abbr ? ` (${abbr})` : ''}
              </span>
            </div>
          );
        })()}
        {match.super_deep && isLive && (
          <div className="absolute top-2 left-2 z-10">
            <div className="flex items-center gap-0.5 bg-yellow-400/20 border border-yellow-400/50 rounded-full px-1.5 py-0.5">
              <span className="text-yellow-500 text-[8px] font-black">⚡</span>
              <span className="text-[7px] font-black text-yellow-600">SD</span>
            </div>
          </div>
        )}
        {match.ft_only && (
          <div className="mt-1 text-center">
            <span className="text-[9px] font-bold text-orange-500 border border-orange-400 px-1 rounded">FT ONLY</span>
          </div>
        )}
        {(match.round || match.phase_text || match.stadium) && (
          <div className="mt-1 text-center">
            {(match.round || match.phase_text) && (
              <span className="text-[9px] text-muted-foreground">{match.phase_text || `Java ${match.round}`}</span>
            )}
            {match.stadium && <span className="text-[9px] text-muted-foreground"> • {match.stadium}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

// Only re-render a card when a field that affects its display actually changed.
// With many live matches and 15s polling, the parent rebuilds the list every
// poll, but unchanged cards skip re-rendering — this is the big win for live load.
function areEqual(prev, next) {
  const a = prev.match, b = next.match;
  if (!a || !b) return a === b;
  if (a === b) return true;
  return a.id === b.id
    && a.status === b.status
    && a.home_score === b.home_score
    && a.away_score === b.away_score
    && a.minute === b.minute
    && a.time === b.time
    && a.date === b.date
    && a.home_team_name === b.home_team_name
    && a.away_team_name === b.away_team_name
    && a.home_team_logo === b.home_team_logo
    && a.away_team_logo === b.away_team_logo
    && a.home_red_cards === b.home_red_cards
    && a.away_red_cards === b.away_red_cards
    && a.penalty_winner === b.penalty_winner
    && a.var_review_text === b.var_review_text
    && a.var_review_team === b.var_review_team
    && a.match_start_timestamp === b.match_start_timestamp
    && a.second_half_start_timestamp === b.second_half_start_timestamp
    && a.extra_time_start_timestamp === b.extra_time_start_timestamp
    && a.extra_time_sh_start_timestamp === b.extra_time_sh_start_timestamp
    && a.extra_time_first_half === b.extra_time_first_half
    && a.extra_time_second_half === b.extra_time_second_half
    && a.slow_update === b.slow_update
    && a.super_deep === b.super_deep
    && a.ft_only === b.ft_only
    && a.round === b.round
    && a.phase_text === b.phase_text
    && a.stadium === b.stadium
    && a.show_in_live === b.show_in_live
    && a.interrupted_reason === b.interrupted_reason;
    }

export default memo(MatchCard, areEqual);