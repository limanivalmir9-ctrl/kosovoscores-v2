import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['blue-500','yellow-500','green-500','red-500','purple-500','orange-500','pink-500','cyan-500'];
const STATUSES = ['Kampion', 'Promovim', 'UECL Qual.', 'Playoff', 'Playoff (Rënie)', 'Renie nga liga'];
const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const EMPTY_FORM = { name: '', season: '', logo: '', color: 'blue-500', tier: 1, status_positions: [] };

export default function AdminCompetitions() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(null);

  // Ref që mban gjithmonë formularin më të freskët — parandalon "stale closure" në handleSave
  const formRef = useRef(form);
  formRef.current = form;

  const load = async () => {
    const data = await base44.entities.Competition.list('tier', 200);
    setCompetitions(data);
    if (selectedSeason === null) {
      const active = data.filter(c => !c.archived);
      const cur = active[0]?.season || data[0]?.season || null;
      setSelectedSeason(cur);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadOptimizedImage(file, { maxDim: 256 });
      const file_url = res?.file_url;
      if (!file_url) throw new Error('Nuk u kthyt URL');
      setForm(prev => ({ ...prev, logo: file_url }));
      toast.success('Logo u ngarkua');
    } catch (err) {
      console.error('Upload logo error:', err);
      toast.error('Ngarkimi i logos dështoi: ' + (err?.message || 'Error'));
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Emri është i detyrueshëm'); return; }
    setSaving(true);
    try {
      // Lexo gjithmonë vlerat më të reja nga ref-i (jo nga mbyllja e vjetër)
      const f = formRef.current;
      // Serialize to plain JS to avoid SDK proxy issues
      const payload = JSON.parse(JSON.stringify({
        name: f.name,
        season: f.season,
        logo: f.logo,
        color: f.color,
        tier: Number(f.tier),
        status_positions: f.status_positions,
      }));
      if (editing) {
        await base44.entities.Competition.update(editing.id, payload);
        toast.success('U përditësua');
      } else {
        await base44.entities.Competition.create(payload);
        toast.success('U krijua');
      }
      setShowPanel(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Gabim gjatë ruajtjes: ' + (err?.message || 'Error i panjohur'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    await base44.entities.Competition.delete(id);
    toast.success('U fshi');
    load();
  };

  const openEdit = (comp) => {
    setEditing(comp);
    setForm({
      name: comp.name || '',
      season: comp.season || '',
      logo: comp.logo || '',
      color: comp.color || 'blue-500',
      tier: comp.tier || 1,
      status_positions: comp.status_positions || [],
    });
    setShowPanel(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const addStatusPosition = () => setForm(prev => {
    const newSP = [...(prev.status_positions || []), { position: (prev.status_positions || []).length + 1, status: 'Kampion' }];
    return { ...prev, status_positions: newSP };
  });

  const updateSP = (i, field, value) => setForm(prev => {
    const newSP = (prev.status_positions || []).map((sp, idx) =>
      idx === i ? { ...sp, [field]: field === 'position' ? Number(value) : value } : sp
    );
    return { ...prev, status_positions: newSP };
  });

  const removeSP = (i) => setForm(prev => {
    const newSP = (prev.status_positions || []).filter((_, idx) => idx !== i);
    return { ...prev, status_positions: newSP };
  });

  const seasons = [...new Set(competitions.map(c => c.season).filter(Boolean))].sort().reverse();
  const shown = competitions.filter(c => !selectedSeason || c.season === selectedSeason);

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Kompeticionet</h2>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Shto</Button>
      </div>

      <Select value={selectedSeason || ''} onValueChange={setSelectedSeason}>
        <SelectTrigger className="mb-4"><SelectValue placeholder="Zgjidh sezonin" /></SelectTrigger>
        <SelectContent>
          {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="space-y-2">
        {shown.map(comp => (
          <div key={comp.id} className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
            {comp.logo
              ? <img src={comp.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
              : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">{comp.name?.[0]}</div>
            }
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{comp.name}</p>
                <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">TIER {comp.tier || 1}</span>
              </div>
              <p className="text-xs text-muted-foreground">{comp.season}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(comp)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(comp.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka kompeticion ende</p>}
      </div>

      {/* Custom overlay panel — no Radix Dialog to avoid portal/focus conflicts */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={closePanel} />

          {/* Panel */}
          <div className="relative z-10 bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">{editing ? 'Edito' : 'Shto'} Kompeticion</h3>
              <button onClick={closePanel} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <Label>Emri</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
              </div>

              <div>
                <Label>Sezoni</Label>
                <Input value={form.season} onChange={e => setForm(p => ({ ...p, season: e.target.value }))} placeholder="2024/25" className="mt-1" />
              </div>

              <div>
                <Label>Niveli (Tier)</Label>
                <Select value={String(form.tier)} onValueChange={v => setForm(p => ({ ...p, tier: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIERS.map(t => <SelectItem key={t} value={String(t)}>TIER {t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label>Logo</Label>
                <Input type="file" accept="image/*" onChange={handleUploadLogo} className="mt-1" />
                {form.logo && <img src={form.logo} alt="" className="w-16 h-16 rounded-lg mt-2 object-cover" />}
              </div>

              <div>
                <Label>Ngjyra e kornizës</Label>
                <Select value={form.color} onValueChange={v => setForm(p => ({ ...p, color: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map(c => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-${c}`} />
                          {c}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Statuset e pozitave</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStatusPosition}>+ Shto</Button>
                </div>
                {form.status_positions.map((sp, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <Input
                      type="number"
                      value={sp.position}
                      onChange={e => updateSP(i, 'position', e.target.value)}
                      className="w-16"
                    />
                    <Select value={sp.status} onValueChange={v => updateSP(i, 'status', v)}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSP(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Duke ruajtur...' : (editing ? 'Përditëso' : 'Krijo')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}