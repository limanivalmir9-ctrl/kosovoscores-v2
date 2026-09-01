import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminTopScorers() {
  const [scorers, setScorers] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ player_name: '', player_id: '', photo: '', club_name: '', competition_id: '', goals: 0 });

  const load = async () => {
    const [allScorers, allComps, allPlayers, allClubs] = await Promise.all([
      base44.entities.TopScorer.list('-goals', 1000),
      base44.entities.Competition.list('-created_date', 200),
      base44.entities.Player.list('name', 500),
      base44.entities.Club.list('name', 200),
    ]);
    // Only current-season (non-archived, non-hidden) competitions — past seasons stay archived
    const currentComps = allComps.filter(c => !c.archived && !c.hidden);
    const activeCompIds = new Set(currentComps.map(c => c.id));
    setScorers(allScorers.filter(s => activeCompIds.has(s.competition_id)));
    setCompetitions(currentComps);
    setPlayers(allPlayers);
    setClubs(allClubs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await uploadOptimizedImage(file, { maxDim: 400 });
    setForm(prev => ({ ...prev, photo: file_url }));
  };

  const handleSave = async () => {
    if (!form.player_name || !form.competition_id) { toast.error('Plotëso fushat'); return; }
    const data = { ...form, goals: Number(form.goals) || 0 };
    if (editing) {
      await base44.entities.TopScorer.update(editing.id, data);
      toast.success('U përditësua');
    } else {
      await base44.entities.TopScorer.create(data);
      toast.success('U krijua');
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ player_name: '', player_id: '', photo: '', club_name: '', competition_id: '', goals: 0 });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    await base44.entities.TopScorer.delete(id);
    toast.success('U fshi');
    load();
  };

  const handlePlayerSelect = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      const club = clubs.find(c => c.id === player.club_id);
      setForm(prev => ({ ...prev, player_name: player.name, player_id: player.id, club_name: club?.name || prev.club_name }));
    }
  };

  // Group players by club for the selected competition
  const selectedComp = competitions.find(c => c.id === form.competition_id);
  const compClubs = clubs.filter(c => c.competition_id === form.competition_id);
  const groupedPlayers = compClubs.map(club => ({
    club,
    players: players.filter(p => p.club_id === club.id),
  })).filter(g => g.players.length > 0);

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Top Golashënuesit</h2>
        <Button onClick={() => { setEditing(null); setForm({ player_name: '', photo: '', club_name: '', competition_id: competitions[0]?.id || '', goals: 0 }); setDialogOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Shto
        </Button>
      </div>

      <div className="space-y-2">
        {scorers.map(scorer => (
          <div key={scorer.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
            {scorer.photo ? <img src={scorer.photo} alt="" className="w-10 h-10 rounded-full object-cover" /> :
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{scorer.player_name?.[0]}</div>}
            <div className="flex-1">
              <p className="text-sm font-semibold">{scorer.player_name}</p>
              <p className="text-xs text-muted-foreground">{scorer.club_name} • {scorer.goals} gola</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => {
                setEditing(scorer);
                setForm({ player_name: scorer.player_name, player_id: scorer.player_id || '', photo: scorer.photo || '', club_name: scorer.club_name || '', competition_id: scorer.competition_id || '', goals: scorer.goals || 0 });
                setDialogOpen(true);
              }}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(scorer.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {scorers.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka golashënues ende</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edito' : 'Shto'} Golashënues</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kompeticioni</Label>
              <Select value={form.competition_id} onValueChange={v => setForm(p => ({ ...p, competition_id: v, player_name: '', club_name: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {competitions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lojtari</Label>
              {groupedPlayers.length > 0 ? (
                <Select value={form.player_id} onValueChange={handlePlayerSelect}>
                  <SelectTrigger><SelectValue placeholder="Zgjedh lojtarin" /></SelectTrigger>
                  <SelectContent>
                    {groupedPlayers.map(group => (
                      <div key={group.club.id}>
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide bg-muted/50">{group.club.name}</div>
                        {group.players.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.number ? `${p.number}. ` : ''}{p.name}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.player_name} onChange={e => setForm(p => ({ ...p, player_name: e.target.value }))} placeholder="Emri i lojtarit" />
              )}
            </div>
            <div>
              <Label>Foto</Label>
              <Input type="file" accept="image/*" onChange={handleUploadPhoto} />
              {form.photo && <img src={form.photo} alt="" className="w-12 h-12 rounded-full mt-2 object-cover" />}
            </div>
            <div><Label>Klubi</Label><Input value={form.club_name} onChange={e => setForm(p => ({ ...p, club_name: e.target.value }))} /></div>
            <div><Label>Gola</Label><Input type="number" value={form.goals} onChange={e => setForm(p => ({ ...p, goals: e.target.value }))} /></div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Përditëso' : 'Krijo'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}