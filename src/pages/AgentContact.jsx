import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { cn } from '@/lib/utils';

export default function AgentContact({ matchCode, agentUsername, agentFullName, agentId, onBack }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const load = async () => {
    setLoading(true);
    let data = [];
    if (agentId) {
      data = await base44.entities.AgentDirectMessage.filter({ agent_id: agentId }, 'created_date', 100);
      // Mark admin messages as read
      for (const m of data.filter(m => m.sender === 'admin' && !m.read_by_agent)) {
        await base44.entities.AgentDirectMessage.update(m.id, { read_by_agent: true });
      }
    }
    setMessages(data);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => { load(); }, [agentId]);

  useEffect(() => {
    const unsub = base44.entities.AgentDirectMessage.subscribe(() => load());
    return unsub;
  }, [agentId]);

  const handleSend = async () => {
    if (!message.trim() || !agentId) { toast.error('Shkruaj mesazhin'); return; }
    setSending(true);
    try {
      await base44.entities.AgentDirectMessage.create({
        agent_id: agentId,
        agent_name: agentFullName || agentUsername || 'Agjent',
        sender: 'agent',
        message: message.trim(),
        read_by_agent: true,
        read_by_admin: false,
      });
      toast.success('Mesazhi u dërgua!');
      setMessage('');
      await load();
    } catch (e) {
      toast.error('Gabim gjatë dërgimit');
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="hover:bg-white/10 rounded p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="font-bold text-sm">Kontakt me Adminin</p>
          <p className="text-[9px] text-primary-foreground/70">Mesazhe direkte</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && <div className="flex justify-center py-8"><div className="w-5 h-5 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">Asnjë mesazh ende. Shkruaj mesazhin tënd!</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex', msg.sender === 'agent' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[78%] rounded-2xl px-3 py-2', msg.sender === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
              {msg.sender === 'admin' && <p className="text-[9px] font-bold mb-0.5 opacity-70">Admin</p>}
              <p className="text-sm">{msg.message}</p>
              <p className="text-[9px] opacity-60 mt-0.5">{moment(msg.created_date).format('DD/MM HH:mm')}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2 bg-background shrink-0">
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Shkruaj mesazhin..."
          className="flex-1 rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button onClick={handleSend} size="icon" disabled={sending || !message.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}