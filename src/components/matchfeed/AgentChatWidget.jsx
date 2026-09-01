import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Camera, Paperclip } from 'lucide-react';
import moment from 'moment';
import { cn } from '@/lib/utils';

export default function AgentChatWidget({ match, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const label = `${match.home_team_name} vs ${match.away_team_name}`;

  const loadMessages = async () => {
    const msgs = await base44.entities.AgentChat.filter({ match_id: match.id }, 'created_date', 100);
    setMessages(msgs);
    // Mark admin messages as read
    for (const m of msgs.filter(m => m.sender === 'admin' && !m.read_by_agent)) {
      await base44.entities.AgentChat.update(m.id, { read_by_agent: true });
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    loadMessages();
    const unsub = base44.entities.AgentChat.subscribe(() => loadMessages());
    return unsub;
  }, []);

  const sendMessage = async () => {
    if (!text.trim()) return;
    await base44.entities.AgentChat.create({
      match_id: match.id,
      match_code: match.match_code,
      sender: 'agent',
      agent_label: label,
      message: text,
      read_by_admin: false,
      read_by_agent: true,
    });
    setText('');
    loadMessages();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const isImage = file.type.startsWith('image/');
    const prefix = isImage ? '[foto]' : `[file:${file.name}]`;
    await base44.entities.AgentChat.create({
      match_id: match.id,
      match_code: match.match_code,
      sender: 'agent',
      agent_label: label,
      message: `${prefix}${file_url}`,
      read_by_admin: false,
      read_by_agent: true,
    });
    setSending(false);
    loadMessages();
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md bg-card rounded-t-2xl border border-border shadow-2xl flex flex-col" style={{ height: '70vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-bold">Chat me Admin</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-center text-muted-foreground pt-6">Asnjë mesazh ende. Dërgoni mesazhin tuaj!</p>
          )}
          {messages.map((msg, i) => {
            const isPhoto = msg.message?.startsWith('[foto]');
            const fileMatch = msg.message?.match(/^\[file:(.+?)\](.+)$/);
            const photoUrl = isPhoto ? msg.message.replace('[foto]', '') : null;
            const fileName = fileMatch?.[1];
            const fileUrl = fileMatch?.[2];
            return (
            <div key={i} className={cn('flex', msg.sender === 'agent' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', msg.sender === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                {isPhoto ? (
                  <img src={photoUrl} alt="foto" className="rounded-lg max-w-[200px]" />
                ) : fileMatch ? (
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline text-xs font-semibold">
                    <Paperclip className="w-3 h-3 shrink-0" />
                    {fileName}
                  </a>
                ) : (
                  <p>{msg.message}</p>
                )}
                <p className="text-[9px] opacity-60 mt-0.5">{moment(msg.created_date).format('HH:mm')}</p>
              </div>
            </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
          <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFileUpload} />
          <Button variant="outline" size="icon" onClick={() => cameraRef.current?.click()} disabled={sending} title="Kamera">
            <Camera className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={sending} title="Bashkangjit skedar">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input value={text} onChange={e => setText(e.target.value)} placeholder="Shkruaj mesazhin..." onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1" />
          <Button onClick={sendMessage} size="icon" disabled={sending}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}