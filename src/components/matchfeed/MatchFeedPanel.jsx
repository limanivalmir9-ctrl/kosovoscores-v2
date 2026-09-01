import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { flushQueue, addToQueue } from '@/lib/offlineQueue';
import { agentUpdateMatch, agentHeartbeat } from '@/lib/agentWrite';
import { Button } from '@/components/ui/button';
import { LogOut, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import ScoreControl from './ScoreControl';
import MatchStatusControl from './MatchStatusControl';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import EventPanel from './EventPanel';
import LineupsControl from './LineupsControl';
import AgentChatWidget from './AgentChatWidget';
import ChatButton from './ChatButton';
import SuperDeepAgentPanel from '@/components/superdeep/SuperDeepAgentPanel.jsx';

export default function MatchFeedPanel({ match: initialMatch, onLogout }) {
  const [match, setMatch] = useState(initialMatch);
  const originalCode = initialMatch.match_code;
  const [events, setEvents] = useState([]);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [homeClub, setHomeClub] = useState(null);
  const [awayClub, setAwayClub] = useState(null);
  const [activeTab, setActiveTab] = useState(initialMatch.super_deep ? 'superdeep' : 'control');
  const [chatOpen, setChatOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const readOnly = match.status === 'full_time';
  const [codeCopied, setCodeCopied] = useState(false);

  const handleLogout = async () => {
    try { await agentUpdateMatch(originalCode || match.match_code, { agent_last_seen: 0 }); } catch {}
    onLogout();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(originalCode || '');
    setCodeCopied(true);
    toast.success('Kodi u kopjua!');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const loadData = async () => {
    const [matches, evts, hPlayers, aPlayers, hClubs, aClubs] = await Promise.all([
      base44.entities.Match.filter({ id: match.id }),
      base44.entities.MatchEvent.filter({ match_id: match.id }, 'minute', 100),
      base44.entities.Player.filter({ club_id: match.home_team_id }, 'number', 50),
      base44.entities.Player.filter({ club_id: match.away_team_id }, 'number', 50),
      base44.entities.Club.filter({ id: match.home_team_id }),
      base44.entities.Club.filter({ id: match.away_team_id }),
    ]);
    if (matches[0]) setMatch(matches[0]);
    setEvents(evts);
    setHomePlayers(hPlayers.filter(p => p.active !== false));
    setAwayPlayers(aPlayers.filter(p => p.active !== false));
    if (hClubs[0]) setHomeClub(hClubs[0]);
    if (aClubs[0]) setAwayClub(aClubs[0]);
  };

  // Lightweight refresh — only refetch events for this match (no full panel reload)
  const loadEvents = async () => {
    const evts = await base44.entities.MatchEvent.filter({ match_id: match.id }, 'minute', 100);
    setEvents(evts);
  };

  // Heartbeat: update agent_last_seen every 30s so admin knows agent is online
  useEffect(() => {
    const sendHeartbeat = () => { try { agentHeartbeat(originalCode || match.match_code); } catch {} };
    sendHeartbeat();
    const hbInterval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(hbInterval);
  }, [initialMatch.id, originalCode, match.match_code]);

  useEffect(() => {
    loadData();

    // Agent panel uses targeted subscriptions — only reload when THIS match changes
    const unsub = base44.entities.Match.subscribe((event) => {
      if (event.type === 'update' && event.data?.id === match.id) {
        setMatch(event.data);
      } else if (event.type === 'update' && event.data?.id !== match.id) {
        return; // ignore other matches — keeps agent isolated from public page issues
      } else {
        loadData();
      }
    });
    const unsub2 = base44.entities.MatchEvent.subscribe((event) => {
      // Only reload events for this match (lightweight — no full panel reload)
      if (!event.data || event.data?.match_id === match.id) loadEvents();
    });

    const handleOnline = async () => {
      setIsOnline(true);
      const flushed = await flushQueue(base44);
      if (flushed > 0) { loadData(); setPendingCount(0); }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => { unsub(); unsub2(); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // useEventNotifications disabled for agents — no push/browser notifications in match feed

  const updateMatch = async (data) => {
    if (navigator.onLine) {
      await agentUpdateMatch(match.match_code || originalCode, data);
    } else {
      addToQueue({ type: 'update_match', matchId: match.id, data });
    }
    setMatch(prev => ({ ...prev, ...data }));
  };

  const tabs = [
    ...(match.super_deep ? [{ id: 'superdeep', label: '⚡ SuperDeep' }] : []),
    { id: 'control', label: 'Kontrolli' },
    { id: 'events', label: 'Ngjarjet' },
    ...(!match.lineup_locked ? [{ id: 'lineups', label: 'Formacionet' }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <img
            src="https://media.base44.com/images/public/69c340685dca7075d7622e15/0a1b2ee68_FINALNEWLOGO.png"
            alt="KosovoScores"
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          />
        </div>
        {originalCode && (
          <button onClick={copyCode} className="flex items-center gap-1 bg-muted hover:bg-muted/80 rounded-lg px-2 py-1 transition-all">
            <span className="font-mono font-bold text-xs text-foreground tracking-widest">{originalCode}</span>
            {codeCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
          </button>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-foreground hover:bg-muted">
          <LogOut className="w-4 h-4 mr-1" /> Dil
        </Button>
      </div>

      {!isOnline && (
        <div className="bg-warning/20 border-b border-warning/30 px-4 py-2 text-xs font-semibold text-center">
          ⚠️ Offline – të dhënat do ruhen lokalisht dhe do dërgohen kur të rikyçeni
        </div>
      )}
      <ScoreControl match={match} updateMatch={updateMatch} homePlayers={homePlayers} awayPlayers={awayPlayers} loadData={loadData} readOnly={readOnly} />

      <div className="flex gap-1 bg-muted mx-3 rounded-lg p-1 mt-3">
        {tabs.map(tab => {
          // Flash the "Kontrolli" tab until the agent has sent both team jersey colors
          const needsColors = tab.id === 'control' && (!match.sd_home_color || !match.sd_away_color);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all relative ${activeTab === tab.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'} ${needsColors ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
            >
              {tab.label}
              {needsColors && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400" />}
            </button>
          );
        })}
      </div>

      <div className="px-3 py-3">
        {activeTab === 'superdeep' && (
          <SuperDeepAgentPanel
            match={match}
            updateMatch={updateMatch}
            events={events}
            setEvents={setEvents}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            loadData={loadData}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'control' && <MatchStatusControl match={match} updateMatch={updateMatch} readOnly={readOnly} />}
        {activeTab === 'events' && <EventPanel match={match} events={events} setEvents={setEvents} homePlayers={homePlayers} awayPlayers={awayPlayers} loadData={loadData} loadEvents={loadEvents} readOnly={readOnly} />}
        {activeTab === 'lineups' && <LineupsControl match={match} homePlayers={homePlayers} awayPlayers={awayPlayers} updateMatch={updateMatch} homeClub={homeClub} awayClub={awayClub} />}
      </div>

      {/* Chat Button with unread badge */}
      <ChatButton matchId={match.id} onClick={() => setChatOpen(true)} />

      {chatOpen && <AgentChatWidget match={match} onClose={() => setChatOpen(false)} />}
    </div>
  );
}