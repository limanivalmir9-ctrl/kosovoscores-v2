import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, ArrowLeftRight, ArrowLeft, Power, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { normalizeCompetitionPositions } from '@/lib/standings';

export default function AdminClubs() {
  const [clubs, setClubs] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [selectedComp, setSelectedComp] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', logo: '', stadium: '', stadium_image: '', coach: '', coach_photo: '', home_color: '', away_color: '', kit_home: '', kit_away: '', kit_third: '', competition_id: '', show_squad: true });
  const [transferClub, setTransferClub] = useState(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);

  const load = async () => {
    const [allClubs, allComps] = await Promise.all([
      base44.entities.Club.list('-created_date', 200),
      base44.entities.Competition.list('-created_date', 50),
    ]);
    setClubs(allClubs);
    setCompetitions(allComps);
    const currentFirst = allComps.find(c => !c.archived && !c.hidden) || allComps[0];
    if (currentFirst && !form.competition_id) {
      setForm(p => ({ ...p, competition_id: currentFirst.id }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ID e klubit është permanente dhe unike — vetëm për adminin, kurrë nuk shfaqet publikisht.
  const generateUniqueClubId = async () => {
    const localIds = new Set(clubs.filter(c => c.club_id).map(c => c.club_id));
    for (let i = 0; i < 50; i++) {
      const id = String(Math.floor(100000 + Math.random() * 900000));
      if (localIds.has(id)) continue;
      const existing = await base44.entities.Club.filter({ club_id: id }, null, 1).catch(() => []);
      if (!existing || existing.length === 0) return id;
    }
    throw new Error('Nuk u gjenerua ID unike');
  };

  const generateMissingClubIds = async () => {
    const missing = clubs.filter(c => !c.club_id);
    if (missing.length === 0) { toast.info('Të gjithë klubet kanë ID'); return; }
    toast('Duke gjeneruar ID unike...');
    let count = 0;
    for (const c of missing) {
      const id = await generateUniqueClubId();
      await base44.entities.Club.update(c.id, { club_id: id });
      count++;
    }
    toast.success(`${count} ID u gjeneruan`);
    load();
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await uploadOptimizedImage(file, { maxDim: 256 });
    setForm(prev => ({ ...prev, logo: file_url }));
  };

  const handleUploadField = async (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const maxDim = field === 'stadium_image' ? 1024 : field === 'coach_photo' ? 400 : 512;
    const { file_url } = await uploadOptimizedImage(file, { maxDim });
    setForm(prev => ({ ...prev, [field]: file_url }));
  };

  const handleSave = async () => {
    if (!form.name || !form.competition_id) { toast.error('Emri dhe kompeticioni nevojiten'); return; }
    if (editing) {
      await base44.entities.Club.update(editing.id, form);
      toast.success('U përditësua');
    } else {
      const clubId = await generateUniqueClubId();
      const created = await base44.entities.Club.create({ ...form, club_id: clubId });
      // Auto-create a standing row so the new club appears in the league table
      if (created && form.competition_id) {
        const targetRows = await base44.entities.Standing.filter({ competition_id: form.competition_id }, 'position', 100);
        const maxPos = targetRows.reduce((m, r) => Math.max(m, r.position || 0), 0);
        await base44.entities.Standing.create({
          competition_id: form.competition_id,
          club_id: created.id,
          club_name: form.name,
          club_logo: form.logo || '',
          played: 0, won: 0, drawn: 0, lost: 0,
          goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
          position: maxPos + 1,
        });
        await normalizeCompetitionPositions(form.competition_id);
      }
      toast.success('U krijua');
    }
    setDialogOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    const compId = clubs.find(c => c.id === id)?.competition_id;
    // Largo rreshtin e tabelës për këtë klub dhe ri-numëro pozitat
    const rows = await base44.entities.Standing.filter({ club_id: id });
    const affectedComps = new Set(rows.map(r => r.competition_id));
    for (const r of rows) await base44.entities.Standing.delete(r.id);
    await base44.entities.Club.delete(id);
    if (compId) affectedComps.add(compId);
    await Promise.all([...affectedComps].map(cid => normalizeCompetitionPositions(cid)));
    toast.success('U fshi');
    load();
  };

  const openEdit = (club) => {
    setEditing(club);
    setForm({
      name: club.name || '',
      logo: club.logo || '',
      stadium: club.stadium || '',
      stadium_image: club.stadium_image || '',
      coach: club.coach || '',
      coach_photo: club.coach_photo || '',
      home_color: club.home_color || '',
      away_color: club.away_color || '',
      kit_home: club.kit_home || '',
      kit_away: club.kit_away || '',
      kit_third: club.kit_third || '',
      competition_id: club.competition_id || '',
      show_squad: club.show_squad !== false,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    const currentFirst = competitions.find(c => !c.archived && !c.hidden) || competitions[0];
    setForm({ name: '', logo: '', stadium: '', stadium_image: '', coach: '', coach_photo: '', home_color: '', away_color: '', kit_home: '', kit_away: '', kit_third: '', competition_id: currentFirst?.id || '', show_squad: true });
    setDialogOpen(true);
  };

  const openTransfer = (club) => {
    setTransferClub(club);
    setTransferTarget('');
    setTransferOpen(true);
  };

  const handleTransfer = async () => {
    if (!transferClub || !transferTarget) { toast.error('Zgjidh kompeticionin e ri'); return; }
    if (transferTarget === transferClub.competition_id) { toast.error('Klubi është tashmë në këtë kompeticion'); return; }
    const sourceCompId = transferClub.competition_id;
    const sourceComp = competitions.find(c => c.id === sourceCompId);
    // Largo rreshtin e tabelës nga kompeticioni burim (vetëm për kompeticione aktive, jo të arkivuara)
    if (sourceComp && !sourceComp.archived) {
      const oldRows = await base44.entities.Standing.filter({ competition_id: sourceCompId, club_id: transferClub.id });
      for (const r of oldRows) { await base44.entities.Standing.delete(r.id); }
    }
    // Shto rresht 00 në kompeticionin e ri (në fund të renditjes aktuale)
    const existing = await base44.entities.Standing.filter({ competition_id: transferTarget, club_id: transferClub.id });
    if (existing.length === 0) {
      const targetRows = await base44.entities.Standing.filter({ competition_id: transferTarget }, 'position', 100);
      const maxPos = targetRows.reduce((m, r) => Math.max(m, r.position || 0), 0);
      await base44.entities.Standing.create({
        competition_id: transferTarget,
        club_id: transferClub.id,
        club_name: transferClub.name,
        club_logo: transferClub.logo || '',
        played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
        position: maxPos + 1
      });
    }
    await base44.entities.Club.update(transferClub.id, { competition_id: transferTarget });
    // Re-sequence positions in both source and target so numbers stay 1,2,3...
    await Promise.all([
      normalizeCompetitionPositions(sourceCompId),
      normalizeCompetitionPositions(transferTarget),
    ]);
    toast.success('Klubi u bart');
    setTransferOpen(false);
    setTransferClub(null);
    load();
  };

  const handleToggleActive = async (club) => {
    const next = club.active === false ? true : false;
    await base44.entities.Club.update(club.id, { active: next });
    toast.success(next ? 'Klubi u aktivizua' : 'Klubi u çaktivizua');
    load();
  };

  const compSquadVisible = (cid) => {
    const c = competitions.find(x => x.id === cid);
    return c ? c.show_squad !== false : true;
  };
  const clubSquadVisible = (club) => club.show_squad === false ? false : club.show_squad === true ? true : compSquadVisible(club.competition_id);

  const handleToggleSquad = async (club) => {
    const next = !clubSquadVisible(club);
    await base44.entities.Club.update(club.id, { show_squad: next });
    toast.success(next ? 'Skuada u bë e dukshme' : 'Skuada u fsheh');
    load();
  };

  const filtered = selectedComp === 'all' ? clubs : clubs.filter(c => c.competition_id === selectedComp);

  const currentSeasonComps = competitions.filter(c => !c.archived && !c.hidden);
  const formComp = competitions.find(c => c.id === form.competition_id);
  const clubDropdownComps = (formComp && (formComp.archived || formComp.hidden)) ? [formComp, ...currentSeasonComps] : currentSeasonComps;

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Klubet</h2>
        <div className="flex gap-2">
          <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Shto</Button>
        </div>
      </div>

      {selectedComp === 'all' ? (
        <div>
          <p className="text-xs text-muted-foreground mb-3">Zgjidh një ligë për të shfaqur klubet e saj</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {currentSeasonComps.map(c => {
              const count = clubs.filter(cl => cl.competition_id === c.id && cl.active !== false).length;
              return (
                <button key={c.id} onClick={() => setSelectedComp(c.id)}
                  className="flex flex-col items-center gap-2 bg-card rounded-2xl border-2 border-border hover:border-primary hover:shadow-md transition-all p-4 group">
                  {c.logo ? <img src={c.logo} alt="" className="w-12 h-12 object-contain" /> : <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold">{c.name?.[0]}</div>}
                  <p className="text-xs font-bold text-center leading-tight group-hover:text-primary transition-colors">{c.name}</p>
                  <span className="text-[10px] text-muted-foreground">{count} klube</span>
                </button>
              );
            })}
          </div>
          {competitions.some(c => c.archived || c.hidden) && (
            <details className="mt-5">
              <summary className="text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground">Ligat e arkivuara / të fshehura</summary>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                {competitions.filter(c => c.archived || c.hidden).map(c => {
                  const count = clubs.filter(cl => cl.competition_id === c.id).length;
                  return (
                    <button key={c.id} onClick={() => setSelectedComp(c.id)} className="flex flex-col items-center gap-2 bg-muted/40 rounded-2xl border border-border hover:border-primary/50 transition-all p-4 opacity-70">
                      {c.logo ? <img src={c.logo} alt="" className="w-10 h-10 object-contain grayscale" /> : <div className="w-10 h-10 rounded-full bg-muted" />}
                      <p className="text-[11px] font-semibold text-center leading-tight">{c.name}</p>
                      <span className="text-[9px] text-muted-foreground">{count} klube</span>
                    </button>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedComp('all')} className="flex items-center gap-1 text-sm text-primary font-semibold mb-3 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Të gjitha ligat
          </button>
          <div className="flex items-center gap-2 mb-3">
            {(() => {
              const c = competitions.find(x => x.id === selectedComp);
              return c ? (
                <>
                  {c.logo && <img src={c.logo} alt="" className="w-7 h-7 object-contain" />}
                  <h3 className="text-base font-bold">{c.name}</h3>
                  <span className="text-xs text-muted-foreground">{filtered.length} klube</span>
                </>
              ) : null;
            })()}
          </div>
          <div className="space-y-2">
            {filtered.map(club => (
              <div key={club.id} className={`flex items-center gap-3 bg-card rounded-xl p-4 border border-border ${club.active === false ? 'opacity-50' : ''}`}>
                {club.logo ? (
                  <img src={club.logo} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{club.name?.[0]}</div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{club.name}</p>
                    {club.club_id && <span className="text-[9px] font-mono text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded select-all">ID: {club.club_id}</span>}
                    {club.active === false && <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">INAKTIV</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{club.stadium}</p>
                </div>
                <Link to={`/ks-panel-7k4m9/clubs/${club.id}/players`} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Users className="w-3 h-3" /> Lojtarët
                </Link>
                {(() => {
                  const sv = clubSquadVisible(club);
                  return (
                    <button
                      onClick={() => handleToggleSquad(club)}
                      title={sv ? 'Skuada e dukshme — kliko për ta fshehur' : 'Skuada e fshehur — kliko për ta shfaqur'}
                      className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-1 rounded-md border transition-colors ${sv ? 'text-primary border-primary/30 bg-primary/5' : 'text-muted-foreground border-border bg-muted/40'}`}
                    >
                      {sv ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {sv ? 'Me skuadë' : 'Pa skuadë'}
                    </button>
                  );
                })()}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title={club.active === false ? 'Aktivizo' : 'Çaktivizo (fshihi nga ligat)'} onClick={() => handleToggleActive(club)}><Power className={`w-4 h-4 ${club.active === false ? 'text-muted-foreground' : 'text-green-500'}`} /></Button>
                  <Button variant="ghost" size="icon" title="Bart në kompeticion tjetër" onClick={() => openTransfer(club)}><ArrowLeftRight className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(club)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(club.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka klub ende</p>}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edito' : 'Shto'} Klub</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kompeticioni</Label>
              <Select value={form.competition_id} onValueChange={v => setForm(p => ({ ...p, competition_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {clubDropdownComps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Emri</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div>
              <Label>Logo</Label>
              <Input type="file" accept="image/*" onChange={handleUploadLogo} />
              {form.logo && <img src={form.logo} alt="" className="w-12 h-12 rounded-full mt-2 object-cover" />}
            </div>
            <div><Label>Stadiumi</Label><Input value={form.stadium} onChange={e => setForm(p => ({ ...p, stadium: e.target.value }))} /></div>
            <div>
              <Label>Foto e stadiumit</Label>
              {form.stadium_image && <img src={form.stadium_image} alt="" className="w-full h-24 rounded-lg mb-2 object-cover" />}
              <Input type="file" accept="image/*" onChange={e => handleUploadField('stadium_image', e)} />
            </div>
            <div><Label>Trajneri</Label><Input value={form.coach || ''} onChange={e => setForm(p => ({ ...p, coach: e.target.value }))} placeholder="Emri i trajnerit" /></div>
            <div>
              <Label>Foto e trajnerit</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.coach_photo && <img src={form.coach_photo} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />}
                <Input type="file" accept="image/*" onChange={e => handleUploadField('coach_photo', e)} />
              </div>
            </div>
            <div>
              <Label>Fanellat (foto)</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { field: 'kit_home', label: 'Shtëpi' },
                  { field: 'kit_away', label: 'Mysafir' },
                  { field: 'kit_third', label: 'Alt.' },
                ].map(k => (
                  <div key={k.field} className="text-center">
                    {form[k.field] ? (
                      <img src={form[k.field]} alt={k.label} className="w-full h-16 rounded-lg object-cover mb-1 border border-border" />
                    ) : (
                      <div className="w-full h-16 rounded-lg bg-muted border border-dashed border-border mb-1" />
                    )}
                    <Input type="file" accept="image/*" onChange={e => handleUploadField(k.field, e)} className="text-[10px] p-1 h-7" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ngjyra vendas</Label><Input type="color" value={form.home_color || '#000000'} onChange={e => setForm(p => ({ ...p, home_color: e.target.value }))} /></div>
              <div><Label>Ngjyra mysafir</Label><Input type="color" value={form.away_color || '#ffffff'} onChange={e => setForm(p => ({ ...p, away_color: e.target.value }))} /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="cursor-pointer">Shfaq profilet e lojtarëve</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">Kur është OFF, tab-i Skuadra fshihet në profilin e klubit</p>
              </div>
              <Switch checked={form.show_squad !== false} onCheckedChange={v => setForm(p => ({ ...p, show_squad: v }))} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Përditëso' : 'Krijo'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bart klubin: {transferClub?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kompeticioni i ri</Label>
              <Select value={transferTarget} onValueChange={setTransferTarget}>
                <SelectTrigger><SelectValue placeholder="Zgjidh kompeticionin" /></SelectTrigger>
                <SelectContent>
                  {currentSeasonComps.filter(c => c.id !== transferClub?.competition_id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} {c.season ? `(${c.season})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleTransfer} className="w-full">Bart klubin</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}