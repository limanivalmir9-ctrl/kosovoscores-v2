import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { cn } from '@/lib/utils';

export default function AgentDirectMessageDialog({ agent, open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = async () => {
    if (!agent) return;
    const msgs = await base44.entities.AgentDirectMessage.filter({ agent_id: agent.id }, 'created_date', 100);
    setMessages(msgs);
    // Mark agent messages as read
    for (const m of msgs.filter(m => m.sender === 'agent' && !m.read_by_admin)) {
      await base44.entities.AgentDirectMessage.update(m.id, { read_by_admin: true });
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    if (!open || !agent) return;
    load();
    const unsub = base44.entities.AgentDirectMessage.subscribe(() => load());
    return unsub;
  }, [open, agent?.id]);

  const handleSend = async () => {
    if (!text.trim() || !agent) return;
    setSending(true);
    await base44.entities.AgentDirectMessage.create({
      agent_id: agent.id,
      agent_name: `${agent.first_name} ${agent.last_name}`,
      sender: 'admin',
      message: text.trim(),
      read_by_agent: false,
      read_by_admin: true,
    });
    setText('');
    setSending(false);
    toast.success('Mesazhi u dërgua');
    load();
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md flex flex-col" style={{ height: '70vh' }}>
        <DialogHeader>
          <DialogTitle>Mesazh → {agent.first_name} {agent.last_name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
          {messages.length === 0 && (
            <p className="text-xs text-center text-muted-foreground pt-8">Asnjë mesazh ende</p>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={cn('flex', msg.sender === 'admin' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[78%] rounded-2xl px-3 py-2', msg.sender === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                <p className="text-sm">{msg.message}</p>
                <p className="text-[9px] opacity-60 mt-0.5">{moment(msg.created_date).format('DD/MM HH:mm')}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 border-t border-border pt-3">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Shkruaj mesazh..."
            className="flex-1 rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button onClick={handleSend} size="icon" disabled={sending || !text.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}