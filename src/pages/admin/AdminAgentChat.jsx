import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageSquare, Trash2, Plus, X } from 'lucide-react';
import moment from 'moment';
import { cn } from '@/lib/utils';

export default function AdminAgentChat() {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const [todayMatches, setTodayMatches] = useState([]);
  const [feedSessions, setFeedSessions] = useState({});
  const [showNewChat, setShowNewChat] = useState(false);

  const load = async () => {
    const today = moment().format('YYYY-MM-DD');
    const [allMsgs, matchesData] = await Promise.all([
      base44.entities.AgentChat.list('-created_date', 500),
      base44.entities.Match.filter({ date: today }, 'time', 100),
    ]);
    setTodayMatches(matchesData);
    // Group by match_id
    const grouped = {};
    allMsgs.forEach(m => {
      if (!grouped[m.match_id]) grouped[m.match_id] = { match_id: m.match_id, label: m.agent_label, messages: [], unread: 0 };
      grouped[m.match_id].messages.push(m);
      if (m.sender === 'agent' && !m.read_by_admin) grouped[m.match_id].unread++;
    });
    setThreads(Object.values(grouped).sort((a, b) => {
      const last_a = a.messages[0]?.created_date;
      const last_b = b.messages[0]?.created_date;
      return new Date(last_b) - new Date(last_a);
    }));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Request notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-create chat 15 min before match start
  useEffect(() => {
    const checkAutoChat = async () => {
      const today = moment().format('YYYY-MM-DD');
      const todayM = await base44.entities.Match.filter({ date: today }, 'time', 100);
      for (const m of todayM) {
        if (m.status !== 'scheduled' || !m.time) continue;
        const [h, min] = m.time.split(':').map(Number);
        const matchDate = new Date(); matchDate.setHours(h, min, 0, 0);
        const diff = matchDate.getTime() - Date.now();
        if (diff > 0 && diff <= 15 * 60 * 1000) {
          const existing = await base44.entities.AgentChat.filter({ match_id: m.id });
          if (existing.length === 0) {
            await base44.entities.AgentChat.create({
              match_id: m.id, match_code: m.match_code || '',
              sender: 'admin', agent_label: `${m.home_team_name} vs ${m.away_team_name}`,
              message: 'Gati për ndeshje?', read_by_admin: true, read_by_agent: false,
            });
            load();
          }
        }
      }
    };
    checkAutoChat();
    const interval = setInterval(checkAutoChat, 60000);
    return () => clearInterval(interval);
  }, []);

  // Agent online: sent message in last 3 min means agent is logged in
  const isAgentOnline = (matchId) => {
    const thread = threads.find(t => t.match_id === matchId);
    if (!thread) return false;
    const lastAgentMsg = thread.messages.filter(m => m.sender === 'agent').sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    if (!lastAgentMsg) return false;
    return (Date.now() - new Date(lastAgentMsg.created_date).getTime()) < 3 * 60 * 1000;
  };

  // Global sound notification for agent messages (works even outside chat section)
  useEffect(() => {
    const playSound = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Two-tone alert
        [880, 1100].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          const t = ctx.currentTime + i * 0.2;
          gain.gain.setValueAtTime(0.6, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      } catch (e) {}
    };

    const unsub = base44.entities.AgentChat.subscribe(async (event) => {
      if (event.type === 'create' && event.data?.sender === 'agent') {
        playSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('💬 Mesazh i ri nga agjenti', {
            body: event.data?.message || '',
            icon: '/favicon.ico',
          });
        }
      }
      load();
      // If thread is open, refresh messages immediately
      setSelected(prev => {
        if (prev && (event.data?.match_id === prev.match_id)) {
          base44.entities.AgentChat.filter({ match_id: prev.match_id }, 'created_date', 200).then(setMessages);
        }
        return prev;
      });
    });
    return unsub;
  }, []);

  const openThread = async (thread) => {
    setSelected(thread);
    const msgs = await base44.entities.AgentChat.filter({ match_id: thread.match_id }, 'created_date', 200);
    setMessages(msgs);
    // Mark agent messages as read
    const unread = msgs.filter(m => m.sender === 'agent' && !m.read_by_admin);
    for (const m of unread) {
      await base44.entities.AgentChat.update(m.id, { read_by_admin: true });
    }
    load();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    await base44.entities.AgentChat.create({
      match_id: selected.match_id,
      match_code: selected.messages?.[0]?.match_code || '',
      sender: 'admin',
      agent_label: selected.label,
      message: reply,
      read_by_admin: true,
      read_by_agent: false,
    });
    setReply('');
    const msgs = await base44.entities.AgentChat.filter({ match_id: selected.match_id }, 'created_date', 200);
    setMessages(msgs);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const startNewChat = async (match) => {
    setShowNewChat(false);
    const label = `${match.home_team_name} vs ${match.away_team_name}`;
    // Create initial message from admin
    await base44.entities.AgentChat.create({
      match_id: match.id,
      match_code: match.match_code || '',
      sender: 'admin',
      agent_label: label,
      message: 'Pershendetje! Keni ndonje lajm nga ndeshja?',
      read_by_admin: true,
      read_by_agent: false,
    });
    await load();
    const thread = { match_id: match.id, label, messages: [] };
    setSelected(thread);
    const msgs = await base44.entities.AgentChat.filter({ match_id: match.id }, 'created_date', 200);
    setMessages(msgs);
  };

  const deleteThread = async (matchId, e) => {
    e.stopPropagation();
    if (!window.confirm('A doni të fshini të gjitha mesazhet e kësaj bisede?')) return;
    const msgs = await base44.entities.AgentChat.filter({ match_id: matchId }, 'created_date', 500);
    for (const m of msgs) await base44.entities.AgentChat.delete(m.id);
    if (selected?.match_id === matchId) setSelected(null);
    load();
  };

  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0);

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Chat me Agjentët</h2>
          {totalUnread > 0 && <span className="bg-live text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>}
        </div>
        <Button size="sm" onClick={() => setShowNewChat(true)}>
          <Plus className="w-4 h-4 mr-1" /> Bisedë e Re
        </Button>
      </div>

      {showNewChat && (
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Zgjedh Ndeshjen</p>
            <button onClick={() => setShowNewChat(false)} className="text-xs text-muted-foreground hover:text-foreground">× Mbyll</button>
          </div>
          {todayMatches.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nuk ka ndeshje sot</p>
          ) : (
            <div className="space-y-2">
              {todayMatches.map(m => {
                const isLive = m.status === 'first_half' || m.status === 'second_half';
                const startIn15 = m.status === 'scheduled' && m.time && (() => {
                  const [h, min] = m.time.split(':').map(Number);
                  const matchDate = new Date(); matchDate.setHours(h, min, 0);
                  return (matchDate.getTime() - Date.now()) <= 15 * 60 * 1000;
                })();
                if (!isLive && !startIn15) return null;
                return (
                  <button key={m.id} onClick={() => startNewChat(m)} className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all flex items-center justify-between">
                    <span className="text-sm font-semibold">{m.home_team_name} vs {m.away_team_name}</span>
                    {isLive && <span className="text-[10px] bg-live text-white px-1.5 py-0.5 rounded font-bold">LIVE</span>}
                    {startIn15 && !isLive && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-bold">{m.time}</span>}
                  </button>
                );
              }).filter(Boolean)}
            </div>
          )}
        </div>
      )}

      {selected ? (
        <div className="bg-card rounded-xl border border-border flex flex-col h-[70vh]">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <button onClick={() => setSelected(null)} className="text-xs text-primary hover:underline">← Kthehu</button>
            <span className="text-sm font-semibold">{selected.label || selected.match_id}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {lightboxUrl && (
              <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
                <button className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
                <img src={lightboxUrl} alt="foto" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" />
              </div>
            )}
            {messages.map((msg, i) => {
              const isPhoto = msg.message?.startsWith('[foto]');
              const photoUrl = isPhoto ? msg.message.replace('[foto]', '') : null;
              return (
              <div key={i} className={cn('flex', msg.sender === 'admin' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', msg.sender === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {isPhoto ? (
                    <img src={photoUrl} alt="foto" className="rounded-lg max-w-[180px] cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setLightboxUrl(photoUrl)} />
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
            <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Shkruaj përgjigjen..." onKeyDown={e => e.key === 'Enter' && sendReply()} className="flex-1" />
            <Button onClick={sendReply} size="icon"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map(thread => (
            <button key={thread.match_id} onClick={() => openThread(thread)} className={`w-full text-left bg-card rounded-xl border-2 p-4 transition-all flex items-start gap-3 ${isAgentOnline(thread.match_id) ? 'border-green-500 shadow-sm shadow-green-500/20' : 'border-red-400/60'}`}>
              <div className="relative">
                <MessageSquare className={cn('w-5 h-5 mt-0.5', thread.unread > 0 ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card', isAgentOnline(thread.match_id) ? 'bg-success' : 'bg-muted-foreground/30')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold truncate ${thread.unread > 0 ? '' : 'text-muted-foreground'}`}>{thread.label || thread.match_id}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {thread.unread > 0 && <span className="bg-live text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{thread.unread}</span>}
                    <button onClick={(e) => deleteThread(thread.match_id, e)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{thread.messages.sort((a,b) => new Date(b.created_date) - new Date(a.created_date))[0]?.message}</p>
              </div>
            </button>
          ))}
          {threads.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka mesazhe ende</p>}
        </div>
      )}
    </div>
  );
}