import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, DollarSign, History, Check, X, RefreshCw, Eye, EyeOff, MessageSquare, Copy, Archive } from 'lucide-react';
import { toast } from 'sonner';
import AgentMatchHistory from '@/components/admin/AgentMatchHistory';
import AgentDirectMessageDialog from '@/components/admin/AgentDirectMessageDialog';

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coverageConfirmations, setCoverageConfirmations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', price_per_match: 0 });
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [historyAgent, setHistoryAgent] = useState(null);
  const [msgAgent, setMsgAgent] = useState(null);
  const [agentUnreadMap, setAgentUnreadMap] = useState({});
  const [editingCount, setEditingCount] = useState(null);
  const [editCountVal, setEditCountVal] = useState('');
  const [pwDialog, setPwDialog] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = async () => {
    const [allAgents, allClubs, unreadMsgs, confirmations] = await Promise.all([
      base44.entities.Agent.list('-created_date', 100),
      base44.entities.Club.list('name', 200),
      base44.entities.AgentDirectMessage.filter({ sender: 'agent', read_by_admin: false }),
      base44.entities.MatchCoverageConfirmation.filter({ read_by_admin: false }, '-created_date', 20),
    ]);
    setAgents(allAgents);
    setClubs(allClubs);
    setCoverageConfirmations(confirmations);
    const unreadMap = {};
    for (const m of unreadMsgs) {
      unreadMap[m.agent_id] = (unreadMap[m.agent_id] || 0) + 1;
    }
    setAgentUnreadMap(unreadMap);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.AgentDirectMessage.subscribe(() => load());
    return unsub;
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) { toast.error('Emri dhe mbiemri nevojiten'); return; }
    const data = { ...form, price_per_match: Number(form.price_per_match) || 0, teams_covered: selectedClubs };
    if (editing) {
      await base44.entities.Agent.update(editing.id, data);
      toast.success('U përditësua');
    } else {
      const username = form.first_name.toLowerCase().replace(/\s+/g, '');
      const password_plain = generatePassword();
      await base44.entities.Agent.create({ ...data, username, password_plain, total_matches_covered: 0, total_earnings: 0 });
      toast.success(`U krijua! Username: ${username} | Password: ${password_plain}`);
    }
    setDialogOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    await base44.entities.Agent.delete(id);
    load();
  };

  const openEdit = (agent) => {
    setEditing(agent);
    setForm({ first_name: agent.first_name, last_name: agent.last_name, phone: agent.phone || '', price_per_match: agent.price_per_match || 0 });
    setSelectedClubs(agent.teams_covered || []);
    setDialogOpen(true);
  };

  const toggleClub = (clubId) => {
    setSelectedClubs(prev => prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]);
  };

  const handleSaveCount = async (agent) => {
    const count = Math.max(0, Number(editCountVal) || 0);
    const newEarnings = count * (agent.price_per_match || 0);
    await base44.entities.Agent.update(agent.id, { total_matches_covered: count, total_earnings: newEarnings });
    setEditingCount(null);
    toast.success('Numri u përditësua');
    load();
  };

  const copyCredentials = async (agent) => {
    const text = `Username: ${agent.username}\nPassword: ${agent.password_plain}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(agent.id);
      toast.success('Kredencialet u kopjuan!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('E pamundur kopjimi');
    }
  };

  const handleArchivePayment = async (agent) => {
    if ((agent.total_earnings || 0) === 0 && (agent.total_matches_covered || 0) === 0) {
      toast.info('Nuk ka pagesë për të arkivuar'); return;
    }
    if (!confirm(`Arkivo pagesën për ${agent.first_name}? ${agent.total_matches_covered} ndeshje • ${agent.total_earnings}€. Totalet do të resetohen në zero.`)) return;
    const payment = {
      date: new Date().toISOString().split('T')[0],
      amount: agent.total_earnings || 0,
      matches: agent.total_matches_covered || 0,
    };
    const archived = [...(agent.archived_payments || []), payment];
    await base44.entities.Agent.update(agent.id, {
      total_earnings: 0,
      total_matches_covered: 0,
      archived_payments: archived,
    });
    toast.success('Pagesa u arkivua! Totalet u resetuan.');
    load();
  };

  const openPasswordDialog = (agent) => {
    setPwDialog(agent);
    setNewPassword('');
    setShowPw(false);
  };

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 4) { toast.error('Passwordi duhet të ketë të paktën 4 karaktere'); return; }
    await base44.entities.Agent.update(pwDialog.id, { password_plain: newPassword });
    toast.success('Passwordi u ndryshua');
    setPwDialog(null);
    load();
  };

  const handleGeneratePassword = () => {
    setNewPassword(generatePassword());
    setShowPw(true);
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Coverage confirmation notifications */}
      {coverageConfirmations.length > 0 && (
        <div className="mb-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">🔔 Konfirmime të Mbulimit</p>
          {coverageConfirmations.map(conf => (
            <div key={conf.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${conf.confirmed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div>
                <p className="text-sm font-bold">{conf.agent_name}</p>
                <p className="text-xs text-muted-foreground">{conf.match_label} · {conf.match_date}{conf.match_time ? ` ${conf.match_time}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2 py-1 rounded-full ${conf.confirmed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {conf.confirmed ? '✅ PO' : '❌ JO'}
                </span>
                <button
                  onClick={async () => {
                    await base44.entities.MatchCoverageConfirmation.update(conf.id, { read_by_admin: true });
                    load();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Shëno si lexuar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Agjentët ({agents.length})</h2>
        <Button onClick={() => { setEditing(null); setForm({ first_name: '', last_name: '', phone: '', price_per_match: 0 }); setSelectedClubs([]); setDialogOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Shto Agjent
        </Button>
      </div>

      <div className="space-y-4">
        {agents.map(agent => {
          const unpaidMatches = agent.total_matches_covered || 0;
          const unpaidEarnings = agent.total_earnings || 0;
          const archivedTotal = (agent.archived_payments || []).reduce((s, p) => s + (p.amount || 0), 0);
          const archivedMatches = (agent.archived_payments || []).reduce((s, p) => s + (p.matches || 0), 0);
          return (
            <div key={agent.id} className="bg-card rounded-2xl border-2 border-border shadow-sm overflow-hidden">
              {/* Header strip */}
              <div className="bg-gradient-to-r from-primary/10 to-transparent border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black text-sm shrink-0">
                    {agent.first_name?.[0]}{agent.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-base truncate">{agent.first_name} {agent.last_name}</p>
                    {agent.phone && <p className="text-xs text-muted-foreground truncate">📞 {agent.phone}</p>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" title="Historiku i ndeshjeve" onClick={() => setHistoryAgent(agent)} className="h-8 w-8">
                    <History className="w-4 h-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Dërgo mesazh" onClick={() => setMsgAgent(agent)} className="h-8 w-8 relative">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    {agentUnreadMap[agent.id] > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {agentUnreadMap[agent.id]}
                      </span>
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(agent)} className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(agent.id)} className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>

              {/* Credentials with one-click copy */}
              <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                    <span className="text-xs text-muted-foreground shrink-0">Kredencialet:</span>
                    {agent.username && (
                      <span className="font-mono text-xs font-bold bg-background border border-border rounded-lg px-2 py-1">
                        👤 {agent.username} &nbsp;|&nbsp; 🔑 {agent.password_plain}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {agent.username && (
                      <Button
                        size="sm"
                        variant={copiedId === agent.id ? 'default' : 'outline'}
                        onClick={() => copyCredentials(agent)}
                        className="text-xs h-7 gap-1"
                        title="Kopjo username + password me një klik"
                      >
                        {copiedId === agent.id ? <><Check className="w-3 h-3" /> U kopjua</> : <><Copy className="w-3 h-3" /> Kopjo</>}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openPasswordDialog(agent)} className="text-xs h-7 shrink-0 gap-1">
                      <RefreshCw className="w-3 h-3" /> PW
                    </Button>
                  </div>
                </div>
                {agent.average_rating > 0 && (
                  <p className="text-xs text-yellow-600 font-semibold mt-1.5">⭐ {agent.average_rating}/5 vlerësim mesatar</p>
                )}
              </div>

              {/* Stats — current unpaid cycle highlighted */}
              <div className="px-4 py-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {/* Unpaid matches (current cycle) */}
                  <div className="bg-warning/10 rounded-xl p-3 border border-warning/30">
                    {editingCount === agent.id ? (
                      <div className="flex flex-col items-center gap-1">
                        <Input type="number" value={editCountVal} onChange={e => setEditCountVal(e.target.value)} className="h-6 text-center text-sm font-black p-0 w-16" autoFocus />
                        <div className="flex gap-1">
                          <button onClick={() => handleSaveCount(agent)} className="text-green-500 hover:text-green-600"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingCount(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingCount(agent.id); setEditCountVal(String(unpaidMatches)); }} className="w-full group" title="Kliko për të edituar">
                        <p className="text-xl font-black text-warning group-hover:opacity-70 transition-opacity">{unpaidMatches}</p>
                        <p className="text-[9px] text-muted-foreground">Ndeshje (papaguar) ✏️</p>
                      </button>
                    )}
                  </div>
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
                    <p className="text-xl font-black text-primary">{agent.price_per_match || 0}€</p>
                    <p className="text-[9px] text-muted-foreground">/ Ndeshje</p>
                  </div>
                  <div className="bg-success/10 rounded-xl p-3 border border-success/30">
                    <p className="text-xl font-black text-success">{unpaidEarnings}€</p>
                    <p className="text-[9px] text-muted-foreground">Për t'u paguar</p>
                  </div>
                </div>

                {/* Archive payment action */}
                {(unpaidMatches > 0 || unpaidEarnings > 0) && (
                  <button
                    onClick={() => handleArchivePayment(agent)}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-foreground text-background hover:opacity-90 rounded-xl py-2.5 text-xs font-bold transition-opacity"
                  >
                    <Archive className="w-3.5 h-3.5" /> Arkivo Pagesën ({unpaidEarnings}€) & Reset
                  </button>
                )}

                {/* Archived history summary */}
                {(agent.archived_payments?.length > 0) && (
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1.5">
                    <span>📦 Arkivuar: {archivedMatches} ndeshje</span>
                    <span className="font-bold text-foreground/70">{archivedTotal}€ gjithsej</span>
                  </div>
                )}

                {/* Teams covered — logos + names */}
                {(agent.teams_covered?.length > 0) && (
                  <div className="mt-3">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Ekipe të mbuluara ({agent.teams_covered.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.teams_covered.map(clubId => {
                        const club = clubs.find(c => c.id === clubId);
                        if (!club) return null;
                        return (
                          <span key={clubId} className="inline-flex items-center gap-1 bg-primary/5 border border-primary/15 text-foreground px-2 py-1 rounded-full">
                            {club.logo && <img src={club.logo} alt="" className="w-3.5 h-3.5 object-contain" />}
                            <span className="text-[10px] font-semibold">{club.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {agents.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka agjentë ende</p>}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edito' : 'Shto'} Agjent</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Emri</Label><Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} /></div>
              <div><Label>Mbiemri</Label><Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} /></div>
            </div>
            <div><Label>Telefoni</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+383..." /></div>
            <div>
              <Label>Çmimi / Ndeshje (€)</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <Input type="number" value={form.price_per_match} onChange={e => setForm(p => ({ ...p, price_per_match: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="block mb-2">Ekipet e Mbulimit</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {clubs.map(club => (
                  <label key={club.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <input type="checkbox" checked={selectedClubs.includes(club.id)} onChange={() => toggleClub(club.id)} className="rounded" />
                    <span className="text-sm">{club.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Përditëso' : 'Krijo'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={!!pwDialog} onOpenChange={() => setPwDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ndrysho Passwordin</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Agjenti: <strong>{pwDialog?.first_name} {pwDialog?.last_name}</strong></p>
          <div className="space-y-3">
            <div>
              <Label>Password i ri</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 4 karaktere" className="pr-9" />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button variant="outline" size="icon" onClick={handleGeneratePassword} title="Gjenero automatik">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              {newPassword && <p className="text-xs text-primary font-mono mt-1">→ {newPassword}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPwDialog(null)} className="flex-1">Anulo</Button>
              <Button onClick={handleSavePassword} className="flex-1">Ruaj Passwordin</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AgentMatchHistory agent={historyAgent} open={!!historyAgent} onClose={() => setHistoryAgent(null)} onUpdate={load} />
      <AgentDirectMessageDialog agent={msgAgent} open={!!msgAgent} onClose={() => { setMsgAgent(null); load(); }} />
    </div>
  );
}