import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Ban, Trash2, Send, RefreshCw, Search, CheckCircle, Clock, Shield, Eye, EyeOff, Reply, Megaphone, MessageSquare, AlertTriangle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from '@/components/fanchat/ChatMessage';
import ScoutPrivateChat from '@/components/fanchat/ScoutPrivateChat';

const EMOJIS = ['😂','❤️','🔥','⚽','👏','😍','🤣','😎','💪','🏆','⚡','🎯'];

export default function AdminFanChat() {
  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [announceDialog, setAnnounceDialog] = useState(false);
  const [announceText, setAnnounceText] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [isPoll, setIsPoll] = useState(false);
  const [banDialog, setBanDialog] = useState(null);
  const [clearChatDialog, setClearChatDialog] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [sending, setSending] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [adminInput, setAdminInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [activePrivateChat, setActivePrivateChat] = useState(null); // scoutUser object
  const [settingsId, setSettingsId] = useState(null);
  const [fanchatEnabled, setFanchatEnabled] = useState(false);
  const [togglingChat, setTogglingChat] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const [msgs, usrs, mts] = await Promise.all([
      base44.entities.FanChatMessage.list('-created_date', 150),
      base44.entities.FanChatUser.list('-created_date', 200),
      base44.entities.Match.filter({ status: 'scheduled' }, 'date', 50),
    ]);
    setMessages(msgs.filter(m => !m.is_deleted).reverse());
    setUsers(usrs);
    setMatches(mts);
    try {
      const settings = await base44.entities.AppSettings.list('-created_date', 5);
      if (settings[0]) { setSettingsId(settings[0].id); setFanchatEnabled(!!settings[0].fanchat_enabled); }
    } catch (_) {}
    if (!silent) setLoading(false);
  };

  const handleToggleFanChat = async () => {
    setTogglingChat(true);
    try {
      if (settingsId) {
        await base44.entities.AppSettings.update(settingsId, { fanchat_enabled: !fanchatEnabled });
      } else {
        const created = await base44.entities.AppSettings.create({ fanchat_enabled: !fanchatEnabled });
        setSettingsId(created.id);
      }
      setFanchatEnabled(!fanchatEnabled);
      toast.success(!fanchatEnabled ? 'FanChat u aktivizua në faqen publike ✅' : 'FanChat u fsheh nga faqja publike 🔒');
    } catch (_) { toast.error('Gabim gjatë ndryshimit'); }
    setTogglingChat(false);
  };

  useEffect(() => { load(); }, []);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.FanChatMessage.subscribe((event) => {
      if (event.type === 'create' && event.data && !event.data.is_deleted) {
        setMessages(prev => prev.find(m => m.id === event.data.id) ? prev : [...prev, event.data]);
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.data?.id ? event.data : m).filter(m => !m.is_deleted));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (tab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, tab]);

  const handleDeleteMessage = async (msgId) => {
    await base44.entities.FanChatMessage.update(msgId, { is_deleted: true, deleted_by_admin: true });
    setMessages(prev => prev.filter(m => m.id !== msgId));
    toast.success('Mesazhi u fshi');
  };

  const handleBan = async () => {
    if (!banDialog) return;
    await base44.entities.FanChatUser.update(banDialog.id, { is_banned: true, ban_reason: banReason || 'shkelje e rregullave' });
    toast.success(`${banDialog.display_name} u pezullua`);
    setBanDialog(null); setBanReason(''); load(true);
  };

  const handleUnban = async (user) => {
    await base44.entities.FanChatUser.update(user.id, { is_banned: false, ban_reason: '' });
    toast.success(`${user.display_name} u riaktivizua`); load(true);
  };

  const handleApprove = async (user) => {
    await base44.entities.FanChatUser.update(user.id, { is_verified: true, verification_token: '' });
    // Send confirmation email
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: '✅ Je aprovuar në KosovoScores FanChat!',
        body: `Përshëndetje ${user.display_name}! 👋\n\nLllogaria jote në KosovoScores FanChat është aprovuar nga administratori.\n\nTani mund të hyrësh dhe të marrësh pjesë në bisedën live me fansat e tjerë! 🏆⚽\n\n👉 Hyr këtu: ${window.location.origin}/fanchat\n\n— Ekipi i KosovoScores`,
      });
    } catch (_) {}
    toast.success(`${user.display_name} u aprovua dhe u dërgua email ✅`); load(true);
  };

  const handleToggleChatAdmin = async (user) => {
    const newVal = !user.is_admin;
    await base44.entities.FanChatUser.update(user.id, { is_admin: newVal });
    toast.success(newVal ? `${user.display_name} u bë moderator` : `${user.display_name} u hoq nga moderatorët`);
    load(true);
  };

  const handleClearChat = async () => {
    // Delete ALL messages including polls/announcements
    const toDelete = messages;
    await Promise.all(toDelete.map(m => base44.entities.FanChatMessage.update(m.id, { is_deleted: true, deleted_by_admin: true })));
    setMessages([]);
    setClearChatDialog(false);
    toast.success(`U fshinë ${toDelete.length} mesazhe ✅`);
  };

  const handleAnnounce = async () => {
    if (!announceText.trim()) return;
    setSending(true);
    const isPollMsg = isPoll && selectedMatchId;
    const match = isPollMsg ? matches.find(m => m.id === selectedMatchId) : null;
    await base44.entities.FanChatMessage.create({
      username: 'admin',
      display_name: 'KosovoScores Admin',
      avatar_color: '#1d4ed8',
      avatar_emoji: '🛡️',
      content: announceText.trim(),
      type: isPollMsg ? 'match_poll' : 'admin_announcement',
      match_id: isPollMsg ? selectedMatchId : null,
      match_label: match ? `${match.home_team_name} vs ${match.away_team_name}` : null,
      poll_votes: 0,
      poll_voter_ids: [],
      reactions: {},
    });
    toast.success('Njoftimi u dërgua ✅');
    setAnnounceText(''); setSelectedMatchId(''); setIsPoll(false); setAnnounceDialog(false); setSending(false);
  };

  const handleAdminSend = async () => {
    const content = adminInput.trim();
    if (!content) return;
    setAdminInput('');
    const msgData = {
      username: 'admin',
      display_name: 'KosovoScores Admin',
      avatar_color: '#1d4ed8',
      avatar_emoji: '🛡️',
      content,
      type: 'admin_announcement',
      reactions: {},
    };
    if (replyTo) {
      msgData.reply_to_id = replyTo.id;
      msgData.reply_to_display_name = replyTo.display_name;
      msgData.reply_to_content = replyTo.content?.slice(0, 80);
    }
    await base44.entities.FanChatMessage.create(msgData);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleReact = async (messageId, emoji) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    await base44.entities.FanChatMessage.update(messageId, { reactions });
  };

  const toggleShowPassword = (userId) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const activeUsers = users.filter(u => !u.is_banned && u.is_verified);
  const bannedUsers = users.filter(u => u.is_banned);
  const pendingUsers = users.filter(u => !u.is_verified && !u.is_banned);
  const filteredUsers = users.filter(u =>
    !searchUser || u.username?.toLowerCase().includes(searchUser.toLowerCase()) || u.display_name?.toLowerCase().includes(searchUser.toLowerCase())
  );

  // Scout messages (match_poll type) with voters
  const scoutMessages = messages.filter(m => m.type === 'match_poll' && (m.poll_votes || 0) > 0);

  const tabs = [
    { id: 'chat', label: 'Chat Live', icon: MessageSquare, count: messages.length },
    { id: 'scouts', label: 'Scouta', icon: MapPin, count: scoutMessages.reduce((a, m) => a + (m.poll_votes || 0), 0) },
    { id: 'users', label: 'Aktive', icon: Users, count: activeUsers.length },
    { id: 'pending', label: 'Pritje', icon: Clock, count: pendingUsers.length },
    { id: 'banned', label: 'Pezulluar', icon: Ban, count: bannedUsers.length },
  ];

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-lg">⚽</div>
          <h2 className="text-lg font-bold">FanChat Admin</h2>
          <div className="flex items-center gap-1 ml-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={handleToggleFanChat}
            disabled={togglingChat}
            className={`flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 border transition-colors ${
              fanchatEnabled ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
            title="Aktizo/çaktivizo FanChat në faqen publike"
          >
            <span className={`w-2 h-2 rounded-full ${fanchatEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            FanChat Publik: {fanchatEnabled ? 'AKTIV' : 'JOAKTIV'}
          </button>
          <Button variant="outline" size="sm" onClick={() => load()}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Rifresko</Button>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setClearChatDialog(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Pastro Chat
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setAnnounceDialog(true)}>
            <Megaphone className="w-3.5 h-3.5 mr-1" /> Njoftim / Scout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Mesazhe', value: messages.length, icon: '💬', color: 'bg-blue-50 text-blue-700' },
          { label: 'Aktive', value: activeUsers.length, icon: '✅', color: 'bg-green-50 text-green-700' },
          { label: 'Pezulluar', value: bannedUsers.length, icon: '🔴', color: 'bg-red-50 text-red-700' },
          { label: 'Pa verifikim', value: pendingUsers.length, icon: '⏳', color: 'bg-yellow-50 text-yellow-700' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-3 text-center ${s.color}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-4 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* CHAT TAB - identical to public chat + moderation controls */}
      {tab === 'chat' && (
        <div className="flex flex-col rounded-2xl border border-border overflow-hidden bg-white shadow-sm" style={{ height: '560px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ background: 'linear-gradient(180deg,#f0f4ff 0%,#f8f9ff 100%)' }}>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Nuk ka mesazhe akoma</div>
            )}
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <div key={msg.id} className="group relative">
                  <ChatMessage
                    message={msg}
                    currentUser={{ username: 'admin', display_name: 'KosovoScores Admin', id: 'admin' }}
                    onReact={(emoji) => handleReact(msg.id, emoji)}
                    onPollVote={() => {}}
                  />
                  {/* Admin overlay controls */}
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 border border-border/50 rounded-xl px-1.5 py-1 shadow-md z-20">
                    <button title="Përgjigju" onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                      className="w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center">
                      <Reply className="w-3 h-3 text-blue-600" />
                    </button>
                    {msg.username !== 'admin' && (
                      <>
                        <button onClick={() => handleDeleteMessage(msg.id)}
                          className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                        <button onClick={() => { const u = users.find(x => x.username === msg.username); if (u) setBanDialog(u); }}
                          className="w-6 h-6 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center">
                          <Ban className="w-3 h-3 text-orange-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div className="px-3 py-2 bg-blue-50 border-t border-blue-200 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-blue-700">↩ Përgjigju: {replyTo.display_name}</span>
                <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            </div>
          )}

          {/* Emoji picker */}
          <AnimatePresence>
            {showEmoji && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="px-3 py-2 border-t border-border flex gap-1.5 flex-wrap bg-white">
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => { setAdminInput(p => p + em); setShowEmoji(false); inputRef.current?.focus(); }}
                    className="text-xl w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted hover:scale-125 transition-all">
                    {em}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Admin input bar */}
          <div className="border-t border-border bg-white px-3 py-2.5 flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-sm shrink-0 mb-0.5">🛡️</div>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={adminInput}
                onChange={e => setAdminInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdminSend(); } }}
                placeholder="Dërgo si admin në chat..."
                rows={1}
                className="w-full resize-none rounded-2xl border border-border/60 bg-muted/40 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all"
                style={{ minHeight: '38px', maxHeight: '90px' }}
              />
              <button onClick={() => setShowEmoji(v => !v)}
                className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground">
                😊
              </button>
            </div>
            <button
              onClick={handleAdminSend}
              disabled={!adminInput.trim()}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shadow-md mb-0.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SCOUTS TAB */}
      {tab === 'scouts' && (
        <div className="space-y-4">
          {scoutMessages.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">Asnjë fan nuk ka shënuar interes akoma</p>
            </div>
          ) : scoutMessages.map(msg => {
            const voterIds = msg.poll_voter_ids || [];
            const voterUsers = voterIds.map(vid => users.find(u => u.id === vid)).filter(Boolean);
            return (
              <div key={msg.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">🏟️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-blue-800">{msg.match_label}</p>
                    <p className="text-xs text-blue-600 mt-0.5">{msg.content}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{new Date(msg.created_date).toLocaleString('sq')}</p>
                  </div>
                  <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2.5 py-1 shrink-0">{msg.poll_votes || 0} scouts</span>
                </div>
                {voterUsers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">👥 Fans të interesuar:</p>
                    {voterUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-2.5 bg-white border border-blue-100 rounded-xl px-3 py-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0" style={{ backgroundColor: u.avatar_color || '#3498db' }}>
                          {u.avatar_emoji || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{u.display_name}</p>
                          <p className="text-xs text-muted-foreground">@{u.username} · {u.email}</p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => setActivePrivateChat(u)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> Chat
                          </button>
                          <a href={`mailto:${u.email}`}
                            className="text-xs bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 font-semibold transition-colors text-center">
                            📧 Email
                          </a>
                        </div>
                      </div>
                    ))}
                    {voterIds.length > voterUsers.length && (
                      <p className="text-xs text-muted-foreground italic">{voterIds.length - voterUsers.length} fans të tjerë (llogari të fshira)</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Të dhënat e fanave nuk u gjetën</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Kërko përdorues..." className="pl-9" />
          </div>
          <div className="space-y-2">
            {filteredUsers.filter(u => !u.is_banned && u.is_verified).map(user => (
              <div key={user.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0" style={{ backgroundColor: user.avatar_color || '#3498db' }}>
                    {user.avatar_emoji || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm">{user.display_name}</span>
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                      {user.is_admin && <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-bold flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> MOD</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email} · {user.total_messages || 0} mesazhe</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground font-mono bg-muted/50 rounded px-1.5 py-0.5">
                        {showPasswords[user.id] ? (user.password_hash || '—') : '••••••••••••'}
                      </span>
                      <button onClick={() => toggleShowPassword(user.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {showPasswords[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      variant={user.is_admin ? "default" : "outline"}
                      size="sm"
                      className={`text-xs h-7 ${user.is_admin ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                      onClick={() => handleToggleChatAdmin(user)}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {user.is_admin ? 'Hiq Mod' : 'Bëj Mod'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setBanDialog(user)} className="text-orange-500 hover:text-orange-700 text-xs h-7">
                      <Ban className="w-3.5 h-3.5 mr-1" /> Pezullo
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PENDING TAB */}
      {tab === 'pending' && (
        <div className="space-y-2">
          {pendingUsers.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm">Nuk ka regjistrime në pritje</p>
            </div>
          )}
          {pendingUsers.map(user => (
            <div key={user.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0" style={{ backgroundColor: user.avatar_color || '#3498db' }}>
                  {user.avatar_emoji || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{user.display_name}</span>
                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                    <span className="text-[10px] bg-yellow-200 text-yellow-800 rounded-full px-1.5 py-0.5">PA VERIFIKIM</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-[11px] text-muted-foreground">Regjistruar: {user.created_date ? new Date(user.created_date).toLocaleString('sq') : '—'}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(user)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Aprovo
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => setBanDialog(user)}>
                    <Ban className="w-3.5 h-3.5 mr-1" /> Refuzo
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BANNED TAB */}
      {tab === 'banned' && (
        <div className="space-y-2">
          {bannedUsers.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Nuk ka përdorues të pezulluar</p>}
          {bannedUsers.map(user => (
            <div key={user.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 opacity-60" style={{ backgroundColor: user.avatar_color || '#3498db' }}>
                {user.avatar_emoji || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{user.display_name}</span>
                  <span className="text-xs text-muted-foreground">@{user.username}</span>
                </div>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <p className="text-xs text-red-600">Arsyeja: {user.ban_reason || 'shkelje e rregullave'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleUnban(user)} className="text-green-600 border-green-200 hover:bg-green-50 h-7 text-xs shrink-0">
                Riaktivizo
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Private Chat Dialog */}
      <Dialog open={!!activePrivateChat} onOpenChange={() => setActivePrivateChat(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {activePrivateChat && (
            <ScoutPrivateChat
              scoutUser={activePrivateChat}
              isAdmin={true}
              currentUser={null}
              onClose={() => setActivePrivateChat(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Announce Dialog */}
      <Dialog open={announceDialog} onOpenChange={setAnnounceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>📢 Njoftim / Sondazh në FanChat</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setIsPoll(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${!isPoll ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border'}`}>
                🔔 Njoftim
              </button>
              <button onClick={() => setIsPoll(true)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${isPoll ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border'}`}>
                🏟️ Scout Fans Ndeshje
              </button>
            </div>
            {isPoll && (
              <div>
                <label className="text-sm font-medium mb-1 block">Zgjedh ndeshjen</label>
                <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                  <SelectTrigger><SelectValue placeholder="Zgjedh ndeshjen..." /></SelectTrigger>
                  <SelectContent>
                    {matches.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.home_team_name} vs {m.away_team_name} — {m.date}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">{isPoll ? 'Pyetja për fansat' : 'Teksti i njoftimit'}</label>
              <textarea value={announceText} onChange={e => setAnnounceText(e.target.value)}
                placeholder={isPoll ? 'Kush do ta shikojë ndeshjen në stadium?' : 'Shkruaj njoftimin...'}
                rows={3} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <Button onClick={handleAnnounce} disabled={sending || !announceText.trim() || (isPoll && !selectedMatchId)} className="w-full">
              {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> Dërgo Njoftimin</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Chat Dialog */}
      <Dialog open={clearChatDialog} onOpenChange={setClearChatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Pastro të gjithë Chatin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ky veprim do të <strong className="text-foreground">fshijë të gjitha mesazhet e fanave</strong> nga chati. Mesazhet e adminit mbeten. Ky veprim nuk mund të kthehet!</p>
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700 font-medium">
              🗑️ Do të fshihen {messages.length} mesazhe (përfshirë sondazhet dhe njoftimet)
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setClearChatDialog(false)}>Anulo</Button>
              <Button variant="destructive" className="flex-1" onClick={handleClearChat}>
                <Trash2 className="w-4 h-4 mr-1" /> Pastro Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pezullo Përdoruesin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Duke pezulluar <strong>{banDialog?.display_name}</strong> (@{banDialog?.username}) ai/ajo nuk do të mund të komentojë më.</p>
            <Input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Arsyeja (opsionale)..." />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setBanDialog(null)}>Anulo</Button>
              <Button variant="destructive" className="flex-1" onClick={handleBan}>
                <Ban className="w-4 h-4 mr-1" /> Pezullo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}