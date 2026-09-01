import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useSeo } from '@/lib/seo';

export default function Kontakti() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(() => new URLSearchParams(window.location.search).get('agent') === '1');
  const [agentForm, setAgentForm] = useState({ name: '', age: '', city: '', phone: '', team_to_cover: '' });
  const [agentSent, setAgentSent] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [clubs, setClubs] = useState([]);

  useSeo({
    title: 'Kontakti | KosovoScores',
    description: 'Na kontakto në KosovoScores për pyetje, sugjerime apo bashkëpunim. Aplikimi për agjent mbulues ndeshjesh gjithashtu në këtë faqe.',
    canonicalPath: '/kontakti',
    appendSiteName: false,
  });

  useEffect(() => {
    if (showAgentForm && clubs.length === 0) {
      Promise.all([
        base44.entities.Club.list('name', 200),
        base44.entities.Competition.list('tier', 100),
      ]).then(([allClubs, allComps]) => {
        const excludedCompIds = new Set(
          allComps.filter(c => /SUPERLIGA U21/i.test(c.name || '')).map(c => c.id)
        );
        setClubs(allClubs.filter(c => !excludedCompIds.has(c.competition_id)));
      });
    }
  }, [showAgentForm]);

  const handleSubmit = async () => {
    if (!form.name || !form.message) { toast.error('Emri dhe mesazhi janë të detyrueshëm'); return; }
    setLoading(true);
    await base44.entities.Contact.create({ ...form, read: false, type: 'contact' });
    setSent(true);
    setLoading(false);
  };

  const handleAgentSubmit = async () => {
    if (!agentForm.name || !agentForm.phone) { toast.error('Emri dhe numri i telefonit janë të detyrueshëm'); return; }
    setAgentLoading(true);
    await base44.entities.Contact.create({
      name: agentForm.name,
      phone: agentForm.phone,
      message: `Aplikim Agjent - Mosha: ${agentForm.age}, Qyteti: ${agentForm.city}, Ekipi: ${agentForm.team_to_cover}`,
      read: false,
      type: 'agent_application',
      age: Number(agentForm.age) || 0,
      city: agentForm.city,
      team_to_cover: agentForm.team_to_cover,
    });
    setAgentSent(true);
    setAgentLoading(false);
  };

  if (sent) {
    return (
      <div className="py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 mx-auto mb-4 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-lg font-bold mb-2">Mesazhi u dërgua!</h2>
        <p className="text-sm text-muted-foreground mb-6">Do t'ju kontaktojmë sa më shpejt të jetë e mundur.</p>
        <Button variant="outline" onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', message: '' }); }}>
          Dërgo mesazh tjetër
        </Button>
      </div>
    );
  }

  if (agentSent) {
    return (
      <div className="py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 mx-auto mb-4 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-lg font-bold mb-2">Aplikimi u dërgua!</h2>
        <p className="text-sm text-muted-foreground mb-6">Do ju kontaktojmë për detaje shtesë.</p>
        <Button variant="outline" onClick={() => { setAgentSent(false); setShowAgentForm(false); setAgentForm({ name: '', age: '', city: '', phone: '', team_to_cover: '' }); }}>
          Kthehu
        </Button>
      </div>
    );
  }

  if (showAgentForm) {
    return (
      <div className="py-4">
        <button onClick={() => setShowAgentForm(false)} className="text-sm text-primary mb-4 hover:underline">← Kthehu</button>
        <div className="mb-6">
          <h1 className="text-lg font-bold">Bëhu Vullnetar</h1>
          <p className="text-sm text-muted-foreground mt-1">Bëhu vullnetar dhe ndihmo projektin tonë duke dërguar të dhëna direkt nga stadiumet.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Emri i Plotë *</label>
            <Input value={agentForm.name} onChange={e => setAgentForm(p => ({ ...p, name: e.target.value }))} placeholder="Emri dhe mbiemri" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Mosha</label>
            <Input type="number" value={agentForm.age} onChange={e => setAgentForm(p => ({ ...p, age: e.target.value }))} placeholder="p.sh. 25" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Qyteti</label>
            <Input value={agentForm.city} onChange={e => setAgentForm(p => ({ ...p, city: e.target.value }))} placeholder="p.sh. Prishtinë" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Numri i Telefonit *</label>
            <Input value={agentForm.phone} onChange={e => setAgentForm(p => ({ ...p, phone: e.target.value }))} placeholder="+383..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Ekipi që mund ta mbulosh</label>
            <Select value={agentForm.team_to_cover} onValueChange={v => setAgentForm(p => ({ ...p, team_to_cover: v }))}>
              <SelectTrigger><SelectValue placeholder="Zgjedh ekipin" /></SelectTrigger>
              <SelectContent>
                {clubs.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAgentSubmit} className="w-full py-5 font-bold bg-success hover:bg-success/90 text-white" disabled={agentLoading}>
            {agentLoading ? 'Duke dërguar...' : 'Dërgo Aplikimin'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 className="text-lg font-bold">Na Kontaktoni<span className="sr-only"> | KosovoScores</span></h1>
        <p className="text-sm text-muted-foreground mt-1">Keni ndonjë pyetje apo sugjerim? Na shkruani!</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Emri & Mbiemri *</label>
          <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Shkruaj emrin tënd" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Email</label>
          <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Numri i telefonit</label>
          <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+383..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Mesazhi *</label>
          <textarea
            value={form.message}
            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Shkruaj mesazhin tënd këtu..."
          />
        </div>
        <Button onClick={handleSubmit} className="w-full py-5 font-bold" disabled={loading}>
          {loading ? 'Duke dërguar...' : 'Dërgo Mesazhin'}
        </Button>
        <Button
          onClick={() => setShowAgentForm(true)}
          className="w-full py-5 font-bold bg-success hover:bg-success/90 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Bëhu Vullnetar
        </Button>
      </div>
    </div>
  );
}