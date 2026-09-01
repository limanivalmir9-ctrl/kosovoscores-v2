import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

function NumberPlayerSearch({ players, value, onChange }) {
  const [numInput, setNumInput] = useState('');
  const found = numInput ? players.find(p => String(p.number) === numInput.trim()) : null;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Nr. fanellës..."
          value={numInput}
          onChange={e => {
            setNumInput(e.target.value);
            const pl = players.find(p => String(p.number) === e.target.value.trim());
            if (pl) onChange(pl.name);
          }}
          className="w-28 text-center font-bold"
        />
        {found && <span className="flex items-center text-sm font-semibold text-primary">{found.name}</span>}
      </div>
      <select
        value={value}
        onChange={e => { onChange(e.target.value); setNumInput(''); }}
        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
      >
        <option value="">-- Pa emër --</option>
        {players.map(p => <option key={p.name} value={p.name}>{p.number ? `${p.number}. ` : ''}{p.name}</option>)}
      </select>
    </div>
  );
}

export default function PenaltyShootout({ match, updateMatch, readOnly }) {
  const homePens = match.penalty_home || [];
  const awayPens = match.penalty_away || [];
  const firstTeam = match.penalty_first_team;

  const getResult = (x) => typeof x === 'string' ? x : (x?.result || '');
  const getPlayer = (x) => typeof x === 'string' ? '' : (x?.player || '');

  const homeGoals = homePens.filter(x => getResult(x) === 'goal').length;
  const awayGoals = awayPens.filter(x => getResult(x) === 'goal').length;
  const isStarted = !!firstTeam;

  const [localHomePens, setLocalHomePens] = useState(null);
  const [localAwayPens, setLocalAwayPens] = useState(null);

  // Use local if fresher (longer), else use match data
  const currentHomePens = (localHomePens !== null && localHomePens.length >= homePens.length) ? localHomePens : homePens;
  const currentAwayPens = (localAwayPens !== null && localAwayPens.length >= awayPens.length) ? localAwayPens : awayPens;

  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [showFirstTeamDialog, setShowFirstTeamDialog] = useState(false);
  const [pendingFirstTeam, setPendingFirstTeam] = useState('home');
  const [shootDialog, setShootDialog] = useState(null); // {team}
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [lastResult, setLastResult] = useState(null); // 'goal'|'miss' after shot
  const [endMatchDialog, setEndMatchDialog] = useState(null); // {winner}

  const getNextTeam = (hPens, aPens, ft) => {
    if (!ft) return null;
    const secondTeam = ft === 'home' ? 'away' : 'home';
    const ftPens = ft === 'home' ? hPens : aPens;
    const stPens = ft === 'home' ? aPens : hPens;
    if (ftPens.length <= stPens.length) return ft;
    return secondTeam;
  };

  const checkEndCondition = (hPens, aPens) => {
    const hG = hPens.filter(x => getResult(x) === 'goal').length;
    const aG = aPens.filter(x => getResult(x) === 'goal').length;
    const hShots = hPens.length;
    const aShots = aPens.length;

    if (hShots < 5 || aShots < 5) {
      // Phase 1: early mathematical winner
      const hRemaining = Math.max(0, 5 - hShots);
      const aRemaining = Math.max(0, 5 - aShots);
      if (hG > aG + aRemaining) { setEndMatchDialog({ winner: 'home', hG, aG }); return true; }
      if (aG > hG + hRemaining) { setEndMatchDialog({ winner: 'away', hG, aG }); return true; }
      return false;
    }

    // Both have >= 5 shots: only check at end of complete rounds (equal shots)
    if (hShots === aShots) {
      if (hG !== aG) {
        setEndMatchDialog({ winner: hG > aG ? 'home' : 'away', hG, aG });
        return true;
      }
      return false; // tied, continue sudden death
    }

    // Mid-round of sudden death, wait for second team to shoot
    return false;
  };

  const openNextShot = (hPens, aPens, ft) => {
    const next = getNextTeam(hPens, aPens, ft || firstTeam);
    if (!next) return;
    if (!checkEndCondition(hPens, aPens)) {
      setShootDialog({ team: next });
      setSelectedPlayer('');
      setLastResult(null);
    }
  };

  const getPlayers = (team) => {
    const lineup = team === 'home' ? (match.home_lineup || []) : (match.away_lineup || []);
    return lineup.map(p => p.name).filter(Boolean);
  };

  const handleStartPenalties = () => setShowConfirmStart(true);

  const handleConfirmStart = () => {
    setShowConfirmStart(false);
    setShowFirstTeamDialog(true);
  };

  const handleFirstTeamConfirm = async () => {
    setLocalHomePens([]);
    setLocalAwayPens([]);
    await base44.entities.Match.update(match.id, {
      penalty_first_team: pendingFirstTeam,
      penalty_home: [],
      penalty_away: [],
    });
    setShowFirstTeamDialog(false);
    setShootDialog({ team: pendingFirstTeam });
    setSelectedPlayer('');
    setLastResult(null);
    toast.success('Penaltitë filluan!');
  };

  const handleShot = async (result) => {
    const { team } = shootDialog;
    const key = team === 'home' ? 'penalty_home' : 'penalty_away';
    const current = [...(team === 'home' ? currentHomePens : currentAwayPens)];
    current.push({ result, player: selectedPlayer || '' });
    if (team === 'home') setLocalHomePens(current);
    else setLocalAwayPens(current);
    await base44.entities.Match.update(match.id, { [key]: current });
    // Check end condition immediately with updated pens
    const hPens = team === 'home' ? current : currentHomePens;
    const aPens = team === 'away' ? current : currentAwayPens;
    const didEnd = checkEndCondition(hPens, aPens);
    if (didEnd) {
      setShootDialog(null); // close shoot dialog; endMatchDialog will show
    } else {
      setLastResult(result);
    }
    if (result === 'goal') toast.success('⚽ GOL!');
    else toast.info('✗ Miss');
  };

  const handleUndo = async () => {
    const { team } = shootDialog;
    const key = team === 'home' ? 'penalty_home' : 'penalty_away';
    const current = [...(team === 'home' ? currentHomePens : currentAwayPens)];
    current.pop();
    if (team === 'home') setLocalHomePens(current);
    else setLocalAwayPens(current);
    await base44.entities.Match.update(match.id, { [key]: current });
    setLastResult(null);
    setSelectedPlayer('');
    toast.info('Penaltia u zhbë');
  };

  const handleNextShot = () => {
    // Use local (fresh) pens so rotation is correct even before re-render
    const hPens = currentHomePens;
    const aPens = currentAwayPens;
    setLastResult(null);
    setSelectedPlayer('');
    if (!checkEndCondition(hPens, aPens)) {
      openNextShot(hPens, aPens, firstTeam);
    }
  };

  const handleEndMatch = async (confirm) => {
    if (confirm && endMatchDialog) {
      const winner = endMatchDialog.winner;
      const scoreKey = winner === 'home' ? 'home_score' : 'away_score';
      const currentScore = winner === 'home' ? (match.home_score || 0) : (match.away_score || 0);
      await updateMatch({
        status: 'full_time',
        [scoreKey]: currentScore + 1,
        penalty_winner: winner,
        minute: 120,
      });
      toast.success('Ndeshja përfundoi Pas Penaltive!');
    }
    setEndMatchDialog(null);
    setShootDialog(null);
  };

  const teamName = (team) => team === 'home' ? match.home_team_name : match.away_team_name;

  const shotIdx = shootDialog
    ? shootDialog.team === 'home' ? (match.penalty_home || []).length + 1 : (match.penalty_away || []).length + 1
    : 0;

  return (
    <div className="space-y-3">
      {/* Penalty score + dots */}
      {isStarted && (
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2 font-bold uppercase tracking-wide">Penaltitë</p>
          <span className="text-3xl font-black font-mono text-live">{homeGoals} : {awayGoals}</span>
          <div className="flex justify-between px-4 mt-3">
            <div className="text-center">
              <p className="text-[10px] font-bold mb-1 truncate max-w-[80px]">{match.home_team_name}</p>
              <div className="flex gap-1 justify-center flex-wrap">
                {Array.from({ length: Math.max(5, homePens.length) }).map((_, i) => {
                  const item = homePens[i];
                  const r = item ? getResult(item) : null;
                  return <div key={i} className={`w-3 h-3 rounded-full border-2 ${r === 'goal' ? 'bg-green-500 border-green-500' : r === 'miss' ? 'bg-red-500 border-red-500' : 'bg-gray-200 border-gray-300'}`} />;
                })}
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold mb-1 truncate max-w-[80px]">{match.away_team_name}</p>
              <div className="flex gap-1 justify-center flex-wrap">
                {Array.from({ length: Math.max(5, awayPens.length) }).map((_, i) => {
                  const item = awayPens[i];
                  const r = item ? getResult(item) : null;
                  return <div key={i} className={`w-3 h-3 rounded-full border-2 ${r === 'goal' ? 'bg-green-500 border-green-500' : r === 'miss' ? 'bg-red-500 border-red-500' : 'bg-gray-200 border-gray-300'}`} />;
                })}
              </div>
            </div>
          </div>
          {/* Next shot button */}
          {!shootDialog && !readOnly && getNextTeam(currentHomePens, currentAwayPens, firstTeam) && (
            <Button className="mt-3 w-full bg-primary" onClick={() => openNextShot(currentHomePens, currentAwayPens, firstTeam)}>
              Penaltia Radhës → {teamName(getNextTeam(currentHomePens, currentAwayPens, firstTeam))}
            </Button>
          )}
        </div>
      )}

      {!isStarted && !readOnly && (
        <Button className="w-full py-6 text-base font-bold bg-purple-600 hover:bg-purple-700 text-white" onClick={handleStartPenalties}>
          🎯 START PENALTIES
        </Button>
      )}

      {/* Confirm START */}
      <Dialog open={showConfirmStart} onOpenChange={setShowConfirmStart}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Konfirmo Fillimin e Penaltive</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">A doni të filloni goditjet e penaltive?</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowConfirmStart(false)} className="flex-1">Anulo</Button>
            <Button onClick={handleConfirmStart} className="flex-1">Po, Fillo</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* First team dialog */}
      <Dialog open={showFirstTeamDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cili Ekip Godet i Pari?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPendingFirstTeam('home')} className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${pendingFirstTeam === 'home' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                {match.home_team_name}
              </button>
              <button onClick={() => setPendingFirstTeam('away')} className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${pendingFirstTeam === 'away' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                {match.away_team_name}
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowFirstTeamDialog(false); setShowConfirmStart(false); }} className="flex-1">Anulo</Button>
              <Button onClick={handleFirstTeamConfirm} className="flex-1">Konfirmo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shot dialog */}
      <Dialog open={!!shootDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Penaltia #{shotIdx} – {shootDialog ? teamName(shootDialog.team) : ''}
            </DialogTitle>
          </DialogHeader>
          {!lastResult ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Zgjedh Lojtarin (opsional)</p>
                {/* Number search */}
                <NumberPlayerSearch
                  players={shootDialog ? shootDialog.team === 'home' ? (match.home_lineup || []) : (match.away_lineup || []) : []}
                  value={selectedPlayer}
                  onChange={setSelectedPlayer}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleShot('goal')}
                  className="py-5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-xl transition-all active:scale-95"
                >
                  ⚽ GOAL
                </button>
                <button
                  onClick={() => handleShot('miss')}
                  className="py-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xl transition-all active:scale-95"
                >
                  ✗ MISS
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center py-2">
              <div className={`text-5xl font-black ${lastResult === 'goal' ? 'text-green-500' : 'text-red-500'}`}>
                {lastResult === 'goal' ? '⚽ GOAL!' : '✗ MISS'}
              </div>
              {selectedPlayer && <p className="text-sm text-muted-foreground">{selectedPlayer}</p>}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={handleUndo} className="flex-1">↩ UNDO</Button>
                <Button onClick={handleNextShot} className="flex-1">Penaltia Radhës →</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* End match dialog */}
      <Dialog open={!!endMatchDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>🏆 NDESHJA PËRFUNDOI?</DialogTitle></DialogHeader>
          {endMatchDialog && (
            <p className="text-sm text-muted-foreground">
              Fitues: <strong>{teamName(endMatchDialog.winner)}</strong><br />
              Rezultati i penaltive: {endMatchDialog.hG} – {endMatchDialog.aG}<br />
              Një gol do t'i shtohet rezultatit të fituesit.
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => handleEndMatch(false)} className="flex-1">JO – Vazhdo</Button>
            <Button onClick={() => handleEndMatch(true)} className="flex-1 bg-live hover:bg-live/90 text-white">PO – Përfundo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}