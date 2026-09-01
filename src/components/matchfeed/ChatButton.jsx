import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle } from 'lucide-react';

export default function ChatButton({ matchId, onClick }) {
  const [unread, setUnread] = useState(0);

  const checkUnread = async () => {
    const msgs = await base44.entities.AgentChat.filter({ match_id: matchId }, 'created_date', 100);
    const unreadCount = msgs.filter(m => m.sender === 'admin' && !m.read_by_agent).length;
    setUnread(unreadCount);
  };

  useEffect(() => {
    checkUnread();
    const unsub = base44.entities.AgentChat.subscribe(() => checkUnread());
    return unsub;
  }, [matchId]);

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-4 w-12 h-12 bg-primary rounded-full shadow-lg flex items-center justify-center text-white z-40 hover:bg-primary/90 transition-all"
    >
      <MessageCircle className="w-6 h-6" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-live rounded-full text-[10px] font-black flex items-center justify-center text-white">
          {unread}
        </span>
      )}
    </button>
  );
}