import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, History } from 'lucide-react';
import { toast } from 'sonner';
import CountrySelect from '@/components/CountrySelect';
import ClubCombobox from '@/components/ClubCombobox';
import PlayerHistoryRow from '@/components/player/PlayerHistoryRow';

const emptyForm = { from_club_name: '', from_club_logo: '', from_club_country: '', to_club_name: '', club_logo: '', to_club_country: '', season: '', year_from: '', year_to: '' };

export default function PlayerHistoryDialog({ open, onOpenChange, player }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    if (!player) return;
    setLoading(true);
    const list = await base44.entities.PlayerHistory.filter({ player_id: player.id }, '-season', 200).catch(() => []);
    setItems((list || []).sort((a, b) => (b.season || '').localeCompare(a.season || '')));
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, player?.id]);
  useEffect(() => { if (open) setForm(emptyForm); }, [open]);

  const addEntry = async () => {
    if (!form.to_club_name?.trim()) { toast.error('Klubi destinacion (tek) nevojitet'); return; }
    try {
      await base44.entities.PlayerHistory.create({
        player_id: player.id,
        player_name: player.name,
        club_name: form.to_club_name.trim(),
        club_logo: form.club_logo || '',
        country: form.to_club_country,
        from_club_name: form.from_club_name?.trim() || '',
        from_club_logo: form.from_club_logo || '',
        from_club_country: form.from_club_country || '',
        season: form.season?.trim() || '',
        year_from: form.year_from ? Number(form.year_from) : undefined,
        year_to: form.year_to ? Number(form.year_to) : undefined,
      });
      setForm(emptyForm);
      toast.success('Transferimi u shtua');
      load();
    } catch (err) {
      toast.error('Gabim: ' + (err?.message || 'Error'));
    }
  };

  const removeEntry = async (id) => {
    if (!confirm('Fshi këtë zë nga historia?')) return;
    await base44.entities.PlayerHistory.delete(id).catch(() => {});
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="w-4 h-4" /> Historia — {player?.name}</DialogTitle>
        </DialogHeader>

        {/* Add form */}
        <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/30">
          <div className="space-y-2 pb-3 border-b border-border/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Nga klubi (origjina)</p>
            <div>
              <Label>Emri i klubit</Label>
              <ClubCombobox value={form.from_club_name} onChange={sel => setForm(p => ({ ...p, from_club_name: sel.name, from_club_logo: sel.logo || '' }))} placeholder="Kërko klubin e origjinës…" />
            </div>
            <div><Label>Shteti (flamuri)</Label><CountrySelect value={form.from_club_country} onChange={v => setForm(p => ({ ...p, from_club_country: v }))} /></div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Tek klubi (destinacioni) *</p>
            <div>
              <Label>Emri i klubit *</Label>
              <ClubCombobox value={form.to_club_name} onChange={sel => setForm(p => ({ ...p, to_club_name: sel.name, club_logo: sel.logo || '' }))} placeholder="Kërko klubin destinacion…" />
            </div>
            <div><Label>Shteti (flamuri)</Label><CountrySelect value={form.to_club_country} onChange={v => setForm(p => ({ ...p, to_club_country: v }))} /></div>
          </div>
          <div>
            <Label>Viti Nga – Deri</Label>
            <div className="flex gap-2">
              <Input type="number" value={form.year_from} onChange={e => setForm(p => ({ ...p, year_from: e.target.value }))} placeholder="Nga (p.sh. 2023)" />
              <Input type="number" value={form.year_to} onChange={e => setForm(p => ({ ...p, year_to: e.target.value }))} placeholder="Deri (p.sh. 2025)" />
            </div>
          </div>
          <div><Label>Sezoni (opsionale)</Label><Input value={form.season} onChange={e => setForm(p => ({ ...p, season: e.target.value }))} placeholder="p.sh. 2023/24" /></div>
          <Button onClick={addEntry} size="sm" className="w-full"><Plus className="w-4 h-4 mr-1" /> Shto në histori</Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {loading && <p className="text-xs text-muted-foreground text-center py-2">Duke ngarkuar...</p>}
          {!loading && items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Ende pa zë në histori.</p>}
          {items.map(h => (
            <PlayerHistoryRow
              key={h.id}
              entry={h}
              onDelete={() => removeEntry(h.id)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}