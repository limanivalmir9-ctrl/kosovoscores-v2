import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, X, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { countryInfo } from '@/lib/countries';
import Flag from '@/components/Flag';
import CountrySelect from '@/components/CountrySelect';
import moment from 'moment';

const ROLES = ['Kryesor', 'Assistant 1', 'Assistant 2', 'VAR', 'AVAR', 'Gjyqtari i Katërt'];

export default function AdminReferees() {
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const emptyForm = { name: '', photo: '', role: 'Kryesor', nationality: '', date_of_birth: '' };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Referee.list('name', 500).catch(() => []);
    setReferees(data || []);
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

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name || '', photo: r.photo || '', role: r.role || 'Kryesor', nationality: r.nationality || '', date_of_birth: r.date_of_birth || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Emri nevojitet'); return; }
    try {
      if (editing) {
        await base44.entities.Referee.update(editing.id, form);
        toast.success('U përditësua');
      } else {
        await base44.entities.Referee.create(form);
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
    await base44.entities.Referee.delete(id).catch(() => {});
    toast.success('U fshi');
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><UserCheck className="w-5 h-5" /> Gjyqtarët</h2>
        <Button onClick={openAdd} size="sm"><Plus className="w-4 h-4 mr-1" /> Shto Gjyqtar</Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Përdorim i brendshëm — vetëm adminët shohin këtë listë.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {referees.map(ref => {
          const ci = countryInfo(ref.nationality);
          const age = ref.date_of_birth ? moment().diff(moment(ref.date_of_birth), 'years') : null;
          return (
            <div key={ref.id} className="flex items-start gap-3 bg-card rounded-xl p-3 border border-border">
              {ref.photo ? (
                <img src={ref.photo} alt="" className="w-14 h-14 rounded-xl object-contain border border-border bg-muted shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted border border-border shrink-0 flex items-center justify-center text-lg font-black text-muted-foreground">{(ref.name || '?')[0]}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{ref.name}</p>
                <p className="text-xs text-muted-foreground">{ref.role}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Flag value={ref.nationality} size={16} />
                  {ci?.name && <span className="text-[10px] text-muted-foreground truncate">{ci.name}</span>}
                  {age != null && <span className="text-[10px] text-muted-foreground">· {age} vjeç</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(ref)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(ref.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
        {referees.length === 0 && <p className="text-center text-sm text-muted-foreground py-8 col-span-2">Nuk ka gjyqtarë ende</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edito' : 'Shto'} Gjyqtar</DialogTitle></DialogHeader>
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
                <input id="ref-photo" type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files?.[0])} />
                <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} onClick={() => document.getElementById('ref-photo').click()}>{uploadingPhoto ? 'Duke ngarkuar...' : 'Ngarko foto'}</Button>
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
            <div><Label>Kombësia</Label><CountrySelect value={form.nationality} onChange={v => setForm(p => ({ ...p, nationality: v }))} /></div>
            <div><Label>Datëlindja</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} /></div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Përditëso' : 'Krijo'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}