import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, X, Eye, EyeOff, Shield, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const ALL_SECTIONS = [
  { key: 'competitions', label: 'Kompeticionet' },
  { key: 'clubs', label: 'Klubet' },
  { key: 'matches', label: 'Ndeshjet' },
  { key: 'referees', label: 'Gjyqtarët' },
  { key: 'standings', label: 'Tabelat' },
  { key: 'news', label: 'Lajme' },
  { key: 'top-scorers', label: 'Golashënues' },
  { key: 'ads', label: 'Reklama' },
  { key: 'agents', label: 'Agjentët' },
  { key: 'matches-today', label: 'Ndeshjet Sot' },
  { key: 'agent-chat', label: 'Chat Agjentësh' },
  { key: 'match-applications', label: 'Aplikimet' },
  { key: 'transfer-players', label: 'Transfero' },
  { key: 'donacion', label: 'Donacion' },
  { key: 'contacts', label: 'Kontaktet' },
  { key: 'analytics', label: 'Statistikat' },
];

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const EMPTY = { name: '', code1: genCode(), code2: genCode(), allowed_sections: [], active: true };

export default function AdminSubAdmins() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, code1: genCode(), code2: genCode() });
  const [saving, setSaving] = useState(false);
  const [showCodes, setShowCodes] = useState({});

  const load = async () => {
    const data = await base44.entities.SubAdmin.list('-created_date', 50);
    setList(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleSection = (key) => {
    setForm(prev => ({
      ...prev,
      allowed_sections: prev.allowed_sections.includes(key)
        ? prev.allowed_sections.filter(s => s !== key)
        : [...prev.allowed_sections, key]
    }));
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Emri është i detyrueshëm'); return; }
    if (form.code1.length < 4 || form.code2.length < 4) { toast.error('Kodet duhet të kenë min 4 shifra'); return; }
    if (form.code1 === form.code2) { toast.error('Kodet duhet të jenë të ndryshme'); return; }
    if (form.allowed_sections.length === 0) { toast.error('Zgjidhni të paktën një seksion'); return; }
    setSaving(true);
    try {
      await base44.entities.SubAdmin.create(JSON.parse(JSON.stringify({
        name: form.name,
        code1: form.code1,
        code2: form.code2,
        allowed_sections: form.allowed_sections,
        active: true,
      })));
      toast.success('Nën-admini u krijua');
      setShowPanel(false);
      setForm({ name: '', code1: genCode(), code2: genCode(), allowed_sections: [], active: true });
      load();
    } catch (err) {
      toast.error('Gabim: ' + (err?.message || 'E panjohur'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Fshi nën-adminin?')) return;
    await base44.entities.SubAdmin.delete(id);
    toast.success('U fshi');
    load();
  };

  const toggleActive = async (item) => {
    await base44.entities.SubAdmin.update(item.id, { active: !item.active });
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Nën-Adminët</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Krijoni admin me qasje të kufizuara</p>
        </div>
        <Button onClick={() => { setForm({ name: '', code1: genCode(), code2: genCode(), allowed_sections: [], active: true }); setShowPanel(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Shto
        </Button>
      </div>

      <div className="space-y-3">
        {list.map(item => (
          <div key={item.id} className={`bg-card rounded-xl border p-4 ${item.active ? 'border-border' : 'border-border opacity-50'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${item.active ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {item.active ? 'Aktiv' : 'Joaktiv'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.allowed_sections?.length || 0} seksione</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleActive(item)}>
                  {item.active ? 'Çaktivizo' : 'Aktivizo'}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Codes */}
            <div className="mt-3 flex gap-3">
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                <span className="text-[10px] text-muted-foreground">Kodi 1:</span>
                <span className="font-mono text-sm">{showCodes[item.id] ? item.code1 : '••••••'}</span>
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                <span className="text-[10px] text-muted-foreground">Kodi 2:</span>
                <span className="font-mono text-sm">{showCodes[item.id] ? item.code2 : '••••••'}</span>
              </div>
              <button
                onClick={() => setShowCodes(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                {showCodes[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Sections */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.allowed_sections?.map(s => {
                const sec = ALL_SECTIONS.find(x => x.key === s);
                return <span key={s} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{sec?.label || s}</span>;
              })}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka nën-admin ende</p>}
      </div>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPanel(false)} />
          <div className="relative z-10 bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">Shto Nën-Admin</h3>
              <button onClick={() => setShowPanel(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Emri i nën-adminit</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="p.sh. Miri - Ndeshjet" className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center justify-between">
                    Kodi 1
                    <button onClick={() => setForm(p => ({ ...p, code1: genCode() }))} className="text-primary hover:opacity-70">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </Label>
                  <Input value={form.code1} onChange={e => setForm(p => ({ ...p, code1: e.target.value.replace(/\D/g, '').slice(0, 8) }))} className="mt-1 font-mono tracking-wider" />
                </div>
                <div>
                  <Label className="flex items-center justify-between">
                    Kodi 2
                    <button onClick={() => setForm(p => ({ ...p, code2: genCode() }))} className="text-primary hover:opacity-70">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </Label>
                  <Input value={form.code2} onChange={e => setForm(p => ({ ...p, code2: e.target.value.replace(/\D/g, '').slice(0, 8) }))} className="mt-1 font-mono tracking-wider" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Kodet gjenerohen automatikisht. Mund t'i ndërroni. Ndajini me nën-adminin.</p>

              <div>
                <Label className="mb-2 block">Seksionet me qasje</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SECTIONS.map(sec => (
                    <label key={sec.key} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${form.allowed_sections.includes(sec.key) ? 'bg-primary/10 border-primary/30' : 'border-border hover:bg-muted'}`}>
                      <input
                        type="checkbox"
                        checked={form.allowed_sections.includes(sec.key)}
                        onChange={() => toggleSection(sec.key)}
                        className="hidden"
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${form.allowed_sections.includes(sec.key) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {form.allowed_sections.includes(sec.key) && <div className="w-2 h-2 bg-white rounded-sm" />}
                      </div>
                      <span className="text-xs">{sec.label}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setForm(p => ({ ...p, allowed_sections: p.allowed_sections.length === ALL_SECTIONS.length ? [] : ALL_SECTIONS.map(s => s.key) }))}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  {form.allowed_sections.length === ALL_SECTIONS.length ? 'Çzgjidh të gjitha' : 'Zgjidh të gjitha'}
                </button>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Duke ruajtur...' : 'Krijo Nën-Admin'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}