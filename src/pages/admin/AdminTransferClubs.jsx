import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, MoveRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeCompetitionPositions } from '@/lib/standings';

export default function AdminTransferClubs() {
  const [competitions, setCompetitions] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [allComps, allClubs] = await Promise.all([
      base44.entities.Competition.list('-created_date', 100),
      base44.entities.Club.list('-created_date', 300),
    ]);
    // vetëm kompeticione aktive (jo të arkivuara)
    const active = allComps.filter(c => !c.archived && !c.hidden);
    setCompetitions(active);
    setClubs(allClubs);
    if (active.length > 0 && !sourceId) setSourceId(active[0].id);
    if (active.length > 1 && !targetId) setTargetId(active[1].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sourceClubs = clubs.filter(c => c.competition_id === sourceId);
  const sourceComp = competitions.find(c => c.id === sourceId);
  const targetComp = competitions.find(c => c.id === targetId);

  const toggle = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected(prev => prev.size === sourceClubs.length ? new Set() : new Set(sourceClubs.map(c => c.id)));
  };

  const apply = async () => {
    if (!sourceId || !targetId) { toast.error('Zgjidh kompeticionin burim dhe destinacion'); return; }
    if (sourceId === targetId) { toast.error('Burimi dhe destinacioni janë të njëjta'); return; }
    if (selected.size === 0) { toast.error('Zgjidh të paktën një klub'); return; }
    setApplying(true);
    try {
      // rendit pozicionet e destinacionit një herë
      let targetRows = await base44.entities.Standing.filter({ competition_id: targetId }, 'position', 100);
      let maxPos = targetRows.reduce((m, r) => Math.max(m, r.position || 0), 0);
      const targetIds = new Set(targetRows.map(r => r.club_id));
      const moved = [];
      for (const club of sourceClubs) {
        if (!selected.has(club.id)) continue;
        // 1. fshi rreshtin e tabelës nga burimi (nëse burimi është aktiv)
        if (sourceComp && !sourceComp.archived) {
          const srcRows = await base44.entities.Standing.filter({ competition_id: sourceId, club_id: club.id });
          for (const r of srcRows) await base44.entities.Standing.delete(r.id);
        }
        // 2. shto rresht 00 në destinacion (nëse nuk ekziston)
        if (!targetIds.has(club.id)) {
          maxPos += 1;
          await base44.entities.Standing.create({
            competition_id: targetId, club_id: club.id,
            club_name: club.name, club_logo: club.logo || '',
            played: 0, won: 0, drawn: 0, lost: 0,
            goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
            position: maxPos,
          });
          targetIds.add(club.id);
        }
        // 3. përditëso kompeticionin e klubit
        await base44.entities.Club.update(club.id, { competition_id: targetId });
        moved.push(club.name);
      }
      // Re-sequence positions in both source and target so numbers stay 1,2,3...
      await Promise.all([
        normalizeCompetitionPositions(sourceId),
        normalizeCompetitionPositions(targetId),
      ]);
      toast.success(`U transferuan ${moved.length} klube në ${targetComp?.name || ''}`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.error('Gabim gjatë transferimit: ' + (e.message || e));
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <h2 className="text-lg font-bold mb-1">Transfero Klubet</h2>
      <p className="text-xs text-muted-foreground mb-4">Bart klubet nga një kompeticion në tjetrin — tabelat sinkronizohen automatikisht.</p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end mb-5">
        <div>
          <label className="text-xs font-semibold mb-1 block">Nga (burim)</label>
          <Select value={sourceId} onValueChange={(v) => { setSourceId(v); setSelected(new Set()); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {competitions.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.season ? `(${c.season})` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="hidden sm:flex items-center justify-center pb-2">
          <MoveRight className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Tek (destinacion)</label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {competitions.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.season ? `(${c.season})` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-xs font-semibold">Klubet në {sourceComp?.name || '—'} ({sourceClubs.length})</span>
          <button onClick={toggleAll} className="text-xs text-primary hover:underline">
            {selected.size === sourceClubs.length && sourceClubs.length > 0 ? 'Përzgjidh asnjë' : 'Përzgjidh të gjitha'}
          </button>
        </div>
        <div className="max-h-[40vh] overflow-y-auto divide-y divide-border">
          {sourceClubs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nuk ka klube në këtë kompeticion</p>
          ) : sourceClubs.map(club => {
            const on = selected.has(club.id);
            return (
              <label key={club.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30">
                <input type="checkbox" checked={on} onChange={() => toggle(club.id)} className="w-4 h-4 accent-primary" />
                {club.logo ? (
                  <img src={club.logo} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{club.name?.[0]}</div>
                )}
                <span className="text-sm font-medium flex-1">{club.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={apply} disabled={applying || selected.size === 0}>
          {applying ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Po aplikohet...</> : <><ArrowRight className="w-4 h-4 mr-1" /> Apliko Transferimin ({selected.size})</>}
        </Button>
        <span className="text-xs text-muted-foreground">→ {targetComp?.name || '—'}</span>
      </div>
    </div>
  );
}