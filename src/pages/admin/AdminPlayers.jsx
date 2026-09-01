import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ArrowLeft, RefreshCw, Upload, X, Power, Package, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import CountrySelect from '@/components/CountrySelect';
import { countryInfo } from '@/lib/countries';
import Flag from '@/components/Flag';
import PlayerHistoryDialog from '@/components/admin/PlayerHistoryDialog';
import InjuredBadge from '@/components/InjuredBadge';

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
const POSITION_LABELS = {
  Goalkeeper: 'Portier',
  Defender: 'Mbrojtës',
  Midfielder: 'Mesfushor',
  Forward: 'Sulmues',
};
const POSITION_COLORS = {
  Goalkeeper: 'text-yellow-600',
  Defender: 'text-blue-600',
  Midfielder: 'text-green-600',
  Forward: 'text-red-500',
};

export default function AdminPlayers() {
  const clubId = window.location.pathname.split('/clubs/')[1]?.split('/')[0];
  const [club, setClub] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', number: '', position: 'Midfielder', nationality: '', date_of_birth: '', photo: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [historyPlayer, setHistoryPlayer] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    const [clubs, allPlayers] = await Promise.all([
      base44.entities.Club.filter({ id: clubId }),
      base44.entities.Player.filter({ club_id: clubId }, 'number', 100),
    ]);
    setClub(clubs[0] || null);
    setPlayers(allPlayers);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clubId]);

  // ID e lojtarit është permanente dhe unike — gjenerohet vetëm një herë, kurrë nuk ndryshohet.
  const generateUniquePlayerId = async () => {
    const localIds = new Set(players.filter(p => p.player_id).map(p => p.player_id));
    for (let i = 0; i < 50; i++) {
      const id = String(Math.floor(100000 + Math.random() * 900000));
      if (localIds.has(id)) continue;
      const existing = await base44.entities.Player.filter({ player_id: id }, null, 1).catch(() => []);
      if (!existing || existing.length === 0) return id;
    }
    throw new Error('Nuk u gjenerua ID unike');
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await uploadOptimizedImage(file, { maxDim: 400 });
    setForm(p => ({ ...p, photo: file_url }));
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Emri nevojitet'); return; }
    const data = {
      ...form,
      number: form.number ? Number(form.number) : null,
      club_id: clubId,
      competition_id: club?.competition_id || '',
    };
    if (editing) {
      // ID e lojtarit është permanente dhe unike — nuk ndryshohet kurrë.
      // Gjenerohet vetëm nëse mungon plotësisht.
      if (!editing.player_id) data.player_id = await generateUniquePlayerId();
      await base44.entities.Player.update(editing.id, data);
      // Përhap ndryshimin e emrit/numrit tek ngjarjet dhe formacionet (përfshirë ndeshjet e përfunduara)
      const oldName = editing.name;
      const newName = form.name;
      const newNumber = form.number ? Number(form.number) : null;
      const nameChanged = newName !== oldName;
      const numberChanged = newNumber !== (editing.number ?? null);
      const photoChanged = form.photo !== (editing.photo || '');
      const pid = editing.player_id || data.player_id;
      if (nameChanged || numberChanged) {
        toast('Duke përditësuar ngjarjet dhe formacionet...');
        // Mukojmë ndeshjet e klubit (vendas + mysafir)
        const homeMatches = await base44.entities.Match.filter({ home_team_id: clubId }, '-date', 500).catch(() => []);
        const awayMatches = await base44.entities.Match.filter({ away_team_id: clubId }, '-date', 500).catch(() => []);
        const clubMatchIds = new Set();
        [...homeMatches, ...awayMatches].forEach(m => clubMatchIds.add(m.id));
        // 1. MatchEvents me player_id (ngjarje të reja)
        if (nameChanged && pid) {
          await base44.entities.MatchEvent.updateMany({ player_id: pid }, { $set: { player_name: newName } }).catch(() => {});
          await base44.entities.MatchEvent.updateMany({ assist_player_id: pid }, { $set: { assist_player_name: newName } }).catch(() => {});
          await base44.entities.MatchEvent.updateMany({ player_in_id: pid }, { $set: { player_in_name: newName } }).catch(() => {});
          await base44.entities.MatchEvent.updateMany({ player_out_id: pid }, { $set: { player_out_name: newName } }).catch(() => {});
        }
        // 2. MatchEvents pa player_id (ngjarje të vjetra) — përkapen me emrin e vjetër brenda ndeshjeve të klubit
        if (nameChanged) {
          const fieldMap = [
            { nameField: 'player_name', idField: 'player_id' },
            { nameField: 'assist_player_name', idField: 'assist_player_id' },
            { nameField: 'player_in_name', idField: 'player_in_id' },
            { nameField: 'player_out_name', idField: 'player_out_id' },
          ];
          for (const f of fieldMap) {
            const evts = await base44.entities.MatchEvent.filter({ [f.nameField]: oldName }, '-created_date', 2000).catch(() => []);
            const toUpdate = evts.filter(e => clubMatchIds.has(e.match_id) && !e[f.idField]);
            if (toUpdate.length > 0) {
              await base44.entities.MatchEvent.bulkUpdate(
                toUpdate.map(e => ({ id: e.id, [f.nameField]: newName, ...(pid ? { [f.idField]: pid } : {}) }))
              ).catch(() => {});
            }
          }
        }
        // 3. Formacionet — përkapen me player_id OSE emrin e vjetër
        const seen = new Set();
        for (const m of [...homeMatches, ...awayMatches]) {
          if (seen.has(m.id)) continue; seen.add(m.id);
          const isHome = m.home_team_id === clubId;
          const key = isHome ? 'home_lineup' : 'away_lineup';
          const lineup = m[key] || [];
          const idx = lineup.findIndex(l => (pid && l.player_id === pid) || l.name === oldName);
          if (idx >= 0) {
            const updated = [...lineup];
            updated[idx] = { ...updated[idx], name: newName, number: newNumber, ...(pid ? { player_id: pid } : {}) };
            await base44.entities.Match.update(m.id, { [key]: updated }).catch(() => {});
          }
        }
      }
      // Përhap emrin/foton tek snapshotet e Yjeve të Javës dhe Golashënuesve (sipas ID-së së entitetit)
      if (nameChanged || photoChanged) {
        if (nameChanged) {
          await base44.entities.WeekStar.updateMany({ player_id: editing.id }, { $set: { player_name: newName } }).catch(() => {});
          await base44.entities.TopScorer.updateMany({ player_id: editing.id }, { $set: { player_name: newName } }).catch(() => {});
        }
        if (photoChanged) {
          await base44.entities.WeekStar.updateMany({ player_id: editing.id }, { $set: { player_photo: form.photo } }).catch(() => {});
          await base44.entities.TopScorer.updateMany({ player_id: editing.id }, { $set: { photo: form.photo } }).catch(() => {});
        }
      }
      toast.success('U përditësua');
    } else {
      data.player_id = await generateUniquePlayerId();
      await base44.entities.Player.create(data);
      toast.success('U krijua');
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', number: '', position: 'Midfielder', nationality: '', date_of_birth: '', photo: '' });
    load();
  };

  const generateMissingIds = async () => {
    const missing = players.filter(p => !p.player_id);
    if (missing.length === 0) { toast.info('Të gjithë lojtarët kanë ID'); return; }
    toast('Duke gjeneruar ID unike...');
    let count = 0;
    for (const p of missing) {
      const id = await generateUniquePlayerId();
      await base44.entities.Player.update(p.id, { player_id: id });
      count++;
    }
    toast.success(`${count} ID u gjeneruan`);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    await base44.entities.Player.delete(id);
    toast.success('U fshi');
    load();
  };

  const toggleActive = async (player) => {
    const next = player.active === false;
    await base44.entities.Player.update(player.id, { active: next });
    toast.success(next ? 'Lojtari u aktivizua' : 'Lojtari u çaktivizua');
    load();
  };

  const toggleInjured = async (player) => {
    const next = !player.injured;
    await base44.entities.Player.update(player.id, { injured: next });
    toast.success(next ? 'I shënuar si i lënduar' : 'I lënduar u hoq');
    load();
  };

  const sendToMagazine = async (player) => {
    if (!confirm(`Dërgo "${player.name}" në Magazinën e Lojtarëve? Lojtari do të hiqet nga ky klub (pa klub) por profileti mbetet i paprekur.`)) return;
    try {
      await base44.entities.Player.update(player.id, { club_id: '', competition_id: '' });
      toast.success('Lojtari u dërgua në Magazinë');
      load();
    } catch (err) {
      toast.error('Gabim: ' + (err?.message || 'Error'));
    }
  };

  const openEdit = (player) => {
    setEditing(player);
    setForm({
      name: player.name || '',
      number: player.number || '',
      position: player.position || 'Midfielder',
      nationality: player.nationality || '',
      date_of_birth: player.date_of_birth || '',
      photo: player.photo || '',
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', number: '', position: 'Midfielder', nationality: '', date_of_birth: '', photo: '' });
    setDialogOpen(true);
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  // Group by position
  const posOrder = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
  const grouped = POSITIONS.reduce((acc, pos) => {
    acc[pos] = players.filter(p => p.position === pos).sort((a, b) => (a.number || 99) - (b.number || 99));
    return acc;
  }, {});
  const ungrouped = players.filter(p => !p.position);

  return (
    <div>
      <Link to="/ks-panel-7k4m9/clubs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Klubet
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {club?.logo && <img src={club.logo} alt="" className="w-10 h-10 rounded-full object-cover" />}
          <div>
            <h2 className="text-lg font-bold">{club?.name || 'Klub'}</h2>
            <p className="text-xs text-muted-foreground">{players.length} lojtarë</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Shto
          </Button>
        </div>
      </div>

      {/* Grouped by position */}
      <div className="space-y-6">
        {[...POSITIONS, null].map(pos => {
          const group = pos ? grouped[pos] : ungrouped;
          if (!group || group.length === 0) return null;
          return (
            <div key={pos || 'other'}>
              <p className={`text-xs font-black uppercase tracking-widest mb-2 ${pos ? POSITION_COLORS[pos] : 'text-muted-foreground'}`}>
                {pos ? POSITION_LABELS[pos] : 'Pa pozicion'}
              </p>
              <div className="space-y-2">
                {group.map(player => (
                  <div key={player.id} className={`flex items-center gap-3 bg-card rounded-xl p-3 border ${player.active === false ? 'border-orange-200 opacity-60' : 'border-border'}`}>
                    {/* Photo */}
                    {player.photo ? (
                      <img src={player.photo} alt={player.name} className="w-10 h-10 rounded-xl object-cover border border-border shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
                        <span className="text-sm font-black text-muted-foreground">{player.number || '?'}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{player.name}</p>
                        {player.active === false && <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">JOAKTIV</span>}
                        {player.injured && <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">LËNDUAR</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {player.number && <span className="text-[10px] font-bold text-muted-foreground">#{player.number}</span>}
                        {player.nationality && (() => {
                          const ci = countryInfo(player.nationality);
                          return (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Flag value={player.nationality} size={15} />
                              {ci?.name}
                            </span>
                          );
                        })()}
                        {player.player_id && <span className="text-[9px] font-mono text-muted-foreground/50">{player.player_id}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" title="Dërgo në Magazinë" onClick={() => sendToMagazine(player)}><Package className="w-4 h-4 text-amber-500" /></Button>
                      <Button variant="ghost" size="icon" title="Historia e karrierës" onClick={() => setHistoryPlayer(player)}><History className="w-4 h-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" title={player.active === false ? 'Aktivizo' : 'Çaktivizo'} onClick={() => toggleActive(player)}><Power className={`w-4 h-4 ${player.active === false ? 'text-orange-500' : 'text-muted-foreground'}`} /></Button>
                      <Button variant="ghost" size="icon" title={player.injured ? 'I lënduar (hiq)' : 'Shëno i lënduar'} onClick={() => toggleInjured(player)}>{player.injured ? <InjuredBadge size="sm" /> : <Plus className="w-4 h-4 text-muted-foreground" />}</Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(player)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(player.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {players.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka lojtarë ende</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edito' : 'Shto'} Lojtar</DialogTitle></DialogHeader>
          <div className="space-y-4">

            {/* ID e lojtarit — vetëm lexim, e paprekshme */}
            {editing?.player_id && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 border border-border">
                <span className="text-[11px] text-muted-foreground">ID e lojtarit</span>
                <span className="font-mono font-bold text-sm text-foreground select-all">{editing.player_id}</span>
              </div>
            )}

            {/* Photo upload */}
            <div>
              <Label>Fotografia</Label>
              <div className="mt-1 flex items-center gap-3">
                {form.photo ? (
                  <div className="relative">
                    <img src={form.photo} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
                    <button
                      onClick={() => setForm(p => ({ ...p, photo: '' }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handlePhotoUpload(e.target.files[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingPhoto}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploadingPhoto ? 'Duke ngarkuar...' : 'Ngarko foto'}
                  </Button>
                </div>
              </div>
            </div>

            <div><Label>Emri & Mbiemri *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Numri i fanelës</Label><Input type="number" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} /></div>
            <div>
              <Label>Pozicioni</Label>
              <Select value={form.position} onValueChange={v => setForm(p => ({ ...p, position: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(pos => <SelectItem key={pos} value={pos}>{POSITION_LABELS[pos]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kombësia</Label>
              <div className="mt-1"><CountrySelect value={form.nationality} onChange={v => setForm(p => ({ ...p, nationality: v }))} /></div>
            </div>
            <div><Label>Data e lindjes</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} /></div>

            <Button onClick={handleSave} className="w-full" disabled={uploadingPhoto}>
              {editing ? 'Përditëso' : 'Krijo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PlayerHistoryDialog open={!!historyPlayer} onOpenChange={(o) => { if (!o) setHistoryPlayer(null); }} player={historyPlayer} />
    </div>
  );
}