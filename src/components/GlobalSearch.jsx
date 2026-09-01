import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Search, Shield, User, Users } from 'lucide-react';

export default function GlobalSearch({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [referees, setReferees] = useState([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    (async () => {
      const [c, p, r, comps] = await Promise.all([
        base44.entities.Club.list('-updated_date', 300).catch(() => []),
        base44.entities.Player.list('-updated_date', 2000).catch(() => []),
        base44.entities.Referee.list('name', 300).catch(() => []),
        base44.entities.Competition.list('tier', 200).catch(() => []),
      ]);
      // Build map: competition_id -> { show_profiles, show_squad, archived, hidden }
      const compMap = {};
      comps.forEach(comp => {
        compMap[comp.id] = {
          show_profiles: comp.show_profiles !== false,
          show_squad: comp.show_squad !== false,
          archived: !!comp.archived,
          hidden: !!comp.hidden,
        };
      });
      // A club is searchable only if its competition is public (profiles visible, not archived/hidden) and the club is active
      const clubSearchable = (club) => {
        if (!club || club.active === false) return false;
        const c = compMap[club.competition_id];
        if (!c) return false;
        return c.show_profiles && !c.archived && !c.hidden;
      };
      const searchableClubs = c.filter(clubSearchable);
      const searchableClubIds = new Set(searchableClubs.map(cl => cl.id));
      // A player is searchable only if their club is searchable AND the club's competition allows the squad
      const searchablePlayers = p.filter(pl => {
        if (!pl.club_id) return false; // free agents / magazine — never public
        if (!searchableClubIds.has(pl.club_id)) return false;
        const comp = compMap[pl.competition_id] || compMap[searchableClubs.find(cl => cl.id === pl.club_id)?.competition_id];
        return comp ? comp.show_squad : false;
      });
      setClubs(searchableClubs);
      setPlayers(searchablePlayers);
      setReferees(r);
      setLoading(false);
    })();
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (q.length < 2) return { clubs: [], players: [], referees: [], coaches: [] };
    const clubMatches = clubs.filter(c => c.name?.toLowerCase().includes(q)).slice(0, 8);
    const playerMatches = players.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 12);
    const refMatches = referees.filter(r => r.name?.toLowerCase().includes(q)).slice(0, 6);
    const coachMatches = clubs.filter(c => c.coach?.toLowerCase().includes(q)).slice(0, 6);
    return { clubs: clubMatches, players: playerMatches, referees: refMatches, coaches: coachMatches };
  }, [q, clubs, players, referees]);

  const go = (path) => { onOpenChange(false); setQuery(''); navigate(path); };
  const hasResults = results.clubs.length || results.players.length || results.referees.length || results.coaches.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 top-[8%] translate-y-0 left-1/2 -translate-x-1/2">
        <DialogTitle className="sr-only">Kërkim global</DialogTitle>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Kërko klube, lojtarë, trajnerë, gjyqtarë..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          {loading && <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q.length < 2 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Shkruani të paktën 2 shkronja për të kërkuar</p>
          ) : !hasResults ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nuk u gjetën rezultate për "{query}"</p>
          ) : (
            <div className="space-y-3">
              {results.clubs.length > 0 && (
                <ResultGroup title="Klubet" icon={<Shield className="w-3.5 h-3.5" />}>
                  {results.clubs.map(c => (
                    <button key={c.id} onClick={() => go(`/team/${c.id}`)} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-muted text-left">
                      {c.logo ? <img src={c.logo} alt="" className="w-6 h-6 object-contain shrink-0" /> : <div className="w-6 h-6 rounded-full bg-muted shrink-0" />}
                      <span className="text-sm font-medium truncate">{c.name}</span>
                    </button>
                  ))}
                </ResultGroup>
              )}
              {results.players.length > 0 && (
                <ResultGroup title="Lojtarët" icon={<User className="w-3.5 h-3.5" />}>
                  {results.players.map(p => (
                    <button key={p.id} onClick={() => go(`/player/${p.id}`)} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-muted text-left">
                      {p.photo ? <img src={p.photo} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" /> : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">{p.name?.[0] || '?'}</div>}
                      <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                      {p.number && <span className="text-[10px] text-muted-foreground shrink-0">#{p.number}</span>}
                    </button>
                  ))}
                </ResultGroup>
              )}
              {results.coaches.length > 0 && (
                <ResultGroup title="Trajnerët" icon={<Users className="w-3.5 h-3.5" />}>
                  {results.coaches.map(c => (
                    <button key={c.id} onClick={() => go(`/team/${c.id}`)} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-muted text-left">
                      {c.logo ? <img src={c.logo} alt="" className="w-6 h-6 object-contain shrink-0" /> : <div className="w-6 h-6 rounded-full bg-muted shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">{c.coach}</span>
                        <span className="text-[10px] text-muted-foreground truncate block">{c.name}</span>
                      </div>
                    </button>
                  ))}
                </ResultGroup>
              )}
              {results.referees.length > 0 && (
                <ResultGroup title="Gjyqtarët" icon={<User className="w-3.5 h-3.5" />}>
                  {results.referees.map(r => (
                    <div key={r.id} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="w-3 h-3 text-muted-foreground" /></div>
                      <span className="text-sm font-medium flex-1">{r.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{r.role}</span>
                    </div>
                  ))}
                </ResultGroup>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultGroup({ title, icon, children }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-2 mb-1">{icon}{title}</p>
      {children}
    </div>
  );
}