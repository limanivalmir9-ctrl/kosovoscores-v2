import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';

const ZONES = [
  { key: 'sidebar_left',  label: 'Anë Majtas',      desc: 'Desktop (format fleksibil)' },
  { key: 'sidebar_right', label: 'Anë Djathtas',    desc: 'Desktop (format fleksibil)' },
  { key: 'top',           label: 'Sipër ndeshjeve',  desc: 'Mobile & Desktop' },
  { key: 'bottom',        label: 'Poshtë ndeshjeve', desc: 'Mobile & Desktop' },
  { key: 'sponsor',       label: 'Sponzorë (Live)',  desc: 'Mobile' },
];

function ZoneSlot({ zone, ads, onAdd, onDelete, onToggle }) {
  const zoneAds = ads.filter(a => a.placement === zone.key);
  return (
    <div className="border border-border rounded-xl bg-card p-3 flex flex-col gap-2 min-h-[80px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold">{zone.label}</p>
          <p className="text-[10px] text-muted-foreground">{zone.desc}</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onAdd(zone.key)}>
          <Plus className="w-3 h-3 mr-1" /> Shto
        </Button>
      </div>
      {zoneAds.length === 0 && (
        <div className="border border-dashed border-border/50 rounded-lg h-12 flex items-center justify-center">
          <p className="text-[10px] text-muted-foreground/40">Bosh</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {zoneAds.map(ad => (
          <div key={ad.id} className="flex items-center gap-2 bg-muted/40 rounded-lg p-1.5">
            <img src={ad.image} alt="" className="h-10 w-16 object-contain rounded shrink-0 bg-white" />
            <div className="flex-1 min-w-0">
              {ad.rotation_group && <p className="text-[10px] text-primary font-semibold truncate">⚡ {ad.rotation_group}</p>}
              {ad.link && <p className="text-[10px] text-muted-foreground truncate">{ad.link}</p>}
              <p className="text-[10px] text-muted-foreground">{ad.width ? `${ad.width}×${ad.height || 'auto'}px` : 'auto'}</p>
            </div>
            <Switch checked={ad.active} onCheckedChange={v => onToggle(ad.id, v)} />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(ad.id)}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAdLayoutMap({ ads, onRefresh }) {
  const [addDialog, setAddDialog] = useState(null); // zone key
  const [form, setForm] = useState({ image: '', link: '', active: true, rotation_group: '', rotation_seconds: 5, width: '', height: '' });
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, image: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.image) { toast.error('Ngarko një foto'); return; }
    await base44.entities.Ad.create({
      ...form,
      placement: addDialog,
      width: form.width ? Number(form.width) : undefined,
      height: form.height ? Number(form.height) : undefined,
    });
    toast.success('Reklama u shtua');
    setAddDialog(null);
    setForm({ image: '', link: '', active: true, rotation_group: '', rotation_seconds: 5, width: '', height: '' });
    onRefresh();
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    await base44.entities.Ad.delete(id);
    toast.success('U fshi');
    onRefresh();
  };

  const handleToggle = async (id, active) => {
    await base44.entities.Ad.update(id, { active });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Desktop Visual Map */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700">
        <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wide">🖥️ Harta e Desktop / Tablet</p>

        {/* Browser chrome */}
        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-600">
          {/* Header zone */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 flex items-center justify-center px-4 py-2">
            <div className="bg-slate-500/50 rounded h-10 w-32 flex items-center justify-center">
              <span className="text-slate-300 text-[10px] font-bold">LOGO</span>
            </div>
          </div>

          {/* Top ad zone */}
          <div className="bg-slate-700/50 px-4 py-1">
            <ZoneMiniPreview
              ads={ads}
              zoneKey="top"
              label="Sipër ndeshjeve"
              className="w-full h-10"
              onAdd={() => setAddDialog('top')}
              horizontal
            />
          </div>

          {/* 3-column body */}
          <div className="flex gap-0 min-h-[120px]">
            {/* Left sidebar */}
            <div className="w-28 bg-slate-800/80 border-r border-slate-600 p-2">
              <ZoneMiniPreview
                ads={ads}
                zoneKey="sidebar_left"
                label="Sidebar Majtas"
                className="w-full h-full min-h-[100px]"
                onAdd={() => setAddDialog('sidebar_left')}
              />
            </div>
            {/* Content */}
            <div className="flex-1 bg-slate-700/30 p-3 flex flex-col gap-2">
              {[1,2,3].map(i => (
                <div key={i} className="bg-slate-600/40 rounded h-6 w-full" />
              ))}
            </div>
            {/* Right sidebar */}
            <div className="w-28 bg-slate-800/80 border-l border-slate-600 p-2">
              <ZoneMiniPreview
                ads={ads}
                zoneKey="sidebar_right"
                label="Sidebar Djathtas"
                className="w-full h-full min-h-[100px]"
                onAdd={() => setAddDialog('sidebar_right')}
              />
            </div>
          </div>

          {/* Bottom ad zone */}
          <div className="bg-slate-700/50 px-4 py-1">
            <ZoneMiniPreview
              ads={ads}
              zoneKey="bottom"
              label="Poshtë ndeshjeve"
              className="w-full h-10"
              onAdd={() => setAddDialog('bottom')}
              horizontal
            />
          </div>
        </div>
      </div>

      {/* Zone cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ZONES.map(zone => (
          <ZoneSlot
            key={zone.key}
            zone={zone}
            ads={ads}
            onAdd={setAddDialog}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Add ad dialog */}
      <Dialog open={!!addDialog} onOpenChange={v => !v && setAddDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Shto Reklamë — {ZONES.find(z => z.key === addDialog)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Foto baneri</Label>
              <Input type="file" accept="image/*" onChange={handleUpload} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Duke ngarkuar...</p>}
              {form.image && <img src={form.image} alt="" className="w-full h-16 rounded-lg mt-2 object-contain bg-muted" />}
            </div>
            <div>
              <Label>Link (opsional)</Label>
              <Input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} placeholder="https://" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs">Gjerësia (px)</Label>
                <Input type="number" min={20} value={form.width} onChange={e => setForm(p => ({ ...p, width: e.target.value }))} placeholder="auto" className="mt-1" />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Lartësia (px)</Label>
                <Input type="number" min={20} value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))} placeholder="auto" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Grupi rotacionit (opsional)</Label>
              <Input value={form.rotation_group} onChange={e => setForm(p => ({ ...p, rotation_group: e.target.value }))} placeholder="p.sh. led-top" className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} />
              <Label>Aktiv</Label>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={uploading}>Shto Reklamën</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ZoneMiniPreview({ ads, zoneKey, label, className = '', onAdd, horizontal = false }) {
  const zoneAds = ads.filter(a => a.placement === zoneKey && a.active);
  const firstAd = zoneAds[0];

  return (
    <div
      className={`relative rounded border-2 border-dashed border-slate-500/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400/70 transition-colors group ${className}`}
      onClick={onAdd}
      title={`Shto reklamë: ${label}`}
    >
      {firstAd ? (
        <>
          <img src={firstAd.image} alt="" className="max-w-full max-h-full object-contain" />
          {zoneAds.length > 1 && (
            <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
              {zoneAds.length}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-0.5 opacity-50 group-hover:opacity-80 transition-opacity">
          <Plus className="w-3 h-3 text-slate-300" />
          <span className="text-[8px] text-slate-300 text-center leading-tight px-1">{label}</span>
        </div>
      )}
    </div>
  );
}