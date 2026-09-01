import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { addToQueue } from '@/lib/offlineQueue';
import { agentCreateEvent, agentUpdateEvent, agentDeleteEvent, agentUpdateMatch, agentDecrementTopScorer } from '@/lib/agentWrite';
import PlayerPicker from './PlayerPicker';

const YELLOW_CARD_URL = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/574698bbe_KARTONIVERDH.png';
const SECOND_YELLOW_URL = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/9c7628b09_YELLOWRED.png';
const RED_CARD_URL = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/d88111f76_DIREKTRED.png';
const SUBSTITUTION_URL = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/4bec831e1_SUBSTITUTION.png';
const MISSED_PEN_URL = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/91e20eecb_MISSEDPENALTY.png';
const VAR_URL = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/494882784_VARLOGO.png';

function EventIcon({ type, size = 'sm' }) {
  // Base sizes for sm; cards +15%, sub +15%, goal larger
  const cardPx = size === 'sm' ? 18 : 23;  // 16 * 1.15 ≈ 18
  const subPx = size === 'sm' ? 18 : 23;   // 16 * 1.15 ≈ 18
  const goalSize = size === 'sm' ? '19px' : '24px'; // ~20% bigger
  if (type === 'yellow_card') return <img src={YELLOW_CARD_URL} alt="Karton i Verdhë" style={{ width: `${cardPx}px`, height: `${cardPx}px`, objectFit: 'contain' }} />;
  if (type === 'second_yellow') return <img src={SECOND_YELLOW_URL} alt="Verdhë/Kuq" style={{ width: `${cardPx + 4}px`, height: `${cardPx}px`, objectFit: 'contain' }} />;
  if (type === 'red_card') return <img src={RED_CARD_URL} alt="Karton i Kuq" style={{ width: `${cardPx}px`, height: `${cardPx}px`, objectFit: 'contain' }} />;
  if (type === 'substitution') return <img src={SUBSTITUTION_URL} alt="Zëvendësim" style={{ width: `${subPx}px`, height: `${subPx}px`, objectFit: 'contain' }} />;
  if (type === 'missed_penalty') return <img src={MISSED_PEN_URL} alt="Penalti e Humbur" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />;
  if (type === 'var_canceled') return <img src={VAR_URL} alt="VAR" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />;
  if (type === 'hydration') return <span style={{ fontSize: `${cardPx}px`, lineHeight: 1 }}>💧</span>;
  if (type === 'var_penalty_awarded') return <span style={{ fontSize: `${cardPx}px`, lineHeight: 1 }}>🎯</span>;
  if (type === 'var_no_penalty') return <span style={{ fontSize: `${cardPx}px`, lineHeight: 1 }}>❌</span>;
  if (type === 'goal' || type === 'penalty_goal' || type === 'own_goal') return <span style={{ fontSize: goalSize, lineHeight: 1 }}>⚽</span>;
  return <span>•</span>;
}

const EVENT_TYPES = [
  { type: 'yellow_card', label: 'Karton i Verdhë', iconUrl: YELLOW_CARD_URL },
  { type: 'second_yellow', label: 'Verdhë/Kuq', iconUrl: SECOND_YELLOW_URL },
  { type: 'red_card', label: 'Karton i Kuq', iconUrl: RED_CARD_URL },
  { type: 'substitution', label: 'Zëvendësim', iconUrl: SUBSTITUTION_URL },
  { type: 'missed_penalty', label: 'Penalti e Humbur', iconUrl: MISSED_PEN_URL },
];

// Deep stats quick buttons (no dialog needed)
async function addDeepStat(match, team, stat) {
  const key = `stats_${team}_${stat}`;
  const current = match[key] || 0;
  await agentUpdateMatch(match.match_code, { [key]: current + 1 });
}

function getPlayerLabel(e) {
  let label = e.player_name || '';
  if (e.type === 'own_goal' || e.is_own_goal) label = label ? `${label} (AG)` : '(AG)';
  return label;
}

function getMinLabel(e) {
  if (e.extra_time_minute) return `${e.minute}+${e.extra_time_minute}'`;
  return e.minute ? `${e.minute}'` : '';
}

function getSortKey(e) {
  if (e.event_timestamp) return e.event_timestamp;
  return (e.minute || 0) * 10000000 + (e.extra_time_minute || 0) * 100000;
}

const VAR_REASONS = [
  'VAR - PO KONTROLLON GOLIN',
  'VAR - PO SHIKON PËR PENALTI',
  'VAR - PO SHIKON PER KARTON TË KUQ',
];

export default function EventPanel({ match, events, setEvents, homePlayers, awayPlayers, loadData, loadEvents, readOnly }) {
  // Prefer the lightweight events-only refresh; fall back to full loadData if not provided
  const refreshEvents = loadEvents || loadData;
  const [submitting, setSubmitting] = useState(false);
  const [eventDialog, setEventDialog] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [varDialog, setVarDialog] = useState(false);
  const [varReason, setVarReason] = useState('');
  const [varTeam, setVarTeam] = useState('');
  // Multi-sub support
  const [subCount, setSubCount] = useState(1);
  const [subPairs, setSubPairs] = useState([{ out: '', in: '', injury: false }]);
  const [editDialog, setEditDialog] = useState(null);
  const [editPlayer, setEditPlayer] = useState('');
  const [editPlayerIn, setEditPlayerIn] = useState('');
  const [editPlayerOut, setEditPlayerOut] = useState('');
  const [editMinute, setEditMinute] = useState('');
  const [editHomeScore, setEditHomeScore] = useState('');
  const [editAwayScore, setEditAwayScore] = useState('');
  const [editAssist, setEditAssist] = useState('');
  const [editInjury, setEditInjury] = useState(false);

  const openEvent = (team, type) => {
    setEventDialog({ team, type });
    setSelectedPlayer('');
    setSubCount(1);
    setSubPairs([{ out: '', in: '', injury: false }]);
  };

  const extraTimeStatuses = ['extra_time_first_half', 'extra_time_second_half'];
  const isMatchLive = ['first_half', 'half_time', 'second_half', 'extra_time_first_half', 'extra_time_second_half', 'awaiting_extra_time', 'extra_time_half_time'].includes(match.status);
  const isHalfTime = match.status === 'half_time';
  const allowManual = !/ALBI MALL SUPERLIGA/i.test(match.competition_name || '');

  const calcMinute = () => {
    // During half_time, substitutions belong to the 2nd half at minute 46
    if (match.status === 'half_time') return { mainMinute: 46, extraMin: undefined };
    let liveMins = match.minute || 0;
    if (match.status === 'first_half' && match.match_start_timestamp) {
      liveMins = Math.ceil((Date.now() - match.match_start_timestamp) / 1000 / 60);
    } else if (match.status === 'second_half' && match.second_half_start_timestamp) {
      liveMins = Math.ceil((Date.now() - match.second_half_start_timestamp) / 1000 / 60) + 45;
    } else if (match.status === 'extra_time_first_half' && match.extra_time_start_timestamp) {
      liveMins = Math.ceil((Date.now() - match.extra_time_start_timestamp) / 1000 / 60) + 90;
    } else if (match.status === 'extra_time_second_half' && match.extra_time_sh_start_timestamp) {
      liveMins = Math.ceil((Date.now() - match.extra_time_sh_start_timestamp) / 1000 / 60) + 105;
    }
    const base = match.status === 'first_half' ? 45 : match.status === 'second_half' ? 90 : match.status === 'extra_time_first_half' ? 105 : 120;
    const mainMinute = Math.min(liveMins, base);
    const extraMin = liveMins > base ? liveMins - base : undefined;
    return { mainMinute, extraMin };
  };

  const handleAdd = async () => {
    if (submitting) return;
    if (!isMatchLive) { toast.error('Mund të shtosh ngjarje vetëm kur ndeshja është në lojë'); return; }
    if (isHalfTime && eventDialog?.type !== 'substitution') { toast.error('Gjatë pushimit mund të shtosh vetëm zëvendësime'); return; }
    setSubmitting(true);
    setEventDialog(null);
    const { mainMinute, extraMin } = calcMinute();
    const eventTimestamp = Date.now();
    const isOnline = navigator.onLine;

    if (eventDialog.type === 'substitution') {
      const validPairs = subPairs.filter(p => p.out || p.in);
      if (validPairs.length === 0) { toast.error('Shto të paktën një zëvendësim'); return; }
      const outList = starterPlayers(eventDialog.team);
      const inList = benchPlayers(eventDialog.team);
      for (const pair of validPairs) {
        const outObj = outList.find(p => p.name === pair.out);
        const inObj = inList.find(p => p.name === pair.in);
        const eventData = {
          match_id: match.id, team: eventDialog.team, type: 'substitution',
          minute: mainMinute, extra_time_minute: extraMin,
          event_timestamp: eventTimestamp,
          player_name: pair.out ? `(${pair.out}) ${pair.in || '?'}` : `? → ${pair.in || '?'}`,
          player_out_name: pair.out, player_in_name: pair.in,
          player_out_id: outObj?.id || '', player_in_id: inObj?.id || '',
          is_injury: !!pair.injury,
        };
        if (isOnline) await agentCreateEvent(match.match_code, eventData);
        else addToQueue({ type: 'create_event', data: eventData });
      }
      if (isOnline) { toast.success('Zëvendësimet u shtuan'); refreshEvents(); }
      else toast.warning('Offline – ruajtur lokalisht');
      // Pas çdo zëvendësimi, tick-u i lëndimit kthehet në default (pa tick)
      setSubPairs([{ out: '', in: '', injury: false }]);
      setSubCount(1);
    } else {
      const playerObj = teamPlayers(eventDialog.team).find(p => p.name === selectedPlayer);
      const eventData = {
        match_id: match.id, team: eventDialog.team, type: eventDialog.type,
        minute: mainMinute, extra_time_minute: extraMin,
        event_timestamp: eventTimestamp,
        player_name: selectedPlayer || '',
        player_id: playerObj?.id || '',
      };
      if (isOnline) {
        const created = await agentCreateEvent(match.match_code, eventData);
        // Optimistically show immediately
        if (created) setEvents(prev => [...prev, created]);
        if (eventDialog.type === 'red_card' || eventDialog.type === 'second_yellow') {
          const key = eventDialog.team === 'home' ? 'home_red_cards' : 'away_red_cards';
          await agentUpdateMatch(match.match_code, { [key]: (match[key] || 0) + 1 });
        }
        toast.success('Ngjarja u shtua');
        refreshEvents();
      } else {
        addToQueue({ type: 'create_event', data: eventData });
        if (eventDialog.type === 'red_card' || eventDialog.type === 'second_yellow') {
          const key = eventDialog.team === 'home' ? 'home_red_cards' : 'away_red_cards';
          addToQueue({ type: 'update_match', matchId: match.id, data: { [key]: (match[key] || 0) + 1 } });
        }
        toast.warning('Offline – ruajtur lokalisht');
      }
    }
    setSubmitting(false);
  };

  const handleDoubleClick = (event) => {
    if (readOnly) return;
    setEditDialog(event);
    setEditPlayer(event.player_name || '');
    setEditPlayerIn(event.player_in_name || '');
    setEditPlayerOut(event.player_out_name || '');
    setEditMinute(event.minute || '');
    setEditHomeScore(event.home_score_after !== undefined ? String(event.home_score_after) : '');
    setEditAwayScore(event.away_score_after !== undefined ? String(event.away_score_after) : '');
    setEditAssist(event.assist_player_name || '');
    setEditInjury(!!event.is_injury);
  };

  const handleEditSave = async () => {
    const isSub = editDialog.type === 'substitution';
    const isGoal = ['goal', 'penalty_goal', 'own_goal'].includes(editDialog.type);
    const updateData = {
      player_name: isSub ? `(${editPlayerOut || '?'}) ${editPlayerIn || '?'}` : editPlayer,
      minute: Number(editMinute) || editDialog.minute,
    };
    if (isSub) {
      updateData.player_in_name = editPlayerIn;
      updateData.player_out_name = editPlayerOut;
      updateData.is_injury = !!editInjury;
    }
    if (isGoal && editHomeScore !== '') {
      updateData.home_score_after = Number(editHomeScore);
      updateData.away_score_after = Number(editAwayScore);
    }
    if (['goal', 'penalty_goal'].includes(editDialog.type)) {
      const assistObj = editAssist ? teamPlayers(editDialog.team).find(p => p.name === editAssist) : null;
      updateData.assist_player_name = editAssist || '';
      updateData.assist_player_id = assistObj?.id || '';
    }
    await agentUpdateEvent(match.match_code, editDialog.id, updateData);
    toast.success('U përditësua');
    setEditDialog(null);
    refreshEvents();
  };

  const handleDelete = async () => {
    if (editDialog.type === 'red_card' || editDialog.type === 'second_yellow') {
      const key = editDialog.team === 'home' ? 'home_red_cards' : 'away_red_cards';
      const current = match[key] || 0;
      if (current > 0) await agentUpdateMatch(match.match_code, { [key]: current - 1 });
    }
    const isGoalType = ['goal', 'penalty_goal'].includes(editDialog.type);
    const playerName = editDialog.player_name?.replace(' (AG)', '').trim();
    await agentDeleteEvent(match.match_code, editDialog.id);
    if (isGoalType && playerName && /ALBI MALL SUPERLIGA/i.test(match.competition_name || '')) {
      try { await agentDecrementTopScorer(match.match_code, playerName); } catch {}
    }
    toast.success('U fshi');
    setEditDialog(null);
    refreshEvents();
  };

  const teamPlayers = (team) => team === 'home' ? homePlayers : awayPlayers;

  const subbedOutHome = events.filter(e => e.type === 'substitution' && e.team === 'home' && e.player_out_name).map(e => e.player_out_name);
  const subbedOutAway = events.filter(e => e.type === 'substitution' && e.team === 'away' && e.player_out_name).map(e => e.player_out_name);
  const subbedInHome = events.filter(e => e.type === 'substitution' && e.team === 'home' && e.player_in_name).map(e => e.player_in_name);
  const subbedInAway = events.filter(e => e.type === 'substitution' && e.team === 'away' && e.player_in_name).map(e => e.player_in_name);

  // "Lojtari që del" = ALL players (starters + bench), minus those already subbed out
  const starterPlayers = (team) => {
    const subbedOut = team === 'home' ? subbedOutHome : subbedOutAway;
    return teamPlayers(team).filter(p => !subbedOut.includes(p.name));
  };
  // "Lojtari që futet" = only bench players, minus those already subbed in
  const benchPlayers = (team) => {
    const subbedIn = team === 'home' ? subbedInHome : subbedInAway;
    return teamPlayers(team).filter(p => !p.starter && !subbedIn.includes(p.name));
  };

  const handleVarSelect = async (reason) => {
    setVarReason(reason);
    setVarTeam('');
  };

  const handleVarTeam = async (team) => {
    setVarTeam(team);
    await agentUpdateMatch(match.match_code, { var_review_text: varReason, var_review_team: team });
    refreshEvents();
  };

  // VAR outcome: penalty awarded / no penalty — logged as match events
  const handleVarOutcome = async (outcome) => {
    const { mainMinute, extraMin } = calcMinute();
    await agentCreateEvent(match.match_code, {
      match_id: match.id, team: varTeam, type: outcome,
      minute: mainMinute, extra_time_minute: extraMin,
      event_timestamp: Date.now(),
      player_name: outcome === 'var_penalty_awarded' ? 'Penalti nga VAR' : 'Pa Penalti (VAR)',
    });
    await agentUpdateMatch(match.match_code, { var_review_text: null, var_review_team: null });
    setVarDialog(false);
    setVarReason('');
    setVarTeam('');
    refreshEvents();
    toast.success(outcome === 'var_penalty_awarded' ? 'Penalti u caktua!' : 'Pa penalti!');
  };

  // Hydration break — logged as a neutral match event
  const handleHydration = async () => {
    const { mainMinute, extraMin } = calcMinute();
    await agentCreateEvent(match.match_code, {
      match_id: match.id, team: 'home', type: 'hydration',
      minute: mainMinute, extra_time_minute: extraMin,
      event_timestamp: Date.now(),
      player_name: 'Pushim Hidratimi',
    });
    refreshEvents();
    toast.success('Pushim hidratimi u regjistrua');
  };

  const handleVarEnd = async () => {
    await agentUpdateMatch(match.match_code, { var_review_text: null, var_review_team: null });
    setVarDialog(false);
    setVarReason('');
    setVarTeam('');
    refreshEvents();
  };

  const handleSubCountChange = (n) => {
    const count = Math.min(10, Math.max(1, Number(n) || 1));
    setSubCount(count);
    setSubPairs(prev => {
      const arr = [...prev];
      while (arr.length < count) arr.push({ out: '', in: '', injury: false });
      return arr.slice(0, count);
    });
  };

  const renderEventRow = (e, i) => {
    const isGoal = e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal';
    const isOG = e.type === 'own_goal' || e.is_own_goal;
    const isSub = e.type === 'substitution';
    const isMissedPen = e.type === 'missed_penalty';
    const isAway = e.team === 'away';
    const hasScore = isGoal && e.home_score_after !== undefined;
    const scoreBadge = hasScore
      ? <span className="text-[9px] font-black bg-foreground text-background rounded px-1 py-0.5 shrink-0">{e.home_score_after}:{e.away_score_after}</span>
      : null;
    const label = getPlayerLabel(e);
    return (
      <div
        key={e.id || i}
        onDoubleClick={() => handleDoubleClick(e)}
        className={cn(
          'text-xs flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5',
          isAway && 'flex-row-reverse text-right',
          isGoal && 'bg-green-50 dark:bg-green-950/20 rounded-lg py-1 px-2'
        )}
      >
        <span className="text-muted-foreground font-mono text-[10px] min-w-[32px] text-center">{getMinLabel(e)}</span>
        <EventIcon type={e.type} size="sm" />
        {/* Badge always after icon in DOM; flex-row-reverse puts it between icon and name visually for away */}
        {scoreBadge}
        <span className={cn('truncate flex-1', isOG && 'text-live font-semibold', isMissedPen && 'text-red-600')}>
          {isSub ? (
            isAway ? (
              <><span className="text-muted-foreground">({e.player_out_name || '?'})</span>{e.player_in_name && <> <span className="font-semibold">{e.player_in_name}</span></>}</>
            ) : (
              <><span className="font-semibold">{e.player_in_name || '?'}</span>{e.player_out_name && <> <span className="text-muted-foreground">({e.player_out_name})</span></>}</>
            )
          ) : (
            <>
              {label}
              {isMissedPen && <span className="text-[9px] text-red-500 ml-1">(P)</span>}
              {e.assist_player_name && e.assist_player_name.trim() && (
                <span className="text-[10px] text-muted-foreground ml-1">({e.assist_player_name})</span>
              )}
            </>
          )}
        </span>
      </div>
    );
  };

  const allSorted = [...events].sort((a, b) => getSortKey(a) - getSortKey(b));
  const firstHalfEvts = allSorted.filter(e => (e.minute || 0) <= 45);
  const secondHalfEvts = allSorted.filter(e => (e.minute || 0) > 45 && (e.minute || 0) <= 90);
  const extraTimeEvts = allSorted.filter(e => (e.minute || 0) > 90);

  return (
    <div>
      {readOnly && (
        <div className="bg-muted/50 border border-border rounded-xl p-3 mb-4 text-xs text-center text-muted-foreground font-medium">
          Ndeshja ka përfunduar. Vetëm admini mund të editojë ngjarjet.
        </div>
      )}

      {/* Team buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {['home', 'away'].map(team => (
          <div key={team}>
            <p className="text-xs font-bold text-center mb-2 truncate">{team === 'home' ? match.home_team_name : match.away_team_name}</p>
            <div className="space-y-2">
              {/* Deep stats buttons */}
              {match.deep_stats && (
                <>
                  <button
                    onClick={() => !readOnly && isMatchLive && addDeepStat(match, team, 'corners')}
                    disabled={readOnly || !isMatchLive}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl border font-semibold text-xs transition-all bg-orange-50 border-orange-200',
                      readOnly || !isMatchLive ? 'opacity-40 cursor-not-allowed' : 'hover:border-orange-400 hover:bg-orange-100 active:scale-95'
                    )}
                  >
                    <span>🚩</span>
                    <span className="text-orange-700">Korner (+{team === 'home' ? (match.stats_home_corners || 0) : (match.stats_away_corners || 0)})</span>
                  </button>
                  <button
                    onClick={() => !readOnly && isMatchLive && addDeepStat(match, team, 'shots')}
                    disabled={readOnly || !isMatchLive}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl border font-semibold text-xs transition-all bg-blue-50 border-blue-200',
                      readOnly || !isMatchLive ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-100 active:scale-95'
                    )}
                  >
                    <span>🎯</span>
                    <span className="text-blue-700">Shut në Gol (+{team === 'home' ? (match.stats_home_shots || 0) : (match.stats_away_shots || 0)})</span>
                  </button>
                </>
              )}
              {match.has_var && (
                <button
                  onClick={() => { if (!readOnly && isMatchLive) setVarDialog(true); }}
                  disabled={readOnly || !isMatchLive}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl border font-semibold text-xs transition-all bg-blue-50 border-blue-300',
                    readOnly || !isMatchLive ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-100 active:scale-95'
                  )}
                >
                  <img src={VAR_URL} alt="VAR" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  <span className="text-blue-700">VAR EVENTS</span>
                </button>
              )}
              {EVENT_TYPES.filter(et => !(match.disabled_event_buttons || []).includes(et.type)).map(et => (
                <button
                  key={et.type}
                  onClick={() => !readOnly && isMatchLive && (et.type === 'substitution' || match.status !== 'half_time') && openEvent(team, et.type)}
                  disabled={readOnly || !isMatchLive || (match.status === 'half_time' && et.type !== 'substitution')}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl border font-semibold text-xs transition-all',
                    readOnly ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5 active:scale-95',
                    et.type === 'missed_penalty' ? 'bg-red-50 border-red-200' : 'bg-card border-border'
                  )}
                >
                  <img src={et.iconUrl} alt={et.label} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  <span>{et.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Hydration break — neutral match event */}
      <button
        onClick={() => !readOnly && isMatchLive && handleHydration()}
        disabled={readOnly || !isMatchLive}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl border font-semibold text-xs transition-all mb-4 bg-cyan-50 border-cyan-200',
          readOnly || !isMatchLive ? 'opacity-40 cursor-not-allowed' : 'hover:border-cyan-400 hover:bg-cyan-100 active:scale-95'
        )}
      >
        <span>💧</span>
        <span className="text-cyan-700">Pushim Hidratimi</span>
      </button>

      {/* Events log */}
      <div className="bg-card rounded-xl border border-border p-3">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Ngjarjet (2x klik për editim)</h4>
        <div className="space-y-1">
          {firstHalfEvts.map(renderEventRow)}
          {firstHalfEvts.length > 0 && secondHalfEvts.length > 0 && (
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[9px] text-muted-foreground">HT</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
          )}
          {secondHalfEvts.map(renderEventRow)}
          {extraTimeEvts.length > 0 && (
            <>
              <div className="flex items-center gap-2 py-1 opacity-50">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] text-muted-foreground">ET</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {extraTimeEvts.map(renderEventRow)}
            </>
          )}
        </div>
      </div>

      {/* VAR Dialog */}
      <Dialog open={varDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={VAR_URL} alt="VAR" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
              VAR EVENTS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-semibold">Zgjedh arsyen e VAR-it:</p>
            {VAR_REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => handleVarSelect(reason)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all',
                  varReason === reason ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border bg-card hover:border-blue-300'
                )}
              >
                {reason}
              </button>
            ))}
            {varReason !== '' && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground font-semibold mb-2">Për cilin ekip?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleVarTeam('home')}
                    className={cn('px-3 py-2 rounded-xl border text-xs font-bold transition-all', varTeam === 'home' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border hover:border-blue-300')}
                  >
                    {match.home_team_name}
                  </button>
                  <button
                       onClick={() => handleVarTeam('away')}
                       className={cn('px-3 py-2 rounded-xl border text-xs font-bold transition-all', varTeam === 'away' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border hover:border-blue-300')}
                     >
                       {match.away_team_name}
                     </button>
                     </div>
                   </div>
                  )}
                  {varTeam && (
                   <div className="mt-3">
                     <p className="text-xs text-muted-foreground font-semibold mb-2">Vendimi i VAR-it:</p>
                     <div className="grid grid-cols-2 gap-2">
                       <button
                         onClick={() => handleVarOutcome('var_penalty_awarded')}
                         className="px-3 py-3 rounded-xl border text-xs font-black transition-all bg-green-50 border-green-500 text-green-700 hover:bg-green-100 active:scale-95"
                       >
                         🎯 PENALTI
                       </button>
                       <button
                         onClick={() => handleVarOutcome('var_no_penalty')}
                         className="px-3 py-3 rounded-xl border text-xs font-black transition-all bg-red-50 border-red-500 text-red-700 hover:bg-red-100 active:scale-95"
                       >
                         ❌ PA PENALTI
                       </button>
                     </div>
                   </div>
                  )}
                  <button
                   onClick={handleVarEnd}
                   className="w-full py-3 rounded-xl bg-destructive text-white font-black text-sm hover:bg-destructive/90 active:scale-95 transition-all mt-2"
                  >
                   🔴 VAR END
                  </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={!!eventDialog} onOpenChange={() => setEventDialog(null)}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {EVENT_TYPES.find(e => e.type === eventDialog?.type)?.label} – {eventDialog?.team === 'home' ? match.home_team_name : match.away_team_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {eventDialog?.type === 'substitution' ? (
              <>
                <div>
                  <Label>Numri i zëvendësimeve</Label>
                  <Input type="number" min={1} max={10} value={subCount} onFocus={e => e.target.select()} onChange={e => handleSubCountChange(e.target.value)} className="w-24 text-center font-bold" />
                </div>
                {subPairs.map((pair, idx) => (
                <div key={idx} className="bg-muted/30 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">Zëv. {idx + 1}</p>
                  <div className="ring-2 ring-red-400 rounded-xl bg-red-50/60">
                    <PlayerPicker
                      label="Lojtari që del"
                      players={starterPlayers(eventDialog.team)}
                      value={pair.out}
                      onChange={v => setSubPairs(prev => prev.map((x, i) => i === idx ? { ...x, out: v } : x))}
                      placeholder="Zgjedh"
                      emptyLabel="Pa emër"
                      allowManual={allowManual}
                    />
                  </div>
                  <div className="ring-2 ring-green-400 rounded-xl bg-green-50/60">
                    <PlayerPicker
                      label="Lojtari që futet (Zëvendësues)"
                      players={benchPlayers(eventDialog.team)}
                      value={pair.in}
                      onChange={v => setSubPairs(prev => prev.map((x, i) => i === idx ? { ...x, in: v } : x))}
                      placeholder="Zgjedh"
                      emptyLabel="Pa emër"
                      allowManual={allowManual}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-red-600 cursor-pointer">
                    <input type="checkbox" checked={!!pair.injury} onChange={e => setSubPairs(prev => prev.map((x, i) => i === idx ? { ...x, injury: e.target.checked } : x))} className="rounded" />
                    Lëndim (lojtari që del është i lënduar)
                  </label>
                </div>
                ))}
              </>
            ) : (
              <PlayerPicker
                label="Lojtari (opsional)"
                players={teamPlayers(eventDialog?.team)}
                value={selectedPlayer}
                onChange={setSelectedPlayer}
                placeholder="Zgjedh lojtarin"
                emptyLabel="Pa emër"
                allowManual={allowManual}
              />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEventDialog(null)} className="flex-1">Anulo</Button>
              <Button onClick={handleAdd} className="flex-1" disabled={submitting}>{submitting ? 'Duke dërguar...' : 'Shto'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Delete Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edito / Fshi Ngjarjen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editDialog?.type === 'substitution' ? (
              <>
                <PlayerPicker
                  label="Lojtari që futet (IN)"
                  players={teamPlayers(editDialog?.team)}
                  value={editPlayerIn}
                  onChange={setEditPlayerIn}
                  placeholder="Zgjedh"
                  emptyLabel="Pa emër"
                />
                <PlayerPicker
                  label="Lojtari që del (OUT)"
                  players={teamPlayers(editDialog?.team)}
                  value={editPlayerOut}
                  onChange={setEditPlayerOut}
                  placeholder="Zgjedh"
                  emptyLabel="Pa emër"
                />
                <label className="flex items-center gap-2 text-xs font-semibold text-red-600 cursor-pointer">
                  <input type="checkbox" checked={editInjury} onChange={e => setEditInjury(e.target.checked)} className="rounded" />
                  Lëndim (lojtari që del është i lënduar)
                </label>
              </>
            ) : (
              <>
                <PlayerPicker
                  label="Lojtari"
                  players={teamPlayers(editDialog?.team)}
                  value={editPlayer}
                  onChange={setEditPlayer}
                  placeholder="Zgjedh lojtarin"
                  emptyLabel="Pa emër"
                />
                {['goal', 'penalty_goal'].includes(editDialog?.type) && (
                  <PlayerPicker
                    label="Asistues"
                    players={teamPlayers(editDialog?.team)}
                    value={editAssist}
                    onChange={setEditAssist}
                    placeholder="Pa asist"
                    emptyLabel="Pa asist"
                  />
                )}
              </>
            )}
            <div>
              <Label>Minuta</Label>
              <Input type="number" value={editMinute} onChange={e => setEditMinute(e.target.value)} />
            </div>
            {['goal', 'penalty_goal', 'own_goal'].includes(editDialog?.type) && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Score Vendas pas golit</Label><Input type="number" value={editHomeScore} onChange={e => setEditHomeScore(e.target.value)} /></div>
                <div><Label className="text-xs">Score Mysafir pas golit</Label><Input type="number" value={editAwayScore} onChange={e => setEditAwayScore(e.target.value)} /></div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleDelete} className="flex-1">Fshi</Button>
              <Button onClick={handleEditSave} className="flex-1">Ruaj</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}