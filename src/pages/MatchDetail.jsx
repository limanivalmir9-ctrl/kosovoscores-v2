import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import MatchStatsBar from '@/components/MatchStatsBar';
import SuperDeepPublicView from '@/components/superdeep/SuperDeepPublicView';
import MatchTimeline from '@/components/superdeep/MatchTimeline';
import MatchPredictions from '@/components/MatchPredictions';
import PlayerStatsModal from '@/components/matchfeed/PlayerStatsModal';
import { useSeo } from '@/lib/seo';
import Breadcrumbs from '@/components/Breadcrumbs';

function splitName(fullName) {
  if (!fullName) return { first: '', last: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: '', last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function NameTwoLine({ name }) {
  const { first, last } = splitName(name);
  return (
    <>
      <span className="hidden md:block truncate">{name}</span>
      <span className="flex flex-col leading-tight md:hidden">
        {first && <span style={{ fontSize: '0.7em' }}>{first}</span>}
        <span className="leading-tight">{last || first}</span>
      </span>
    </>
  );
}

const SQ_MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor'];
function formatSqDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${SQ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function useLiveClock(match) {
  const [display, setDisplay] = useState('');
  const status = match?.status;
  const startTs = match?.match_start_timestamp;
  const halfTs = match?.second_half_start_timestamp;
  const etStartTs = match?.extra_time_start_timestamp;
  const etShStartTs = match?.extra_time_sh_start_timestamp;
  const minute = match?.minute;
  const liveStatuses = ['first_half','second_half','extra_time_first_half','extra_time_second_half'];
  useEffect(() => {
    if (!match || !liveStatuses.includes(status)) { setDisplay(''); return; }
    const tick = () => {
      const now = Date.now();
      let totalSecs;
      if (status === 'first_half' && startTs) totalSecs = Math.floor((now - startTs) / 1000);
      else if (status === 'second_half' && halfTs) totalSecs = Math.floor((now - halfTs) / 1000) + 45 * 60;
      else if (status === 'extra_time_first_half' && etStartTs) totalSecs = Math.floor((now - etStartTs) / 1000) + 90 * 60;
      else if (status === 'extra_time_second_half' && etShStartTs) totalSecs = Math.floor((now - etShStartTs) / 1000) + 105 * 60;
      else totalSecs = (minute || 0) * 60;
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      const base = status === 'first_half' ? 45 : status === 'second_half' ? 90 : status === 'extra_time_first_half' ? 105 : 120;
      if (mins >= base) setDisplay(`${base}+${mins - base}:${String(secs).padStart(2, '0')}`);
      else setDisplay(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [status, startTs, halfTs, etStartTs, etShStartTs, minute]);
  return display;
}

// Cache i faqes së ndeshjes — kur përdoruesi kthehet prapë ose rihap një ndeshje,
// të dhënat (match + events + formacione) shfaqen menjëherë nga cache-i, ndërsa në
// sfond rifreskohen me të dhënat e reja. Kjo ul ndjeshëm ngarkesën dhe vonesën kur
// ka shumë shikues njëkohësisht.
const _detailCache = {};

export default function MatchDetail() {
  const { slug } = useParams();
  const _c = _detailCache[slug];
  const [match, setMatch] = useState(_c?.match || null);
  const [events, setEvents] = useState(_c?.events || []);
  const [loading, setLoading] = useState(!_c);
  // Always open on the Events (Ngjarjet) tab — users clicking a match from the
  // live page expect to land on the event timeline first, not lineups.
  const [activeTab, setActiveTab] = useState('Ngjarjet');
  const [playerPhotos, setPlayerPhotos] = useState(_c?.playerPhotos || {}); // player_id -> photo url
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [teamColors, setTeamColors] = useState(_c?.teamColors || { home: null, away: null });
  const [coachPhotos, setCoachPhotos] = useState(_c?.coachPhotos || { home: null, away: null });
  const [playerEntityIdMap, setPlayerEntityIdMap] = useState(_c?.playerEntityIdMap || {});

  const matchId = match?.id;
  const homeName = match?.home_team_name;
  const awayName = match?.away_team_name;
  const competitionName = match?.competition_name;
  const sqDate = match?.date ? formatSqDate(match.date) : '';

  const seoTitle = match
    ? `${homeName} vs ${awayName} - ${competitionName || 'Kosova'} Live | KosovoScores`
    : 'Ndeshja Live | KosovoScores';
  const seoDescription = match
    ? `Ndiq live ${homeName} vs ${awayName} ne ${competitionName || 'Kosova'}, ${match.date}. Rezultati, formacionet, statistikat ne KosovoScores.com - Rezultatet Live te futbollit Kosovar.`
    : 'Rezultati live, formacionet, statistikat dhe golat ne KosovoScores.com - Rezultatet Live te futbollit Kosovar.';

  const canonicalUrl = slug ? `https://kosovoscores.com/ndeshja/${slug}` : undefined;
  const jsonLd = match ? {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${homeName} vs ${awayName}`,
    sport: 'Soccer',
    startDate: match.date ? `${match.date}${match.time ? `T${match.time}:00` : ''}` : undefined,
    eventStatus: ['full_time','official_result'].includes(match.status) ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
    homeTeam: { '@type': 'SportsTeam', name: homeName },
    awayTeam: { '@type': 'SportsTeam', name: awayName },
    ...(competitionName ? { league: { '@type': 'SportsLeague', name: competitionName } } : {}),
    ...(match.stadium ? { location: { '@type': 'Place', name: match.stadium } } : {}),
    ...(canonicalUrl ? { url: canonicalUrl } : {}),
    ...(match.home_team_logo ? { image: match.home_team_logo } : {}),
    ...(['full_time','official_result'].includes(match.status) ? { homeScore: match.home_score, awayScore: match.away_score } : {}),
  } : null;

  useSeo({
    title: seoTitle,
    description: seoDescription,
    canonicalPath: canonicalUrl,
    image: match?.home_team_logo,
    jsonLd,
  });

  const refreshTimerRef = useRef(null);
  const refreshData = useCallback(() => {
    if (!matchId) return;
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      const [m, evts] = await Promise.all([
        base44.entities.Match.filter({ id: matchId }),
        base44.entities.MatchEvent.filter({ match_id: matchId }, 'minute', 100),
      ]);
      if (m[0]) setMatch(m[0]);
      setEvents(evts);
    }, 300);
  }, [matchId]);

  // Load match by slug, then events + player data
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const doLoad = async () => {
      const m = await base44.entities.Match.filter({ slug }).catch(() => []);
      if (cancelled) return;
      const matchData = m[0] || null;
      setMatch(matchData);
      setLoading(false);
      if (!matchData) return;

      const [evts, dbPlayers, dbPlayers2, homeClub, awayClub] = await Promise.all([
        base44.entities.MatchEvent.filter({ match_id: matchData.id }, 'minute', 100),
        base44.entities.Player.filter({ club_id: matchData.home_team_id }, '-created_date', 100).catch(() => []),
        base44.entities.Player.filter({ club_id: matchData.away_team_id }, '-created_date', 100).catch(() => []),
        base44.entities.Club.get(matchData.home_team_id).catch(() => null),
        base44.entities.Club.get(matchData.away_team_id).catch(() => null),
      ]);
      if (cancelled) return;
      setEvents(evts);
      setTeamColors({
        home: matchData.sd_home_color || homeClub?.home_color || null,
        away: matchData.sd_away_color || awayClub?.away_color || null,
      });
      setCoachPhotos({
        home: homeClub?.coach_photo || null,
        away: awayClub?.coach_photo || null,
      });
      const all = [...dbPlayers, ...dbPlayers2];
      const photoMap = {};
      const idMap = {};
      all.forEach(p => {
        if (p.player_id) photoMap[p.player_id] = p;
        if (p.name) photoMap[`name:${p.name}`] = p;
        if (p.player_id) idMap[p.player_id] = p.id;
        if (p.name) idMap[`name:${p.name}`] = p.id;
      });
      setPlayerPhotos(photoMap);
      setPlayerEntityIdMap(idMap);
      _detailCache[slug] = {
        match: matchData, events: evts,
        teamColors: { home: matchData.sd_home_color || homeClub?.home_color || null, away: matchData.sd_away_color || awayClub?.away_color || null },
        coachPhotos: { home: homeClub?.coach_photo || null, away: awayClub?.coach_photo || null },
        playerPhotos: photoMap, playerEntityIdMap: idMap,
      };
    };
    doLoad();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!matchId) return;
    const u1 = base44.entities.Match.subscribe((event) => {
      if (event.type === 'update' && event.data?.id === matchId) setMatch(event.data);
      else refreshData();
    });
    const u2 = base44.entities.MatchEvent.subscribe(() => refreshData());
    return () => { u1(); u2(); };
  }, [matchId, refreshData]);

  // Frequent background refresh — guarantees the public timeline updates near
  // real-time even if the realtime socket drops under load. Silent (no flicker).
  useEffect(() => {
    if (!matchId || !match) return;
    const SKIP = ['full_time', 'official_result', 'cancelled', 'postponed', 'interrupted'];
    if (SKIP.includes(match.status)) return;
    const interval = setInterval(() => refreshData(), 5000);
    return () => clearInterval(interval);
  }, [matchId, match?.status, refreshData]);

  const liveClock = useLiveClock(match);

  // Persist active tab so back-navigation from a player profile returns to the same tab (e.g. Formacionet)
  useEffect(() => {
    try { sessionStorage.setItem(`match_tab_${window.location.pathname}`, activeTab); } catch {}
  }, [activeTab]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!match) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Ndeshja nuk u gjet</p>
      <Link to="/" className="text-primary text-sm mt-2 inline-block">Kthehu</Link>
    </div>
  );

  const isLive = ['first_half','second_half','extra_time_first_half','extra_time_second_half'].includes(match.status);
  const isHT = match.status === 'half_time';
  const isFT = match.status === 'full_time';
  const isActive = isLive || isHT || ['awaiting_extra_time','extra_time_half_time','penalties'].includes(match.status);
  // Ndeshja ka filluar (përfshirë HT, pjesën e dytë, vazhdimet, penallti, FT, rezultat zyrtar, të ndërprerë)
  const hasMatchStarted = match.status !== 'scheduled' && match.status !== 'postponed' && match.status !== 'cancelled';
  const hasPenalties = match.status === 'penalties' || !!match.penalty_winner;
  const getPenResult = (x) => typeof x === 'string' ? x : (x?.result || '');
  const getPenPlayer = (x) => typeof x === 'string' ? '' : (x?.player || '');

  const getStatusText = () => {
    if (match.status === 'scheduled') return match.time || 'Planifikuar';
    if (isLive) return liveClock || `${match.minute || 0}'`;
    if (isHT) return 'HT';
    if (isFT) { if (match.penalty_winner) return 'Pas Penaltive'; return 'FT'; }
    if (match.status === 'cancelled') return 'E ANULUAR';
    if (match.status === 'interrupted') return 'E NDËRPRERË';
    if (match.status === 'postponed') return 'E SHTYER';
    if (match.status === 'awaiting_extra_time') return 'Vazhdimet';
    if (match.status === 'extra_time_half_time') { const etFH = match.extra_time_first_half; return etFH ? `ET HT  105+${etFH}'` : 'ET HT'; }
    if (match.status === 'penalties') { const hg = (match.penalty_home || []).filter(x => getPenResult(x) === 'goal').length; const ag = (match.penalty_away || []).filter(x => getPenResult(x) === 'goal').length; return `Pen. ${hg}:${ag}`; }
    if (match.status === 'official_result') return 'REZULTAT ZYRTAR';
    return '';
  };

  const showScore = match.status !== 'scheduled' && match.status !== 'postponed';

  const hasLineups = match.home_lineup?.length > 0 || match.away_lineup?.length > 0;
  const hasStats = match.deep_stats;
  const hasRefs = !!match.referee_main;
  const availableTabs = ['Ngjarjet'];
  if (hasStats) availableTabs.push('Stats');
  if (hasLineups) availableTabs.push('Formacionet');
  if (hasRefs) availableTabs.push('Gjyqtarët');


  return (
    <div className="py-4">
      {match && (
        <Breadcrumbs items={[
          { label: 'Ligat', to: '/ligat' },
          ...(match.competition_id ? [{ label: match.competition_name || 'Liga', to: `/ligat/${match.competition_id}` }] : []),
          ...(homeName && awayName ? [{ label: `${homeName} vs ${awayName}` }] : []),
        ]} />
      )}
      <h1 className="sr-only">{match ? `${homeName} vs ${awayName}` : 'Ndeshja'}</h1>
      <h2 className="sr-only">Rezultati Live dhe Statistikat</h2>
      {/* Match Header */}
      <div className={cn('bg-card rounded-2xl p-5 border text-center', isLive ? 'border-live/30' : 'border-border')}>
        {match.competition_name && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{match.competition_name}</p>
        )}
        {(match.round || match.phase_text) && (
          <p className="text-[10px] text-muted-foreground mb-3">{match.phase_text || `Java ${match.round}`}</p>
        )}
        {match.status === 'interrupted' && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-black text-red-500 animate-pulse">E NDËRPRERË{match.interrupted_reason ? ` (${match.interrupted_reason})` : ''}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-center">
            <Link to={`/team/${match.home_team_id}`} className="inline-block hover:opacity-80 transition-opacity">
              {match.home_team_logo ? <img src={match.home_team_logo} alt="" className="w-14 h-14 mx-auto mb-2 object-contain cursor-pointer" /> :
                <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center"><span className="text-lg font-bold">{(match.home_team_name||'H')[0]}</span></div>}
              <p className="text-sm font-bold hover:text-primary transition-colors">{match.home_team_name || 'Vendas'}</p>
            </Link>
            {hasPenalties && (
              <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
                {Array.from({ length: Math.max(5, (match.penalty_home||[]).length) }).map((_, i) => {
                  const item = (match.penalty_home||[])[i];
                  const r = item ? getPenResult(item) : null;
                  return <div key={i} className={`w-2.5 h-2.5 rounded-full border ${r==='goal'?'bg-green-500 border-green-500':r==='miss'?'bg-red-500 border-red-500':'bg-muted border-border'}`} />;
                })}
              </div>
            )}
          </div>
          <div className="text-center">
            {match.slow_update && (
              <p className="text-[10px] font-semibold text-red-500 leading-none mb-1 whitespace-nowrap">
                Përditësim i ngadaltë
              </p>
            )}
            <div className="flex items-center gap-3">
              {showScore ? (
                <>
                  <span className={cn('text-3xl font-black', isActive ? 'text-live' : 'text-foreground')}>{match.home_score ?? 0}</span>
                  <span className="text-muted-foreground text-xl">-</span>
                  <span className={cn('text-3xl font-black', isActive ? 'text-live' : 'text-foreground')}>{match.away_score ?? 0}</span>
                </>
              ) : match.status === 'postponed' ? (
                <span className="text-2xl font-black text-red-500 tracking-wide">E SHTYER</span>
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">{match.time || '--:--'}</span>
              )}
            </div>
            {showScore && (
              <div className="mt-1">
                <span className={cn('text-xs font-bold inline-block',
                  (match.status === 'cancelled' || match.status === 'interrupted' || match.status === 'postponed') ? 'text-red-500' :
                  match.status === 'official_result' ? 'text-red-600' :
                  isActive ? 'text-live' : 'text-muted-foreground'
                )}>
                  {getStatusText()}
                </span>
                {match.status === 'official_result' && (
                  <div className="text-[9px] text-red-600 font-medium mt-1">
                    Fed.Decision
                  </div>
                )}
                {match.status === 'interrupted' && match.interrupted_reason && (
                  <div className="text-[10px] font-bold text-red-500 mt-1 animate-pulse whitespace-nowrap">
                    ({match.interrupted_reason})
                  </div>
                )}
              </div>
            )}
            {hasPenalties && (
              <div className="mt-1 text-xs text-muted-foreground">
                Pen. {(match.penalty_home||[]).filter(x=>getPenResult(x)==='goal').length} – {(match.penalty_away||[]).filter(x=>getPenResult(x)==='goal').length}
              </div>
            )}
          </div>
          <div className="flex-1 text-center">
            <Link to={`/team/${match.away_team_id}`} className="inline-block hover:opacity-80 transition-opacity">
              {match.away_team_logo ? <img src={match.away_team_logo} alt="" className="w-14 h-14 mx-auto mb-2 object-contain cursor-pointer" /> :
                <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center"><span className="text-lg font-bold">{(match.away_team_name||'A')[0]}</span></div>}
              <p className="text-sm font-bold hover:text-primary transition-colors">{match.away_team_name || 'Mysafir'}</p>
            </Link>
            {hasPenalties && (
              <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
                {Array.from({ length: Math.max(5, (match.penalty_away||[]).length) }).map((_, i) => {
                  const item = (match.penalty_away||[])[i];
                  const r = item ? getPenResult(item) : null;
                  return <div key={i} className={`w-2.5 h-2.5 rounded-full border ${r==='goal'?'bg-green-500 border-green-500':r==='miss'?'bg-red-500 border-red-500':'bg-muted border-border'}`} />;
                })}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-[10px] text-muted-foreground">
          {match.date && match.status !== 'postponed' && <span>📅 {match.date}</span>}
          {match.time && match.status !== 'postponed' && <span>🕐 {match.time}</span>}
          {match.stadium && <span>🏟 {match.stadium}</span>}
        </div>
        {match.highlights_url && (
          <div className="mt-3">
            <a
              href={match.highlights_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
              Shiko Highlights
            </a>
          </div>
        )}
      </div>

      {/* PARASHIKIMI */}
      <MatchPredictions
        matchId={matchId}
        homeName={match.home_team_name}
        awayName={match.away_team_name}
        matchStatus={match.status}
      />

      {/* Tabs */}
      {availableTabs.length > 1 && (
        <div className="mt-3 flex border-b border-border overflow-x-auto">
          {availableTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-2.5 py-2 text-[11px] font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* SUPERDEEP PUBLIC VIEW */}
      {match.super_deep && (
        <SuperDeepPublicView match={match} events={events} />
      )}

      {/* NGJARJET */}
      {activeTab === 'Ngjarjet' && (
        <>
          {(events.length > 0 || hasMatchStarted) && !match.super_deep && (
            <MatchTimeline
              events={events}
              match={match}
              homeColor={teamColors.home}
              awayColor={teamColors.away}
              playerEntityIdMap={/ALBI MALL SUPERLIGA/i.test(match.competition_name || '') ? playerEntityIdMap : {}}
            />
          )}
          {hasPenalties && match.penalty_first_team && (() => {
            const ft = match.penalty_first_team;
            const st = ft === 'home' ? 'away' : 'home';
            const ftPens = ft === 'home' ? (match.penalty_home||[]) : (match.penalty_away||[]);
            const stPens = ft === 'home' ? (match.penalty_away||[]) : (match.penalty_home||[]);
            const ftName = ft === 'home' ? match.home_team_name : match.away_team_name;
            const stName = ft === 'home' ? match.away_team_name : match.home_team_name;
            const rows = [];
            const totalRounds = Math.max(ftPens.length, stPens.length);
            for (let i = 0; i < totalRounds; i++) {
              if (ftPens[i] !== undefined) rows.push({ team: ft, name: ftName, pen: ftPens[i] });
              if (stPens[i] !== undefined) rows.push({ team: st, name: stName, pen: stPens[i] });
            }
            if (!rows.length) return null;
            return (
              <div className="mt-4 bg-card rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2 py-1.5">
                  <div className="flex-1 h-px bg-border opacity-50" />
                  <span className="text-[10px] text-muted-foreground font-bold opacity-50">Penaltitë</span>
                  <div className="flex-1 h-px bg-border opacity-50" />
                </div>
                <div className="space-y-0.5">
                  {rows.map((row, idx) => {
                    const result = getPenResult(row.pen);
                    const player = getPenPlayer(row.pen);
                    const isAway = row.team === 'away';
                    return (
                      <div key={idx} className={cn('flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg', isAway ? 'flex-row-reverse' : '')}>
                        <img
                          src={result === 'goal'
                            ? 'https://media.base44.com/images/public/69c340685dca7075d7622e15/760bed0da_topigreen.png'
                            : 'https://media.base44.com/images/public/69c340685dca7075d7622e15/821cf0c9d_MISSMISS.png'}
                          alt={result} style={{ width: '12px', height: '12px', objectFit: 'contain' }}
                        />
                        <span className="font-bold text-[0.58rem]">{player || row.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {events.length === 0 && !hasMatchStarted && !hasPenalties && !match.super_deep && (
            <div className="mt-4 bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">Nuk ka ngjarje ende</p>
            </div>
          )}
        </>
      )}

      {/* STATS */}
      {activeTab === 'Stats' && (
        <MatchStatsBar match={match} events={events} forceShow />
      )}

      {/* FORMACIONET */}
      {activeTab === 'Formacionet' && hasLineups && (
        <div className="mt-4 bg-card rounded-2xl border border-border p-4">
          <div className="grid grid-cols-2 gap-4">
            {[{ lineup: match.home_lineup, name: match.home_team_name, coach: match.home_coach, coachPhoto: coachPhotos.home }, { lineup: match.away_lineup, name: match.away_team_name, coach: match.away_coach, coachPhoto: coachPhotos.away }].map((side, si) => {
              const posOrder = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
              const getPos = (p) => playerPhotos[p.player_id]?.position || playerPhotos[`name:${p.name}`]?.position;
              const starters = [...(side.lineup||[])].filter(p=>p.starter).sort((a,b)=>(posOrder[getPos(a)]??4)-(posOrder[getPos(b)]??4));
              const subs = [...(side.lineup||[])].filter(p=>!p.starter).sort((a,b)=>(posOrder[getPos(a)]??4)-(posOrder[getPos(b)]??4));

              const renderPlayer = (p, i, isSub) => {
                const wasSubbed = !isSub && events.some(e => e.type === 'substitution' && (e.player_out_name === p.name || e.player_out_id === p.player_id));
                const cameOn = isSub && events.some(e => e.type === 'substitution' && (e.player_in_name === p.name || e.player_in_id === p.player_id));
                const isGK = p.position === 'Goalkeeper';
                const dbPlayer = playerPhotos[p.player_id] || playerPhotos[`name:${p.name}`] || null;
                const photo = dbPlayer?.photo || null;
                const hasGoal = events.some(e => (e.type === 'goal' || e.type === 'penalty_goal') && (e.player_name === p.name || e.player_id === p.player_id));

                return (
                   <div
                    key={i}
                    className={cn(
                      'w-full text-left flex gap-1.5 items-center rounded-lg px-1 py-1',
                      isSub ? 'opacity-70' : ''
                    )}
                  >
                    {/* Photo or kit icon */}
                    {photo ? (
                     <span className={cn('relative inline-flex shrink-0', isSub ? 'w-[36px] h-[36px]' : 'w-[42px] h-[42px]')}>
                       <img src={photo} alt={p.name} className="w-full h-full rounded-lg object-contain border border-border bg-card" />
                       {p.number && (
                         <span className="absolute bottom-0 left-0 bg-black/80 text-white font-black rounded-br-lg rounded-tl-sm leading-none px-1" style={{fontSize:'11px'}}>{p.number}</span>
                       )}
                     </span>
                    ) : (
                      <span className={cn('relative inline-flex items-center justify-center shrink-0', isSub ? 'w-[31px] h-[31px] opacity-60' : 'w-[36px] h-[36px]')}>
                        <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/a0b0baa64_KITICON.png" alt="" className="absolute inset-0 w-full h-full object-contain" />
                        <span className="relative font-black z-10" style={{fontSize:'8px',lineHeight:1,marginTop:'1px',color:'#111'}}>{p.number}</span>
                      </span>
                    )}
                    <div className="flex items-end gap-0.5 min-w-0 flex-1">
                      {dbPlayer?.id ? (
                        <Link to={`/player/${dbPlayer.id}`} onClick={e => e.stopPropagation()} className={cn('text-xs min-w-0 hover:text-primary transition-colors', isSub ? 'text-muted-foreground font-normal' : 'font-bold')}>
                          <NameTwoLine name={p.name} />
                        </Link>
                      ) : (
                        <span className={cn('text-xs min-w-0', isSub ? 'text-muted-foreground font-normal' : 'font-bold')}>
                          <NameTwoLine name={p.name} />
                        </span>
                      )}
                      {p.is_captain && <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/ab6daf14d_CAPTAINLOGO.png" alt="C" style={{width:'13px',height:'13px',objectFit:'contain'}} />}
                      {isGK && <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/73be00226_GK_gloves_icon.png" alt="GK" style={{width:'10px',height:'10px',objectFit:'contain'}} />}
                      {(wasSubbed || cameOn) && <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/4bec831e1_SUBSTITUTION.png" alt="sub" style={{width:'8px',height:'8px',objectFit:'contain'}} />}
                    </div>
                    </div>
                  );
                  };

              return (
                <div key={si}>
                  <p className="text-xs font-bold mb-2 truncate">{side.name}</p>
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-600 mb-1 mt-1">STARTUES</p>
                  <div className="space-y-0.5">
                    {starters.map((p, i) => renderPlayer(p, i, false))}
                    {subs.length > 0 && (
                      <>
                        <div className="h-6" />
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/60 border border-border mb-1">
                          <p className="text-[10px] font-black text-foreground flex items-center gap-1">
                            Zëvendësues
                            <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/f4fe4efbc_BENCH.png" alt="bench" style={{width:'14px',height:'14px',objectFit:'contain'}} />
                          </p>
                        </div>
                        {subs.map((p, i) => renderPlayer(p, i, true))}
                      </>
                    )}
                    {side.coach && (
                      <div className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1.5" key="coach">
                        {side.coachPhoto ? (
                          <img src={side.coachPhoto} alt={side.coach} className="w-7 h-7 rounded-full object-cover border border-border shrink-0" />
                        ) : (
                          <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/f7fad8ba9_Coach.png" alt="coach" style={{width:'14px',height:'14px',objectFit:'contain'}} />
                        )}
                        <span className="bg-muted/50 rounded px-2 py-1">Trajner: <span className="font-semibold">{side.coach}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PLAYER STATS MODAL — disabled temporarily */}

      {/* GJYQTARËT */}
      {activeTab === 'Gjyqtarët' && hasRefs && (
        <div className="mt-4 bg-card rounded-2xl border border-border p-4">
          <div className="space-y-1 text-xs">
            {match.referee_main && <div className="flex items-center gap-2"><img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/323b4f1d5_REFWHISTLE.png" alt="whistle" className="w-4 h-4 object-contain" /><span className="text-muted-foreground">Kryesor:</span><span className="font-medium">{match.referee_main}</span></div>}
            {match.referee_assistant1 && <div className="flex items-center gap-2"><img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/4a38dbcdd_asistentlogo.png" alt="" className="w-4 h-4 object-contain" /><span className="text-muted-foreground">Asistent 1:</span><span className="font-medium">{match.referee_assistant1}</span></div>}
            {match.referee_assistant2 && <div className="flex items-center gap-2"><img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/4a38dbcdd_asistentlogo.png" alt="" className="w-4 h-4 object-contain" /><span className="text-muted-foreground">Asistent 2:</span><span className="font-medium">{match.referee_assistant2}</span></div>}
            {match.referee_var && <div className="flex items-center gap-2"><img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/494882784_VARLOGO.png" alt="" className="w-4 h-4 object-contain" /><span className="text-muted-foreground">VAR:</span><span className="font-medium">{match.referee_var}</span></div>}
            {match.referee_avar && <div className="flex items-center gap-2"><img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/494882784_VARLOGO.png" alt="" className="w-4 h-4 object-contain" /><span className="text-muted-foreground">AVAR:</span><span className="font-medium">{match.referee_avar}</span></div>}
            {match.referee_forth && <div className="flex items-center gap-2"><img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/f19de5a06_FORTHLOGO.png" alt="" className="w-4 h-4 object-contain" /><span className="text-muted-foreground">I Katërt:</span><span className="font-medium">{match.referee_forth}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}