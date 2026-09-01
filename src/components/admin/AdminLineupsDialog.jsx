import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LineupsControl from '@/components/matchfeed/LineupsControl';
import { toast } from 'sonner';

export default function AdminLineupsDialog({ match, open, onClose }) {
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [homeClub, setHomeClub] = useState(null);
  const [awayClub, setAwayClub] = useState(null);
  const [currentMatch, setCurrentMatch] = useState(match);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !match) return;
    setCurrentMatch(match);
    const load = async () => {
      setLoading(true);
      const [hp, ap, hc, ac] = await Promise.all([
        base44.entities.Player.filter({ club_id: match.home_team_id }),
        base44.entities.Player.filter({ club_id: match.away_team_id }),
        match.home_team_id ? base44.entities.Club.filter({ id: match.home_team_id }) : Promise.resolve([]),
        match.away_team_id ? base44.entities.Club.filter({ id: match.away_team_id }) : Promise.resolve([]),
      ]);
      setHomePlayers(hp.filter(p => p.active !== false));
      setAwayPlayers(ap.filter(p => p.active !== false));
      setHomeClub(hc[0] || null);
      setAwayClub(ac[0] || null);
      setLoading(false);
    };
    load();
  }, [open, match?.id]);

  const handlePlayerCreated = (player, team) => {
    if (team === 'home') setHomePlayers(prev => [...prev, player]);
    else setAwayPlayers(prev => [...prev, player]);
  };

  const updateMatch = async (data) => {
    await base44.entities.Match.update(currentMatch.id, data);
    setCurrentMatch(prev => ({ ...prev, ...data }));
    toast.success('Formacioni u ruajt!');
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formacioni – {match.home_team_name} vs {match.away_team_name}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <LineupsControl
            match={currentMatch}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            updateMatch={updateMatch}
            homeClub={homeClub}
            awayClub={awayClub}
            onPlayerCreated={handlePlayerCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}