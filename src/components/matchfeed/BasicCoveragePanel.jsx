import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { agentBatch, agentDeleteEvent, agentUpdateEvent } from '@/lib/agentWrite';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Trash2, Pencil } from 'lucide-react';
import InterruptedMatchButton from './InterruptedMatchButton';
import StadiumPhotoUpload from './StadiumPhotoUpload';

const LIVE_STATUSES = ['first_half', 'second_half'];

function useLiveMinute(match) {
  const [minute, setMinute] = useState(match?.minute || 0);
  useEffect(() => {
    if (!match) return;
    if (!LIVE_STATUSES.includes(match.status)) { setMinute(match.minute || (match.status === 'half_time' ? 45 : match.status === 'full_time' ? 90 : 0)); return; }
    const tick = () => {
      const now = Date.now();
      let total;
      if (match.status === 'first_half' && match.match_start_timestamp) total = Math.floor((now - match.match_start_timestamp) / 60000);
      else if (match.status === 'second_half' && match.second_half_start_timestamp) total = 45 + Math.floor((now - match.second_half_start_timestamp) / 60000);
      else total = match.minute || 0;
      setMinute(Math.max(0, Math.min(90, total)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match?.status, match?.match_start_timestamp, match?.second_half_start_timestamp, match?.minute]);
  return minute;
}

export default function BasicCoveragePanel({ match: initialMatch, onLogout }) {
  const [match, setMatch] = useState(initialMatch);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmState, setConfirmState] = useState(null); // { action } pending confirmation
  const [editEvent, setEditEvent] = useState(null); // event being edited
  const [editName, setEditName] = useState('');
  const [deleteEvent, setDeleteEvent] = useState(null); // event pending delete confirm
  const [goalDialog, setGoalDialog] = useState(null); // { team } pending goal type selection
  const [goalType, setGoalType] = useState('goal'); // 'goal' | 'penalty' | 'own'
  const matchCode = match?.match_code;

  const refresh = useCallback(async () => {
    if (!match?.id) return;
    const [m, evs] = await Promise.all([
      base44.entities.Match.get(match.id).catch(() => null),
      base44.entities.MatchEvent.filter({ match_id: match.id }, 'minute', 200),
    ]);
    if (m) setMatch(m);
    setEvents(evs || []);
  }, [match?.id]);

  useEffect(() => {
    refresh();
    if (!match?.id) return;
    const u1 = base44.entities.Match.subscribe(() => refresh());
    const u2 = base44.entities.MatchEvent.subscribe(() => refresh());
    return () => { u1(); u2(); };
  }, [match?.id, refresh]);

  const minute = useLiveMinute(match);

  const status = match?.status || 'scheduled';
  const isLive = LIVE_STATUSES.includes(status);
  const isHT = status === 'half_time';
  const isFT = status === 'full_time';
  const isScheduled = status === 'scheduled';
  const canControl = !isFT;

  // Determine the current control button
  let controlBtn = null;
  if (isScheduled) controlBtn = { label: 'MATCH START ( NIS NDESHJEN )', next: 'first_half' };
  else if (status === 'first_half') controlBtn = { label: 'HALF TIME ( PERFUNDO PJESEN E PARE )', next: 'half_time' };
  else if (isHT) controlBtn = { label: 'SECOND HALF START ( NIS PJESEN E DYTE )', next: 'second_half' };
  else if (status === 'second_half') controlBtn = { label: 'MATCH END ( MBYLL NDESHJEN )', next: 'full_time' };

  const doControl = async (next) => {
    setLoading(true);
    try {
      const now = Date.now();
      const data = { status: next };
      if (next === 'first_half') { data.match_start_timestamp = now; data.minute = 0; }
      else if (next === 'half_time') { data.minute = 45; }
      else if (next === 'second_half') { data.second_half_start_timestamp = now; data.minute = 45; }
      else if (next === 'full_time') { data.minute = 90; }
      await agentBatch(matchCode, [{ op: 'updateMatch', data }]);
      await refresh();
      toast.success('Statusi u përditësua');
    } catch (e) { toast.error(e.message || 'Gabim'); }
    setLoading(false);
    setConfirmState(null);
  };

  const addGoal = (team) => {
    if (!isLive && !isHT) { toast.error('Nis ndeshjen së pari'); return; }
    setGoalType('goal');
    setGoalDialog({ team });
  };

  const confirmGoalBasic = async () => {
    const team = goalDialog?.team;
    if (!team) return;
    setLoading(true);
    try {
      const eventType = goalType === 'penalty' ? 'penalty_goal' : goalType === 'own' ? 'own_goal' : 'goal';
      // Për autogol, ngjarja i atribuohet ekipit kundërshtar (që shënoi në portën e
      // vet); pika shkon te ekipi i klikuar.
      const eventTeam = goalType === 'own' ? (team === 'home' ? 'away' : 'home') : team;
      const newHome = team === 'home' ? (match.home_score || 0) + 1 : match.home_score || 0;
      const newAway = team === 'away' ? (match.away_score || 0) + 1 : match.away_score || 0;
      await agentBatch(matchCode, [
        { op: 'createEvent', data: { type: eventType, team: eventTeam, minute, event_timestamp: Date.now(), home_score_after: newHome, away_score_after: newAway, is_own_goal: goalType === 'own', is_penalty: goalType === 'penalty' } },
        { op: 'updateMatch', data: { home_score: newHome, away_score: newAway, last_goal_timestamp: Date.now() } },
      ]);
      setGoalDialog(null);
      await refresh();
    } catch (e) { toast.error(e.message || 'Gabim'); }
    setLoading(false);
  };

  const addRedCard = async (team) => {
    if (!isLive && !isHT) { toast.error('Nis ndeshjen së pari'); return; }
    setLoading(true);
    try {
      await agentBatch(matchCode, [
        { op: 'createEvent', data: { type: 'red_card', team, minute, event_timestamp: Date.now() } },
        { op: 'updateMatch', data: { [team === 'home' ? 'home_red_cards' : 'away_red_cards']: (team === 'home' ? match.home_red_cards || 0 : match.away_red_cards || 0) + 1 } },
      ]);
      await refresh();
    } catch (e) { toast.error(e.message || 'Gabim'); }
    setLoading(false);
  };

  const confirmDelete = async () => {
    const ev = deleteEvent;
    if (!ev) return;
    setLoading(true);
    try {
      await agentDeleteEvent(matchCode, ev.id);
      // Recompute score / red cards from remaining events
      const remaining = events.filter(e => e.id !== ev.id);
      const isGoal = ['goal', 'penalty_goal', 'own_goal'].includes(ev.type);
      if (isGoal) {
        const homeGoals = remaining.filter(e => ['goal', 'penalty_goal'].includes(e.type) && e.team === 'home').length
          + remaining.filter(e => e.type === 'own_goal' && e.team === 'away').length;
        const awayGoals = remaining.filter(e => ['goal', 'penalty_goal'].includes(e.type) && e.team === 'away').length
          + remaining.filter(e => e.type === 'own_goal' && e.team === 'home').length;
        await agentBatch(matchCode, [{ op: 'updateMatch', data: { home_score: homeGoals, away_score: awayGoals } }]);
      } else if (ev.type === 'red_card') {
        const field = ev.team === 'home' ? 'home_red_cards' : 'away_red_cards';
        await agentBatch(matchCode, [{ op: 'updateMatch', data: { [field]: Math.max(0, (match[field] || 0) - 1) } }]);
      }
      await refresh();
      toast.success('Ngjarja u fshi');
    } catch (e) { toast.error(e.message || 'Gabim'); }
    setLoading(false);
    setDeleteEvent(null);
  };

  const saveEdit = async () => {
    if (!editEvent) return;
    setLoading(true);
    try {
      await agentUpdateEvent(matchCode, editEvent.id, { player_name: editName.trim() || undefined });
      await refresh();
      toast.success('U përditësua');
    } catch (e) { toast.error(e.message || 'Gabim'); }
    setLoading(false);
    setEditEvent(null);
  };

  const statusText = isScheduled ? 'Planifikuar' : isLive ? `${minute}'` : isHT ? 'HT' : isFT ? 'FT' : '';

  const sortedEvents = [...events].sort((a, b) => ((a.minute || 0) - (b.minute || 0)) || ((a.event_timestamp || 0) - (b.event_timestamp || 0)));

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm">Basic Coverage</p>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{statusText}</span>
        </div>
        <button onClick={onLogout} className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors">Dil</button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        {/* Match header: logos, names, score, time */}
        <div className="bg-card rounded-2xl border border-border p-5 text-center shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              {match.home_team_logo ? <img src={match.home_team_logo} alt="" className="w-14 h-14 mx-auto mb-2 object-contain" /> :
                <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center text-lg font-bold">{(match.home_team_name || 'H')[0]}</div>}
              <p className="text-xs font-bold truncate">{match.home_team_name || 'Vendas'}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black">{match.home_score ?? 0}</span>
                <span className="text-muted-foreground text-xl">-</span>
                <span className="text-3xl font-black">{match.away_score ?? 0}</span>
              </div>
              <p className="text-xs font-bold text-muted-foreground mt-1">{statusText}</p>
            </div>
            <div className="flex-1 text-center">
              {match.away_team_logo ? <img src={match.away_team_logo} alt="" className="w-14 h-14 mx-auto mb-2 object-contain" /> :
                <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center text-lg font-bold">{(match.away_team_name || 'A')[0]}</div>}
              <p className="text-xs font-bold truncate">{match.away_team_name || 'Mysafir'}</p>
            </div>
          </div>
        </div>

        {/* Stadium photos (P1/P2) */}
        <div className="mt-3 flex gap-2 justify-center">
          <StadiumPhotoUpload match={match} matchCode={matchCode} slot="start" onAfter={refresh} />
          <StadiumPhotoUpload match={match} matchCode={matchCode} slot="end" onAfter={refresh} />
        </div>

        {/* Match control button */}
        {canControl && controlBtn && (
          <div className="mt-3">
            {confirmState?.action === 'control' ? (
              <div className="bg-card border-2 border-primary rounded-2xl p-3 space-y-2">
                <p className="text-xs font-bold text-center">Konfirmo: {controlBtn.label}?</p>
                <div className="flex gap-2">
                  <button onClick={() => doControl(controlBtn.next)} disabled={loading} className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2.5 rounded-xl disabled:opacity-50">PO, konfirmo</button>
                  <button onClick={() => setConfirmState(null)} className="flex-1 bg-muted text-foreground text-xs font-bold py-2.5 rounded-xl">Anulo</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmState({ action: 'control' })} disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors disabled:opacity-50">
                {controlBtn.label}
              </button>
            )}
          </div>
        )}

        {/* Interrupted match button */}
        <div className="mt-3">
          <InterruptedMatchButton match={match} matchCode={matchCode} onAfter={refresh} />
        </div>

        {/* Goal + Red card buttons */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {/* Home */}
          <div className="space-y-2">
            <button onClick={() => addGoal('home')} disabled={loading || (!isLive && !isHT)}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold rounded-2xl py-3 flex flex-col items-center gap-1 transition-colors">
              {match.home_team_logo && <img src={match.home_team_logo} alt="" className="w-5 h-5 object-contain" />}
              <span className="text-xs">GOL ({match.home_team_name || 'Vendas'})</span>
            </button>
            <button onClick={() => addRedCard('home')} disabled={loading || (!isLive && !isHT)}
              className="w-full bg-black hover:bg-black/90 disabled:opacity-40 text-white font-bold rounded-2xl py-2.5 transition-colors">
              <span className="text-[11px]">Karton i kuq<br /><span className="text-[9px] opacity-80">{(match.home_team_name || 'vendas').toLowerCase()}</span></span>
            </button>
          </div>
          {/* Away */}
          <div className="space-y-2">
            <button onClick={() => addGoal('away')} disabled={loading || (!isLive && !isHT)}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold rounded-2xl py-3 flex flex-col items-center gap-1 transition-colors">
              {match.away_team_logo && <img src={match.away_team_logo} alt="" className="w-5 h-5 object-contain" />}
              <span className="text-xs">GOL ({match.away_team_name || 'Mysafir'})</span>
            </button>
            <button onClick={() => addRedCard('away')} disabled={loading || (!isLive && !isHT)}
              className="w-full bg-black hover:bg-black/90 disabled:opacity-40 text-white font-bold rounded-2xl py-2.5 transition-colors">
              <span className="text-[11px]">Karton i kuq<br /><span className="text-[9px] opacity-80">{(match.away_team_name || 'mysafir').toLowerCase()}</span></span>
            </button>
          </div>
        </div>

        {/* Events list */}
        <div className="mt-4 bg-card rounded-2xl border border-border p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Ngjarjet e ndeshjes</p>
          {sortedEvents.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">Nuk ka ngjarje ende</p>
          ) : (
            <div className="space-y-1">
              {sortedEvents.map(ev => {
                const isHome = ev.team === 'home';
                const isGoal = ['goal', 'penalty_goal', 'own_goal'].includes(ev.type);
                const isRed = ev.type === 'red_card';
                return (
                  <div key={ev.id} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 border', isHome ? 'bg-home/5 border-border' : 'bg-away/5 border-border flex-row-reverse text-right')}>
                    <span className="text-[10px] font-black tabular-nums w-8 text-center shrink-0">{ev.minute || 0}'</span>
                    {isGoal && <span className="text-sm">⚽</span>}
                    {isRed && <span className="text-sm">🟥</span>}
                    <span className={cn('flex-1 text-xs min-w-0', isGoal ? 'font-bold' : 'font-medium')}>
                      {isGoal ? (ev.type === 'penalty_goal' ? 'Penalti' : ev.type === 'own_goal' ? 'Auto Gol' : 'Gol') : isRed ? 'Karton i kuq' : ev.type}
                      {ev.player_name ? ` — ${ev.player_name}` : ' (pa emër)'}
                    </span>
                    <button onClick={() => { setEditEvent(ev); setEditName(ev.player_name || ''); }}
                      className="p-1 hover:bg-muted rounded" title="Edito (dyklik)"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteEvent(ev)} className="p-1 hover:bg-red-50 rounded" title="Fshi"><Trash2 className="w-3 h-3 text-destructive" /></button>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[9px] text-muted-foreground mt-2 text-center">Kliko dy her mbi ngjarje për të shtuar/emëruar lojtarin, ose fshi për të korrigjuar rezultatin.</p>
        </div>
      </div>

      {/* Edit dialog */}
      {editEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setEditEvent(null)}>
          <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold mb-3">Edito ngjarjen</p>
            <label className="text-xs text-muted-foreground">Emri i lojtarit</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="shkruaj emrin..."
              className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={loading} className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2.5 rounded-xl disabled:opacity-50">Ruaj</button>
              <button onClick={() => setEditEvent(null)} className="flex-1 bg-muted text-foreground text-xs font-bold py-2.5 rounded-xl">Anulo</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setDeleteEvent(null)}>
          <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold mb-1">Fshi ngjarjen?</p>
            <p className="text-xs text-muted-foreground mb-3">
              {['goal', 'penalty_goal', 'own_goal'].includes(deleteEvent.type) ? 'Fshirja e golit do të ri-llogarisë rezultatin.' : 'Kartoni i kuq do të largohet.'}
            </p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} disabled={loading} className="flex-1 bg-destructive text-destructive-foreground text-xs font-bold py-2.5 rounded-xl disabled:opacity-50">PO, fshi</button>
              <button onClick={() => setDeleteEvent(null)} className="flex-1 bg-muted text-foreground text-xs font-bold py-2.5 rounded-xl">Anulo</button>
            </div>
          </div>
        </div>
      )}

      {/* Goal type dialog (Gol / Penalti / Auto Gol) */}
      {goalDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setGoalDialog(null)}>
          <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold mb-3 text-center">
              Gol për {goalDialog.team === 'home' ? (match.home_team_name || 'Vendas') : (match.away_team_name || 'Mysafir')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'goal', label: '⚽ Gol' },
                { key: 'penalty', label: '🎯 Penalti' },
                { key: 'own', label: '🤚 Auto Gol' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setGoalType(opt.key)}
                  className={cn('py-3 rounded-xl border text-xs font-bold transition-all', goalType === opt.key ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40')}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setGoalDialog(null)} className="flex-1 bg-muted text-foreground text-xs font-bold py-2.5 rounded-xl">Anulo</button>
              <button onClick={confirmGoalBasic} disabled={loading} className="flex-1 bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-50">Konfirmo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}