import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countryInfo } from '@/lib/countries';
import { computePlayerStats, getPlayerMatchMinutes } from '@/lib/playerStats';
import PlayerStatsCharts from '@/components/player/PlayerStatsCharts';
import { useSeo, schema } from '@/lib/seo';
import { buildMatchSlug } from '@/lib/matchSlug';
import Breadcrumbs from '@/components/Breadcrumbs';
import Flag from '@/components/Flag';
import InjuredBadge from '@/components/InjuredBadge';
import PlayerHistoryRow from '@/components/player/PlayerHistoryRow';
import moment from 'moment';

const POSITION_LABELS = { Goalkeeper: 'Portier', Defender: 'Mbrojtës', Midfielder: 'Mesfushor', Forward: 'Sulmues' };

export default function PlayerDetail() {
  const navigate = useNavigate();
  const playerId = window.location.pathname.split('/player/')[1];
  const [player, setPlayer] = useState(null);
  const [club, setClub] = useState(null);
  const [stats, setStats] = useState(null);
  const [seasonMatches, setSeasonMatches] = useState([]);
  const [matchEvents, setMatchEvents] = useState([]);
  const [storedMinutesMap, setStoredMinutesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeComp, setActiveComp] = useState(0);
  const [history, setHistory] = useState([]);
  const [clubLogoMap, setClubLogoMap] = useState({});
  const [infoTab, setInfoTab] = useState('info');

  useSeo({
    title: player ? `${player.name} – Statistika dhe Ndeshje | KosovoScores` : 'Lojtari | KosovoScores',
    description: player
      ? `Profili, statistikat, golat, asistimet, kartonët dhe ndeshjet e ${player.name}${club ? ` te ${club.name}` : ''}${player.position ? ` (${POSITION_LABELS[player.position] || player.position})` : ''} në KosovoScores.`
      : 'Profili i lojtarit të futbollit në Kosovë në KosovoScores.',
    canonicalPath: `/player/${playerId}`,
    image: player?.photo,
    jsonLd: player ? schema.person({ player, club, url: `${window.location.origin}/player/${playerId}` }) : null,
  });

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    const load = async () => {
      // Stage 1: player only — render header + info immediately
      const p = await base44.entities.Player.get(playerId).catch(() => null);
      if (cancelled) return;
      setPlayer(p);
      setLoading(false);
      // Carreira history (admin-managed) — load for every player, including magazine/free agents
      base44.entities.PlayerHistory.filter({ player_id: playerId }, '-season', 200)
        .then(h => { if (!cancelled) setHistory(h || []); })
        .catch(() => {});
      // Club logo map (by name) so history chips show logos even for older entries
      base44.entities.Club.list(null, 1000)
        .then(list => {
          if (cancelled) return;
          const m = {};
          (list || []).forEach(c => { if (c.name && c.logo) m[c.name.toLowerCase()] = c.logo; });
          setClubLogoMap(m);
        })
        .catch(() => {});
      if (!p?.club_id) return;
      // Stage 2: club + matches in background
      const [c, allComps, homeMatches, awayMatches] = await Promise.all([
        base44.entities.Club.get(p.club_id).catch(() => null),
        base44.entities.Competition.filter({ archived: false }, 'tier', 100),
        base44.entities.Match.filter({ home_team_id: p.club_id }, '-date', 100),
        base44.entities.Match.filter({ away_team_id: p.club_id }, '-date', 100),
      ]);
      if (cancelled) return;
      setClub(c);
      const currentCompIds = new Set(allComps.map(x => x.id));
      const seen = new Set();
      const seasonMatches = [...homeMatches, ...awayMatches].filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return currentCompIds.has(m.competition_id);
      });
      setSeasonMatches(seasonMatches);
      // Stage 3: events (heaviest) — show stats spinner meanwhile
      setStatsLoading(true);
      const finishedIds = seasonMatches.filter(m => ['full_time','official_result'].includes(m.status)).map(m => m.id);
      let events = [];
      if (finishedIds.length) {
        try {
          events = await base44.entities.MatchEvent.filter({ match_id: { $in: finishedIds } }, '-created_date', 2000);
        } catch (_) { events = []; }
      }
      if (cancelled) return;
      setMatchEvents(events);
      // Minutat e ruajtura (rikalkulim manual nga admini) — kanë përparësi
      let storedMap = {};
      try {
        const stored = await base44.entities.PlayerMatchMinutes.filter({ player_id: playerId }, null, 500);
        (stored || []).forEach(s => { if (s.match_id) storedMap[s.match_id] = s.minutes; });
      } catch (_) {}
      if (cancelled) return;
      setStoredMinutesMap(storedMap);
      setStats(computePlayerStats(playerId, p.club_id, seasonMatches, events, storedMap));
      setStatsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!player) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Lojtari nuk u gjet</p>
      <Link to="/ligat" className="text-primary text-sm mt-2 inline-block">Kthehu</Link>
    </div>
  );

  const ci = countryInfo(player.nationality);
  const age = player.date_of_birth ? moment().diff(moment(player.date_of_birth), 'years') : null;

  // Sort competitions: league first, then cup
  const byComp = stats ? [...stats.byCompetition].sort((a, b) => (a.is_cup ? 1 : 0) - (b.is_cup ? 1 : 0)) : [];
  const activeStats = byComp[activeComp] || byComp[0];

  return (
    <div className="py-4 md:[zoom:1.2] md:origin-top">
      <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate(club ? `/team/${club.id}` : '/ligat')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        {club ? club.name : 'Ligat'}
      </button>

      <Breadcrumbs items={[{ label: 'Ligat', to: '/ligat' }, ...(club ? [{ label: club.name, to: `/team/${club.id}` }] : []), { label: player.name }]} />

      {/* Header card with club logo as blue-toned watermark */}
      <div className="relative rounded-2xl border-2 border-primary/40 p-5 text-center overflow-hidden bg-card">
        {club?.logo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img src={club.logo} alt="" className="w-3/5 max-w-[220px] object-contain opacity-[0.10]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/15 pointer-events-none" />
        <div className="relative z-10">
          <div className="w-[154px] h-[154px] rounded-full mx-auto mb-3 overflow-hidden border-2 border-primary/30 bg-card shadow-md">
            {player.photo ? (
              <img src={player.photo} alt={player.name} loading="lazy" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl font-black text-muted-foreground">{player.name?.[0]}</span>
              </div>
            )}
          </div>
          <h1 className="text-xl font-black flex items-center justify-center gap-1.5">{player.name}{player.injured && <InjuredBadge size="sm" />}<span className="sr-only"> | KosovoScores</span></h1>
          {player.number && (
            <div className="flex items-center justify-center mt-2">
              <span className="relative inline-flex items-center justify-center w-9 h-9">
                <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/a0b0baa64_KITICON.png" alt="" className="absolute inset-0 w-full h-full object-contain" />
                <span className="relative z-10 font-black" style={{ fontSize: '12px', lineHeight: 1, color: '#111' }}>{player.number}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info + Historia tabs */}
      <div className="mt-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
          <button onClick={() => setInfoTab('info')} className={cn('flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all', infoTab === 'info' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Informacioni</button>
          <button onClick={() => setInfoTab('history')} className={cn('flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all', infoTab === 'history' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Historia</button>
        </div>

        {infoTab === 'info' && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground sr-only">Informacioni</h3>
            {player.position && <Row label="Pozicioni" value={POSITION_LABELS[player.position] || player.position} />}
            {player.nationality && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Kombësia</span>
                <span className="font-medium flex items-center gap-1.5">
                  <Flag value={player.nationality} size={18} />
                  {ci?.name || player.nationality}
                </span>
              </div>
            )}
            {player.date_of_birth && <Row label="Datëlindja" value={age != null ? `${player.date_of_birth} (${age} vjeç)` : player.date_of_birth} />}
            {player.player_id && <Row label="ID" value={player.player_id} />}
            {club && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Klubi</span>
                <Link to={`/team/${club.id}`} className="font-medium flex items-center gap-1.5 hover:text-primary transition-colors">
                  {club.logo && <img src={club.logo} alt="" className="w-4 h-4 object-contain" />}
                  {club.name}
                </Link>
              </div>
            )}
          </div>
        )}

        {infoTab === 'history' && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 sr-only">Historia</h3>
            {history.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Ende pa zë në histori.</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <PlayerHistoryRow
                    key={h.id}
                    entry={h}
                    logoMap={clubLogoMap}
                    toLink={h.club_id ? `/team/${h.club_id}` : null}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats loading indicator */}
      {statsLoading && !stats && (
        <div className="mt-4 flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      )}

      {/* Stats per competition (tabs) */}
      {stats && byComp.length > 0 && (
        <div className="mt-4">
          {byComp.length > 1 && (
            <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
              {byComp.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setActiveComp(i)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-xs font-bold transition-all',
                    activeComp === i ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <CompStatsBlock comp={activeStats} />
        </div>
      )}
      {stats && byComp.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 mt-4 text-center">
          <p className="text-sm text-muted-foreground">Ende pa ndeshje të luajtura</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mt-1">Sezoni 2026/2027</p>
        </div>
      )}

      {/* Ndeshjet e Sezonit */}
      {(() => {
        const evsByMatch = {};
        matchEvents.forEach(e => {
          if (!evsByMatch[e.match_id]) evsByMatch[e.match_id] = [];
          evsByMatch[e.match_id].push(e);
        });
        const finished = seasonMatches
          .filter(m => ['full_time', 'official_result'].includes(m.status))
          .sort((a, b) => b.date.localeCompare(a.date));
        if (finished.length === 0) return null;
        return (
          <div className="mt-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Ndeshjet e Sezonit <span className="text-primary">2026/2027</span></h3>
            <div className="space-y-2">
              {finished.map(m => {
                const isHome = m.home_team_id === player.club_id;
                const oppName = isHome ? m.away_team_name : m.home_team_name;
                const oppLogo = isHome ? m.away_team_logo : m.home_team_logo;
                const isAlbi = /ALBI MALL SUPERLIGA/i.test(m.competition_name || '');
                const storedMin = storedMinutesMap[m.id];
                const mins = storedMin !== undefined ? storedMin : (isAlbi ? getPlayerMatchMinutes(player.id, player.club_id, m, evsByMatch[m.id] || []) : null);
                const played = mins !== null && mins !== undefined;
                const evs = evsByMatch[m.id] || [];
                const isMe = (e) => e.player_id === player.id || (player.name && e.player_name === player.name);
                const isMyAssist = (e) => e.assist_player_id === player.id || (player.name && e.assist_player_name === player.name);
                const goalCount = evs.filter(e => ['goal', 'penalty_goal'].includes(e.type) && isMe(e)).length;
                const assistCount = evs.filter(e => isMyAssist(e)).length;
                const yellowCount = evs.filter(e => e.type === 'yellow_card' && isMe(e)).length;
                const secondYellow = evs.some(e => e.type === 'second_yellow' && isMe(e));
                const directRed = evs.some(e => e.type === 'red_card' && isMe(e));
                return (
                  <Link key={m.id} to={`/ndeshja/${m.slug || buildMatchSlug(m.home_team_name, m.away_team_name, m.date)}`} className="flex items-center gap-2 bg-card rounded-xl border border-border p-2.5 hover:bg-muted/40 transition-colors">
                    <span className="text-[10px] text-muted-foreground w-12 shrink-0">{moment(m.date).format('DD.MM')}</span>
                    {oppLogo ? <img src={oppLogo} alt="" className="w-6 h-6 object-contain shrink-0" /> : <div className="w-6 h-6 rounded-full bg-muted shrink-0" />}
                    <span className="text-xs font-semibold flex-1 truncate">{oppName}</span>
                    {isAlbi && goalCount > 0 && <span className="flex shrink-0 gap-0">{Array.from({ length: Math.min(goalCount, 5) }).map((_, gi) => <span key={gi} className="text-xs leading-none">⚽</span>)}</span>}
                    {isAlbi && assistCount > 0 && <span className="flex shrink-0 gap-0.5">{Array.from({ length: Math.min(assistCount, 5) }).map((_, ai) => <span key={ai} className="w-3.5 h-3.5 rounded-[3px] bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-black leading-none">A</span>)}</span>}
                    {isAlbi && yellowCount > 0 && <span className="flex shrink-0 gap-0.5">{Array.from({ length: Math.min(yellowCount, 2) }).map((_, yi) => <span key={yi} className="w-2.5 h-3.5 rounded-[2px] bg-yellow-400 border border-yellow-600/40" />)}</span>}
                    {isAlbi && secondYellow && <span className="flex shrink-0 gap-0.5"><span className="w-2.5 h-3.5 rounded-[2px] bg-yellow-400 border border-yellow-600/40" /><span className="w-2.5 h-3.5 rounded-[2px] bg-red-600 border border-red-800/40" /></span>}
                    {isAlbi && directRed && <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/d88111f76_DIREKTRED.png" alt="Kuq" className="w-3.5 h-3.5 object-contain shrink-0" />}
                    <span className="text-xs font-black tabular-nums shrink-0">{m.home_score ?? 0}:{m.away_score ?? 0}</span>
                    <span className={cn('text-[10px] font-bold w-10 text-right shrink-0', isAlbi ? (played ? 'text-foreground' : 'text-muted-foreground') : 'text-muted-foreground/40')}>
                      {isAlbi ? (played ? `${mins}'` : '–') : ''}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function CompStatsBlock({ comp }) {
  return (
    <>
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground leading-tight flex-1 min-w-0">Statistikat · {comp.name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Sezoni 2026/2027</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{comp.is_cup ? 'Kupë' : 'Ligë'}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Ndeshjet" value={comp.apps} />
          {/ALBI MALL SUPERLIGA/i.test(comp.name || '') && <StatBox label="Minutat" value={comp.minutes} />}
          <StatBox label="Golat" value={comp.goals} color="text-green-600" />
          <StatBox label="Asistimet" value={comp.assists} color="text-primary" />
          <StatBox label="K. të Verdhë" value={comp.yellow} color="text-yellow-600" />
          <StatBox label="K. të Kuq" value={comp.red} color="text-red-500" />
        </div>
      </div>
      <div className="mt-4">
        <PlayerStatsCharts comp={comp} />
      </div>
    </>
  );
}

function Row({ label, value }) {
  return <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3 text-center">
      <p className={`text-xl font-black ${color || ''}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}