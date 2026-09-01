import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, X, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { countryInfo } from '@/lib/countries';
import Flag from '@/components/Flag';
import CountrySelect from '@/components/CountrySelect';
import moment from 'moment';

const ROLES = ['Trajner Kryesor', 'Asistent', 'Trajner Portierësh', 'Trajner Fizik', 'Analist'];

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const emptyForm = { name: '', photo: '', role: 'Trajner Kryesor', club_id: '', club_name: '', nationality: '', date_of_birth: '' };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const [data, clubList] = await Promise.all([
      base44.entities.Coach.list('name', 500).catch(() => []),
      base44.entities.Club.list('name', 500).catch(() => []),
    ]);
    setCoaches(data || []);
    setClubs(clubList || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  const onClubChange = (clubId) => {
    const c = clubs.find(x => x.id === clubId);
    setForm(p => ({ ...p, club_id: clubId, club_name: c?.name || '' }));
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name || '', photo: c.photo || '', role: c.role || 'Trajner Kryesor', club_id: c.club_id || '', club_name: c.club_name || '', nationality: c.nationality || '', date_of_birth: c.date_of_birth || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Emri nevojitet'); return; }
    try {
      if (editing) {
        await base44.entities.Coach.update(editing.id, form);
        toast.success('U përditësua');
      } else {
        await base44.entities.Coach.create(form);
        toast.success('U krijua');
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error('Gabim: ' + (err?.message || 'Error'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    await base44.entities.Coach.delete(id).catch(() => {});
    toast.success('U fshi');
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2"><UserCog className="w-5 h-5" /> Trajnerët</h2>
        <Button onClick={openAdd} size="sm"><Plus className="w-4 h-4 mr-1" /> Shto Trajner</Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Përdorim i brendshëm — vetëm adminët shohin këtë listë.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {coaches.map(c => {
          const ci = countryInfo(c.nationality);
          const age = c.date_of_birth ? moment().diff(moment(c.date_of_birth), 'years') : null;
          return (
            <div key={c.id} className="flex items-start gap-3 bg-card rounded-xl p-3 border border-border">
              {c.photo ? (
                <img src={c.photo} alt="" className="w-14 h-14 rounded-xl object-contain border border-border bg-muted shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted border border-border shrink-0 flex items-center justify-center text-lg font-black text-muted-foreground">{(c.name || '?')[0]}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role}</p>
                {c.club_name && <p className="text-xs font-medium truncate mt-0.5">{c.club_name}</p>}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Flag value={c.nationality} size={16} />
                  {ci?.name && <span className="text-[10px] text-muted-foreground truncate">{ci.name}</span>}
                  {age != null && <span className="text-[10px] text-muted-foreground">· {age} vjeç</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
        {coaches.length === 0 && <p className="text-center text-sm text-muted-foreground py-8 col-span-2">Nuk ka trajnerë ende</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edito' : 'Shto'} Trajner</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {form.photo ? (
                <div className="relative">
                  <img src={form.photo} alt="" className="w-16 h-16 rounded-xl object-contain border border-border bg-card" />
                  <button onClick={() => setForm(p => ({ ...p, photo: '' }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center"><Upload className="w-5 h-5 text-muted-foreground" /></div>
              )}
              <div>
                <input id="coach-photo" type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
                <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} onClick={() => document.getElementById('coach-photo').click()}>{uploadingPhoto ? 'Duke ngarkuar...' : 'Ngarko foto'}</Button>
              </div>
            </div>
            <div><Label>Emri *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div>
              <Label>Roli</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Klubi aktual</Label>
              <Select value={form.club_id || '__none'} onValueChange={v => v === '__none' ? setForm(p => ({ ...p, club_id: '', club_name: '' })) : onClubChange(v)}>
                <SelectTrigger><SelectValue placeholder="Pa klub" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Pa klub</SelectItem>
                  {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Kombësia</Label><CountrySelect value={form.nationality} onChange={v => setForm(p => ({ ...p, nationality: v }))} /></div>
            <div><Label>Datëlindja</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} /></div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Përditëso' : 'Krijo'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}