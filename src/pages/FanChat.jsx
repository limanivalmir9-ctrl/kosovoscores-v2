import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, LogIn, UserPlus, Shield, X, SmilePlus, LogOut, Users } from 'lucide-react';
import FanChatAuth from '@/components/fanchat/FanChatAuth';
import FanChatVerify from '@/components/fanchat/FanChatVerify';
import ChatMessage from '@/components/fanchat/ChatMessage';
import FanChatRules from '@/components/fanchat/FanChatRules';
import FanChatResetPassword from '@/components/fanchat/FanChatResetPassword';
import ScoutPrivateChat from '@/components/fanchat/ScoutPrivateChat';
import { useSeo } from '@/lib/seo';

const EMOJIS = ['😂','❤️','🔥','⚽','👏','😍','🤣','😎','💪','🏆','🦁','⚡','🎯','😅','🙌','👍','❌','✅','😤','🤩'];
const CHAT_USER_KEY = 'ks_fanchat_user';

export default function FanChat() {
  const [chatUser, setChatUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAT_USER_KEY)) || null; } catch { return null; }
  });
  const [view, setView] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [verifyToken, setVerifyToken] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [showPrivateChat, setShowPrivateChat] = useState(false);
  const [hasUnreadAdminMessages, setHasUnreadAdminMessages] = useState(false);
  const [fanchatEnabled, setFanchatEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useSeo({
    title: 'FanChat | KosovoScores',
    description: 'Komuniteti i fanave të futbollit kosovar. Diskuto ndeshjet LIVE me tifozët e tjerë.',
    canonicalPath: '/fanchat',
    noindex: true,
  });

  // Site settings: fan chat enabled?
  useEffect(() => {
    const load = async () => {
      try {
        const s = await base44.entities.AppSettings.list('-created_date', 5);
        if (s[0]) setFanchatEnabled(!!s[0].fanchat_enabled);
      } catch (_) {}
    };
    load();
  }, []);

  // Check URL tokens
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get('verify');
    const reset = params.get('reset');
    if (verify) setVerifyToken(verify);
    if (reset) setResetToken(reset);
  }, []);

  // Real online count: users active in last 5 minutes
  useEffect(() => {
    const calcOnline = async () => {
      try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const recent = await base44.entities.FanChatUser.filter({ is_verified: true, is_banned: false }, '-last_seen', 200);
        const count = recent.filter(u => u.last_seen && u.last_seen > fiveMinAgo).length;
        setOnlineCount(Math.max(count, messages.length > 0 ? 1 : 0));
      } catch (_) {}
    };
    calcOnline();
    const t = setInterval(calcOnline, 60000);
    return () => clearInterval(t);
  }, [messages.length]);

  const loadMessages = useCallback(async () => {
    const msgs = await base44.entities.FanChatMessage.list('-created_date', 80);
    const filtered = msgs.filter(m => !m.is_deleted);
    setMessages(filtered.reverse());
    // Mark all current messages as "read" — clears the badge in BottomNav
    const totalCount = filtered.filter(m => m.type === 'message').length;
    localStorage.setItem('ks_fanchat_read_count', String(totalCount));
    localStorage.setItem('ks_fanchat_total_count', String(totalCount));
  }, []);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 15000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Check for unread admin private messages
  useEffect(() => {
    const checkUnreadAdmin = async () => {
      if (!chatUser) { setHasUnreadAdminMessages(false); return; }
      try {
        const res = await base44.functions.invoke('fanChatPrivate', {
          action: 'get',
          scout_user_id: chatUser.id,
          viewer_user_id: chatUser.id,
        });
        if (res.data?.messages) {
          const hasUnread = res.data.messages.some(m => m.sender === 'admin' && !m.read_by_scout);
          setHasUnreadAdminMessages(hasUnread);
        }
      } catch (_) {}
    };
    checkUnreadAdmin();
    const interval = setInterval(checkUnreadAdmin, 5000);
    return () => clearInterval(interval);
  }, [chatUser]);

  // Real-time subscription — update read count as messages arrive (user is watching)
  useEffect(() => {
    const unsub = base44.entities.FanChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data && !event.data.is_deleted) {
        setMessages(prev => {
          if (prev.find(m => m.id === event.data.id)) return prev;
          const next = [...prev, event.data];
          // Since user is on this page, mark new message as read immediately
          if (event.data.type === 'message') {
            const total = next.filter(m => m.type === 'message').length;
            localStorage.setItem('ks_fanchat_read_count', String(total));
            localStorage.setItem('ks_fanchat_total_count', String(total));
          }
          return next;
        });
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.data?.id ? event.data : m).filter(m => !m.is_deleted));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !chatUser || sending) return;
    const content = input.trim();
    setInput('');
    setShowEmoji(false);

    // Optimistic update — show message immediately
    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      user_id: chatUser.id,
      username: chatUser.username,
      display_name: chatUser.display_name,
      avatar_color: chatUser.avatar_color,
      avatar_emoji: chatUser.avatar_emoji,
      content,
      type: 'message',
      reactions: {},
      is_deleted: false,
      created_date: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setSending(true);

    try {
      const res = await base44.functions.invoke('fanChatMessages', {
        action: 'send',
        user_id: chatUser.id,
        username: chatUser.username,
        display_name: chatUser.display_name,
        avatar_color: chatUser.avatar_color,
        avatar_emoji: chatUser.avatar_emoji,
        content,
      });
      // Replace temp with real message
      if (res.data?.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.data.message : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (_) {
      // Remove optimistic on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await base44.functions.invoke('fanChatMessages', { action: 'react', message_id: messageId, emoji });
      loadMessages();
    } catch (_) {}
  };

  const handlePollVote = async (messageId) => {
    if (!chatUser) return;
    try {
      await base44.functions.invoke('fanChatMessages', { action: 'poll_vote', message_id: messageId, user_id: chatUser.id });
      loadMessages();
    } catch (_) {}
  };

  // Check if user has voted in any poll (to show private chat button)
  const userHasVotedInAnyPoll = chatUser && messages.some(m =>
    m.type === 'match_poll' && (m.poll_voter_ids || []).includes(chatUser.id)
  );

  const handleLogin = (user) => {
    setChatUser(user);
    localStorage.setItem(CHAT_USER_KEY, JSON.stringify(user));
    setView('chat');
  };

  const handleLogout = () => {
    setChatUser(null);
    localStorage.removeItem(CHAT_USER_KEY);
  };

  if (!fanchatEnabled) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 shadow-xl bg-white px-6 py-16 text-center" style={{ minHeight: 420 }}>
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="text-lg font-bold text-foreground mb-2">FanChat është çaktivizuar</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Chati i fansave është çaktivizuar përkohësisht nga administratori. Ju falënderojmë për mirëkuptimin.</p>
      </div>
    );
  }

  if (verifyToken) {
    return <FanChatVerify token={verifyToken} onDone={() => { setVerifyToken(null); setView('login'); }} />;
  }

  if (resetToken) {
    return <FanChatResetPassword token={resetToken} onDone={() => { setResetToken(null); window.history.replaceState({}, '', window.location.pathname); setView('login'); }} />;
  }

  if (view === 'login' || view === 'register') {
    return <FanChatAuth mode={view} onSuccess={handleLogin} onSwitch={m => setView(m)} onBack={() => setView('chat')} />;
  }

  if (view === 'rules') {
    return <FanChatRules onBack={() => setView('chat')} />;
  }

  // Gate: must be logged in AND verified (approved by admin) to access chat
  if (!chatUser) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 shadow-xl bg-white px-6 py-16 text-center"
        style={{ minHeight: 420 }}
      >
        <div className="text-6xl mb-4">⚽</div>
        <h2 className="text-xl font-bold text-foreground mb-2">FanChat — Komuniteti i Fanave</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Për të hyrë në chat duhet të <strong>regjistrohesh</strong> dhe të <strong>aprovohesh nga admini</strong>.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => setView('login')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-3 transition-colors shadow-md"
          >
            <LogIn className="w-4 h-4" /> Hyr
          </button>
          <button
            onClick={() => setView('register')}
            className="flex items-center gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold rounded-xl px-6 py-3 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Regjistrohu
          </button>
        </div>
        <button onClick={() => setView('rules')} className="mt-6 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <Shield className="w-3 h-3" /> Shiko rregullat e chat-it
        </button>
      </div>
    );
  }

  if (!chatUser.is_verified) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 shadow-xl bg-white px-6 py-16 text-center"
        style={{ minHeight: 420 }}
      >
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-lg font-bold text-foreground mb-2">Llogaria në pritje aprovimi</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          Regjistrimi yt u pranua! Admini do të aprovojë llogarinë tënde së shpejti.
          Kthehu pas pak për të hyrë në chat.
        </p>
        <button
          onClick={handleLogout}
          className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <LogOut className="w-3 h-3" /> Dil
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col rounded-2xl overflow-hidden border border-border/60 shadow-xl bg-white"
      style={{ height: 'calc(100dvh - 145px)', minHeight: 420 }}
    >
      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-800 shrink-0">
        {/* Top bar: branding + actions */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center text-lg shrink-0">⚽</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-sm leading-tight">FanChat</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-blue-200 text-[10px]">{onlineCount} online</span>
            </div>
          </div>

          {/* Rules button always visible */}
          <button
            onClick={() => setView('rules')}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition-colors border border-white/15 shrink-0"
          >
            <Shield className="w-3 h-3" /> Rregullat
          </button>
        </div>

        {/* Auth row */}
        {chatUser ? (
          <div className="px-4 pb-2.5 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1.5 flex-1 min-w-0">
              <span className="text-base leading-none shrink-0">{chatUser.avatar_emoji}</span>
              <span className="text-white text-xs font-semibold truncate">{chatUser.display_name}</span>
            </div>
            {userHasVotedInAnyPoll && (
              <button
                onClick={() => {
                  setShowPrivateChat(true);
                  setHasUnreadAdminMessages(false);
                }}
                className={`flex items-center gap-1 text-[11px] font-bold rounded-xl px-2.5 py-1.5 border transition-colors shrink-0 ${
                  hasUnreadAdminMessages
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-600 animate-pulse'
                    : 'bg-white/20 hover:bg-white/30 text-white border-white/25'
                }`}
              >
                💬 Admin {hasUnreadAdminMessages && '🔴'}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-white/10 hover:bg-red-500/40 text-white text-[11px] font-semibold rounded-xl px-3 py-1.5 border border-white/15 transition-colors shrink-0"
            >
              <LogOut className="w-3 h-3" /> Dil
            </button>
          </div>
        ) : (
          <div className="px-4 pb-2.5 flex items-center gap-2">
            <button
              onClick={() => setView('login')}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl py-2 border border-white/20 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" /> Hyr
            </button>
            <button
              onClick={() => setView('register')}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-xl py-2 transition-colors shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5" /> Regjistrohu
            </button>
          </div>
        )}

        {/* Warning strip */}
        <div className="mx-4 mb-3 bg-amber-500/20 border border-amber-400/25 rounded-xl px-3 py-1.5 flex items-start gap-2">
          <span className="text-sm shrink-0 mt-0.5">⚠️</span>
          <p className="text-[11px] text-amber-100 leading-snug">
            Fyerjet dhe sharjet janë <strong className="text-white">rreptësisht të ndaluara</strong>. Shkelësit <strong className="text-white">pezullohen menjëherë</strong>.
          </p>
        </div>
      </div>

      {/* Private Chat modal (scout ↔ admin) */}
      {showPrivateChat && chatUser && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 p-4" style={{ borderRadius: 'inherit' }}>
          <div className="w-full max-w-md">
            <ScoutPrivateChat
              scoutUser={chatUser}
              isAdmin={false}
              currentUser={chatUser}
              onClose={() => setShowPrivateChat(false)}
            />
          </div>
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
        style={{ background: 'linear-gradient(180deg, #f0f4ff 0%, #f8f9ff 100%)' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-5xl mb-3 animate-bounce">💬</div>
            <p className="text-foreground font-semibold">Bëhu i pari që komenton!</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Diskuto ndeshjet, ecurinë, dhe gjithçka rreth futbollit kosovar.
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              message={msg}
              currentUser={chatUser}
              onReact={emoji => handleReact(msg.id, emoji)}
              onPollVote={() => handlePollVote(msg.id)}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT AREA ── */}
      <div className="bg-white border-t border-border/60 px-3 py-2.5 shrink-0">
        {chatUser ? (
          <>
            <div className="flex items-end gap-2">
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mb-0.5"
                style={{ backgroundColor: chatUser.avatar_color || '#3498db' }}
              >
                {chatUser.avatar_emoji}
              </div>

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Shkruaj një koment..."
                  className="w-full resize-none rounded-2xl border border-border/60 bg-muted/40 px-3.5 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all"
                  rows={1}
                  maxLength={500}
                  style={{ minHeight: '38px', maxHeight: '110px' }}
                />
                <button
                  onClick={() => setShowEmoji(v => !v)}
                  className={`absolute right-2.5 bottom-2 transition-colors ${showEmoji ? 'text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <SmilePlus className="w-4.5 h-4.5" />
                </button>
              </div>

              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="shrink-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-md mb-0.5"
              >
                {sending
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>

            {input.length > 400 && (
              <p className="text-[10px] text-muted-foreground mt-1 text-right pr-12">{input.length}/500</p>
            )}

            {/* Emoji picker */}
            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mt-2 flex flex-wrap gap-1.5 bg-muted/60 border border-border/40 rounded-2xl p-2.5"
                >
                  {EMOJIS.map(em => (
                    <button
                      key={em}
                      onClick={() => { setInput(prev => prev + em); setShowEmoji(false); inputRef.current?.focus(); }}
                      className="text-xl hover:scale-125 transition-transform active:scale-95 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white"
                    >
                      {em}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 py-1">
            <p className="text-xs text-muted-foreground font-medium">Kyçu për të komentuar ⚽</p>
            <div className="flex gap-2">
              <button
                onClick={() => setView('login')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl px-4 py-2 flex items-center gap-1.5 font-semibold transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" /> Hyr
              </button>
              <button
                onClick={() => setView('register')}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs rounded-xl px-4 py-2 flex items-center gap-1.5 font-semibold transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Regjistrohu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}