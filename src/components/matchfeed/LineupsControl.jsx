import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Crown, Send, ArrowLeftRight, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LineupsControl({ match, homePlayers, awayPlayers, updateMatch, homeClub, awayClub, onPlayerCreated }) {
  const [team, setTeam] = useState('home');
  const [localHomeLineup, setLocalHomeLineup] = useState(match.home_lineup || []);
  const [localAwayLineup, setLocalAwayLineup] = useState(match.away_lineup || []);
  const [homeCoach, setHomeCoach] = useState(match.home_coach || homeClub?.coach || '');
  const [awayCoach, setAwayCoach] = useState(match.away_coach || awayClub?.coach || '');
  const [hasPending, setHasPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  const currentLineup = team === 'home' ? localHomeLineup : localAwayLineup;
  const setCurrentLineup = team === 'home' ? setLocalHomeLineup : setLocalAwayLineup;
  const availablePlayers = (team === 'home' ? homePlayers : awayPlayers).filter(p => p.active !== false);

  const posOrder = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
  const starters = currentLineup.filter(p => p.starter);
  const subs = currentLineup.filter(p => !p.starter);
  const addedIds = currentLineup.map(p => p.player_id);
  const notAdded = [...availablePlayers.filter(p => !addedIds.includes(p.id))].sort((a, b) => (posOrder[a.position] ?? 4) - (posOrder[b.position] ?? 4));

  const addPlayer = (playerId, isStarter) => {
    const player = availablePlayers.find(p => p.id === playerId);
    if (!player) return;
    if (isStarter && starters.length >= 11) { toast.error('Formacioni është plot (11)'); return; }
    const newLineup = [...currentLineup, { player_id: player.id, name: player.name, number: player.number, starter: isStarter, is_captain: false }];
    setCurrentLineup(newLineup);
    setHasPending(true);
  };

  const removePlayer = (playerId) => {
    setCurrentLineup(prev => prev.filter(p => p.player_id !== playerId));
    setHasPending(true);
  };

  const toggleCaptain = (playerId) => {
    setCurrentLineup(prev => prev.map(p => ({ ...p, is_captain: p.player_id === playerId ? !p.is_captain : false })));
    setHasPending(true);
  };

  const handleScanPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanLoading(true);
    toast('Duke analizuar foton...', { duration: 4000 });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Kjo eshte nje foto e formacionit te nje ndeshjeje futbolli. Detekto vetem numrat e fanellave (jersey numbers) te lojtareve.
Ktheje nje JSON me kete strukture:
{ "starters": [9, 1, 5, 7, ...], "substitutes": [16, 22, 3, ...] }
Nese nuk mund te dallosh starters nga substitutes, vendosi te gjithe tek starters. Kthe vetem numra te plote (integers).`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          starters: { type: 'array', items: { type: 'number' } },
          substitutes: { type: 'array', items: { type: 'number' } },
        }
      }
    });

    // Match numbers against registered players
    const teamPlayers = team === 'home' ? homePlayers : awayPlayers;
    const findPlayer = (num) => teamPlayers.find(p => p.number === num || p.number === String(num));

    const starterNums = result.starters || [];
    const subNums = result.substitutes || [];

    const starterEntries = starterNums.map(num => {
      const p = findPlayer(num);
      return p
        ? { player_id: p.id, name: p.name, number: p.number, starter: true, is_captain: false }
        : { player_id: `scan_${num}_${Date.now()}`, name: `#${num}`, number: num, starter: true, is_captain: false };
    });
    const subEntries = subNums.map(num => {
      const p = findPlayer(num);
      return p
        ? { player_id: p.id, name: p.name, number: p.number, starter: false, is_captain: false }
        : { player_id: `scan_${num}_${Date.now()}`, name: `#${num}`, number: num, starter: false, is_captain: false };
    });

    const matched = [...starterEntries, ...subEntries].filter((_, i, arr) =>
      arr.findIndex(x => x.player_id === arr[i].player_id) === i
    );

    setCurrentLineup(matched);
    setHasPending(true);
    setScanLoading(false);

    const foundCount = matched.filter(p => !p.name.startsWith('#')).length;
    const notFoundCount = matched.filter(p => p.name.startsWith('#')).length;
    toast.success(`U gjetën ${foundCount} lojtarë nga sistemi${notFoundCount > 0 ? `, ${notFoundCount} nr. të panjohur` : ''}!`);
    e.target.value = '';
  };

  const handleCreatePlayer = async (isStarter) => {
    if (!newPlayerName.trim()) { toast.error('Shto emrin e lojtarit'); return; }
    setCreatingPlayer(true);
    const clubId = team === 'home' ? match.home_team_id : match.away_team_id;
    const competitionId = match.competition_id;
    const created = await base44.entities.Player.create({
      name: newPlayerName.trim(),
      number: newPlayerNumber ? parseInt(newPlayerNumber) : undefined,
      club_id: clubId,
      competition_id: competitionId,
    });
    // Add to lineup
    if (isStarter && starters.length >= 11) { toast.error('Formacioni është plot (11)'); setCreatingPlayer(false); return; }
    const newEntry = { player_id: created.id, name: created.name, number: created.number, starter: isStarter, is_captain: false };
    setCurrentLineup(prev => [...prev, newEntry]);
    setHasPending(true);
    if (onPlayerCreated) onPlayerCreated(created, team);
    setNewPlayerName('');
    setNewPlayerNumber('');
    setShowNewPlayer(false);
    setCreatingPlayer(false);
    toast.success('Lojtari u krijua dhe u shtua!');
  };

  const handleDergo = async () => {
    setSending(true);
    await updateMatch({
      home_lineup: localHomeLineup,
      away_lineup: localAwayLineup,
      home_coach: homeCoach,
      away_coach: awayCoach,
    });
    setHasPending(false);
    setSending(false);
    toast.success('Formacioni u dërgua!');
  };

  const renderPlayer = (p, isStarter = false) => (
    <div key={p.player_id} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-2 py-1.5">
      {!isStarter && <ArrowLeftRight className="w-3 h-3 text-primary flex-shrink-0" />}
      <span className="font-mono text-muted-foreground w-6">{p.number}</span>
      <span className="flex-1 font-medium">{p.name}{p.is_captain ? ' (C)' : ''}</span>
      <button onClick={() => toggleCaptain(p.player_id)} className={`p-0.5 rounded ${p.is_captain ? 'text-secondary' : 'text-muted-foreground hover:text-secondary'}`} title={p.is_captain ? 'Hiq kapiten' : 'Cakto kapiten'}>
        <Crown className="w-3 h-3" />
      </button>
      <button onClick={() => removePlayer(p.player_id)} className="text-destructive p-0.5"><X className="w-3 h-3" /></button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {['home', 'away'].map(t => (
          <button key={t} onClick={() => setTeam(t)} className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${team === t ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
            {t === 'home' ? match.home_team_name : match.away_team_name}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-3">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Starting XI ({starters.length}/11) <span className="text-[10px] normal-case font-normal">– Kliko 👑 për kapiten</span></h4>
        <div className="space-y-1 mb-2">{starters.map(p => renderPlayer(p, true))}</div>
        {starters.length < 11 && notAdded.length > 0 && (
          <Select onValueChange={(v) => addPlayer(v, true)}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Shto lojtar fillestar" /></SelectTrigger>
            <SelectContent>{notAdded.map(p => <SelectItem key={p.id} value={p.id}>{p.number ? `${p.number}. ` : ''}{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-3">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Zëvendësuesit</h4>
        <div className="space-y-1 mb-2">{subs.map(p => renderPlayer(p, false))}</div>
        {notAdded.length > 0 && (
          <Select onValueChange={(v) => addPlayer(v, false)}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Shto zëvendësues" /></SelectTrigger>
            <SelectContent>{notAdded.map(p => <SelectItem key={p.id} value={p.id}>{p.number ? `${p.number}. ` : ''}{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {/* Skano foto */}
      <div className="bg-card rounded-xl border border-border p-3">
        <label className={`flex items-center gap-2 cursor-pointer text-xs font-semibold text-primary ${scanLoading ? 'opacity-50 pointer-events-none' : ''}`}>
          {scanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {scanLoading ? 'Duke analizuar foton...' : 'Ngarko foto formacioni (AI do ta lexojë)'}
          <input type="file" accept="image/*" className="hidden" onChange={handleScanPhoto} disabled={scanLoading} />
        </label>
        <p className="text-[10px] text-muted-foreground mt-1">AI do të detektojë lojtarët fillestarë dhe rezervë nga foto automatikisht.</p>
      </div>

      {/* Krijo lojtar të ri */}
      <div className="bg-card rounded-xl border border-dashed border-primary/40 p-3">
        <button onClick={() => setShowNewPlayer(v => !v)} className="text-xs font-bold text-primary w-full text-left flex items-center gap-1">
          <span className="text-base leading-none">+</span> Krijo lojtar të ri për {team === 'home' ? match.home_team_name : match.away_team_name}
        </button>
        {showNewPlayer && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="Emri i lojtarit" className="text-xs flex-1" />
              <Input value={newPlayerNumber} onChange={e => setNewPlayerNumber(e.target.value)} placeholder="Nr" className="text-xs w-14" type="number" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs" disabled={creatingPlayer} onClick={() => handleCreatePlayer(true)}>
                {creatingPlayer ? 'Duke krijuar...' : 'Shto si fillestar'}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs" disabled={creatingPlayer} onClick={() => handleCreatePlayer(false)}>
                Shto si rezervë
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-3">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Trajneri</h4>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">{match.home_team_name}</Label>
            <Input value={homeCoach} onChange={e => { setHomeCoach(e.target.value); setHasPending(true); }} placeholder="Trajneri vendas..." className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">{match.away_team_name}</Label>
            <Input value={awayCoach} onChange={e => { setAwayCoach(e.target.value); setHasPending(true); }} placeholder="Trajneri mysafir..." className="text-sm" />
          </div>
        </div>
      </div>

      {/* Dërgo button */}
      <Button
        onClick={handleDergo}
        disabled={!hasPending || sending}
        className={`w-full py-5 font-bold text-sm ${hasPending ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
      >
        <Send className="w-4 h-4 mr-2" />
        {sending ? 'Duke dërguar...' : hasPending ? 'Dërgo Formacionin' : 'Formacioni i Dërguar'}
      </Button>
    </div>
  );
}