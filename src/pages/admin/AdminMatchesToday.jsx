import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, Play, Pause, Square, Clock } from 'lucide-react';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import moment from 'moment';

function LiveClock({ match }) {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (match.status !== 'first_half' && match.status !== 'second_half') { setDisplay(''); return; }
    const tick = () => {
      let totalSecs;
      if (match.status === 'first_half' && match.match_start_timestamp)
        totalSecs = Math.floor((Date.now() - match.match_start_timestamp) / 1000);
      else if (match.status === 'second_half' && match.second_half_start_timestamp)
        totalSecs = Math.floor((Date.now() - match.second_half_start_timestamp) / 1000) + 45 * 60;
      else totalSecs = (match.minute || 0) * 60;
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      const base = match.status === 'first_half' ? 45 : 90;
      if (mins >= base) setDisplay(`${base}+${mins - base}:${String(secs).padStart(2, '0')}`);
      else setDisplay(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match.status, match.match_start_timestamp, match.second_half_start_timestamp, match.minute]);
  if (!display) return null;
  return <span className="text-live font-mono font-bold text-lg">{display}</span>;
}

const STATUS_LABELS = {
  scheduled: 'Planifikuar', first_half: 'Pjesa 1', half_time: 'Pushim',
  second_half: 'Pjesa 2', full_time: 'Përfundoi',
};

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function AdminMatchesToday() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [matchEvents, setMatchEvents] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [addEventDialog, setAddEventDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({ type: 'goal', minute: '', player_name: '', team: 'home' });
  const [editEventDialog, setEditEventDialog] = useState(null);
  const [editEventData, setEditEventData] = useState({});
  const [matchPlayers, setMatchPlayers] = useState({ home: [], away: [] });
  const [extraFirst, setExtraFirst] = useState(0);
  const [extraSecond, setExtraSecond] = useState(0);
  const [editTimeDialog, setEditTimeDialog] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState('');
  const [adjustClockDialog, setAdjustClockDialog] = useState(false);
  const [adjustMins, setAdjustMins] = useState(0);
  const [adjustSecs, setAdjustSecs] = useState(0);
  // Agent online tracking per match
  const [agentOnline, setAgentOnline] = useState({});

  const load = async () => {
    const today = moment().format('YYYY-MM-DD');
    const allMatches = await base44.entities.Match.filter({ date: today }, 'time', 100);
    setMatches(allMatches);
    setLoading(false);
  };

  // Track agent online status via agent_last_seen heartbeat on Match entity
  useEffect(() => {
    const checkAgents = () => {
      const now = Date.now();
      const online = {};
      matches.forEach(m => {
        if (m.agent_last_seen && m.agent_last_seen > 0 && now - m.agent_last_seen < 90000) {
          online[m.id] = true;
        }
      });
      setAgentOnline(online);
    };
    checkAgents();
    const interval = setInterval(checkAgents, 15000);
    return () => clearInterval(interval);
  }, [matches]);

  useEffect(() => {
    load();
    const unsub = base44.entities.Match.subscribe(async () => {
      const today = moment().format('YYYY-MM-DD');
      const allMatches = await base44.entities.Match.filter({ date: today }, 'time', 100);
      setMatches(allMatches);
      // Update selected if open
      setSelected(prev => {
        if (!prev) return prev;
        const updated = allMatches.find(m => m.id === prev.id);
        return updated || prev;
      });
    });
    return unsub;
  }, []);

  const openMatch = async (match) => {
    setSelected(match);
    setExtraFirst(match.extra_time_first_half || 0);
    setExtraSecond(match.extra_time_second_half || 0);
    const [evts, hPlayers, aPlayers] = await Promise.all([
      base44.entities.MatchEvent.filter({ match_id: match.id }, 'minute', 200),
      base44.entities.Player.filter({ club_id: match.home_team_id }, 'number', 50),
      base44.entities.Player.filter({ club_id: match.away_team_id }, 'number', 50),
    ]);
    setMatchEvents(evts);
    setMatchPlayers({ home: hPlayers, away: aPlayers });
  };

  const refreshSelected = async (matchId) => {
    const evts = await base44.entities.MatchEvent.filter({ match_id: matchId }, 'minute', 200);
    setMatchEvents(evts);
  };

  // Real-time push notifications for critical events (admin view)
  useEventNotifications(matchEvents, selected);

  // Match status control
  const saveMatchTime = async () => {
    await base44.entities.Match.update(selected.id, { time: editTimeValue });
    toast.success('Ora u ndryshua');
    setEditTimeDialog(false);
    const updated = await base44.entities.Match.filter({ id: selected.id });
    if (updated[0]) setSelected(updated[0]);
    load();
  };

  const openAdjustClock = () => {
    // Pre-fill with current live time
    if (selected.status === 'first_half' && selected.match_start_timestamp) {
      const elapsed = Math.floor((Date.now() - selected.match_start_timestamp) / 1000);
      setAdjustMins(Math.floor(elapsed / 60));
      setAdjustSecs(elapsed % 60);
    } else if (selected.status === 'second_half' && selected.second_half_start_timestamp) {
      const elapsed = Math.floor((Date.now() - selected.second_half_start_timestamp) / 1000) + 45 * 60;
      setAdjustMins(Math.floor(elapsed / 60));
      setAdjustSecs(elapsed % 60);
    } else {
      setAdjustMins(0);
      setAdjustSecs(0);
    }
    setAdjustClockDialog(true);
  };

  const applyClockAdjust = async () => {
    const targetMins = Math.max(0, Number(adjustMins) || 0);
    const targetSecs = Math.min(59, Math.max(0, Number(adjustSecs) || 0));
    const targetTotalSecs = targetMins * 60 + targetSecs;
    const now = Date.now();
    let updateData = {};
    if (selected.status === 'first_half') {
      updateData.match_start_timestamp = now - targetTotalSecs * 1000;
    } else if (selected.status === 'second_half') {
      updateData.second_half_start_timestamp = now - (targetTotalSecs - 45 * 60) * 1000;
    } else {
      toast.error('Mund të rregullosh kohën vetëm gjatë pjesës 1 ose 2');
      return;
    }
    await base44.entities.Match.update(selected.id, updateData);
    toast.success(`Koha u vendos: ${String(targetMins).padStart(2,'0')}:${String(targetSecs).padStart(2,'0')}`);
    setAdjustClockDialog(false);
    const updated = await base44.entities.Match.filter({ id: selected.id });
    if (updated[0]) setSelected(updated[0]);
  };

  const updateStandingsOnEnd = async (match) => {
    const homeScore = match.home_score || 0;
    const awayScore = match.away_score || 0;
    const [homeS, awayS] = await Promise.all([
      base44.entities.Standing.filter({ competition_id: match.competition_id, club_id: match.home_team_id }),
      base44.entities.Standing.filter({ competition_id: match.competition_id, club_id: match.away_team_id }),
    ]);
    const updateS = async (s, gf, ga) => {
      if (!s) return;
      const data = { played: (s.played || 0) + 1, goals_for: (s.goals_for || 0) + gf, goals_against: (s.goals_against || 0) + ga };
      if (gf > ga) { data.won = (s.won || 0) + 1; data.points = (s.points || 0) + 3; }
      else if (gf === ga) { data.drawn = (s.drawn || 0) + 1; data.points = (s.points || 0) + 1; }
      else { data.lost = (s.lost || 0) + 1; }
      data.goal_difference = ((s.goals_for || 0) + gf) - ((s.goals_against || 0) + ga);
      await base44.entities.Standing.update(s.id, data);
    };
    await Promise.all([updateS(homeS[0], homeScore, awayScore), updateS(awayS[0], awayScore, homeScore)]);
    const allS = await base44.entities.Standing.filter({ competition_id: match.competition_id });
    const sorted = [...allS].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.goal_difference || 0) - (a.goal_difference || 0));
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].position !== i + 1) await base44.entities.Standing.update(sorted[i].id, { position: i + 1 });
    }
  };

  const doStatusChange = async () => {
    const match = selected;
    let updateData = {};
    switch (match.status) {
      case 'scheduled':
        updateData = { status: 'first_half', minute: 1, match_start_timestamp: Date.now() };
        toast.success('Ndeshja filloi!');
        break;
      case 'first_half':
        updateData = { status: 'half_time', minute: 45 };
        toast.success('Pushim!');
        break;
      case 'half_time':
        updateData = { status: 'second_half', minute: 46, second_half_start_timestamp: Date.now() };
        toast.success('Pjesa e dytë filloi!');
        break;
      case 'second_half':
        updateData = { status: 'full_time', minute: 90 };
        await updateStandingsOnEnd(match);
        await base44.entities.Match.update(match.id, { match_code: generateCode() });
        toast.success('Ndeshja përfundoi!');
        break;
      default: return;
    }
    await base44.entities.Match.update(match.id, updateData);
    setConfirmDialog(null);
  };

  const handleExtraTime = async (half) => {
    const val = half === 'first' ? Number(extraFirst) || 0 : Number(extraSecond) || 0;
    const key = half === 'first' ? 'extra_time_first_half' : 'extra_time_second_half';
    await base44.entities.Match.update(selected.id, { [key]: val });
    toast.success(`Minutat shtesë: +${val}`);
  };

  const addEvent = async () => {
    // Auto-calculate minute from live clock
    let liveMins = 0;
    if (selected.status === 'first_half' && selected.match_start_timestamp) {
      liveMins = Math.ceil((Date.now() - selected.match_start_timestamp) / 1000 / 60);
    } else if (selected.status === 'second_half' && selected.second_half_start_timestamp) {
      liveMins = Math.ceil((Date.now() - selected.second_half_start_timestamp) / 1000 / 60) + 45;
    }
    const minuteToUse = newEvent.minute ? Number(newEvent.minute) : liveMins;
    await base44.entities.MatchEvent.create({
      match_id: selected.id,
      team: newEvent.team,
      type: newEvent.type,
      minute: minuteToUse,
      player_name: newEvent.player_name || '',
    });
    toast.success('Ngjarja u shtua');
    setAddEventDialog(false);
    setNewEvent({ type: 'goal', minute: '', player_name: '', team: 'home' });
    refreshSelected(selected.id);
  };

  const deleteEvent = async (id) => {
    await base44.entities.MatchEvent.delete(id);
    toast.success('U fshi');
    refreshSelected(selected.id);
  };

  const saveEventEdit = async () => {
    const updateData = {
      player_name: editEventData.player_name,
      minute: Number(editEventData.minute) || editEventDialog.minute,
      type: editEventData.type,
    };
    if (['goal','penalty_goal','own_goal'].includes(editEventData.type) && editEventData.home_score_after !== undefined) {
      updateData.home_score_after = editEventData.home_score_after;
      updateData.away_score_after = editEventData.away_score_after;
    }
    await base44.entities.MatchEvent.update(editEventDialog.id, updateData);
    toast.success('U përditësua');
    setEditEventDialog(null);
    refreshSelected(selected.id);
  };

  const getStatusBadge = (status) => {
    const isLive = status === 'first_half' || status === 'second_half';
    return (
      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', isLive ? 'bg-live text-white' : status === 'full_time' ? 'bg-muted text-muted-foreground' : 'bg-secondary/20 text-secondary-foreground')}>
        {STATUS_LABELS[status] || status}
      </span>
    );
  };

  const getStatusButton = (status) => {
    switch (status) {
      case 'scheduled': return { label: 'MATCH START', icon: Play, color: 'bg-green-500 hover:bg-green-600 text-white', confirm: 'A doni të filloni ndeshjen?' };
      case 'first_half': return { label: 'HALF TIME', icon: Pause, color: 'bg-yellow-500 hover:bg-yellow-600 text-white', confirm: 'A doni të shpallni pushimin?' };
      case 'half_time': return { label: 'SECOND HALF', icon: Play, color: 'bg-primary hover:bg-primary/90 text-white', confirm: 'A doni të filloni pjesën e dytë?' };
      case 'second_half': return { label: 'MATCH END', icon: Square, color: 'bg-live hover:bg-live/90 text-white', confirm: 'A doni të përfundoni ndeshjen?' };
      default: return null;
    }
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  if (selected) {
    const sorted = [...matchEvents].sort((a, b) => (a.minute || 0) - (b.minute || 0));
    const btnCfg = getStatusButton(selected.status);
    const BtnIcon = btnCfg?.icon;
    const firstHalfExtraLocked = selected.status === 'half_time' || selected.status === 'second_half' || selected.status === 'full_time';
    const secondHalfExtraLocked = selected.status !== 'second_half';

    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-xs text-primary hover:underline mb-4 inline-block">← Kthehu</button>

        {/* Match Header Card */}
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusBadge(selected.status)}
              <LiveClock match={selected} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openAdjustClock}
                className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 border border-orange-300 px-2 py-1 rounded-lg hover:bg-orange-200 transition-colors font-bold"
                title="Rregulllo kohën e lojës"
              >
                ⏱ Rregullo
              </button>
              <button
                onClick={() => { setEditTimeValue(selected.time || ''); setEditTimeDialog(true); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono font-bold">{selected.time || '--:--'}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              {selected.home_team_logo && <img src={selected.home_team_logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain" />}
              <p className="text-xs font-bold truncate">{selected.home_team_name}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-3xl font-black">{selected.home_score ?? 0} - {selected.away_score ?? 0}</p>
            </div>
            <div className="flex-1 text-center">
              {selected.away_team_logo && <img src={selected.away_team_logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain" />}
              <p className="text-xs font-bold truncate">{selected.away_team_name}</p>
            </div>
          </div>
        </div>

        {/* Status Control */}
        {btnCfg && (
          <Button
            onClick={() => setConfirmDialog(btnCfg)}
            className={`w-full py-5 text-sm font-bold mb-4 ${btnCfg.color}`}
          >
            {BtnIcon && <BtnIcon className="w-4 h-4 mr-2" />}
            {btnCfg.label}
          </Button>
        )}

        {/* Extra Time */}
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <p className="text-xs font-bold mb-3">Minutat Shtesë</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Pjesa e parë</Label>
              <div className="flex gap-1">
                <Input type="number" value={extraFirst} onChange={e => setExtraFirst(e.target.value)} className="text-center" min={0} disabled={firstHalfExtraLocked} />
                <Button variant="outline" size="sm" onClick={() => handleExtraTime('first')} disabled={firstHalfExtraLocked}>OK</Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Pjesa e dytë</Label>
              <div className="flex gap-1">
                <Input type="number" value={extraSecond} onChange={e => setExtraSecond(e.target.value)} className="text-center" min={0} disabled={secondHalfExtraLocked} />
                <Button variant="outline" size="sm" onClick={() => handleExtraTime('second')} disabled={secondHalfExtraLocked}>OK</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Ngjarjet</h3>
            <Button size="sm" onClick={() => setAddEventDialog(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Shto</Button>
          </div>
          {sorted.length === 0 && <p className="text-xs text-muted-foreground">Nuk ka ngjarje ende</p>}
          <div className="space-y-1">
            {sorted.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-muted/50">
                <span className="text-muted-foreground font-mono min-w-[30px]">{e.minute ? `${e.minute}'` : ''}</span>
                <span className="flex-1 font-medium">{e.type} – {e.player_name || '—'} ({e.team})</span>
                <button onClick={() => { setEditEventDialog(e); setEditEventData({ player_name: e.player_name || '', minute: e.minute || '', type: e.type, home_score_after: e.home_score_after, away_score_after: e.away_score_after }); }} className="p-1 hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteEvent(e.id)} className="p-1 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Time Dialog */}
        <Dialog open={editTimeDialog} onOpenChange={setEditTimeDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader><DialogTitle>Ndrysho Oren e Ndeshjes</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input type="time" value={editTimeValue} onChange={e => setEditTimeValue(e.target.value)} className="text-center text-lg font-mono" />
              <Button onClick={saveMatchTime} className="w-full">Ruaj</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Adjust Live Clock Dialog — spinner style */}
        <Dialog open={adjustClockDialog} onOpenChange={setAdjustClockDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader><DialogTitle>⏱ Vendos Kohën e Lojës</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground text-center">Vendos minutën dhe sekondën aktuale të ndeshjes</p>
            <div className="flex items-center justify-center gap-4 py-4">
              {/* Minutes spinner */}
              <div className="flex flex-col items-center gap-1">
                <Label className="text-xs text-muted-foreground">Minuta</Label>
                <button onClick={() => setAdjustMins(v => Math.max(0, Number(v) + 1))} className="w-10 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-lg font-bold">▲</button>
                <input
                  type="number"
                  value={adjustMins}
                  onChange={e => setAdjustMins(Math.max(0, Number(e.target.value)))}
                  className="w-16 h-12 text-center font-mono font-black text-2xl border border-input rounded-lg bg-background"
                />
                <button onClick={() => setAdjustMins(v => Math.max(0, Number(v) - 1))} className="w-10 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-lg font-bold">▼</button>
              </div>
              <span className="text-3xl font-black text-muted-foreground pb-2">:</span>
              {/* Seconds spinner */}
              <div className="flex flex-col items-center gap-1">
                <Label className="text-xs text-muted-foreground">Sekonda</Label>
                <button onClick={() => setAdjustSecs(v => Math.min(59, Number(v) + 1))} className="w-10 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-lg font-bold">▲</button>
                <input
                  type="number"
                  value={adjustSecs}
                  onChange={e => setAdjustSecs(Math.min(59, Math.max(0, Number(e.target.value))))}
                  className="w-16 h-12 text-center font-mono font-black text-2xl border border-input rounded-lg bg-background"
                />
                <button onClick={() => setAdjustSecs(v => Math.max(0, Number(v) - 1))} className="w-10 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-lg font-bold">▼</button>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center text-sm font-black text-orange-700 font-mono">
              {String(adjustMins).padStart(2,'0')}:{String(adjustSecs).padStart(2,'0')}
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setAdjustClockDialog(false)} className="flex-1">Anulo</Button>
              <Button onClick={applyClockAdjust} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">Apliko</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Status Dialog */}
        <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Konfirmo Ndryshimin</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">{confirmDialog?.confirm}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmDialog(null)} className="flex-1">Anulo</Button>
              <Button onClick={doStatusChange} className="flex-1">Po, Konfirmo</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Event Dialog */}
        <Dialog open={addEventDialog} onOpenChange={setAddEventDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Shto Ngjarje</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Ekipi</Label>
                <Select value={newEvent.team} onValueChange={v => setNewEvent(p => ({ ...p, team: v }))}>                <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">{selected.home_team_name}</SelectItem>
                    <SelectItem value="away">{selected.away_team_name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Lloji</Label>
                <Select value={newEvent.type} onValueChange={v => setNewEvent(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['goal','penalty_goal','own_goal','yellow_card','second_yellow','red_card','substitution','var_canceled','missed_penalty'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Minuta (lër bosh për minutën aktuale)</Label><Input type="number" value={newEvent.minute} onChange={e => setNewEvent(p => ({ ...p, minute: e.target.value }))} placeholder="Auto" /></div>
              <div>
                <Label>Emri i Lojtarit</Label>
                <select value={newEvent.player_name} onChange={e => setNewEvent(p => ({ ...p, player_name: e.target.value }))} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="">-- Shkruaj manuale --</option>
                  {(newEvent.team === 'home' ? matchPlayers.home : matchPlayers.away).map(p => (
                    <option key={p.id} value={p.name}>{p.number ? `${p.number}. ` : ''}{p.name}</option>
                  ))}
                </select>
                <Input className="mt-1" placeholder="Ose shkruaj manuale..." value={newEvent.player_name} onChange={e => setNewEvent(p => ({ ...p, player_name: e.target.value }))} />
              </div>
              <Button onClick={addEvent} className="w-full">Shto</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={!!editEventDialog} onOpenChange={() => setEditEventDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Edito Ngjarjen</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Lloji</Label>
                <Select value={editEventData.type} onValueChange={v => setEditEventData(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['goal','penalty_goal','own_goal','yellow_card','second_yellow','red_card','substitution','var_canceled','missed_penalty'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Minuta</Label><Input type="number" value={editEventData.minute} onChange={e => setEditEventData(p => ({ ...p, minute: e.target.value }))} /></div>
              <div>
                <Label>Emri i Lojtarit</Label>
                <select
                  value={editEventData.player_name}
                  onChange={e => setEditEventData(p => ({ ...p, player_name: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">-- Pa emër --</option>
                  {(editEventDialog?.team === 'home' ? matchPlayers.home : matchPlayers.away).map(p => (
                    <option key={p.id} value={p.name}>{p.number ? `${p.number}. ` : ''}{p.name}</option>
                  ))}
                </select>
                <Input className="mt-1" placeholder="Ose shkruaj manuale..." value={editEventData.player_name} onChange={e => setEditEventData(p => ({ ...p, player_name: e.target.value }))} />
              </div>
              {['goal','penalty_goal','own_goal'].includes(editEventData.type) && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Score Vendas pas golit</Label><Input type="number" value={editEventData.home_score_after ?? ''} onChange={e => setEditEventData(p => ({ ...p, home_score_after: Number(e.target.value) }))} /></div>
                  <div><Label className="text-xs">Score Mysafir pas golit</Label><Input type="number" value={editEventData.away_score_after ?? ''} onChange={e => setEditEventData(p => ({ ...p, away_score_after: Number(e.target.value) }))} /></div>
                </div>
              )}
              <Button onClick={saveEventEdit} className="w-full">Ruaj</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Menaxho Ndeshjet Sot</h2>
      {matches.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka ndeshje sot</p>}
      <div className="space-y-2">
        {matches.map(m => {
          const isLive = m.status === 'first_half' || m.status === 'second_half';
          return (
            <button key={m.id} onClick={() => openMatch(m)} className="w-full text-left bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Agent online indicator */}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${agentOnline[m.id] ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>{agentOnline[m.id] ? 'ONLINE' : 'OFFLINE'}</span>
                  {getStatusBadge(m.status)}
                  {isLive && <LiveClock match={m} />}
                  <span className="text-sm font-semibold truncate">{m.home_team_name} {m.home_score ?? 0} - {m.away_score ?? 0} {m.away_team_name}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{m.time}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}