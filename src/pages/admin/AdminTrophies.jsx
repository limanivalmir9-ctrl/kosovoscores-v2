import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

const COMP_TYPES = [
  { value: 'Ligen', label: 'Ligen' },
  { value: 'Kupen', label: 'Kupen' },
  { value: 'Superkupen', label: 'Superkupen' },
];

const TYPE_LABELS = { Ligen: 'Ligen', Kupen: 'Kupen', Superkupen: 'Superkupen' };

export default function AdminTrophies() {
  const [trophies, setTrophies] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ competition_type: 'Ligen', trophy_image: '', count: 1, season: '' });
  const [uploading, setUploading] = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const [typeIcons, setTypeIcons] = useState({ Ligen: '', Kupen: '', Superkupen: '' });
  const [iconUploading, setIconUploading] = useState(null);

  const load = async () => {
    const [allTrophies, allClubs] = await Promise.all([
      base44.entities.Trophy.list('-created_date', 500),
      base44.entities.Club.list('-created_date', 500),
    ]);
    setTrophies(allTrophies);
    setClubs(allClubs);
    try {
      const settings = await base44.entities.AppSettings.list('-created_date', 5);
      if (settings[0]) {
        setSettingsId(settings[0].id);
        setTypeIcons({
          Ligen: settings[0].trophy_icon_ligen || '',
          Kupen: settings[0].trophy_icon_kupen || '',
          Superkupen: settings[0].trophy_icon_superkupen || '',
        });
      }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadOptimizedImage(file, { maxDim: 256 });
      setForm(p => ({ ...p, trophy_image: file_url }));
    } catch (e) {
      toast.error('Ngarkimi dështoi');
    }
    setUploading(false);
  };

  // Upload i ikonës së përbashkët për një garë — ruhet një herë dhe përdoret për çdo titull
  const handleTypeIconUpload = async (type, file) => {
    if (!file) return;
    setIconUploading(type);
    try {
      const { file_url } = await uploadOptimizedImage(file, { maxDim: 128 });
      setTypeIcons(prev => ({ ...prev, [type]: file_url }));
      const field = `trophy_icon_${type.toLowerCase()}`;
      if (settingsId) {
        await base44.entities.AppSettings.update(settingsId, { [field]: file_url });
      } else {
        const created = await base44.entities.AppSettings.create({ [field]: file_url });
        setSettingsId(created.id);
      }
      toast.success('Ikona u ruajt');
    } catch (e) {
      toast.error('Ngarkimi dështoi');
    }
    setIconUploading(null);
  };

  const handleSave = async () => {
    if (!selectedClub) { toast.error('Zgjedh klubin'); return; }
    if (!form.competition_type) { toast.error('Zgjedh kompeticionin'); return; }
    const club = clubs.find(c => c.id === selectedClub);
    const data = {
      club_id: selectedClub,
      club_name: club?.name || '',
      competition_type: form.competition_type,
      trophy_image: form.trophy_image || undefined,
      count: Number(form.count) || 1,
      season: form.season || undefined,
    };
    if (editing) {
      await base44.entities.Trophy.update(editing.id, data);
      toast.success('Trofeu u përditësua');
    } else {
      await base44.entities.Trophy.create(data);
      toast.success('Trofeu u shtua');
    }
    setEditing(null);
    setForm({ competition_type: 'Ligen', trophy_image: '', count: 1, season: '' });
    load();
  };

  const handleEdit = (t) => {
    setEditing(t);
    setForm({ competition_type: t.competition_type, trophy_image: t.trophy_image || '', count: t.count || 1, season: t.season || '' });
    setSelectedClub(t.club_id);
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    await base44.entities.Trophy.delete(id);
    toast.success('Trofeu u fshi');
    load();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ competition_type: 'Ligen', trophy_image: '', count: 1, season: '' });
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const clubTrophies = trophies.filter(t => t.club_id === selectedClub);

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Trofetë e Klubeve</h2>

      {/* Ikona të përbashkëta të trofeve — vendosen një herë për çdo garë, përdoren automatikisht për çdo titull */}
      <div className="bg-gradient-to-b from-yellow-50/60 to-transparent border border-yellow-200/70 rounded-2xl p-3 mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-yellow-700 mb-1 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Ikona e Trofeve (të përbashkëta)</p>
        <p className="text-[10px] text-muted-foreground mb-2">Vendos ikonën një herë për çdo garë — përdoret automatikisht te të gjithë titujt e klubeve (nuk nevojitet upload për çdo titull).</p>
        <div className="grid grid-cols-3 gap-2">
          {COMP_TYPES.map(ct => (
            <div key={ct.value} className="flex flex-col items-center gap-1 bg-card rounded-lg border border-border p-2">
              <span className="text-[10px] font-bold text-muted-foreground">{ct.label}</span>
              {typeIcons[ct.value] ? (
                <img src={typeIcons[ct.value]} alt="" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center"><Trophy className="w-5 h-5 text-yellow-500" /></div>
              )}
              <label className="text-[10px] font-semibold text-primary cursor-pointer hover:underline">
                {iconUploading === ct.value ? 'Po ngarkohet...' : 'Ngarko ikonë'}
                <input type="file" accept="image/*" className="hidden" onChange={e => handleTypeIconUpload(ct.value, e.target.files?.[0])} disabled={iconUploading === ct.value} />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <Label>Zgjedh Klubin</Label>
        <Select value={selectedClub} onValueChange={v => { setSelectedClub(v); resetForm(); }}>
          <SelectTrigger><SelectValue placeholder="Zgjedh klubin" /></SelectTrigger>
          <SelectContent>
            {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedClub && (
        <div className="bg-card rounded-2xl border border-border p-4 mb-4">
          <h3 className="text-sm font-bold mb-3">{editing ? 'Edito Trofe' : 'Shto Trofe'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kompeticioni</Label>
              <Select value={form.competition_type} onValueChange={v => setForm(p => ({ ...p, competition_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMP_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Numri i titujve</Label>
              <Input type="number" min={1} value={form.count} onChange={e => setForm(p => ({ ...p, count: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Sezoni (opsionale)</Label>
              <Input placeholder="p.sh. 2024/25" value={form.season} onChange={e => setForm(p => ({ ...p, season: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Foto e trofeut</Label>
              <Input type="file" accept="image/*" onChange={e => handleUpload(e.target.files?.[0])} disabled={uploading} />
              {uploading && <p className="text-[10px] text-muted-foreground mt-1">Po ngarkohet...</p>}
              {form.trophy_image && <img src={form.trophy_image} alt="" className="w-16 h-16 object-contain mt-2 border border-border rounded-lg" />}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleSave} size="sm"><Plus className="w-4 h-4 mr-1" /> {editing ? 'Përditëso' : 'Shto'}</Button>
            {editing && <Button onClick={resetForm} size="sm" variant="outline">Anulo</Button>}
          </div>
        </div>
      )}

      {selectedClub && (
        <div className="space-y-2">
          {clubTrophies.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Nuk ka trofe të regjistruara</p>
          ) : (
            clubTrophies.map(t => (
              <div key={t.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                {(t.trophy_image || typeIcons[t.competition_type]) ? (
                  <img src={t.trophy_image || typeIcons[t.competition_type]} alt="" className="w-12 h-12 object-contain rounded-lg border border-border" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-yellow-50 border border-border flex items-center justify-center"><Trophy className="w-6 h-6 text-yellow-500" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{TYPE_LABELS[t.competition_type] || t.competition_type}</p>
                  <p className="text-xs text-muted-foreground">{t.count} titull(e) {t.season ? `· ${t.season}` : ''}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}