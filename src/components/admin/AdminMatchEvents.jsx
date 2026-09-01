import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const EVENT_TYPES = [
  { value: 'goal', label: '⚽ Gol' },
  { value: 'penalty_goal', label: '⚽ Gol Penalti' },
  { value: 'own_goal', label: '⚽ Auto Gol' },
  { value: 'yellow_card', label: '🟨 Karton i Verdhë' },
  { value: 'second_yellow', label: '🟨🟥 Verdhë/Kuq' },
  { value: 'red_card', label: '🟥 Karton i Kuq' },
  { value: 'substitution', label: '🔄 Zëvendësim' },
  { value: 'missed_penalty', label: '❌ Penalti e Humbur' },
  { value: 'var_canceled', label: '📺 VAR - Gol i Anuluar' },
];

const EMPTY_FORM = {
  team: 'home', type: 'goal', minute: '', extra_time_minute: '',
  player_name: '', assist_player_name: '',
  player_in_name: '', player_out_name: '',
  home_score_after: '', away_score_after: '',
};

export default function AdminMatchEvents({ match, open, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadEvents = async () => {
    if (!match) return;
    setLoading(true);
    const evts = await base44.entities.MatchEvent.filter({ match_id: match.id }, 'minute', 200);
    evts.sort((a, b) => {
      const minA = (a.minute||0)*10000 + (a.extra_time_minute||0);
      const minB = (b.minute||0)*10000 + (b.extra_time_minute||0);
      if (minA !== minB) return minA - minB;
      return (a.event_timestamp||0) - (b.event_timestamp||0);
    });
    setEvents(evts);
    setLoading(false);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(events);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setEvents(reordered);
    // Save new order: assign sequential event_timestamps based on new position
    const base = Date.now();
    await Promise.all(reordered.map((evt, i) =>
      base44.entities.MatchEvent.update(evt.id, { event_timestamp: base + i * 1000 })
    ));
    toast.success('Radhitja u ruajt');
  };

  useEffect(() => { if (open && match) loadEvents(); }, [open, match?.id]);

  const openAdd = () => {
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (evt) => {
    setEditingEvent(evt);
    setForm({
      team: evt.team || 'home',
      type: evt.type || 'goal',
      minute: evt.minute || '',
      extra_time_minute: evt.extra_time_minute || '',
      player_name: evt.player_name || '',
      assist_player_name: evt.assist_player_name || '',
      player_in_name: evt.player_in_name || '',
      player_out_name: evt.player_out_name || '',
      home_score_after: evt.home_score_after !== undefined ? String(evt.home_score_after) : '',
      away_score_after: evt.away_score_after !== undefined ? String(evt.away_score_after) : '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const data = {
      match_id: match.id,
      team: form.team,
      type: form.type,
      minute: Number(form.minute) || 0,
      extra_time_minute: form.extra_time_minute ? Number(form.extra_time_minute) : undefined,
      player_name: form.player_name || '',
      player_id: currentPlayerMap[form.player_name] || undefined,
      assist_player_name: form.assist_player_name || '',
      assist_player_id: currentPlayerMap[form.assist_player_name] || undefined,
      player_in_name: form.player_in_name || '',
      player_in_id: currentPlayerMap[form.player_in_name] || undefined,
      player_out_name: form.player_out_name || '',
      player_out_id: currentPlayerMap[form.player_out_name] || undefined,
    };
    const isGoal = ['goal', 'penalty_goal', 'own_goal'].includes(form.type);
    if (isGoal && form.home_score_after !== '') {
      data.home_score_after = Number(form.home_score_after);
      data.away_score_after = Number(form.away_score_after);
    }
    if (editingEvent) {
      await base44.entities.MatchEvent.update(editingEvent.id, data);
      toast.success('Ngjarja u përditësua');
    } else {
      await base44.entities.MatchEvent.create({ ...data, event_timestamp: Date.now() });
      toast.success('Ngjarja u shtua');
    }
    setFormOpen(false);
    loadEvents();
  };

  const handleDelete = async (evt) => {
    if (!confirm('Fshi këtë ngjarje?')) return;
    await base44.entities.MatchEvent.delete(evt.id);
    toast.success('U fshi');
    loadEvents();
  };

  const isSub = form.type === 'substitution';
  const isGoalType = ['goal', 'penalty_goal', 'own_goal'].includes(form.type);

  // Get players from match lineup — map name -> player_id (6-digit) for ID linking
  const homePlayerMap = {};
  (match?.home_lineup || []).forEach(p => { if (p.name) homePlayerMap[p.name] = p.player_id; });
  const awayPlayerMap = {};
  (match?.away_lineup || []).forEach(p => { if (p.name) awayPlayerMap[p.name] = p.player_id; });
  const homePlayers = Object.keys(homePlayerMap);
  const awayPlayers = Object.keys(awayPlayerMap);
  const currentPlayers = form.team === 'home' ? homePlayers : awayPlayers;
  const currentPlayerMap = form.team === 'home' ? homePlayerMap : awayPlayerMap;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Ngjarjet — {match?.home_team_name} vs {match?.away_team_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center mb-3">
          <p className="text-xs text-muted-foreground">{events.length} ngjarje</p>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Shto Ngjarje</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : events.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nuk ka ngjarje</p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="events">
              {(provided) => (
                <div className="space-y-1" ref={provided.innerRef} {...provided.droppableProps}>
                  {events.map((evt, index) => (
                    <Draggable key={evt.id} draggableId={evt.id} index={index}>
                      {(drag, snapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                            ['goal','penalty_goal','own_goal'].includes(evt.type) ? 'bg-green-50 border-green-200' : 'bg-card border-border',
                            snapshot.isDragging && 'shadow-lg opacity-90'
                          )}
                        >
                          <span {...drag.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                            <GripVertical className="w-3 h-3" />
                          </span>
                          <span className="font-mono font-bold w-8 text-center text-muted-foreground">{evt.minute}{evt.extra_time_minute ? `+${evt.extra_time_minute}` : ''}'</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', evt.team === 'home' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700')}>
                            {evt.team === 'home' ? match?.home_team_name?.split(' ')[0] : match?.away_team_name?.split(' ')[0]}
                          </span>
                          <span className="font-semibold">{EVENT_TYPES.find(t => t.value === evt.type)?.label || evt.type}</span>
                          <span className="flex-1 text-muted-foreground truncate">{evt.player_name}{evt.assist_player_name ? ` (As. ${evt.assist_player_name})` : ''}{evt.player_in_name ? ` ↑${evt.player_in_name}` : ''}{evt.player_out_name ? ` ↓${evt.player_out_name}` : ''}</span>
                          {evt.home_score_after !== undefined && (
                            <span className="font-black text-[10px] bg-foreground text-background rounded px-1">{evt.home_score_after}:{evt.away_score_after}</span>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(evt)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(evt)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Add/Edit form dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingEvent ? 'Edito' : 'Shto'} Ngjarje</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Ekipi</Label>
                  <Select value={form.team} onValueChange={v => setForm(p => ({ ...p, team: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">{match?.home_team_name}</SelectItem>
                      <SelectItem value="away">{match?.away_team_name}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Lloji</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Minuta</Label><Input type="number" value={form.minute} onChange={e => setForm(p => ({ ...p, minute: e.target.value }))} /></div>
                <div><Label className="text-xs">Shtesë (+min)</Label><Input type="number" value={form.extra_time_minute} onChange={e => setForm(p => ({ ...p, extra_time_minute: e.target.value }))} /></div>
              </div>

              {isSub ? (
                <>
                  <div>
                    <Label className="text-xs">Lojtari që futet (IN)</Label>
                    <select value={form.player_in_name} onChange={e => setForm(p => ({ ...p, player_in_name: e.target.value }))} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">-- Zgjedh --</option>
                      {currentPlayers.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <Input className="mt-1" placeholder="Ose shkruaj..." value={form.player_in_name} onChange={e => setForm(p => ({ ...p, player_in_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Lojtari që del (OUT)</Label>
                    <select value={form.player_out_name} onChange={e => setForm(p => ({ ...p, player_out_name: e.target.value }))} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">-- Zgjedh --</option>
                      {currentPlayers.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <Input className="mt-1" placeholder="Ose shkruaj..." value={form.player_out_name} onChange={e => setForm(p => ({ ...p, player_out_name: e.target.value }))} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs">Lojtari</Label>
                    <select value={form.player_name} onChange={e => setForm(p => ({ ...p, player_name: e.target.value }))} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">-- Zgjedh --</option>
                      {currentPlayers.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <Input className="mt-1" placeholder="Ose shkruaj..." value={form.player_name} onChange={e => setForm(p => ({ ...p, player_name: e.target.value }))} />
                  </div>
                  {isGoalType && (
                    <div>
                      <Label className="text-xs">Asistues</Label>
                      <select value={form.assist_player_name} onChange={e => setForm(p => ({ ...p, assist_player_name: e.target.value }))} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                        <option value="">-- Pa asist --</option>
                        {currentPlayers.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <Input className="mt-1" placeholder="Ose shkruaj..." value={form.assist_player_name} onChange={e => setForm(p => ({ ...p, assist_player_name: e.target.value }))} />
                    </div>
                  )}
                </>
              )}

              {isGoalType && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Rezultati Vendas pas golit</Label><Input type="number" value={form.home_score_after} onChange={e => setForm(p => ({ ...p, home_score_after: e.target.value }))} /></div>
                  <div><Label className="text-xs">Rezultati Mysafir pas golit</Label><Input type="number" value={form.away_score_after} onChange={e => setForm(p => ({ ...p, away_score_after: e.target.value }))} /></div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setFormOpen(false)} className="flex-1">Anulo</Button>
                <Button onClick={handleSave} className="flex-1">{editingEvent ? 'Ruaj' : 'Shto'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}