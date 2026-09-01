import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function CompetitionStats({ competition, matches, standings }) {
  const [tab, setTab] = useState('forma');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAlbi = /ALBI MALL SUPERLIGA/i.test(competition?.name || '');

  useEffect(() => {
    if (!isAlbi) { setLoading(false); return; }
    const finished = matches.filter(m => ['full_time', 'official_result'].includes(m.status));
    if (finished.length === 0) { setEvents([]); setLoading(false); return; }
    const ids = finished.map(m => m.id);
    (async () => {
      try {
        const evts = await base44.entities.MatchEvent.filter({ match_id: { $in: ids } }, '-created_date', 3000);
        setEvents(evts);
      } catch { setEvents([]); }
      setLoading(false);
    })();
  }, [competition?.id, matches.length, isAlbi]);

  if (!isAlbi) return null;

  const teamMap = {};
  standings.forEach(s => {
    if (s.club_id) teamMap[s.club_id] = { id: s.club_id, name: s.club_name || '', logo: s.club_logo || '', gf: s.goals_for || 0, ga: s.goals_against || 0 };
  });

  const matchById = {};
  matches.forEach(m => { matchById[m.id] = m; });

  // FORMA: last 5 finished matches per team
  const finishedSorted = matches.filter(m => ['full_time', 'official_result'].includes(m.status))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const formByTeam = {};
  finishedSorted.forEach(m => {
    const hs = m.home_score ?? 0, as = m.away_score ?? 0;
    const homeRes = hs > as ? 'W' : hs === as ? 'D' : 'L';
    const awayRes = hs > as ? 'L' : hs === as ? 'D' : 'W';
    if (teamMap[m.home_team_id]) {
      (formByTeam[m.home_team_id] = formByTeam[m.home_team_id] || []).push(homeRes);
    }
    if (teamMap[m.away_team_id]) {
      (formByTeam[m.away_team_id] = formByTeam[m.away_team_id] || []).push(awayRes);
    }
  });
  const formaRows = Object.keys(teamMap).map(id => {
    const last5 = (formByTeam[id] || []).slice(0, 5);
    const pts = last5.reduce((p, r) => p + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
    return { ...teamMap[id], last5, pts };
  }).sort((a, b) => b.pts - a.pts);

  // DISIPLINA: cards from events
  const cardsByTeam = {};
  Object.keys(teamMap).forEach(id => { cardsByTeam[id] = { yellow: 0, red: 0, points: 0 }; });
  events.forEach(e => {
    const m = matchById[e.match_id];
    if (!m) return;
    const tid = e.team === 'home' ? m.home_team_id : m.away_team_id;
    if (!teamMap[tid]) return;
    const c = cardsByTeam[tid];
    if (e.type === 'yellow_card') { c.yellow += 1; c.points += 1; }
    else if (e.type === 'second_yellow') { c.yellow += 1; c.red += 1; c.points += 2; }
    else if (e.type === 'red_card') { c.red += 1; c.points += 2; }
  });
  const disciplinaRows = Object.keys(teamMap).map(id => ({ ...teamMap[id], ...cardsByTeam[id] }))
    .sort((a, b) => b.points - a.points);

  // GOLAT: from standings
  const golatRows = Object.keys(teamMap).map(id => ({ ...teamMap[id], gd: teamMap[id].gf - teamMap[id].ga }))
    .sort((a, b) => b.gd - a.gd || b.gf - a.gf);

  const formBadge = (r) => {
    const map = { W: { txt: 'F', cls: 'bg-green-500 text-white' }, D: { txt: 'B', cls: 'bg-orange-500 text-white' }, L: { txt: 'H', cls: 'bg-red-500 text-white' } };
    const v = map[r];
    return <span className={cn('inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-black', v ? v.cls : 'bg-muted text-muted-foreground')}>{v ? v.txt : ''}</span>;
  };

  const Logo = ({ logo, name }) => logo ? <img src={logo} alt="" className="w-4 h-4 object-contain shrink-0" /> : <div className="w-4 h-4 rounded-full bg-muted shrink-0" />;

  return (
    <div className="mt-3 bg-card rounded-xl border border-border p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Statistikat</span>
      </div>
      <div className="flex gap-1 bg-muted rounded-lg p-0.5 mb-3">
        {[
          { id: 'forma', label: 'Forma' },
          { id: 'disiplina', label: 'Disiplina' },
          { id: 'golat', label: 'Golat' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all', tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><div className="w-5 h-5 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : tab === 'forma' ? (
        <div className="space-y-1">
          {formaRows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2 text-[11px] py-1 px-1 rounded hover:bg-muted/40">
              <span className="w-4 text-center font-bold text-muted-foreground">{i + 1}</span>
              <Logo logo={r.logo} name={r.name} />
              <Link to={`/team/${r.id}`} className="flex-1 truncate font-medium hover:text-primary transition-colors">{r.name}</Link>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => <span key={idx}>{formBadge(r.last5[idx])}</span>)}
              </div>
              <span className="w-7 text-right font-black tabular-nums">{r.pts}</span>
            </div>
          ))}
        </div>
      ) : tab === 'disiplina' ? (
        <div className="space-y-1">
          {disciplinaRows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2 text-[11px] py-1 px-1 rounded hover:bg-muted/40">
              <span className="w-4 text-center font-bold text-muted-foreground">{i + 1}</span>
              <Logo logo={r.logo} name={r.name} />
              <Link to={`/team/${r.id}`} className="flex-1 truncate font-medium hover:text-primary transition-colors">{r.name}</Link>
              <span className="inline-flex items-center gap-0.5 w-10 justify-end">
                <span className="w-2.5 h-3.5 rounded-sm bg-yellow-400" />
                <span className="font-bold tabular-nums">{r.yellow}</span>
              </span>
              <span className="inline-flex items-center gap-0.5 w-10 justify-end">
                <span className="w-2.5 h-3.5 rounded-sm bg-red-500" />
                <span className="font-bold tabular-nums">{r.red}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {golatRows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2 text-[11px] py-1 px-1 rounded hover:bg-muted/40">
              <span className="w-4 text-center font-bold text-muted-foreground">{i + 1}</span>
              <Logo logo={r.logo} name={r.name} />
              <Link to={`/team/${r.id}`} className="flex-1 truncate font-medium hover:text-primary transition-colors">{r.name}</Link>
              <span className="text-green-600 font-bold tabular-nums w-8 text-right">{r.gf}</span>
              <span className="text-muted-foreground text-[10px]">:</span>
              <span className="text-red-500 font-bold tabular-nums w-8 text-right">{r.ga}</span>
              <span className="w-8 text-right font-black tabular-nums">{r.gd > 0 ? '+' : ''}{r.gd}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}