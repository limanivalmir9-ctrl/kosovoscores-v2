import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Package, Send, ArrowLeft, Plus, Pencil, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { countryInfo } from '@/lib/countries';
import Flag from '@/components/Flag';
import MagazinePlayerForm from '@/components/admin/MagazinePlayerForm';
import PlayerHistoryDialog from '@/components/admin/PlayerHistoryDialog';

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
const POSITION_LABELS = { Goalkeeper: 'Portier', Defender: 'Mbrojtës', Midfielder: 'Mesfushor', Forward: 'Sulmues' };
const POSITION_COLORS = { Goalkeeper: 'text-yellow-600', Defender: 'text-blue-600', Midfielder: 'text-green-600', Forward: 'text-red-500' };
const POS_ORDER = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };

export default function AdminPlayerMagazine() {
  const [players, setPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [assigning, setAssigning] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [historyPlayer, setHistoryPlayer] = useState(null);

  const load = async () => {
    const [allPlayers, allClubs] = await Promise.all([
      base44.entities.Player.list('-updated_date', 2000),
      base44.entities.Club.list('-created_date', 1000),
    ]);
    const free = allPlayers.filter(p => !p.club_id);
    setPlayers(free);
    setClubs(allClubs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = !q ? players : players.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.player_id?.toLowerCase().includes(q) ||
      (p.position && POSITION_LABELS[p.position]?.toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => {
      const pa = POS_ORDER[a.position] ?? 4;
      const pb = POS_ORDER[b.position] ?? 4;
      if (pa !== pb) return pa - pb;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [players, q]);

  const grouped = POSITIONS.reduce((acc, pos) => {
    acc[pos] = filtered.filter(p => p.position === pos);
    return acc;
  }, {});
  const ungrouped = filtered.filter(p => !p.position);

  const assignToClub = async (playerId, clubId) => {
    if (!clubId) return;
    const club = clubs.find(c => c.id === clubId);
    if (!club) return;
    setAssigning(playerId);
    try {
      await base44.entities.Player.update(playerId, {
        club_id: club.id,
        competition_id: club.competition_id || '',
      });
      toast.success('Lojtari u vendos te ' + club.name);
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    } catch (err) {
      toast.error('Gabim: ' + (err?.message || 'Error'));
    } finally {
      setAssigning(null);
    }
  };

  const openCreate = () => { setEditingPlayer(null); setFormOpen(true); };
  const openEdit = (player) => { setEditingPlayer(player); setFormOpen(true); };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <Link to="/ks-panel-7k4m9" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Ballina
      </Link>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Magazina e Lojtarëve</h2>
            <p className="text-xs text-muted-foreground">{players.length} lojtarë pa klub</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Shto Lojtar</Button>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Kërko lojtar..." className="pl-8 w-48" />
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
        Këta lojtarë janë pa klub (free agents). Mund t'i editosh plotësisht (foto, pozicion, kombësi, etj.), t'u shtosh histori karriere, ose t'i transferosh te një klub.
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          {players.length === 0 ? 'Magazina është bosh — shto lojtar të ri ose dërgo nga faqja e klubit.' : 'Nuk u gjetën lojtarë për kërkimin tuaj.'}
        </p>
      ) : (
        <div className="space-y-6">
          {[...POSITIONS, null].map(pos => {
            const group = pos ? grouped[pos] : ungrouped;
            if (!group || group.length === 0) return null;
            return (
              <div key={pos || 'other'}>
                <p className={`text-xs font-black uppercase tracking-widest mb-2 ${pos ? POSITION_COLORS[pos] : 'text-muted-foreground'}`}>
                  {pos ? POSITION_LABELS[pos] : 'Pa pozicion'} ({group.length})
                </p>
                <div className="space-y-2">
                  {group.map(player => {
                    const ci = countryInfo(player.nationality);
                    return (
                      <div key={player.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                        {player.photo ? (
                          <img src={player.photo} alt={player.name} className="w-10 h-10 rounded-xl object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
                            <span className="text-sm font-black text-muted-foreground">{player.number || '?'}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{player.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {player.number && <span className="text-[10px] font-bold text-muted-foreground">#{player.number}</span>}
                            <Flag value={player.nationality} size={15} />
                            {ci?.name && <span className="text-[10px] text-muted-foreground">{ci.name}</span>}
                            {player.player_id && <span className="text-[9px] font-mono text-muted-foreground/50">{player.player_id}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" title="Historia" onClick={() => setHistoryPlayer(player)}><History className="w-4 h-4 text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" title="Edito" onClick={() => openEdit(player)}><Pencil className="w-4 h-4" /></Button>
                        </div>
                        <div className="w-40 shrink-0">
                          <Select value="" onValueChange={v => assignToClub(player.id, v)} disabled={assigning === player.id}>
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder={assigning === player.id ? 'Duke dërguar...' : 'Dërgo te klubi...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {clubs.filter(c => c.active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MagazinePlayerForm open={formOpen} onOpenChange={setFormOpen} player={editingPlayer} onSaved={load} />
      <PlayerHistoryDialog open={!!historyPlayer} onOpenChange={(o) => { if (!o) setHistoryPlayer(null); }} player={historyPlayer} />
    </div>
  );
}