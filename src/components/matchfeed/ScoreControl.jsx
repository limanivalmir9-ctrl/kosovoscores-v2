import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import PlayerPicker from './PlayerPicker';
import { addToQueue } from '@/lib/offlineQueue';
import { agentCreateEvent, agentUpdateEvent, agentDeleteEvent, agentUpdateTopScorer, agentCreateTopScorer } from '@/lib/agentWrite';
import { toast } from 'sonner';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function ScoreControl({ match, updateMatch, homePlayers, awayPlayers, loadData, readOnly }) {
  const [goalDialog, setGoalDialog] = useState(null);
  const [goalScorer, setGoalScorer] = useState('');
  const [assistPlayer, setAssistPlayer] = useState('');
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [isPenalty, setIsPenalty] = useState(false);
  const [ownGoalPlayer, setOwnGoalPlayer] = useState('');
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMatchLive = !['scheduled', 'full_time'].includes(match.status);
  const isLive = match.status === 'first_half' || match.status === 'second_half';

  const handleScoreUp = (team) => {
    if (readOnly) return;
    setGoalTeamForDialog(team);
    setGoalDialog({ team });
    setGoalScorer(''); setAssistPlayer(''); setIsOwnGoal(false); setIsPenalty(false); setOwnGoalPlayer('');
  };

  const handleScoreDown = (team) => {
    if (readOnly) return;
    const key = team === 'home' ? 'home_score' : 'away_score';
    const current = match[key] || 0;
    if (current > 0) {
      setCancelDialog({ team, key, current });
      setCancelReason('');
    }
  };

  const confirmCancelGoal = async () => {
    if (!cancelReason) return;
    const { team, key, current } = cancelDialog;
    await updateMatch({ [key]: current - 1 });

    const allEvents = await base44.entities.MatchEvent.filter({ match_id: match.id, team }, 'minute', 100);
    const goalEvents = allEvents.filter(e => e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal');
    if (goalEvents.length > 0) {
      const lastGoal = goalEvents[goalEvents.length - 1];
      if (cancelReason === 'var_faul' || cancelReason === 'var_offside') {
        const reasonText = cancelReason === 'var_faul' ? 'Faull' : 'Offside';
        await agentUpdateEvent(match.match_code, lastGoal.id, {
          type: 'var_canceled',
          player_name: 'Gol i Anuluar',
          assist_player_name: '',
          cancellation_reason: reasonText,
        });
      } else {
        await agentDeleteEvent(match.match_code, lastGoal.id);
      }

      const playerName = lastGoal.player_name?.replace(' (AG)', '').trim();
      if (playerName && /ALBI MALL SUPERLIGA/i.test(match.competition_name || '')) {
        const scorers = await base44.entities.TopScorer.filter({ competition_id: match.competition_id });
        const scorer = scorers.find(s => s.player_name === playerName && s.goals > 0);
        if (scorer) await agentUpdateTopScorer(match.match_code, scorer.id, { goals: scorer.goals - 1 });
      }
    }

    setCancelDialog(null);
    loadData();
  };

  const confirmGoal = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGoalDialog(null);
    const team = goalTeamForDialog;
    const scoreKey = team === 'home' ? 'home_score' : 'away_score';
    const newScore = (match[scoreKey] || 0) + 1;
    let liveMins = match.minute || 0;
    if (match.status === 'first_half' && match.match_start_timestamp) {
      liveMins = Math.ceil((Date.now() - match.match_start_timestamp) / 1000 / 60);
    } else if (match.status === 'second_half' && match.second_half_start_timestamp) {
      liveMins = Math.ceil((Date.now() - match.second_half_start_timestamp) / 1000 / 60) + 45;
    }
    if (match.status === 'extra_time_first_half' && match.extra_time_start_timestamp) {
      liveMins = Math.ceil((Date.now() - match.extra_time_start_timestamp) / 1000 / 60) + 90;
    } else if (match.status === 'extra_time_second_half' && match.extra_time_sh_start_timestamp) {
      liveMins = Math.ceil((Date.now() - match.extra_time_sh_start_timestamp) / 1000 / 60) + 105;
    }
    const base = match.status === 'first_half' ? 45 : match.status === 'second_half' ? 90 : match.status === 'extra_time_first_half' ? 105 : 120;
    const mainMinute = Math.min(liveMins, base);
    const extraMin = liveMins > base ? liveMins - base : undefined;

    let playerName = isOwnGoal ? ownGoalPlayer : goalScorer;
    if (isOwnGoal && playerName && playerName.trim()) playerName = `${playerName.trim()} (AG)`;

    const assistPlayerObj = !isOwnGoal && assistPlayer ? teamPlayers.find(p => p.name === assistPlayer) : null;
    // Lidh golin me ID-në e entitetit të lojtarit (i padepozueshëm — nuk prishet nga
    // ndryshimi i emrit/numrit/pozicionit/fotos).
    const scorerObj = isOwnGoal
      ? oppositeTeamPlayers.find(p => p.name === (ownGoalPlayer || '').trim())
      : teamPlayers.find(p => p.name === (goalScorer || '').trim());

    const isOnline = navigator.onLine;
    const homeScoreAfter = team === 'home' ? newScore : (match.home_score || 0);
    const awayScoreAfter = team === 'away' ? newScore : (match.away_score || 0);

    const eventData = {
      match_id: match.id,
      team,
      type: isOwnGoal ? 'own_goal' : isPenalty ? 'penalty_goal' : 'goal',
      minute: mainMinute,
      extra_time_minute: extraMin,
      event_timestamp: Date.now(),
      player_name: playerName || '',
      player_id: scorerObj?.id || '',
      assist_player_name: isOwnGoal ? '' : (assistPlayer || ''),
      assist_player_id: isOwnGoal ? '' : (assistPlayerObj?.id || ''),
      is_penalty: isPenalty,
      is_own_goal: isOwnGoal,
      home_score_after: homeScoreAfter,
      away_score_after: awayScoreAfter,
    };

    if (isOnline) {
      // Deep stats: një gol është gjithmonë edhe shut në gol → +1 automatikisht
      const matchUpdate = { [scoreKey]: newScore, last_goal_timestamp: Date.now() };
      if (match.deep_stats) {
        const shotsKey = team === 'home' ? 'stats_home_shots' : 'stats_away_shots';
        matchUpdate[shotsKey] = (match[shotsKey] || 0) + 1;
      }
      await updateMatch(matchUpdate);
      await agentCreateEvent(match.match_code, eventData);
      // Update top scorers (ALBI MALL SUPERLIGA only) using player_id + photo
      if (!isOwnGoal && /ALBI MALL SUPERLIGA/i.test(match.competition_name || '')) {
        const scorers = await base44.entities.TopScorer.filter({ competition_id: match.competition_id });
        const scorerName = (goalScorer || '').trim();
        const playersList = team === 'home' ? homePlayers : awayPlayers;
        const playerObj = playersList.find(p => p.name === scorerName);
        if (scorerName) {
          const existing = scorers.find(s => (playerObj?.id && s.player_id === playerObj.id) || s.player_name === scorerName);
          if (existing) {
            await agentUpdateTopScorer(match.match_code, existing.id, {
              goals: (existing.goals || 0) + 1,
              photo: playerObj?.photo || existing.photo,
              player_id: playerObj?.id || existing.player_id,
            });
          } else {
            await agentCreateTopScorer(match.match_code, {
              player_name: scorerName,
              player_id: playerObj?.id || '',
              photo: playerObj?.photo || '',
              club_name: team === 'home' ? match.home_team_name : match.away_team_name,
              competition_id: match.competition_id,
              goals: 1,
            });
          }
        }
      }
      loadData();
    } else {
      addToQueue({ type: 'update_match', matchId: match.id, data: { [scoreKey]: newScore, last_goal_timestamp: Date.now() } });
      addToQueue({ type: 'create_event', data: eventData });
      await updateMatch({ [scoreKey]: newScore });
      toast.warning('Offline – goli u ruajt lokalisht');
    }
    setIsSubmitting(false);
  };

  const [goalTeamForDialog, setGoalTeamForDialog] = useState(null);
  const teamPlayers = goalTeamForDialog === 'home' ? homePlayers : awayPlayers;
  const oppositeTeamPlayers = goalTeamForDialog === 'home' ? awayPlayers : homePlayers;

  // Live clock display
  const [liveClock, setLiveClock] = useState('');
  const [extraLabel, setExtraLabel] = useState('');
  useEffect(() => {
    if (match.status !== 'first_half' && match.status !== 'second_half') { setLiveClock(''); setExtraLabel(''); return; }
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
      const extra = match.status === 'first_half' ? (match.extra_time_first_half || 0) : (match.extra_time_second_half || 0);
      if (mins >= base) setLiveClock(`${base}+${mins - base}:${String(secs).padStart(2, '0')}`);
      else setLiveClock(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      setExtraLabel(extra > 0 ? `+${extra}` : '');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match.status, match.match_start_timestamp, match.second_half_start_timestamp, match.minute, match.extra_time_first_half, match.extra_time_second_half]);

  // Score color: red when live OR half_time, black only when full_time / scheduled
  const scoreColorClass = (match.status === 'first_half' || match.status === 'second_half' || match.status === 'half_time')
    ? 'text-live' : 'text-foreground';

  return (
    <>
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            {match.home_team_logo
              ? <img src={match.home_team_logo} alt="" className="w-12 h-12 mx-auto mb-1 object-contain" />
              : <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-1 flex items-center justify-center"><span className="font-bold">{(match.home_team_name || 'H')[0]}</span></div>}
            <p className="text-xs font-semibold truncate px-1">{match.home_team_name}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <button onClick={() => handleScoreUp('home')} disabled={readOnly || !isMatchLive} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="w-6 h-6" /></button>
              <span className={cn('text-4xl font-black tabular-nums', scoreColorClass)}>{match.home_score ?? 0}</span>
              <button onClick={() => handleScoreDown('home')} disabled={readOnly || !isMatchLive} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="w-6 h-6" /></button>
            </div>
            <span className="text-2xl font-light text-muted-foreground">:</span>
            <div className="flex flex-col items-center">
              <button onClick={() => handleScoreUp('away')} disabled={readOnly || !isMatchLive} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="w-6 h-6" /></button>
              <span className={cn('text-4xl font-black tabular-nums', scoreColorClass)}>{match.away_score ?? 0}</span>
              <button onClick={() => handleScoreDown('away')} disabled={readOnly || !isMatchLive} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="flex-1 text-center">
            {match.away_team_logo
              ? <img src={match.away_team_logo} alt="" className="w-12 h-12 mx-auto mb-1 object-contain" />
              : <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-1 flex items-center justify-center"><span className="font-bold">{(match.away_team_name || 'A')[0]}</span></div>}
            <p className="text-xs font-semibold truncate px-1">{match.away_team_name}</p>
          </div>
        </div>

        <div className="text-center mt-2">
          <span className={cn('text-sm font-black font-mono', isLive ? 'text-live animate-pulse-live' : 'text-muted-foreground')}>
            {match.status === 'scheduled' && (match.time || 'Planifikuar')}
            {(match.status === 'first_half' || match.status === 'second_half') && liveClock}
            {match.status === 'half_time' && 'HT'}
            {match.status === 'full_time' && 'FT'}
          </span>
          {extraLabel && isLive && <p className="text-xs font-bold text-live">{extraLabel}</p>}
        </div>
      </div>

      {/* Goal Dialog */}
      <Dialog open={!!goalDialog} onOpenChange={() => setGoalDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmo Golin – {goalDialog?.team === 'home' ? match.home_team_name : match.away_team_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isOwnGoal} onChange={e => { setIsOwnGoal(e.target.checked); setIsPenalty(false); }} className="rounded" />
                <span className="text-sm">Auto Gol</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPenalty} disabled={isOwnGoal} onChange={e => setIsPenalty(e.target.checked)} className="rounded" />
                <span className="text-sm">Penalti</span>
              </label>
            </div>

            {!isOwnGoal ? (
              <>
                <PlayerPicker
                  label={`Golashënuesi${isPenalty ? ' (P)' : ''} (opsional)`}
                  players={teamPlayers}
                  value={goalScorer}
                  onChange={setGoalScorer}
                  placeholder="Zgjedh lojtarin"
                  emptyLabel="Pa emër"
                />
                <PlayerPicker
                  label="Asistues (opsional)"
                  players={teamPlayers}
                  value={assistPlayer}
                  onChange={setAssistPlayer}
                  placeholder="Zgjedh"
                  emptyLabel="Pa asist"
                />
              </>
            ) : (
              <PlayerPicker
                label="Lojtari (auto gol, opsional)"
                players={oppositeTeamPlayers}
                value={ownGoalPlayer}
                onChange={setOwnGoalPlayer}
                placeholder="Zgjedh"
                emptyLabel="Pa emër"
              />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGoalDialog(null)} className="flex-1">Anulo</Button>
              <Button onClick={confirmGoal} className="flex-1">Konfirmo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Goal Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Arsyeja e Fshirjes së Golit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[
              { value: 'var_faul', label: '📺 VAR – Faull' },
              { value: 'var_offside', label: '🚩 VAR – Offside' },
              { value: 'mistake', label: '✏️ Gabim i regjistrimit' },
            ].map(opt => (
              <label key={opt.value} className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all', cancelReason === opt.value ? 'border-primary bg-primary/5' : 'border-border')}>
                <input type="radio" name="reason" value={opt.value} checked={cancelReason === opt.value} onChange={e => setCancelReason(e.target.value)} />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setCancelDialog(null)} className="flex-1">Anulo</Button>
              <Button variant="destructive" onClick={confirmCancelGoal} disabled={!cancelReason} className="flex-1">Konfirmo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}