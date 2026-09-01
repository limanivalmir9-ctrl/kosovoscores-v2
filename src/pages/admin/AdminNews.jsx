import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { getAdminSession } from '@/lib/adminAuth';
import { newsCreate, newsUpdate, newsDelete } from '@/lib/newsWrite';

export default function AdminNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', image: '' });
  const session = getAdminSession();
  const isSub = session?.type === 'subadmin';

  const load = async () => {
    const data = await base44.entities.News.list('-created_date', 100);
    setNews(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await uploadOptimizedImage(file, { maxDim: 1024 });
    setForm(prev => ({ ...prev, image: file_url }));
  };

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error('Titulli dhe përmbajtja nevojiten'); return; }
    try {
      if (editing) {
        if (isSub) await newsUpdate(session.code1, session.code2, editing.id, { ...form, published: true });
        else await base44.entities.News.update(editing.id, { ...form, published: true });
        toast.success('U përditësua');
      } else {
        if (isSub) await newsCreate(session.code1, session.code2, { ...form, published: true });
        else await base44.entities.News.create({ ...form, published: true });
        toast.success('U krijua');
      }
    } catch (err) { toast.error(err?.message || 'Gabim'); return; }
    setDialogOpen(false);
    setEditing(null);
    setForm({ title: '', content: '', image: '' });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    try {
      if (isSub) await newsDelete(session.code1, session.code2, id);
      else await base44.entities.News.delete(id);
      toast.success('U fshi');
    } catch (err) { toast.error(err?.message || 'Gabim'); return; }
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Lajme</h2>
        <Button onClick={() => { setEditing(null); setForm({ title: '', content: '', image: '' }); setDialogOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Shto
        </Button>
      </div>

      <div className="space-y-2">
        {news.map(item => (
          <div key={item.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
            {item.image && <img src={item.image} alt="" className="w-14 h-14 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{moment(item.created_date).format('DD MMM YYYY')}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => {
                setEditing(item);
                setForm({ title: item.title || '', content: item.content || '', image: item.image || '' });
                setDialogOpen(true);
              }}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {news.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka lajme ende</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edito' : 'Shto'} Lajm</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Titulli</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div>
              <Label>Foto</Label>
              <Input type="file" accept="image/*" onChange={handleUploadImage} />
              {form.image && <img src={form.image} alt="" className="w-full h-32 rounded-lg mt-2 object-cover" />}
            </div>
            <div>
              <Label>Përmbajtja</Label>
              <textarea
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Shkruaj përmbajtjen..."
              />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Përditëso' : 'Publiko'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}