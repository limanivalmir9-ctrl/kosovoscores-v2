import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminWeekStars() {
  const [stars, setStars] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekNumber, setWeekNumber] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [albiComp, setAlbiComp] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [allStars, allComps, allClubs] = await Promise.all([
        base44.entities.WeekStar.list('-week_number', 200),
        base44.entities.Competition.list('tier', 100),
        base44.entities.Club.list('name', 200),
      ]);
      const albi = allComps.find(c => /ALBI MALL SUPERLIGA/i.test(c.name || '') && !c.archived && !c.hidden)
        || allComps.find(c => c.tier === 1 && !c.archived && !c.hidden);
      const albiClubs = albi ? allClubs.filter(cl => cl.competition_id === albi.id && cl.active !== false) : [];
      setAlbiComp(albi);
      setStars(allStars);
      setClubs(albiClubs);
      // Load players for the ALBI competition only (avoids the 500-cap cutting off players)
      const allPlayers = albi
        ? await base44.entities.Player.filter({ competition_id: albi.id }, 'number', 500).catch(() => [])
        : [];
      const albiClubIds = new Set(albiClubs.map(c => c.id));
      setPlayers(allPlayers.filter(p => albiClubIds.has(p.club_id)));
    } catch (e) {
      console.error('WeekStar load error', e);
      toast.error('Gabim gjatë ngarkimit');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clubPlayers = players.filter(p => p.club_id === selectedClubId);

  const handleSave = async () => {
    const wk = Number(weekNumber);
    if (!wk || wk < 1) { toast.error('Vendos numrin e javës'); return; }
    if (!selectedPlayerId) { toast.error('Zgjedh lojtarin'); return; }
    const playerObj = players.find(p => p.id === selectedPlayerId);
    const clubObj = clubs.find(c => c.id === playerObj?.club_id);
    if (!playerObj || !clubObj) { toast.error('Lojtari ose klubi nuk u gjet'); return; }
    setSaving(true);
    const payload = {
      week_number: wk,
      competition_id: albiComp?.id || '',
      player_id: playerObj.id,
      player_name: playerObj.name,
      player_photo: playerObj.photo || '',
      club_id: clubObj.id,
      club_name: clubObj.name,
      club_logo: clubObj.logo || '',
    };
    try {
      const existing = stars.find(s => Number(s.week_number) === wk);
      if (existing) {
        await base44.entities.WeekStar.update(existing.id, payload);
        toast.success(`Ylli i javës ${wk} u përditësua`);
      } else {
        await base44.entities.WeekStar.create(payload);
        toast.success(`Ylli i javës ${wk} u krijua ✓`);
      }
      setWeekNumber('');
      setSelectedPlayerId('');
      setSelectedClubId('');
      load();
    } catch (e) {
      console.error('WeekStar save error', e);
      toast.error('Gabim: ' + (e?.message || 'ruajtja dështoi'));
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    try {
      await base44.entities.WeekStar.delete(id);
      toast.success('U fshi');
      load();
    } catch (e) {
      toast.error('Gabim gjatë fshirjes');
    }
  };

  const sortedStars = [...stars].sort((a, b) => (Number(b.week_number) || 0) - (Number(a.week_number) || 0));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Yjet e Javës</h2>
          <p className="text-xs text-muted-foreground">ALBI MALL SUPERLIGA · Zgjedh yllin për çdo javë</p>
        </div>
      </div>

      {/* Create form */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-6">
        <div className="space-y-4">
          <div>
            <Label>Java (numri)</Label>
            <Input type="number" min={1} value={weekNumber} onChange={e => setWeekNumber(e.target.value)} placeholder="p.sh. 1" className="max-w-[120px]" />
          </div>
          <div>
            <Label>Klubi</Label>
            <Select value={selectedClubId} onValueChange={(v) => { setSelectedClubId(v); setSelectedPlayerId(''); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Zgjedh klubin" />
              </SelectTrigger>
              <SelectContent>
                {clubs.length === 0 && <SelectItem value="__none" disabled>Pa klube</SelectItem>}
                {clubs.map(cl => (
                  <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lojtari Yll i Javës</Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} disabled={!selectedClubId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedClubId ? 'Zgjedh lojtarin' : 'Zgjedh klubin së pari'} />
              </SelectTrigger>
              <SelectContent>
                {clubPlayers.length === 0 && <SelectItem value="__none" disabled>Pa lojtarë</SelectItem>}
                {clubPlayers.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.number ? `${p.number}. ` : ''}{p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1" />
            {saving ? 'Duke ruajtur...' : 'Ruaj Yllin'}
          </Button>
        </div>
      </div>

      {/* Existing stars */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : sortedStars.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Nuk ka yje të krijuar ende</p>
      ) : (
        <div className="space-y-2">
          {sortedStars.map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
              <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
              </div>
              <span className="text-xs font-black bg-yellow-400 text-black px-2 py-1 rounded-lg shrink-0">JAVA {s.week_number}</span>
              {s.player_photo ? (
                <img src={s.player_photo} alt="" className="w-10 h-10 rounded-full object-contain border border-border bg-muted shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0"><span className="text-sm font-bold">{s.player_name?.[0]}</span></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.player_name}</p>
                <p className="text-[10px] text-muted-foreground">{s.club_name}</p>
              </div>
              {s.club_logo && <img src={s.club_logo} alt="" className="w-6 h-6 object-contain shrink-0" />}
              <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}