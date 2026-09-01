import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import CountrySelect from '@/components/CountrySelect';

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
const POSITION_LABELS = { Goalkeeper: 'Portier', Defender: 'Mbrojtës', Midfielder: 'Mesfushor', Forward: 'Sulmues' };
const EMPTY = { name: '', number: '', position: 'Midfielder', nationality: '', date_of_birth: '', photo: '' };

const generateUniquePlayerId = async () => {
  for (let i = 0; i < 50; i++) {
    const id = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await base44.entities.Player.filter({ player_id: id }, null, 1).catch(() => []);
    if (!existing || existing.length === 0) return id;
  }
  throw new Error('Nuk u gjenerua ID unike');
};

export default function MagazinePlayerForm({ open, onOpenChange, player, onSaved }) {
  const editing = !!player;
  const [form, setForm] = useState(EMPTY);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(player ? {
        name: player.name || '',
        number: player.number ?? '',
        position: player.position || 'Midfielder',
        nationality: player.nationality || '',
        date_of_birth: player.date_of_birth || '',
        photo: player.photo || '',
      } : EMPTY);
    }
  }, [open, player]);

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await uploadOptimizedImage(file, { maxDim: 400 });
      setForm(p => ({ ...p, photo: file_url }));
    } catch (err) {
      toast.error('Gabim me ngarkimin e fotos');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Emri nevojitet'); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        number: form.number ? Number(form.number) : null,
        position: form.position,
        nationality: form.nationality,
        date_of_birth: form.date_of_birth,
        photo: form.photo,
        club_id: '',
        competition_id: '',
      };
      if (editing) {
        // ID e lojtarit është permanente — nuk ndryshohet kurrë.
        await base44.entities.Player.update(player.id, data);
        toast.success('Lojtari u përditësua');
      } else {
        data.player_id = await generateUniquePlayerId();
        await base44.entities.Player.create(data);
        toast.success('Lojtari u krijua në Magazinë');
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error('Gabim: ' + (err?.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Edito' : 'Shto'} Lojtar në Magazinë</DialogTitle></DialogHeader>
        <div className="space-y-4">

          {editing?.player_id && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 border border-border">
              <span className="text-[11px] text-muted-foreground">ID e lojtarit</span>
              <span className="font-mono font-bold text-sm text-foreground select-all">{editing.player_id}</span>
            </div>
          )}

          <div>
            <Label>Fotografia</Label>
            <div className="mt-1 flex items-center gap-3">
              {form.photo ? (
                <div className="relative">
                  <img src={form.photo} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
                  <button onClick={() => setForm(p => ({ ...p, photo: '' }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} onClick={() => fileRef.current?.click()}>
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

          <Button onClick={handleSave} className="w-full" disabled={uploadingPhoto || saving}>
            {saving ? 'Duke ruajtur...' : (editing ? 'Përditëso' : 'Krijo')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}