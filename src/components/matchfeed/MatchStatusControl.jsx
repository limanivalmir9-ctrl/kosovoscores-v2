import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { agentBatch, agentRotateMatchCode } from '@/lib/agentWrite';
import PenaltyShootout from './PenaltyShootout';
import PossessionControl from './PossessionControl';
import PossessionSlider from './PossessionSlider';
import ShotsControl from './ShotsControl';
import JerseyColorButton from './JerseyColorButton';
import InterruptedMatchButton from './InterruptedMatchButton';
import StadiumPhotoUpload from './StadiumPhotoUpload';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function MatchStatusControl({ match, updateMatch, readOnly }) {
  const [extraFirst, setExtraFirst] = useState(match.extra_time_first_half || 0);
  const [extraSecond, setExtraSecond] = useState(match.extra_time_second_half || 0);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [kickOffTeam, setKickOffTeam] = useState('');
  const [displayTime, setDisplayTime] = useState('');
  const [elapsedMins, setElapsedMins] = useState(0);

  const firstHalfExtraLocked = match.status !== 'first_half' || elapsedMins < 44;
  const secondHalfExtraLocked = match.status !== 'second_half' || elapsedMins < 89;

  const [extraTimeDisplay, setExtraTimeDisplay] = useState('');

  useEffect(() => {
    const tick = () => {
      if (match.status === 'first_half' && match.match_start_timestamp) {
        const elapsed = Math.floor((Date.now() - match.match_start_timestamp) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const extra = match.extra_time_first_half || 0;
        setDisplayTime(mins >= 45 ? `45+${mins - 45}:${String(secs).padStart(2, '0')}` : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        setExtraTimeDisplay(extra > 0 ? `+${extra}` : '');
        setElapsedMins(mins);
      } else if (match.status === 'second_half' && match.second_half_start_timestamp) {
        const elapsed = Math.floor((Date.now() - match.second_half_start_timestamp) / 1000) + 45 * 60;
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const extra = match.extra_time_second_half || 0;
        setDisplayTime(mins >= 90 ? `90+${mins - 90}:${String(secs).padStart(2, '0')}` : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        setExtraTimeDisplay(extra > 0 ? `+${extra}` : '');
        setElapsedMins(mins);
      } else if (match.status === 'extra_time_first_half' && match.extra_time_start_timestamp) {
        const elapsed = Math.floor((Date.now() - match.extra_time_start_timestamp) / 1000) + 90 * 60;
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setDisplayTime(mins >= 105 ? `105+${mins - 105}:${String(secs).padStart(2, '0')}` : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        setExtraTimeDisplay('');
        setElapsedMins(mins);
      } else if (match.status === 'extra_time_second_half' && match.extra_time_sh_start_timestamp) {
        const elapsed = Math.floor((Date.now() - match.extra_time_sh_start_timestamp) / 1000) + 105 * 60;
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setDisplayTime(mins >= 120 ? `120+${mins - 120}:${String(secs).padStart(2, '0')}` : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        setExtraTimeDisplay('');
        setElapsedMins(mins);
      } else if (match.status === 'awaiting_extra_time') {
        setDisplayTime('Vazhdimet');
        setExtraTimeDisplay('');
        setElapsedMins(0);
      } else if (match.status === 'extra_time_half_time') {
        setDisplayTime('ET HT');
        setExtraTimeDisplay('');
        setElapsedMins(0);
      } else if (match.status === 'penalties') {
        setDisplayTime('Penaltitë');
        setExtraTimeDisplay('');
        setElapsedMins(0);
      } else {
        setDisplayTime('');
        setExtraTimeDisplay('');
        setElapsedMins(0);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match.status, match.match_start_timestamp, match.second_half_start_timestamp, match.extra_time_start_timestamp, match.extra_time_sh_start_timestamp, match.extra_time_first_half, match.extra_time_second_half]);

  const updateStandingsAndAgent = async () => {
    // Idempotent recompute: each finished match is counted exactly once,
    // so a match can never be counted multiple times in the standings.
    const [allMatches, allStandings] = await Promise.all([
      base44.entities.Match.filter({ competition_id: match.competition_id }, '-date', 1000),
      base44.entities.Standing.filter({ competition_id: match.competition_id }),
    ]);
    const FINISHED_S = ['full_time', 'official_result'];
    const finished = allMatches.filter(m => FINISHED_S.includes(m.status));
    const agg = {};
    allStandings.forEach(s => { agg[s.club_id] = { id: s.id, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 }; });
    finished.forEach(m => {
      const hs = m.home_score || 0, as = m.away_score || 0;
      if (agg[m.home_team_id]) {
        const h = agg[m.home_team_id];
        h.played++; h.goals_for += hs; h.goals_against += as;
        if (hs > as) { h.won++; h.points += 3; } else if (hs === as) { h.drawn++; h.points += 1; } else { h.lost++; }
      }
      if (agg[m.away_team_id]) {
        const a = agg[m.away_team_id];
        a.played++; a.goals_for += as; a.goals_against += hs;
        if (as > hs) { a.won++; a.points += 3; } else if (as === hs) { a.drawn++; a.points += 1; } else { a.lost++; }
      }
    });
    const sorted = allStandings.map(s => {
      const v = agg[s.club_id];
      return { id: s.id, position: s.position, points: v?.points || 0, goal_difference: (v?.goals_for || 0) - (v?.goals_against || 0) };
    }).sort((a, b) => (b.points || 0) - (a.points || 0) || (b.goal_difference || 0) - (a.goal_difference || 0));

    const allAgents = await base44.entities.Agent.list('-created_date', 200);
    const covering = allAgents.filter(a => a.teams_covered?.includes(match.home_team_id) || a.teams_covered?.includes(match.away_team_id));

    // Batch all writes through the service-role proxy (agents have no direct write access)
    const ops = [];
    Object.values(agg).forEach(v => ops.push({ op: 'updateStanding', standing_id: v.id, data: {
      played: v.played, won: v.won, drawn: v.drawn, lost: v.lost,
      goals_for: v.goals_for, goals_against: v.goals_against,
      goal_difference: v.goals_for - v.goals_against, points: v.points,
    }}));
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].position !== i + 1) ops.push({ op: 'updateStanding', standing_id: sorted[i].id, data: { position: i + 1 } });
    }
    // Numërimi i agjentit është idempotent: rillogaritet nga të gjitha ndeshjet e
    // përfunduara që ai agjent mbulon — kështu një ndeshje nuk numërohet kurrë dy herë
    // (psh. full_time + official_result) dhe nuk pritet vlerësimi i adminit.
    covering.forEach(agent => {
      const coveredCount = finished.filter(m =>
        (agent.teams_covered || []).includes(m.home_team_id) ||
        (agent.teams_covered || []).includes(m.away_team_id)
      ).length;
      ops.push({ op: 'updateAgent', agent_id: agent.id, data: {
        total_matches_covered: coveredCount,
        total_earnings: coveredCount * (agent.price_per_match || 0),
      }});
    });
    if (ops.length > 0) await agentBatch(match.match_code, ops);
  };

  const doStatusChange = async () => {
    const action = confirmDialog?.action;
    switch (action) {
      case 'scheduled': {
        const now = Date.now();
        const startData = { status: 'first_half', minute: 1, match_start_timestamp: now };
        if (match.deep_stats && kickOffTeam) {
          startData.stats_possession_current = kickOffTeam;
          startData.stats_possession_last_switch = now;
          startData.stats_possession_kick_off_team = kickOffTeam;
          startData.stats_possession_home_ms = 0;
          startData.stats_possession_away_ms = 0;
        }
        await updateMatch(startData);
        setKickOffTeam('');
        toast.success('Ndeshja filloi!');
        break;
      }
      case 'first_half': {
        // Freeze possession accumulation before going to HT
        const htUpdate = { status: 'half_time', minute: 45 };
        if (match.deep_stats && match.stats_possession_current && match.stats_possession_current !== 'neutral' && match.stats_possession_last_switch) {
          const now = Date.now();
          const elapsed = now - match.stats_possession_last_switch;
          if (match.stats_possession_current === 'home') htUpdate.stats_possession_home_ms = (match.stats_possession_home_ms || 0) + elapsed;
          else if (match.stats_possession_current === 'away') htUpdate.stats_possession_away_ms = (match.stats_possession_away_ms || 0) + elapsed;
          htUpdate.stats_possession_last_switch = now;
          htUpdate.stats_possession_current = 'neutral';
        }
        await updateMatch(htUpdate);
        toast.success('Pushim!');
        break;
      }
      case 'half_time':
        await updateMatch({ status: 'second_half', minute: 46, second_half_start_timestamp: Date.now() });
        toast.success('Pjesa e dytë filloi!');
        break;
      case 'second_half_end':
        await updateMatch({ status: 'full_time', minute: 90 });
        await updateStandingsAndAgent();
        await agentRotateMatchCode(match.match_code, generateCode());
        toast.success('Ndeshja përfundoi!');
        break;
      case 'awaiting_extra_time_action':
        await updateMatch({ status: 'awaiting_extra_time', minute: 90 });
        toast.success('Ndeshja shkon në vazhdime!');
        break;
      case 'start_extra_time':
        await updateMatch({ status: 'extra_time_first_half', extra_time_start_timestamp: Date.now(), minute: 90 });
        toast.success('Vazhdimi i parë filloi!');
        break;
      case 'et_half_time':
        await updateMatch({ status: 'extra_time_half_time', minute: 105 });
        toast.success('ET Pushim!');
        break;
      case 'et_second_half':
        await updateMatch({ status: 'extra_time_second_half', extra_time_sh_start_timestamp: Date.now(), minute: 106 });
        toast.success('Vazhdimi i dytë filloi!');
        break;
      case 'et_second_half_end':
        await updateMatch({ status: 'full_time', minute: 120 });
        await updateStandingsAndAgent();
        await agentRotateMatchCode(match.match_code, generateCode());
        toast.success('Ndeshja përfundoi!');
        break;
      case 'penalties_action':
        await updateMatch({ status: 'penalties', minute: 120 });
        toast.success('Goditjet e penaltive!');
        break;
      default: break;
    }
    setConfirmDialog(null);
  };

  const handleExtraTime = async (half) => {
    const val = half === 'first' ? Number(extraFirst) || 0 : Number(extraSecond) || 0;
    const key = half === 'first' ? 'extra_time_first_half' : 'extra_time_second_half';
    // Sinrono automatikisht edhe fushën "Deshmi Admini" (admin_et) në panelin e adminit
    const adminKey = half === 'first' ? 'admin_et_first_half' : 'admin_et_second_half';
    await updateMatch({ [key]: val, [adminKey]: val });
    toast.success(`Minutat shtesë: +${val}`);
  };

  // Button configs per status
  const getMainButton = () => {
    switch (match.status) {
      case 'scheduled':
        return { action: 'scheduled', label: 'MATCH START', icon: Play, color: 'bg-success hover:bg-success/90 text-white', confirmLabel: 'A doni të filloni ndeshjen?' };
      case 'first_half':
        return { action: 'first_half', label: 'HALF TIME', icon: Pause, color: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground', confirmLabel: 'A doni të shpallni pushimin?' };
      case 'half_time':
        return { action: 'half_time', label: 'SECOND HALF', icon: Play, color: 'bg-primary hover:bg-primary/90 text-primary-foreground', confirmLabel: 'A doni të filloni pjesën e dytë?' };
      case 'second_half':
        return { action: 'second_half_end', label: 'MATCH END', icon: Square, color: 'bg-live hover:bg-live/90 text-white', confirmLabel: 'A doni të përfundoni ndeshjen? Ky veprim nuk mund të zhbëhet.' };
      case 'awaiting_extra_time':
        return { action: 'start_extra_time', label: 'START EXTRA TIME', icon: Play, color: 'bg-orange-500 hover:bg-orange-600 text-white', confirmLabel: 'A doni të filloni kohën shtesë?' };
      case 'extra_time_first_half':
        return { action: 'et_half_time', label: 'ET HALF TIME', icon: Pause, color: 'bg-yellow-500 hover:bg-yellow-600 text-white', confirmLabel: 'A doni të shpallni pushimin e kohës shtesë?' };
      case 'extra_time_half_time':
        return { action: 'et_second_half', label: 'ET SECOND HALF START', icon: Play, color: 'bg-primary hover:bg-primary/90 text-primary-foreground', confirmLabel: 'A doni të filloni kohën shtesë të dytë?' };
      case 'extra_time_second_half':
        return { action: 'et_second_half_end', label: 'MATCH END', icon: Square, color: 'bg-live hover:bg-live/90 text-white', confirmLabel: 'A doni të përfundoni ndeshjen?' };
      case 'penalties':
        return { action: 'et_second_half_end', label: 'MATCH END', icon: Square, color: 'bg-live hover:bg-live/90 text-white', confirmLabel: 'A doni të përfundoni ndeshjen pa goditjet e penaltive?' };
      default:
        return { label: 'FULL TIME', icon: Square, color: 'bg-muted text-muted-foreground', disabled: true };
    }
  };

  const handleOfficialResult = async () => {
    await updateMatch({ status: 'official_result' });
    // Update standings as if it were a full_time result
    await updateStandingsAndAgent();
    toast.success('Statusi u vendos: Rezultat Zyrtar');
  };

  const mainBtn = getMainButton();
  const MainIcon = mainBtn.icon;

  const isSpecialText = ['awaiting_extra_time', 'extra_time_half_time', 'penalties'].includes(match.status);

  return (
    <div className="space-y-4">
      {/* Jersey colors — set before the match so timeline circles show team colors */}
      {!readOnly && (
        <JerseyColorButton match={match} updateMatch={updateMatch} readOnly={readOnly} />
      )}

      {/* Main status button */}
      <Button
        onClick={() => !readOnly && !mainBtn.disabled && setConfirmDialog(mainBtn)}
        className={`w-full py-6 text-base font-bold ${mainBtn.color}`}
        disabled={mainBtn.disabled || match.status === 'full_time' || readOnly}
      >
        <MainIcon className="w-5 h-5 mr-2" />
        {mainBtn.label}
      </Button>

      {/* Interrupted match button — available while the match is in progress */}
      {!readOnly && !['scheduled', 'full_time', 'official_result', 'cancelled', 'postponed'].includes(match.status) && (
        <InterruptedMatchButton match={match} matchCode={match.match_code} />
      )}

      {/* Stadium photos (P1/P2) */}
      {!readOnly && (
        <div className="flex gap-2 justify-center">
          <StadiumPhotoUpload match={match} matchCode={match.match_code} slot="start" />
          <StadiumPhotoUpload match={match} matchCode={match.match_code} slot="end" />
        </div>
      )}

      {/* OFFICIAL RESULT button — shown when match is full_time */}
      {match.status === 'full_time' && !readOnly && (
        <Button
          onClick={handleOfficialResult}
          className="w-full py-4 text-sm font-bold bg-black hover:bg-black/80 text-white"
        >
          ⚖️ REZULTAT ZYRTAR
        </Button>
      )}

      {/* Cup: AWAITING EXTRA TIME button (shown alongside MATCH END in second_half) */}
      {match.is_cup_match && match.status === 'second_half' && !readOnly && (
        <Button
          onClick={() => setConfirmDialog({ action: 'awaiting_extra_time_action', confirmLabel: 'A doni të shpallni se ndeshja shkon në vazhdime?' })}
          className="w-full py-6 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white"
        >
          ⏱ AWAITING EXTRA TIME
        </Button>
      )}

      {/* Cup: PENALTIES button (shown in extra_time_second_half alongside MATCH END) */}
      {match.is_cup_match && match.status === 'extra_time_second_half' && !readOnly && (
        <Button
          onClick={() => setConfirmDialog({ action: 'penalties_action', confirmLabel: 'A doni të shkoni në goditjet e penaltive?' })}
          className="w-full py-6 text-base font-bold bg-purple-600 hover:bg-purple-700 text-white"
        >
          🎯 PENALTIES
        </Button>
      )}

      {/* Clock / special text */}
      {displayTime && (
        <div className="text-center">
          <span className={`text-2xl font-black font-mono text-live`}>{displayTime}</span>
          {extraTimeDisplay && <p className="text-sm font-bold text-live mt-0.5">{extraTimeDisplay}</p>}
        </div>
      )}

      {/* Possession Control (Deep stats - slider version) */}
      <PossessionSlider match={match} updateMatch={updateMatch} readOnly={readOnly} />

      {/* Shots & Corners Control (Deep stats) */}
      <ShotsControl match={match} updateMatch={updateMatch} readOnly={readOnly} />

      {/* Penalty Shootout UI */}
      {match.status === 'penalties' && (
        <PenaltyShootout match={match} updateMatch={updateMatch} readOnly={readOnly} />
      )}

      {/* Extra Time inputs (only for normal halves) */}
      {!['awaiting_extra_time', 'extra_time_first_half', 'extra_time_half_time', 'extra_time_second_half', 'penalties', 'full_time'].includes(match.status) && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-bold">Minutat Shtesë</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Pjesa e parë {firstHalfExtraLocked && '🔒'}</Label>
              {match.status === 'first_half' && elapsedMins >= 44 && !match.extra_time_first_half && (
                <p className="text-[10px] font-bold text-yellow-600 animate-pulse mb-1">⚠️ Vëmendje minutat shtesë</p>
              )}
              <div className="flex gap-1">
                <Input type="number" value={extraFirst} onChange={e => setExtraFirst(e.target.value)} className="text-center" min={0} disabled={firstHalfExtraLocked} />
                <Button variant="outline" size="sm" onClick={() => handleExtraTime('first')} disabled={firstHalfExtraLocked || readOnly}>OK</Button>
              </div>
              {match.status === 'first_half' && elapsedMins < 44 && <p className="text-[10px] text-muted-foreground mt-1">E disponueshme pas min. 44</p>}
            </div>
            <div>
              <Label className="text-xs">Pjesa e dytë {secondHalfExtraLocked && '🔒'}</Label>
              {match.status === 'second_half' && elapsedMins >= 89 && !match.extra_time_second_half && (
                <p className="text-[10px] font-bold text-yellow-600 animate-pulse mb-1">⚠️ Vëmendje minutat shtesë</p>
              )}
              <div className="flex gap-1">
                <Input type="number" value={extraSecond} onChange={e => setExtraSecond(e.target.value)} className="text-center" min={0} disabled={secondHalfExtraLocked} />
                <Button variant="outline" size="sm" onClick={() => handleExtraTime('second')} disabled={secondHalfExtraLocked || readOnly}>OK</Button>
              </div>
              {match.status === 'second_half' && elapsedMins < 89 && <p className="text-[10px] text-muted-foreground mt-1">E disponueshme pas min. 89</p>}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Konfirmo Ndryshimin</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmDialog?.confirmLabel}</p>
          {/* Kick-off team selection for Deep stats */}
          {match.deep_stats && confirmDialog?.action === 'scheduled' && (
            <div className="mt-3">
              <p className="text-xs font-bold text-muted-foreground mb-2">Cili ekip nis me top?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setKickOffTeam('home')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${kickOffTeam === 'home' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                >
                  {match.home_team_name}
                </button>
                <button
                  onClick={() => setKickOffTeam('away')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${kickOffTeam === 'away' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                >
                  {match.away_team_name}
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDialog(null)} className="flex-1">Anulo</Button>
            <Button onClick={doStatusChange} className="flex-1">Po, Konfirmo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}