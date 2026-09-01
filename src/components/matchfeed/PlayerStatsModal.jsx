import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const POSITION_LABELS = {
  Goalkeeper: 'Portier',
  Defender: 'Mbrojtës',
  Midfielder: 'Mesfushor',
  Forward: 'Sulmues',
};

const POSITION_COLORS = {
  Goalkeeper: 'bg-yellow-500/20 text-yellow-700',
  Defender: 'bg-blue-500/20 text-blue-700',
  Midfielder: 'bg-green-500/20 text-green-700',
  Forward: 'bg-red-500/20 text-red-700',
};

export default function PlayerStatsModal({ player, matchEvents, onClose }) {
  const [allEvents, setAllEvents] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load all-time stats for this player across all matches
  useEffect(() => {
    if (!player?.player_id && !player?.name) return;
    setLoading(true);
    const fetchStats = async () => {
      const evts = await base44.entities.MatchEvent.filter({ player_id: player.player_id }, '-event_timestamp', 200).catch(() => []);
      setAllEvents(evts);
      setLoading(false);
    };
    fetchStats();
  }, [player?.player_id]);

  if (!player) return null;

  // Stats from THIS match (passed in as matchEvents)
  const matchGoals = matchEvents.filter(e =>
    (e.type === 'goal' || e.type === 'penalty_goal') &&
    (e.player_id === player.player_id || e.player_name === player.name)
  ).length;
  const matchAssists = matchEvents.filter(e =>
    e.assist_player_id === player.player_id || e.assist_player_name === player.name
  ).length;
  const matchYellow = matchEvents.filter(e =>
    e.type === 'yellow_card' &&
    (e.player_id === player.player_id || e.player_name === player.name)
  ).length;
  const matchRed = matchEvents.filter(e =>
    (e.type === 'red_card' || e.type === 'second_yellow') &&
    (e.player_id === player.player_id || e.player_name === player.name)
  ).length;

  // All-time stats
  const totalGoals = allEvents ? allEvents.filter(e =>
    e.type === 'goal' || e.type === 'penalty_goal'
  ).length : 0;
  const totalAssists = allEvents ? allEvents.filter(e =>
    e.assist_player_id === player.player_id || e.assist_player_name === player.name
  ).length : 0;
  const totalYellow = allEvents ? allEvents.filter(e => e.type === 'yellow_card').length : 0;
  const totalRed = allEvents ? allEvents.filter(e => e.type === 'red_card' || e.type === 'second_yellow').length : 0;

  const posLabel = POSITION_LABELS[player.position] || player.position || '';
  const posCls = POSITION_COLORS[player.position] || 'bg-muted text-muted-foreground';

  return (
    <Dialog open={!!player} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">Statistikat e Lojtarit</DialogTitle>
        </DialogHeader>

        {/* Player header */}
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          {player.photo ? (
            <img src={player.photo} alt={player.name} className="w-20 h-20 rounded-2xl object-cover border border-border" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center border border-border">
              <span className="text-3xl font-black text-muted-foreground">{player.number || player.name?.[0]}</span>
            </div>
          )}
          <div>
            <p className="text-lg font-black">{player.name}</p>
            {player.number && <p className="text-2xl font-black text-primary">#{player.number}</p>}
            {posLabel && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${posCls}`}>{posLabel}</span>
            )}
            {player.nationality && <p className="text-xs text-muted-foreground mt-1">{player.nationality}</p>}
          </div>
        </div>

        {/* This match stats */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Kjo Ndeshje</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Gola', value: matchGoals, icon: '⚽' },
              { label: 'Asiste', value: matchAssists, icon: '🅰️' },
              { label: '🟨', value: matchYellow, icon: null },
              { label: '🟥', value: matchRed, icon: null },
            ].map(stat => (
              <div key={stat.label} className="bg-muted rounded-xl p-2 text-center">
                <div className="text-base">{stat.icon || stat.label}</div>
                <div className="text-xl font-black">{stat.value}</div>
                {stat.icon && <div className="text-[9px] text-muted-foreground">{stat.label}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* All-time stats */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Gjithsej (karrierë)
          </p>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Gola', value: totalGoals, icon: '⚽' },
                { label: 'Asiste', value: totalAssists, icon: '🅰️' },
                { label: '🟨', value: totalYellow, icon: null },
                { label: '🟥', value: totalRed, icon: null },
              ].map(stat => (
                <div key={stat.label} className="bg-muted/50 rounded-xl p-2 text-center border border-border">
                  <div className="text-base">{stat.icon || stat.label}</div>
                  <div className="text-xl font-black">{stat.value}</div>
                  {stat.icon && <div className="text-[9px] text-muted-foreground">{stat.label}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}