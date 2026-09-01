import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const FINISHED = ['full_time', 'official_result'];

function matchTotalMinutes(m, isLateSub = false) {
  if (m.penalty_winner || m.extra_time_start_timestamp) return 120;
  // Për zëvendësuesit e vonshëm (nga 88:01), llogarit edhe minutat shtesë të pjesës së dytë
  if (isLateSub && m.admin_et_second_half) return 90 + (m.admin_et_second_half || 0);
  return 90;
}
function effectiveMinute(e) { return e.minute || 0; }
function isLateSubEntry(subIn) {
  if (!subIn) return false;
  const m = subIn.minute || 0;
  const et = subIn.extra_time_minute || 0;
  return m >= 89 || (m === 88 && et >= 1);
}
// Minutat e futjes përfshijnë shtesën (90+3 → 93) që zëvendësimi i vonë të llogaritet saktë
function subEntryMinute(subIn) {
  if (!subIn) return 0;
  return (subIn.minute || 0) + (subIn.extra_time_minute || 0);
}

const TABS = [
  { key: 'minutes', label: 'TOP MINUTES' },
  { key: 'assists', label: 'TOP ASSIST' },
  { key: 'cards', label: 'TOP CARDS' },
];

export default function CompetitionTopStats({ competition, matches }) {
  const [tab, setTab] = useState('minutes');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playersTick, setPlayersTick] = useState(0);

  // Re-fetch player photos immediately when any Player record changes (photo/name edits in admin)
  useEffect(() => {
    const unsub = base44.entities.Player.subscribe(() => setPlayersTick(t => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const finished = (matches || []).filter(m => FINISHED.includes(m.status));
      if (finished.length === 0) {
        if (!cancelled) { setData({ minutes: [], assists: [], cards: [] }); setLoading(false); }
        return;
      }
      const finishedIds = finished.map(m => m.id);
      const [events, players] = await Promise.all([
        base44.entities.MatchEvent.filter({ match_id: { $in: finishedIds } }, null, 5000).catch(() => []),
        // Fetch ALL players (not just this competition) so transferred players' photos are found too
        base44.entities.Player.filter({}, null, 5000).catch(() => []),
      ]);
      if (cancelled) return;
      const playerMap = {};
      (players || []).forEach(p => { playerMap[p.id] = p; });
      // Map by 6-digit player_id so lineup entries (which store the 6-digit id) resolve to the entity
      const byPlayerId = {};
      (players || []).forEach(p => { if (p.player_id) byPlayerId[p.player_id] = p; });
      // Resolver që mbulon si entity-id ashtu edhe 6-shifror — siguron foto + link profile
      const resolveP = (pid) => (pid && playerMap[pid]) || (pid && byPlayerId[pid]) || null;

      const minutes = {};
      const assists = {};
      const cards = {};
      const byMatch = {};
      (events || []).forEach(e => { (byMatch[e.match_id] = byMatch[e.match_id] || []).push(e); });

      const ensure = (acc, key, base) => { if (!acc[key]) acc[key] = base; return acc[key]; };

      // Build a name -> player_id resolver from a match's lineups (events often store only the player name)
      const buildNameResolver = (m) => {
        const byName = { home: {}, away: {} };
        [
          { side: 'home', lineup: m.home_lineup },
          { side: 'away', lineup: m.away_lineup },
        ].forEach(({ side, lineup }) => {
          (lineup || []).forEach(l => {
            if (l.name && l.player_id) byName[side][l.name] = l.player_id;
          });
        });
        return (team, name) => (name && byName[team]?.[name]) || null;
      };

      finished.forEach(m => {
        const evs = byMatch[m.id] || [];
        const resolvePid = buildNameResolver(m);
        const sidesMap = {
          home: { clubId: m.home_team_id, clubName: m.home_team_name, clubLogo: m.home_team_logo },
          away: { clubId: m.away_team_id, clubName: m.away_team_name, clubLogo: m.away_team_logo },
        };
        const sides = [
          { lineup: m.home_lineup, ...sidesMap.home },
          { lineup: m.away_lineup, ...sidesMap.away },
        ];
        sides.forEach(side => {
          (side.lineup || []).forEach(l => {
            if (!l.player_id) return;
            const isStarter = l.starter === true;
            const matchesName = (e, nameField, idField) => e[idField] === l.player_id || (l.name && e[nameField] === l.name);
            const subIn = evs.find(e => e.type === 'substitution' && matchesName(e, 'player_in_name', 'player_in_id'));
            const subOut = evs.find(e => e.type === 'substitution' && matchesName(e, 'player_out_name', 'player_out_id'));
            const redCard = evs.find(e => (e.type === 'red_card' || e.type === 'second_yellow') && matchesName(e, 'player_name', 'player_id'));
            const played = isStarter || !!subIn;
            if (!played) return;
            const isLateSub = !isStarter && isLateSubEntry(subIn);
            const total = matchTotalMinutes(m, isLateSub);
            let startMin = isStarter ? 0 : subEntryMinute(subIn);
            if (startMin === 46) startMin = 45;
            let endMin = total;
            if (redCard) endMin = effectiveMinute(redCard);
            else if (subOut) endMin = subEntryMinute(subOut);
            const mins = Math.max(0, Math.round(endMin - startMin));
            const rp = resolveP(l.player_id);
            const rec = ensure(minutes, l.player_id, {
              player_id: l.player_id, entity_id: rp?.id, name: l.name || rp?.name, photo: rp?.photo,
              club_id: side.clubId, club_name: side.clubName, club_logo: side.clubLogo, minutes: 0,
            });
            rec.minutes += mins;
            if (!rec.name && rp?.name) rec.name = rp.name;
            if (!rec.photo && rp?.photo) rec.photo = rp.photo;
          });
        });

        // assists — resolve via player_id, fallback to lineup name->id, then name+club
        evs.forEach(e => {
          if (e.type !== 'goal' && e.type !== 'penalty_goal') return;
          const aid = e.assist_player_id || resolvePid(e.team, e.assist_player_name);
          const side = sidesMap[e.team] || sidesMap.home;
          if (!aid && !e.assist_player_name) return;
          const key = aid || `name_${e.assist_player_name}_${side.clubId}`;
          const p = aid ? resolveP(aid) : null;
          const rec = ensure(assists, key, {
            player_id: aid, entity_id: p?.id, name: e.assist_player_name, photo: p?.photo || null,
            club_id: side.clubId, club_name: side.clubName, club_logo: side.clubLogo, assists: 0,
          });
          rec.assists += 1;
          if (!rec.name && e.assist_player_name) rec.name = e.assist_player_name;
          if (!rec.photo && p?.photo) rec.photo = p.photo;
        });

        // cards — resolve player_id via lineup so the profile photo can be attached
        evs.forEach(e => {
          if (!['yellow_card', 'second_yellow', 'red_card'].includes(e.type)) return;
          const side = sidesMap[e.team] || sidesMap.home;
          const pid = e.player_id || resolvePid(e.team, e.player_name);
          const p = pid ? resolveP(pid) : null;
          const key = pid || `${e.player_name}_${side.clubId}`;
          const rec = ensure(cards, key, {
            player_id: pid, entity_id: p?.id, name: e.player_name, photo: p?.photo || null,
            club_id: side.clubId, club_name: side.clubName, club_logo: side.clubLogo, yellow: 0, red: 0,
          });
          if (e.type === 'yellow_card') rec.yellow += 1;
          if (e.type === 'second_yellow') { rec.yellow += 1; rec.red += 1; }
          if (e.type === 'red_card') rec.red += 1;
          if (!rec.photo && p?.photo) rec.photo = p.photo;
        });
      });

      const minutesArr = Object.values(minutes).filter(r => r.name).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
      const assistsArr = Object.values(assists).filter(a => a.name).sort((a, b) => b.assists - a.assists).slice(0, 5);
      const cardsArr = Object.values(cards).filter(c => c.name).sort((a, b) => (b.yellow + 2 * b.red) - (a.yellow + 2 * a.red)).slice(0, 5);

      if (!cancelled) { setData({ minutes: minutesArr, assists: assistsArr, cards: cardsArr }); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [competition.id, matches, playersTick]);

  if (loading) return <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const empty = { minutes: [], assists: [], cards: [] };
  const d = data || empty;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">TOP 5 STATISTIKA</h3>
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn('flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-wide transition-all', tab === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'minutes' && <TopList rows={d.minutes} valueKey="minutes" valueSuffix="'" emptyText="Ende pa ndeshje të përfunduara" />}
      {tab === 'assists' && <TopList rows={d.assists} valueKey="assists" valueSuffix={v => v === 1 ? ' Asist' : ' Asiste'} emptyText="Ende pa asistime" />}
      {tab === 'cards' && <TopCards rows={d.cards} />}
    </div>
  );
}

function TopList({ rows, valueKey, valueSuffix, emptyText }) {
  if (rows.length === 0) return <p className="text-center text-xs text-muted-foreground py-6">{emptyText}</p>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.player_id || i} className="flex items-center gap-3 bg-card rounded-xl border border-border p-2.5">
          <span className="text-xs font-black text-muted-foreground w-5 text-center shrink-0">{i + 1}</span>
          {r.photo ? (
            <img src={r.photo} alt="" className="w-9 h-9 rounded-full object-contain bg-muted border border-border shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted border border-border shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground">{(r.name || '?')[0]}</div>
          )}
          <div className="flex-1 min-w-0">
            {r.entity_id ? (
              <Link to={`/player/${r.entity_id}`} className="text-sm font-bold truncate block hover:text-primary transition-colors">{r.name}</Link>
            ) : (
              <p className="text-sm font-bold truncate">{r.name}</p>
            )}
            <div className="flex items-center gap-1.5">
              {r.club_logo && <img src={r.club_logo} alt="" className="w-3.5 h-3.5 object-contain" />}
              {r.club_id ? (
                <Link to={`/team/${r.club_id}`} className="text-[10px] text-muted-foreground truncate hover:text-primary transition-colors">{r.club_name}</Link>
              ) : (
                <span className="text-[10px] text-muted-foreground truncate">{r.club_name}</span>
              )}
            </div>
          </div>
          <span className="text-sm font-black tabular-nums shrink-0">{r[valueKey]}{typeof valueSuffix === 'function' ? valueSuffix(r[valueKey]) : valueSuffix}</span>
        </div>
      ))}
    </div>
  );
}

function TopCards({ rows }) {
  if (rows.length === 0) return <p className="text-center text-xs text-muted-foreground py-6">Ende pa kartonë</p>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.player_id || `${r.name}_${i}`} className="flex items-center gap-3 bg-card rounded-xl border border-border p-2.5">
          <span className="text-xs font-black text-muted-foreground w-5 text-center shrink-0">{i + 1}</span>
          {r.photo ? (
            <img src={r.photo} alt="" className="w-9 h-9 rounded-full object-contain bg-muted border border-border shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted border border-border shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground">{(r.name || '?')[0]}</div>
          )}
          <div className="flex-1 min-w-0">
            {r.entity_id ? (
              <Link to={`/player/${r.entity_id}`} className="text-sm font-bold truncate block hover:text-primary transition-colors">{r.name}</Link>
            ) : (
              <p className="text-sm font-bold truncate">{r.name}</p>
            )}
            <div className="flex items-center gap-1.5">
              {r.club_logo && <img src={r.club_logo} alt="" className="w-3.5 h-3.5 object-contain" />}
              {r.club_id ? (
                <Link to={`/team/${r.club_id}`} className="text-[10px] text-muted-foreground truncate hover:text-primary transition-colors">{r.club_name}</Link>
              ) : (
                <span className="text-[10px] text-muted-foreground truncate">{r.club_name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {r.yellow > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-bold">
                <span className="w-2.5 h-3.5 rounded-sm bg-yellow-400 border border-yellow-500/50 inline-block" />
                {r.yellow}
              </span>
            )}
            {r.red > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-bold">
                <span className="w-2.5 h-3.5 rounded-sm bg-red-500 border border-red-600/50 inline-block" />
                {r.red}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}