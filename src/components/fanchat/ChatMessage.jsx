import { useState } from 'react';
import { motion } from 'framer-motion';

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '👏', '⚽'];

export default function ChatMessage({ message, currentUser, onReact, onPollVote }) {
  const [showReactions, setShowReactions] = useState(false);
  const isAdmin = message.type === 'admin_announcement' || message.type === 'match_poll';
  const isPoll = message.type === 'match_poll';
  const hasVoted = currentUser && (message.poll_voter_ids || []).includes(currentUser.id);
  const isOwn = currentUser && message.username === currentUser.username;
  const totalReactions = Object.values(message.reactions || {}).reduce((a, b) => a + b, 0);

  const timeStr = message.created_date
    ? new Date(message.created_date).toLocaleTimeString('sq', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={isAdmin ? 'px-1 my-2' : `flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} group`}
    >
      {/* ── ADMIN / POLL CARD ── */}
      {isAdmin && (
        <div className={`w-full rounded-xl border overflow-hidden ${
          isPoll
            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-400/40 shadow-md'
            : 'bg-blue-50 border-blue-200'
        }`}>
          {/* Compact header */}
          <div className={`px-3 py-2 flex items-center gap-1.5 ${isPoll ? '' : 'border-b border-blue-200'}`}>
            <span className="text-sm">🛡️</span>
            <span className={`text-[11px] font-bold ${isPoll ? 'text-blue-100' : 'text-blue-700'}`}>KosovoScores Admin</span>
            {isPoll && <span className="ml-auto text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-semibold">🏟️ SCOUT</span>}
          </div>
          <div className={`px-3 pb-2.5 ${isPoll ? '' : 'pt-0'}`}>
            <p className={`text-xs font-medium leading-snug ${isPoll ? 'text-white/90 pt-0' : 'text-blue-900 pt-2'}`}>
              {message.content}
            </p>
            {isPoll && message.match_label && (
              <div className="mt-2">
                <p className="text-blue-200 text-[10px] mb-1.5">🏟️ {message.match_label}</p>
                {hasVoted ? (
                  <div className="w-full py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white/80 text-center">
                    ✅ E regjistruar
                  </div>
                ) : (
                  <button
                    onClick={() => currentUser && onPollVote?.()}
                    disabled={!currentUser}
                    className="w-full py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-blue-700 hover:bg-blue-50 active:scale-[0.98] shadow disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    🏟️ Do ta shikoj në stadium
                  </button>
                )}
                {!currentUser && <p className="text-blue-300 text-[10px] text-center mt-1">Kyçu për t'u regjistruar</p>}
              </div>
            )}
            {totalReactions > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {Object.entries(message.reactions || {}).filter(([, v]) => v > 0).map(([emoji, count]) => (
                  <button key={emoji} onClick={() => onReact(emoji)}
                    className={`text-xs rounded-full px-2 py-0.5 hover:scale-105 transition-transform font-medium ${
                      isPoll ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    {emoji} {count}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REGULAR MESSAGE ── */}
      {!isAdmin && (
        <>
          {/* Avatar */}
          {!isOwn && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5 shadow-sm"
              style={{ backgroundColor: message.avatar_color || '#3498db' }}
              title={message.display_name}
            >
              {message.avatar_emoji || message.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}

          <div className={`flex flex-col max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
            {/* Name + time */}
            {!isOwn && (
              <div className="flex items-baseline gap-1.5 mb-1 px-1">
                <span className="text-[11px] font-bold text-foreground truncate">{message.display_name}</span>
                <span className="text-[10px] text-muted-foreground">{timeStr}</span>
              </div>
            )}

            {/* Reply preview */}
            {message.reply_to_content && (
              <div className={`mb-1 rounded-xl px-2.5 py-1.5 border-l-2 text-[11px] ${
                isOwn ? 'bg-blue-700/60 border-white/40 text-white/80' : 'bg-muted border-blue-400 text-muted-foreground'
              }`}>
                <span className={`font-bold mr-1 ${isOwn ? 'text-white/90' : 'text-blue-600'}`}>{message.reply_to_display_name}:</span>
                {message.reply_to_content}{message.reply_to_content?.length >= 80 ? '…' : ''}
              </div>
            )}

            {/* Bubble + tap to show reactions */}
            <div
              className={`relative rounded-2xl px-3.5 py-2 cursor-pointer select-text ${
                isOwn
                  ? 'bg-blue-600 text-white rounded-tr-sm shadow-md'
                  : 'bg-white border border-border/60 text-foreground rounded-tl-sm shadow-sm'
              }`}
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
              onClick={() => setShowReactions(v => !v)}
            >
              <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{message.content}</p>

              {/* Hover quick-react strip */}
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-9 flex items-center gap-0.5 bg-white border border-border rounded-full px-2 py-1 shadow-lg z-10`}
                >
                  {QUICK_REACTIONS.map(em => (
                    <button
                      key={em}
                      onClick={e => { e.stopPropagation(); onReact(em); setShowReactions(false); }}
                      className="text-base hover:scale-125 transition-transform active:scale-95 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted"
                    >
                      {em}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Timestamp for own messages */}
            {isOwn && (
              <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{timeStr}</span>
            )}

            {/* Reactions row */}
            {totalReactions > 0 && (
              <div className="flex gap-1 mt-1 px-1 flex-wrap">
                {Object.entries(message.reactions || {}).filter(([, v]) => v > 0).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(emoji)}
                    className="text-xs bg-muted hover:bg-muted/70 border border-border/40 rounded-full px-2 py-0.5 transition-all hover:scale-105 font-medium"
                  >
                    {emoji} {count}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}