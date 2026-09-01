import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

export default function AdminTransferPlayers() {
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [fromClub, setFromClub] = useState('');
  const [toClub, setToClub] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [allClubs, allPlayers] = await Promise.all([
        base44.entities.Club.list('name', 200),
        base44.entities.Player.list('name', 500),
      ]);
      setClubs(allClubs);
      setPlayers(allPlayers);
      setLoading(false);
    };
    load();
  }, []);

  const fromPlayers = players.filter(p => p.club_id === fromClub);
  const selectedPlayerObj = players.find(p => p.id === selectedPlayer);

  const handleTransfer = async () => {
    if (!fromClub || !toClub || !selectedPlayer) {
      toast.error('Zgjedh ekipin, lojtarin dhe ekipin e ri');
      return;
    }
    if (fromClub === toClub) {
      toast.error('Ekipet duhet të jenë të ndryshme');
      return;
    }
    setTransferring(true);
    const toClubObj = clubs.find(c => c.id === toClub);
    await base44.entities.Player.update(selectedPlayer, {
      club_id: toClub,
      competition_id: toClubObj?.competition_id || '',
    });
    // Refresh players
    const updated = await base44.entities.Player.list('name', 500);
    setPlayers(updated);
    toast.success(`${selectedPlayerObj?.name} u transferua tek ${toClubObj?.name}`);
    setSelectedPlayer('');
    setTransferring(false);
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Transfero Lojtarët</h2>
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5 max-w-lg">
        <div>
          <label className="text-sm font-semibold block mb-1">Ekipi burimor (nga)</label>
          <Select value={fromClub} onValueChange={v => { setFromClub(v); setSelectedPlayer(''); }}>
            <SelectTrigger><SelectValue placeholder="Zgjedh ekipin" /></SelectTrigger>
            <SelectContent>
              {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {fromClub && (
          <div>
            <label className="text-sm font-semibold block mb-1">Lojtari</label>
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger><SelectValue placeholder="Zgjedh lojtarin" /></SelectTrigger>
              <SelectContent>
                {fromPlayers.length === 0
                  ? <SelectItem value="_none" disabled>Nuk ka lojtarë</SelectItem>
                  : fromPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.number ? `#${p.number} ` : ''}{p.name}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-sm font-semibold block mb-1">Ekipi i ri (tek)</label>
          <Select value={toClub} onValueChange={setToClub}>
            <SelectTrigger><SelectValue placeholder="Zgjedh ekipin e ri" /></SelectTrigger>
            <SelectContent>
              {clubs.filter(c => c.id !== fromClub).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayerObj && toClub && (
          <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3 text-sm">
            <span className="font-semibold">{selectedPlayerObj.name}</span>
            <ArrowRight className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">{clubs.find(c => c.id === toClub)?.name}</span>
          </div>
        )}

        <Button onClick={handleTransfer} disabled={transferring || !fromClub || !toClub || !selectedPlayer} className="w-full">
          {transferring ? 'Duke transferuar...' : '⇄ Transfero Lojtarin'}
        </Button>
      </div>

      {/* List players per selected from-club */}
      {fromClub && fromPlayers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold mb-2 text-muted-foreground">Lojtarët e {clubs.find(c => c.id === fromClub)?.name}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fromPlayers.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
                <span className="font-mono text-muted-foreground mr-1">#{p.number || '?'}</span>
                <span className="font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}