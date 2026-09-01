import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, SmilePlus, LogIn, UserPlus, ArrowLeft, X, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatMessage from './ChatMessage';

const EMOJIS = ['😂','❤️','🔥','⚽','👏','😍','⚡','💪','🏆','😤','🤩','🙌'];
const CHAT_USER_KEY = 'ks_fanchat_user';

const LIVE_STATUSES = ['first_half', 'second_half', 'half_time', 'extra_time_first_half', 'extra_time_second_half', 'extra_time_half_time', 'penalties'];
const UPCOMING_STATUSES = ['scheduled'];

function StatusBadge({ status, minute }) {
  const isLive = LIVE_STATUSES.includes(status);
  const isHT = status === 'half_time';
  const isPen = status === 'penalties';
  const isET = status?.startsWith('extra_time');

  if (isHT) return (
    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">HT</span>
  );
  if (isPen) return (
    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">PEN</span>
  );
  if (isET && !isHT) return (
    <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
      ET {minute}'
    </span>
  );
  if (isLive) return (
    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
      <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />
      {minute}'
    </span>
  );
  return (
    <span className="bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
      {status === 'full_time' ? 'FT' : '—'}
    </span>
  );
}

function MatchCard({ match, messageCount, onOpenChat }) {
  const isLive = LIVE_STATUSES.includes(match.status);
  const isFT = match.status === 'full_time';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-shadow hover:shadow-md ${
        isLive ? 'border-red-200 ring-1 ring-red-200' : 'border-border/60'
      }`}
    >
      {/* Live indicator strip */}
      {isLive && (
        <div className="h-0.5 bg-gradient-to-r from-red-400 via-red-500 to-orange-400" />
      )}

      <div className="px-4 py-3">
        {/* Competition name */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
            {match.competition_name || 'Ligat'}
          </span>
          <StatusBadge status={match.status} minute={match.minute} />
        </div>

        {/* Teams + Score */}
        <div className="flex items-center gap-3">
          {/* Home team */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {match.home_team_logo ? (
              <img src={match.home_team_logo} alt="" className="w-8 h-8 object-contain shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">⚽</div>
            )}
            <span className="text-sm font-bold truncate text-foreground">{match.home_team_name}</span>
          </div>

          {/* Score */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0 ${
            isLive ? 'bg-red-50 border border-red-100' : isFT ? 'bg-muted' : 'bg-muted'
          }`}>
            <span className={`text-xl font-black tabular-nums ${isLive ? 'text-red-600' : 'text-foreground'}`}>
              {match.home_score ?? 0}
            </span>
            <span className="text-sm font-bold text-muted-foreground">—</span>
            <span className={`text-xl font-black tabular-nums ${isLive ? 'text-red-600' : 'text-foreground'}`}>
              {match.away_score ?? 0}
            </span>
          </div>

          {/* Away team */}
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <span className="text-sm font-bold truncate text-foreground text-right">{match.away_team_name}</span>
            {match.away_team_logo ? (
              <img src={match.away_team_logo} alt="" className="w-8 h-8 object-contain shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">⚽</div>
            )}
          </div>
        </div>

        {/* FanChat button */}
        <button
          onClick={() => onOpenChat(match)}
          className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
            isLive
              ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-sm'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Chat për këtë ndeshje
          {messageCount > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
              isLive ? 'bg-white/30 text-white' : 'bg-blue-600 text-white'
            }`}>
              {messageCount}
            </span>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function MatchChatPanel({ match, chatUser, onClose, onLoginRequired }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const loadMessages = useCallback(async () => {
    const all = await base44.entities.FanChatMessage.list('-created_date', 60);
    // Show match-specific messages + general admin announcements
    const filtered = all
      .filter(m => !m.is_deleted && (m.match_id === match.id || m.type === 'admin_announcement' || m.match_id === null && m.type === 'message' === false))
      .reverse();
    // Actually: show messages tied to this match + match_poll for this match
    const relevant = all
      .filter(m => !m.is_deleted && (
        m.match_id === match.id ||
        (m.match_id == null && m.type === 'message') === false
      ))
      .reverse();
    // Simplified: messages with this match_id OR admin messages for this match
    const msgs = all.filter(m => !m.is_deleted && m.match_id === match.id).reverse();
    setMessages(msgs);
  }, [match.id]);

  useEffect(() => {
    loadMessages();
    const iv = setInterval(loadMessages, 5000);
    return () => clearInterval(iv);
  }, [loadMessages]);

  useEffect(() => {
    const unsub = base44.entities.FanChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data?.match_id === match.id && !event.data.is_deleted) {
        setMessages(prev => prev.find(m => m.id === event.data.id) ? prev : [...prev, event.data]);
      } else if (event.type === 'update' && event.data?.match_id === match.id) {
        setMessages(prev => prev.map(m => m.id === event.data?.id ? event.data : m).filter(m => !m.is_deleted));
      }
    });
    return () => unsub();
  }, [match.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !chatUser || sending) return;
    if (!chatUser) { onLoginRequired(); return; }
    setSending(true);
    const content = input.trim();
    setInput('');
    setShowEmoji(false);
    try {
      await base44.functions.invoke('fanChatMessages', {
        action: 'send_match',
        user_id: chatUser.id,
        username: chatUser.username,
        display_name: chatUser.display_name,
        avatar_color: chatUser.avatar_color,
        avatar_emoji: chatUser.avatar_emoji,
        content,
        match_id: match.id,
        match_label: `${match.home_team_name} vs ${match.away_team_name}`,
      });
    } catch (_) {}
    setSending(false);
    inputRef.current?.focus();
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await base44.functions.invoke('fanChatMessages', { action: 'react', message_id: messageId, emoji });
      loadMessages();
    } catch (_) {}
  };

  const isLive = LIVE_STATUSES.includes(match.status);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="flex flex-col h-full bg-white rounded-2xl border border-border/60 shadow-xl overflow-hidden"
    >
      {/* Chat header */}
      <div className={`px-4 py-3 shrink-0 ${isLive ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-gradient-to-r from-blue-700 to-blue-600'}`}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm truncate">
                {match.home_team_name} vs {match.away_team_name}
              </span>
              {isLive && <span className="bg-white/25 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" />{match.minute}'</span>}
            </div>
            <p className="text-white/70 text-[10px] mt-0.5">{match.competition_name}</p>
          </div>
          <div className="bg-white/20 rounded-xl px-2.5 py-1 text-white font-black text-lg shrink-0">
            {match.home_score ?? 0} — {match.away_score ?? 0}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
        style={{ background: 'linear-gradient(180deg, #f0f4ff 0%, #f8f9ff 100%)' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm font-semibold text-foreground">Bëhu i pari që komenton!</p>
            <p className="text-xs text-muted-foreground mt-1">Diskuto këtë ndeshje me fansat e tjerë.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              message={msg}
              currentUser={chatUser}
              onReact={emoji => handleReact(msg.id, emoji)}
              onPollVote={() => {}}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-border/60 px-3 py-2.5 shrink-0">
        {chatUser ? (
          <>
            <div className="flex items-end gap-2">
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
                  placeholder={`Komento ${match.home_team_name} vs ${match.away_team_name}...`}
                  className="w-full resize-none rounded-2xl border border-border/60 bg-muted/40 px-3.5 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all"
                  rows={1}
                  maxLength={500}
                  style={{ minHeight: '38px', maxHeight: '100px' }}
                />
                <button
                  onClick={() => setShowEmoji(v => !v)}
                  className={`absolute right-2.5 bottom-2 transition-colors ${showEmoji ? 'text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <SmilePlus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="shrink-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-md mb-0.5"
              >
                {sending
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mt-2 flex flex-wrap gap-1.5 bg-muted/60 border border-border/40 rounded-2xl p-2.5"
                >
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => { setInput(p => p + em); setShowEmoji(false); inputRef.current?.focus(); }}
                      className="text-xl hover:scale-125 transition-transform active:scale-95 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white">
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
            <button
              onClick={onLoginRequired}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl px-4 py-2 flex items-center gap-1.5 font-semibold transition-colors shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" /> Hyr / Regjistrohu
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function LiveScoresFanChat() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});
  const [chatUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAT_USER_KEY)) || null; } catch { return null; }
  });
  const navigate = useNavigate();

  const loadMatches = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await base44.entities.Match.filter({ date: today });
    const live = all.filter(m => LIVE_STATUSES.includes(m.status));
    const upcoming = all.filter(m => UPCOMING_STATUSES.includes(m.status));
    const finished = all.filter(m => m.status === 'full_time');
    setMatches([...live, ...upcoming, ...finished].filter(m => m.show_in_live !== false));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMatches();
    const iv = setInterval(loadMatches, 30000);
    return () => clearInterval(iv);
  }, [loadMatches]);

  // Load message counts per match
  useEffect(() => {
    const loadCounts = async () => {
      const msgs = await base44.entities.FanChatMessage.list('-created_date', 300);
      const counts = {};
      msgs.filter(m => !m.is_deleted && m.match_id).forEach(m => {
        counts[m.match_id] = (counts[m.match_id] || 0) + 1;
      });
      setMessageCounts(counts);
    };
    loadCounts();
  }, []);

  // Real-time match updates
  useEffect(() => {
    const unsub = base44.entities.Match.subscribe(() => loadMatches());
    return () => unsub();
  }, [loadMatches]);

  const liveMatches = matches.filter(m => LIVE_STATUSES.includes(m.status));
  const otherMatches = matches.filter(m => !LIVE_STATUSES.includes(m.status));

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {selectedMatch ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ height: 'calc(100dvh - 145px)', minHeight: 420 }}
          >
            <MatchChatPanel
              match={selectedMatch}
              chatUser={chatUser}
              onClose={() => setSelectedMatch(null)}
              onLoginRequired={() => navigate('/fanchat')}
            />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl px-4 py-4 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-base tracking-tight">Live Scores & FanChat</h2>
                <p className="text-blue-300 text-xs mt-0.5">Shiko rezultatet dhe diskuto me fansat</p>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
                {liveMatches.length > 0
                  ? <Wifi className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                  : <WifiOff className="w-3.5 h-3.5 text-slate-400" />}
                <span className={`text-xs font-bold ${liveMatches.length > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                  {liveMatches.length > 0 ? `${liveMatches.length} LIVE` : 'Nuk ka live'}
                </span>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center py-10">
                <div className="w-7 h-7 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}

            {!loading && matches.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-border/60">
                <div className="text-4xl mb-2">📅</div>
                <p className="font-semibold text-foreground">Nuk ka ndeshje sot</p>
                <p className="text-xs text-muted-foreground mt-1">Kthehu nesër për ndeshjet e reja</p>
              </div>
            )}

            {!loading && liveMatches.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-black text-red-600 uppercase tracking-wider">Tani Live</span>
                </div>
                <div className="space-y-3">
                  {liveMatches.map(m => (
                    <MatchCard key={m.id} match={m} messageCount={messageCounts[m.id] || 0} onOpenChat={setSelectedMatch} />
                  ))}
                </div>
              </div>
            )}

            {!loading && otherMatches.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Sot</p>
                <div className="space-y-3">
                  {otherMatches.map(m => (
                    <MatchCard key={m.id} match={m} messageCount={messageCounts[m.id] || 0} onOpenChat={setSelectedMatch} />
                  ))}
                </div>
              </div>
            )}

            {/* Link to full FanChat */}
            <button
              onClick={() => navigate('/fanchat')}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 text-sm font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Hap FanChat-in e Përgjithshëm
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}