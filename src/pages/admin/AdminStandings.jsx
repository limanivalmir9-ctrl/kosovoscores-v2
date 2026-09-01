import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, Save, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeCompetitionPositions } from '@/lib/standings';

export default function AdminStandings() {
  const [competitions, setCompetitions] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [standings, setStandings] = useState([]);
  const [selectedComp, setSelectedComp] = useState('');
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null); // row being edited
  const [editData, setEditData] = useState({});

  const load = async () => {
    const [allComps, allClubs, allStandings] = await Promise.all([
      base44.entities.Competition.list('-created_date', 50),
      base44.entities.Club.list('-created_date', 200),
      base44.entities.Standing.list('position', 200),
    ]);
    setCompetitions(allComps);
    setClubs(allClubs);
    setStandings(allStandings);
    if (allComps.length > 0 && !selectedComp) setSelectedComp(allComps[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-recalc all standings every 6 hours
  useEffect(() => {
    if (loading || competitions.length === 0) return;
    const lastRecalc = localStorage.getItem('ks_standings_last_recalc');
    const sixHours = 6 * 60 * 60 * 1000;
    if (lastRecalc && Date.now() - Number(lastRecalc) < sixHours) return;
    localStorage.setItem('ks_standings_last_recalc', String(Date.now()));
    recalcAll();
  }, [loading, competitions.length]);

  const compClubs = clubs.filter(c => c.competition_id === selectedComp);
  const compStandings = standings.filter(s => s.competition_id === selectedComp);

  const initStandings = async () => {
    const existingClubIds = compStandings.map(s => s.club_id);
    const missing = compClubs.filter(c => !existingClubIds.includes(c.id));
    if (missing.length === 0) { toast.info('Të gjithë klubet kanë rreshta në tabelë'); return; }
    const newStandings = missing.map((club, i) => ({
      competition_id: selectedComp,
      club_id: club.id,
      club_name: club.name,
      club_logo: club.logo || '',
      played: 0, won: 0, drawn: 0, lost: 0,
      goals_for: 0, goals_against: 0, goal_difference: 0,
      points: 0, position: compStandings.length + i + 1,
    }));
    await base44.entities.Standing.bulkCreate(newStandings);
    await normalizeCompetitionPositions(selectedComp);
    toast.success(`${missing.length} rreshta u shtuan`);
    load();
  };

  const recalcAll = async () => {
    // Silently recalc all competitions
    const allComps = competitions;
    const allStandsData = await base44.entities.Standing.list('position', 500);
    const allMatchesData = await base44.entities.Match.filter({ status: 'full_time' }, '-date', 2000);
    for (const comp of allComps) {
      const compStands = allStandsData.filter(s => s.competition_id === comp.id);
      const compMatches = allMatchesData.filter(m => m.competition_id === comp.id);
      if (compStands.length === 0) continue;
      const stats = {};
      for (const s of compStands) {
        stats[s.club_id] = { id: s.id, club_name: s.club_name, club_logo: s.club_logo, competition_id: comp.id, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0 };
      }
      for (const m of compMatches) {
        const hs = m.home_score ?? 0; const as2 = m.away_score ?? 0;
        if (stats[m.home_team_id]) { const h = stats[m.home_team_id]; h.played++; h.goals_for += hs; h.goals_against += as2; if (hs > as2) { h.won++; h.points += 3; } else if (hs === as2) { h.drawn++; h.points += 1; } else { h.lost++; } }
        if (stats[m.away_team_id]) { const a = stats[m.away_team_id]; a.played++; a.goals_for += as2; a.goals_against += hs; if (as2 > hs) { a.won++; a.points += 3; } else if (hs === as2) { a.drawn++; a.points += 1; } else { a.lost++; } }
      }
      const sorted = Object.values(stats).map(s => ({ ...s, goal_difference: s.goals_for - s.goals_against })).sort((a, b) => (b.points - a.points) || (b.goal_difference - a.goal_difference) || (b.goals_for - a.goals_for));
      for (let i = 0; i < sorted.length; i++) { const { id, ...data } = sorted[i]; await base44.entities.Standing.update(id, { ...data, position: i + 1 }); }
    }
    toast.success('Të gjitha tabelat u rillogaritën automatikisht!');
    load();
  };

  const recalcPositions = async () => {
    // Fetch all matches for this competition, then keep only full_time
    const allCompMatches = await base44.entities.Match.filter({ competition_id: selectedComp }, '-date', 500);
    const compMatches = allCompMatches.filter(m => m.status === 'full_time');

    // Build stats map keyed by club_id, seeded from existing standings
    const stats = {};
    for (const s of compStandings) {
      stats[s.club_id] = {
        id: s.id,
        club_name: s.club_name,
        club_logo: s.club_logo,
        competition_id: selectedComp,
        played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
      };
    }

    for (const m of compMatches) {
      const hs = m.home_score ?? 0;
      const as2 = m.away_score ?? 0;

      if (stats[m.home_team_id]) {
        const h = stats[m.home_team_id];
        h.played++;
        h.goals_for += hs;
        h.goals_against += as2;
        if (hs > as2) { h.won++; h.points += 3; }
        else if (hs === as2) { h.drawn++; h.points += 1; }
        else { h.lost++; }
      }

      if (stats[m.away_team_id]) {
        const a = stats[m.away_team_id];
        a.played++;
        a.goals_for += as2;
        a.goals_against += hs;
        if (as2 > hs) { a.won++; a.points += 3; }
        else if (hs === as2) { a.drawn++; a.points += 1; }
        else { a.lost++; }
      }
    }

    // Recalc goal_difference and sort
    const sorted = Object.values(stats)
      .map(s => ({ ...s, goal_difference: s.goals_for - s.goals_against }))
      .sort((a, b) => (b.points - a.points) || (b.goal_difference - a.goal_difference) || (b.goals_for - a.goals_for));

    for (let i = 0; i < sorted.length; i++) {
      const { id, ...data } = sorted[i];
      await base44.entities.Standing.update(id, { ...data, position: i + 1 });
    }

    toast.success(`Tabela u rillogarit nga ${compMatches.length} ndeshje të përfunduara`);
    load();
  };

  const startEdit = (row) => {
    setEditRow(row.id);
    setEditData({
      position: row.position || '',
      played: row.played || 0,
      won: row.won || 0,
      drawn: row.drawn || 0,
      lost: row.lost || 0,
      goals_for: row.goals_for || 0,
      goals_against: row.goals_against || 0,
      goal_difference: row.goal_difference || 0,
      points: row.points || 0,
    });
  };

  const deleteRow = async (rowId) => {
    if (!confirm('Fshi këtë rresht nga tabela?')) return;
    await base44.entities.Standing.delete(rowId);
    await normalizeCompetitionPositions(selectedComp);
    toast.success('U fshi');
    load();
  };

  const deleteAll = async () => {
    if (!confirm(`Fshi GJITHË tabelën për këtë kompeticion? Kjo veprim nuk mund të anulohet.`)) return;
    for (const row of compStandings) {
      await base44.entities.Standing.delete(row.id);
    }
    toast.success('Tabela u fshi. Mund ta ri-inicializosh tani.');
    load();
  };

  const saveEdit = async (rowId) => {
    const data = {
      position: Number(editData.position) || 0,
      played: Number(editData.played) || 0,
      won: Number(editData.won) || 0,
      drawn: Number(editData.drawn) || 0,
      lost: Number(editData.lost) || 0,
      goals_for: Number(editData.goals_for) || 0,
      goals_against: Number(editData.goals_against) || 0,
      goal_difference: Number(editData.goals_for) - Number(editData.goals_against),
      points: Number(editData.points) || 0,
    };
    await base44.entities.Standing.update(rowId, data);
    await normalizeCompetitionPositions(selectedComp);
    toast.success('U ruajt');
    setEditRow(null);
    load();
  };

  const f = (field) => (
    <Input
      type="number"
      value={editData[field] ?? ''}
      onChange={e => setEditData(p => ({ ...p, [field]: e.target.value }))}
      className="h-7 text-center px-1 text-xs w-full"
    />
  );

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Tabelat</h2>

      <Select value={selectedComp} onValueChange={setSelectedComp}>
        <SelectTrigger className="mb-4"><SelectValue /></SelectTrigger>
        <SelectContent>
          {competitions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Button onClick={initStandings} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-1" /> Inicializo
        </Button>
        <Button onClick={recalcPositions} size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-1" /> Rillogarit
        </Button>
        {compStandings.length > 0 && (
          <Button onClick={deleteAll} size="sm" variant="destructive">
            <AlertTriangle className="w-4 h-4 mr-1" /> Fshi të gjitha
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">Kliko mbi një rresht për ta edituar</p>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-11 gap-0.5 px-2 py-2 bg-muted/50 text-[10px] font-bold uppercase text-muted-foreground">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Ekipi</div>
          <div className="col-span-1 text-center">NL</div>
          <div className="col-span-1 text-center">F</div>
          <div className="col-span-1 text-center">B</div>
          <div className="col-span-1 text-center">H</div>
          <div className="col-span-1 text-center">GD</div>
          <div className="col-span-1 text-center">P</div>
          <div className="col-span-1 text-center">✏️</div>
        </div>
        {[...compStandings].sort((a, b) => (a.position || 999) - (b.position || 999)).map((row, index) => (
          <div key={row.id} className="border-t border-border/50">
            {editRow === row.id ? (
              <div className="p-2 bg-primary/5 space-y-2">
                <p className="text-xs font-bold text-primary">{row.club_name}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[['Pozita','position'],['Ndeshje Luajt','played'],['Fituar','won'],['Baraz','drawn'],['Humbur','lost'],['Gola Sh.','goals_for'],['Gola Marr','goals_against'],['Pikë','points']].map(([label, field]) => (
                    <div key={field}>
                      <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
                      {f(field)}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(row.id)} className="flex-1"><Save className="w-3 h-3 mr-1" />Ruaj</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditRow(null)} className="flex-1">Anulo</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteRow(row.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              </div>
            ) : (
              <div
                className="grid grid-cols-11 gap-0.5 px-2 py-2 text-xs hover:bg-muted/30 cursor-pointer"
                onClick={() => startEdit(row)}
              >
                <div className="col-span-1 font-bold">{row.position || (index + 1)}</div>
                <div className="col-span-3 flex items-center gap-1 truncate">
                  {row.club_logo && <img src={row.club_logo} alt="" className="w-4 h-4 object-contain" />}
                  <span className="truncate font-medium">{row.club_name}</span>
                </div>
                <div className="col-span-1 text-center">{row.played || 0}</div>
                <div className="col-span-1 text-center">{row.won || 0}</div>
                <div className="col-span-1 text-center">{row.drawn || 0}</div>
                <div className="col-span-1 text-center">{row.lost || 0}</div>
                <div className="col-span-1 text-center">{row.goal_difference || 0}</div>
                <div className="col-span-1 text-center font-black">{row.points || 0}</div>
                <div className="col-span-1 text-center text-muted-foreground">✏️</div>
              </div>
            )}
          </div>
        ))}
        {compStandings.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">Kliko "Inicializo" për të krijuar tabelën</p>
        )}
      </div>
    </div>
  );
}