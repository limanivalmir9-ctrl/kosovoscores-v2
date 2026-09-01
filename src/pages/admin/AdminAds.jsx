import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Move, Map, List } from 'lucide-react';
import { toast } from 'sonner';
import AdPositionEditor from '@/components/admin/AdPositionEditor';
import AdminAdLayoutMap from '@/components/admin/AdminAdLayoutMap';

const SIDEBAR_FORMATS = [
  { label: 'Vertikal 160×600', width: 160, height: 600 },
  { label: 'Gjysmë 300×600', width: 300, height: 600 },
  { label: 'Katror 300×300', width: 300, height: 300 },
  { label: 'Katror 250×250', width: 250, height: 250 },
  { label: 'Banner 300×250', width: 300, height: 250 },
  { label: 'Banner 336×280', width: 336, height: 280 },
];

export default function AdminAds() {
  const [ads, setAds] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('map'); // 'map' | 'list'
  const [form, setForm] = useState({ image: '', competition_id: '', placement: 'top', link: '', active: true, rotation_group: '', rotation_seconds: 5, width: '', height: '', device: 'both' });

  const PLACEMENT_LABELS = {
    top: '📱 Sipër ndeshjeve (mobile & desktop)',
    bottom: '📱 Poshtë ndeshjeve (mobile & desktop)',
    sidebar_left: '🖥️ Anë Majtas — Desktop (format fleksibil)',
    sidebar_right: '🖥️ Anë Djathtas — Desktop (format fleksibil)',
    sponsor: '📱 Sponzorë — Faqja Live (mobile)',
    float: '📍 Pozicion i lirë (drag & drop)',
    side_desktop: '🖥️ Sidebar i vjetër',
    header_left: '🖥️ Header Majtas (i vjetër)',
    header_right: '🖥️ Header Djathtas (i vjetër)',
  };
  const [posEditor, setPosEditor] = useState(false);

  const load = async () => {
    const [allAds, allComps] = await Promise.all([
      base44.entities.Ad.list('-created_date', 100),
      base44.entities.Competition.list('-created_date', 50),
    ]);
    setAds(allAds);
    setCompetitions(allComps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await uploadOptimizedImage(file, { maxDim: 1024 });
    setForm(prev => ({ ...prev, image: file_url }));
  };

  const handleSave = async () => {
    if (!form.image) { toast.error('Ngarko një foto'); return; }
    if (editing) {
      await base44.entities.Ad.update(editing.id, form);
      toast.success('U përditësua');
    } else {
      await base44.entities.Ad.create(form);
      toast.success('U krijua');
    }
    setDialogOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    await base44.entities.Ad.delete(id);
    toast.success('U fshi');
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Reklamat</h2>
        <div className="flex gap-2">
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button variant={view === 'map' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8" onClick={() => setView('map')}>
              <Map className="w-3.5 h-3.5 mr-1" /> Harta
            </Button>
            <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8" onClick={() => setView('list')}>
              <List className="w-3.5 h-3.5 mr-1" /> Lista
            </Button>
          </div>
          {view === 'list' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPosEditor(true)} disabled={ads.filter(a => a.active).length === 0}>
                <Move className="w-4 h-4 mr-1" /> Poziciono
              </Button>
              <Button onClick={() => { setEditing(null); setForm({ image: '', competition_id: '', placement: 'top', link: '', active: true, rotation_group: '', rotation_seconds: 5, device: 'both' }); setDialogOpen(true); }} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Shto
              </Button>
            </>
          )}
        </div>
      </div>

      {view === 'map' && (
        <AdminAdLayoutMap ads={ads} onRefresh={load} />
      )}

      {view === 'list' && <div className="space-y-2">
        {ads.map(ad => (
          <div key={ad.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
            <img src={ad.image} alt="" className="w-20 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{competitions.find(c => c.id === ad.competition_id)?.name || 'Global'}</p>
              <p className="text-xs text-muted-foreground">
                {PLACEMENT_LABELS[ad.placement] || ad.placement} • {ad.active ? 'Aktiv' : 'Jo aktiv'}
                {ad.device && ad.device !== 'both' && <span className="ml-1 font-semibold text-foreground/70">📱 {ad.device === 'mobile' ? 'Vetëm Mobile' : 'Vetëm Desktop'}</span>}
                {ad.rotation_group && <span className="ml-1 font-semibold text-primary">⚡ {ad.rotation_group} ({ad.rotation_seconds || 5}s)</span>}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => {
                setEditing(ad);
                setForm({ image: ad.image, competition_id: ad.competition_id || '', placement: ad.placement, link: ad.link || '', active: ad.active, rotation_group: ad.rotation_group || '', rotation_seconds: ad.rotation_seconds || 5, width: ad.width || '', height: ad.height || '', device: ad.device || 'both' });
                setDialogOpen(true);
              }}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {ads.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka reklama ende</p>}
      </div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edito' : 'Shto'} Reklamë</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Foto baneri</Label>
              <Input type="file" accept="image/*" onChange={handleUpload} />
              {form.image && <img src={form.image} alt="" className="w-full h-20 rounded-lg mt-2 object-cover" />}
            </div>
            <div>
              <Label>Kompeticioni (opsional)</Label>
              <Select value={form.competition_id || 'none'} onValueChange={v => setForm(p => ({ ...p, competition_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Global (të gjitha) —</SelectItem>
                  {competitions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pozicioni</Label>
              <Select value={form.placement} onValueChange={v => setForm(p => ({ ...p, placement: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">📱 Sipër ndeshjeve (mobile & desktop)</SelectItem>
                  <SelectItem value="bottom">📱 Poshtë ndeshjeve (mobile & desktop)</SelectItem>
                  <SelectItem value="sidebar_left">🖥️ Anë Majtas — Desktop (format fleksibil)</SelectItem>
                  <SelectItem value="sidebar_right">🖥️ Anë Djathtas — Desktop (format fleksibil)</SelectItem>
                  <SelectItem value="sponsor">📱 Sponzorë — Faqja Live (mobile)</SelectItem>
                  <SelectItem value="float">📍 Pozicion i lirë (drag & drop)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.placement === 'sidebar_left' || form.placement === 'sidebar_right') && (
              <div>
                <Label className="text-xs">Formate të shpejta (px)</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SIDEBAR_FORMATS.map(f => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, width: f.width, height: f.height }))}
                      className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                        (form.width === f.width && form.height === f.height)
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div><Label>Link (opsional)</Label><Input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} placeholder="https://" /></div>

            <div>
              <Label>Shfaq në</Label>
              <Select value={form.device || 'both'} onValueChange={v => setForm(p => ({ ...p, device: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">📱💻 Të dyja (Mobile & Desktop)</SelectItem>
                  <SelectItem value="mobile">📱 Vetëm Mobile</SelectItem>
                  <SelectItem value="desktop">💻 Vetëm Desktop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Width / Height */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs">Gjerësia (px) — opsional</Label>
                <Input
                  type="number"
                  min={20}
                  value={form.width}
                  onChange={e => setForm(p => ({ ...p, width: e.target.value ? Number(e.target.value) : '' }))}
                  placeholder="auto"
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Lartësia (px) — opsional</Label>
                <Input
                  type="number"
                  min={20}
                  value={form.height}
                  onChange={e => setForm(p => ({ ...p, height: e.target.value ? Number(e.target.value) : '' }))}
                  placeholder="auto"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Rotating LED group */}
            <div className="border border-dashed border-border rounded-xl p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">⚡ Rotacion LED (opsional)</p>
              <div>
                <Label className="text-xs">Grupi i rotacionit</Label>
                <Input
                  value={form.rotation_group}
                  onChange={e => setForm(p => ({ ...p, rotation_group: e.target.value }))}
                  placeholder="p.sh. led-top, led-kryesore"
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Baneret me të njëjtin grup do të ndryshohen automatikisht (flip)</p>
              </div>
              {form.rotation_group && (
                <div>
                  <Label className="text-xs">Sekonda para ndërrimit</Label>
                  <Input
                    type="number"
                    min={2}
                    max={60}
                    value={form.rotation_seconds}
                    onChange={e => setForm(p => ({ ...p, rotation_seconds: Number(e.target.value) || 5 }))}
                    className="mt-1 w-24"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} />
              <Label>Aktiv</Label>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Përditëso' : 'Krijo'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {posEditor && (
        <AdPositionEditor
          ads={ads.filter(a => a.active)}
          onClose={() => setPosEditor(false)}
          onSaved={() => { setPosEditor(false); load(); }}
        />
      )}
    </div>
  );
}