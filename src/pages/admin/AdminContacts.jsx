import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, MailOpen, Trash2, Send } from 'lucide-react';
import moment from 'moment';

export default function AdminContacts() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('contact');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const load = async () => {
    const data = await base44.entities.Contact.list('-created_date', 100);
    setMessages(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (msg) => {
    if (!msg.read) {
      await base44.entities.Contact.update(msg.id, { read: true });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
    }
    setSelected(msg);
  };

  const handleDelete = async (id) => {
    await base44.entities.Contact.delete(id);
    setSelected(null);
    load();
  };

  const handleReply = async (msg) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    await base44.entities.Contact.update(msg.id, { reply: replyText.trim() });
    setReplyText('');
    setSendingReply(false);
    load();
  };

  const filtered = messages.filter(m => (m.type || 'contact') === tab);
  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold">Mesazhet e Kontaktit</h2>
        {unreadCount > 0 && (
          <span className="bg-live text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} të reja</span>
        )}
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('contact')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'contact' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
          Kontaktet ({messages.filter(m => (m.type||'contact') === 'contact').length})
        </button>
        <button onClick={() => setTab('agent_application')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'agent_application' ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>
          Aplikime Agjent ({messages.filter(m => m.type === 'agent_application').length})
        </button>
        <button onClick={() => setTab('agent_message')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'agent_message' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
          Mesazhe Agjentësh ({messages.filter(m => m.type === 'agent_message').length})
        </button>
      </div>

      {selected ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <button onClick={() => setSelected(null)} className="text-xs text-primary mb-4 hover:underline">← Kthehu</button>
          <div className="space-y-2 mb-4">
            <h3 className="font-bold text-base">{selected.name}</h3>
            {selected.email && <p className="text-xs text-muted-foreground">📧 {selected.email}</p>}
            {selected.phone && <p className="text-xs text-muted-foreground">📞 {selected.phone}</p>}
            <p className="text-[10px] text-muted-foreground">{moment(selected.created_date).format('DD MMM YYYY, HH:mm')}</p>
          </div>
          {selected.subject && <p className="text-xs font-bold mb-2 text-muted-foreground">Subjekti: {selected.subject}</p>}
          {selected.match_code && <p className="text-xs text-muted-foreground mb-2">🔑 Kodi: <span className="font-mono font-bold">{selected.match_code}</span></p>}
          <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap mb-4">{selected.message}</div>
          {selected.reply && (
            <div className="bg-success/5 border border-success/20 rounded-lg p-3 mb-4">
              <p className="text-xs font-bold text-success mb-1">Përgjigja jote:</p>
              <p className="text-sm">{selected.reply}</p>
            </div>
          )}
          {selected.type === 'agent_message' && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-bold">Kthe Përgjigje:</p>
              <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Shkruaj përgjigjen..." />
              <Button size="sm" onClick={() => handleReply(selected)} disabled={sendingReply || !replyText.trim()}>
                <Send className="w-3 h-3 mr-1" /> Dërgo
              </Button>
            </div>
          )}
          <Button variant="destructive" size="sm" onClick={() => handleDelete(selected.id)}>
            <Trash2 className="w-4 h-4 mr-1" /> Fshi Mesazhin
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(msg => (
            <button
              key={msg.id}
              onClick={() => markRead(msg)}
              className="w-full text-left bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-all flex items-start gap-3"
            >
              {msg.read ? <MailOpen className="w-5 h-5 text-muted-foreground mt-0.5" /> : <Mail className="w-5 h-5 text-primary mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${!msg.read ? 'text-foreground' : 'text-muted-foreground'}`}>{msg.name}</p>
                  <div className="flex items-center gap-1">
                    {msg.type === 'agent_application' && <span className="text-[9px] bg-success/20 text-success font-bold px-1 rounded">AGJENT</span>}
                    <p className="text-[10px] text-muted-foreground">{moment(msg.created_date).format('DD MMM')}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{msg.message}</p>
              </div>
            </button>
          ))}
          {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka mesazhe ende</p>}
        </div>
      )}
    </div>
  );
}