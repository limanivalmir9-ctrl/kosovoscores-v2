import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, X, MessageSquare, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Private chat between admin and a specific scout fan
// scoutUser: { id, username, display_name, avatar_color, avatar_emoji }
// isAdmin: boolean — true if the viewer is a Base44 admin
// currentUser: the logged-in fan user object (if not admin)
export default function ScoutPrivateChat({ scoutUser, isAdmin, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const scout_user_id = scoutUser?.id;
  const scout_username = scoutUser?.username || '';
  const scout_display_name = scoutUser?.display_name || scoutUser?.username || 'Scout';

  const loadMessages = async () => {
    if (!scout_user_id) return;
    try {
      const res = await base44.functions.invoke('fanChatPrivate', {
        action: 'get',
        scout_user_id,
        viewer_user_id: isAdmin ? null : (currentUser?.id || null),
      });
      if (res.data?.ok) {
        setMessages(res.data.messages || []);
        setError('');
      } else {
        setError(res.data?.error || 'Gabim në ngarkimin e mesazheve');
      }
    } catch (e) {
      setError('Gabim lidhje: ' + (e?.message || 'E panjohur'));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!scout_user_id) return;
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [scout_user_id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput('');
    setError('');

    // Optimistic update
    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      sender: isAdmin ? 'admin' : 'scout',
      content,
      scout_user_id,
      scout_username,
      scout_display_name,
      created_date: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await base44.functions.invoke('fanChatPrivate', {
        action: 'send',
        scout_user_id,
        scout_username,
        scout_display_name,
        sender: isAdmin ? 'admin' : 'scout',
        content,
      });

      if (res.data?.ok && res.data?.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.data.message : m));
      } else {
        // Remove optimistic on failure and show error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setError(res.data?.error || 'Dërgimi dështoi');
        setInput(content); // Restore input
      }
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setError('Gabim lidhje: ' + (e?.message || 'E panjohur'));
      setInput(content);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  if (!scout_user_id) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
        <AlertCircle className="w-5 h-5 mr-2 text-red-400" /> Scout ID mungon
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex flex-col bg-white rounded-2xl border border-border shadow-xl overflow-hidden"
      style={{ height: 460, width: '100%', maxWidth: 440 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-4 py-3 flex items-center gap-3 shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 shadow"
          style={{ backgroundColor: scoutUser.avatar_color || '#3498db' }}
        >
          {scoutUser.avatar_emoji || '⚽'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{scout_display_name}</p>
          <p className="text-blue-200 text-[10px]">@{scout_username} · Bisedë private 🔒</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gradient-to-b from-blue-50/40 to-white">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <MessageSquare className="w-8 h-8 text-muted-foreground/25 mb-2" />
            <p className="text-xs text-muted-foreground">
              {isAdmin ? `Fillo bisedën me ${scout_display_name}` : 'Admini do të kontaktojë së shpejti'}
            </p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = isAdmin ? msg.sender === 'admin' : msg.sender === 'scout';
          const isTemp = msg.id?.startsWith('temp-');
          const timeStr = msg.created_date
            ? new Date(msg.created_date).toLocaleTimeString('sq', { hour: '2-digit', minute: '2-digit' })
            : '';
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                {!isMine && (
                  <p className="text-[10px] font-bold text-muted-foreground mb-0.5 px-1">
                    {msg.sender === 'admin' ? '🛡️ KosovoScores Admin' : scout_display_name}
                  </p>
                )}
                <div className={`rounded-2xl px-3.5 py-2 ${
                  isMine
                    ? `bg-blue-600 text-white rounded-tr-sm shadow-md ${isTemp ? 'opacity-60' : ''}`
                    : 'bg-white border border-border/60 text-foreground rounded-tl-sm shadow-sm'
                }`}>
                  <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                </div>
                <p className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isMine ? 'text-right' : ''}`}>
                  {isTemp ? '⏳ duke dërguar...' : timeStr}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Error bar */}
      {error && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-sm font-bold">×</button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-white px-3 py-2.5 flex gap-2 items-end shrink-0">
        {isAdmin && (
          <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-xs shrink-0 mb-0.5">🛡️</div>
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder={isAdmin ? `Dërgo mesazh tek ${scout_display_name}...` : 'Shkruaj mesazh privat...'}
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-border/60 bg-muted/40 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all"
          style={{ minHeight: '38px', maxHeight: '90px' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-md mb-0.5 shrink-0"
        >
          {sending
            ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </motion.div>
  );
}