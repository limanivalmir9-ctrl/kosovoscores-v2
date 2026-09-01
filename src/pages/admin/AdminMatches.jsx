import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Copy, ListChecks, Timer, ArrowLeft, Check } from 'lucide-react';
import AdminMatchEvents from '@/components/admin/AdminMatchEvents';
import ImportMatchesFromUrl from '@/components/admin/ImportMatchesFromUrl';
import AdminLineupsDialog from '@/components/admin/AdminLineupsDialog';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buildMatchSlug } from '@/lib/matchSlug';
import { pickTeamColors } from '@/lib/teamColors';
import { recalcAndSaveMatchMinutes } from '@/lib/recalcMinutes';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getUniqueSlug(baseSlug, excludeId) {
  let candidate = baseSlug || 'ndeshja';
  let suffix = 2;
  while (suffix < 50) {
    const existing = await base44.entities.Match.filter({ slug: candidate }).catch(() => []);
    const collision = existing.some(m => m.id !== excludeId);
    if (!collision) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix++;
  }
  return candidate;
}

async function updateStandingsForMatch(match) {
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
}

export default function AdminMatches() {
  const [matches, setMatches] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [referees, setReferees] = useState([]);
  const [eventsMatch, setEventsMatch] = useState(null);
  const [importComp, setImportComp] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [lineupsMatch, setLineupsMatch] = useState(null);
  const [lineupsOpen, setLineupsOpen] = useState(false);
  const [selectedComp, setSelectedComp] = useState('all');
  const [isCupMatch, setIsCupMatch] = useState(false);
  const [isTestMatch, setIsTestMatch] = useState(false);
  const [ftOnly, setFtOnly] = useState(false);
  const [showInLive, setShowInLive] = useState(true);
  const [hasVar, setHasVar] = useState(false);
  const [deepStats, setDeepStats] = useState(false);
  const [superDeep, setSuperDeep] = useState(false);
  const [basicCoverage, setBasicCoverage] = useState(false);
  const [disabledButtons, setDisabledButtons] = useState([]);
  const [lineupLocked, setLineupLocked] = useState(false);
  const [slowUpdate, setSlowUpdate] = useState(false);
  const [adminEtFirstHalf, setAdminEtFirstHalf] = useState(0);
  const [adminEtSecondHalf, setAdminEtSecondHalf] = useState(0);
  const [roundOrPhase, setRoundOrPhase] = useState('round'); // 'round' | 'phase'
  const [matchStatus, setMatchStatus] = useState('scheduled');
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedRound, setSelectedRound] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    competition_id: '', round: '', phase_text: '', phase_order: '', home_team_id: '', away_team_id: '',
    home_score: 0, away_score: 0, // for past matches
    stadium: '', date: '', time: '', match_code: '',
    referee_main: '', referee_assistant1: '', referee_assistant2: '', referee_var: '', referee_avar: '',
  });
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Auto-set past matches to full_time
  const autoSetPastMatches = async (allMatches) => {
    const today = new Date().toISOString().split('T')[0];
    const pastScheduled = allMatches.filter(m => m.date < today && m.status === 'scheduled');
    for (const m of pastScheduled) {
      await base44.entities.Match.update(m.id, { status: 'full_time', minute: 90 });
    }
    if (pastScheduled.length > 0) toast.info(`${pastScheduled.length} ndeshje u vendosën FT`);
  };

  const load = async () => {
    const [allMatches, allComps, allClubs, allRefs, allAgents] = await Promise.all([
      base44.entities.Match.list('-date', 1000),
      base44.entities.Competition.list('tier', 50),
      base44.entities.Club.list('-created_date', 500),
      base44.entities.Referee.list('name', 200),
      base44.entities.Agent.list('first_name', 200),
    ]);
    const activeCompIds = new Set(allComps.filter(c => !c.archived).map(c => c.id));
    const visibleMatches = allMatches.filter(m => activeCompIds.has(m.competition_id));
    setMatches(visibleMatches);
    setCompetitions(allComps);
    setClubs(allClubs);
    setReferees(allRefs);
    setAgents(allAgents);
    setLoading(false);
    autoSetPastMatches(visibleMatches);
  };

  useEffect(() => { load(); }, []);

  // Auto-generate slug from home/away teams + date (unless manually edited)
  useEffect(() => {
    if (slugManuallyEdited) return;
    const homeClub = clubs.find(c => c.id === form.home_team_id);
    const awayClub = clubs.find(c => c.id === form.away_team_id);
    setSlug(buildMatchSlug(homeClub?.name || '', awayClub?.name || '', form.date || ''));
  }, [form.home_team_id, form.away_team_id, form.date, clubs, slugManuallyEdited]);

  const handleSave = async () => {
    if (!form.competition_id || !form.home_team_id || !form.away_team_id || !form.date) {
      const missing = [];
      if (!form.competition_id) missing.push('Kompeticionin');
      if (!form.home_team_id) missing.push('Ekipin Vendas');
      if (!form.away_team_id) missing.push('Ekipin Mysafir');
      if (!form.date) missing.push('Datën');
      toast.error('Plotëso: ' + missing.join(', '));
      const dlg = document.querySelector('[role=dialog]');
      if (dlg) dlg.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    try {
    // If editing a live match, preserve its current status
    const currentMatch = editing ? matches.find(m => m.id === editing.id) : null;
    const isLive = currentMatch && (currentMatch.status === 'first_half' || currentMatch.status === 'second_half' || currentMatch.status === 'half_time');
    if (isLive) {
      // Don't change status for live matches
    }
    const homeClub = clubs.find(c => c.id === form.home_team_id);
    const awayClub = clubs.find(c => c.id === form.away_team_id);
    const comp = competitions.find(c => c.id === form.competition_id);

    const data = {
      ...form,
      round: roundOrPhase === 'round' ? (Number(form.round) || undefined) : undefined,
      phase_text: roundOrPhase === 'phase' ? (form.phase_text || undefined) : undefined,
      phase_order: roundOrPhase === 'phase' && form.phase_order ? Number(form.phase_order) : undefined,
      home_team_name: homeClub?.name || '',
      away_team_name: awayClub?.name || '',
      home_team_logo: homeClub?.logo || '',
      away_team_logo: awayClub?.logo || '',
      competition_name: comp?.name || '',
      competition_color: comp?.color || 'blue-500',
      match_code: form.match_code || generateCode(),
      slug: await getUniqueSlug(slug || buildMatchSlug(homeClub?.name || '', awayClub?.name || '', form.date || ''), editing?.id),
      home_score: Number(form.home_score) || 0,
      away_score: Number(form.away_score) || 0,
      status: isLive ? (currentMatch.status) : matchStatus,
      assigned_agent_id: selectedAgentId || undefined,
      show_in_live: showInLive,
      has_var: hasVar,
      deep_stats: deepStats,
      super_deep: superDeep,
      basic_coverage: basicCoverage,
      disabled_event_buttons: disabledButtons,
      lineup_locked: lineupLocked,
      is_cup_match: isCupMatch,
      is_test_match: isTestMatch,
      ft_only: ftOnly,
      slow_update: slowUpdate,
      admin_et_first_half: Number(adminEtFirstHalf) || 0,
      admin_et_second_half: Number(adminEtSecondHalf) || 0,
      highlights_url: form.highlights_url || undefined,
    };

    // Auto-assign non-conflicting team colors (excluding white & bright yellow) when not already set
    if (!editing || (!currentMatch?.sd_home_color && !currentMatch?.sd_away_color)) {
      const colors = pickTeamColors({ homeColor: homeClub?.home_color, awayColor: awayClub?.away_color });
      data.sd_home_color = colors.homeColor;
      data.sd_away_color = colors.awayColor;
    }

    let matchId = editing?.id;
    if (editing) {
      await base44.entities.Match.update(editing.id, data);
      toast.success('U përditësua');
      // Auto-update standings if status changed to full_time or official_result
      const prevStatus = editing.status;
      if (
        (prevStatus !== 'full_time' && prevStatus !== 'official_result') &&
        (matchStatus === 'full_time' || matchStatus === 'official_result')
      ) {
        await updateStandingsForMatch({ ...editing, ...data });
      }
    } else {
      const created = await base44.entities.Match.create(data);
      matchId = created.id;
      toast.success('U krijua');
    }
    // Auto-assign agent: create/update MatchApplication as approved
    if (selectedAgentId && matchId) {
      const agent = agents.find(a => a.id === selectedAgentId);
      const existingApps = await base44.entities.MatchApplication.filter({ match_id: matchId, agent_id: selectedAgentId });
      if (existingApps.length > 0) {
        await base44.entities.MatchApplication.update(existingApps[0].id, { status: 'approved' });
      } else {
        const comp = competitions.find(c => c.id === form.competition_id);
        const homeC = clubs.find(c => c.id === form.home_team_id);
        const awayC = clubs.find(c => c.id === form.away_team_id);
        await base44.entities.MatchApplication.create({
          match_id: matchId,
          agent_id: selectedAgentId,
          agent_name: `${agent.first_name} ${agent.last_name}`,
          match_label: `${homeC?.name || ''} vs ${awayC?.name || ''}`,
          match_date: form.date,
          match_time: form.time || '',
          competition_name: comp?.name || '',
          status: 'approved',
        });
      }
    }
    setDialogOpen(false);
    setEditing(null);
    load();
    } catch (err) {
      console.error('Match save failed:', err);
      toast.error('Gabim: ' + (err?.message || String(err)));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('A jeni i sigurt?')) return;
    // Remove associated events so player stats recompute from scratch
    try {
      const evs = await base44.entities.MatchEvent.filter({ match_id: id });
      if (evs.length) await base44.entities.MatchEvent.deleteMany({ match_id: id });
    } catch (_) {}
    await base44.entities.Match.delete(id);
    toast.success('U fshi');
    load();
  };

  const [recalcLoading, setRecalcLoading] = useState(false);
  const handleRecalcMinutes = async (match) => {
    if (!['full_time', 'official_result'].includes(match.status)) {
      toast.error('Rikalkulimi funksionon vetëm për ndeshje të përfunduara');
      return;
    }
    setRecalcLoading(true);
    try {
      const res = await recalcAndSaveMatchMinutes(match);
      toast.success(`U ruajtën minutat për ${res.saved} lojtarë`);
    } catch (e) {
      toast.error('Gabim: ' + (e?.message || 'rikalkulimi'));
    } finally {
      setRecalcLoading(false);
    }
  };

  const openEdit = (match) => {
    setEditing(match);
    setSelectedAgentId(match.assigned_agent_id || '');
    setShowInLive(match.show_in_live !== false);
    setHasVar(match.has_var || false);
    setDeepStats(match.deep_stats || false);
    setSuperDeep(match.super_deep || false);
    setBasicCoverage(match.basic_coverage || false);
    setDisabledButtons(match.disabled_event_buttons || []);
    setLineupLocked(match.lineup_locked || false);
    setSlowUpdate(match.slow_update || false);
    setAdminEtFirstHalf(match.admin_et_first_half || 0);
    setAdminEtSecondHalf(match.admin_et_second_half || 0);
    setIsCupMatch(match.is_cup_match || false);
    setIsTestMatch(match.is_test_match || false);
    setFtOnly(match.ft_only || false);
    setRoundOrPhase(match.phase_text ? 'phase' : 'round');
    setMatchStatus(match.status || 'scheduled');
    setForm({
      competition_id: match.competition_id || '',
      round: match.round || '',
      phase_text: match.phase_text || '',
      phase_order: match.phase_order || '',
      home_team_id: match.home_team_id || '',
      home_score: match.home_score ?? 0,
      away_score: match.away_score ?? 0,
      away_team_id: match.away_team_id || '',
      stadium: match.stadium || '',
      date: match.date || '',
      time: match.time || '',
      match_code: match.match_code || '',
      referee_main: match.referee_main || '',
      referee_assistant1: match.referee_assistant1 || '',
      referee_assistant2: match.referee_assistant2 || '',
      referee_var: match.referee_var || '',
      referee_avar: match.referee_avar || '',
      referee_forth: match.referee_forth || '',
      highlights_url: match.highlights_url || '',
    });
    setSlug(match.slug || '');
    setSlugManuallyEdited(false);
    setDialogOpen(true);
  };

  const toggleDisabledBtn = (btn) => {
    setDisabledButtons(prev => prev.includes(btn) ? prev.filter(b => b !== btn) : [...prev, btn]);
  };

  const openNew = () => {
    setEditing(null);
    setSelectedAgentId('');
    setIsCupMatch(false);
    setIsTestMatch(false);
    setFtOnly(false);
    setShowInLive(true);
    setHasVar(false);
    setDeepStats(false);
    setSuperDeep(false);
    setBasicCoverage(false);
    setDisabledButtons([]);
    setLineupLocked(false);
    setSlowUpdate(false);
    setAdminEtFirstHalf(0);
    setAdminEtSecondHalf(0);
    setRoundOrPhase('round');
    setMatchStatus('scheduled');
    const presetComp = selectedComp !== 'all' ? selectedComp : ((competitions.find(c => !c.archived && !c.hidden) || competitions[0])?.id || '');
    setForm({
      competition_id: presetComp, round: '', phase_text: '', home_team_id: '', away_team_id: '',
      home_score: 0, away_score: 0,
      stadium: '', date: '', time: '', match_code: generateCode(),
      referee_main: '', referee_assistant1: '', referee_assistant2: '', referee_var: '', referee_avar: '', referee_forth: '',
    });
    setSlug('');
    setSlugManuallyEdited(false);
    setDialogOpen(true);
  };

  // For cup matches, allow all clubs; otherwise filter by competition
  const compClubs = isCupMatch ? clubs : clubs.filter(c => c.competition_id === form.competition_id);

  const currentSeasonComps = competitions
    .filter(c => !c.archived && !c.hidden)
    .sort((a, b) => (a.tier || 99) - (b.tier || 99));
  const formComp = competitions.find(c => c.id === form.competition_id);
  const matchDropdownComps = (formComp && (formComp.archived || formComp.hidden)) ? [formComp, ...currentSeasonComps] : currentSeasonComps;
  // Auto-set stadium when home team changes
  const handleHomeTeamChange = (v) => {
    const homeClub = clubs.find(c => c.id === v);
    setForm(p => ({ ...p, home_team_id: v, stadium: homeClub?.stadium || p.stadium }));
  };
  const filtered = selectedComp === 'all' ? matches : matches.filter(m => m.competition_id === selectedComp);

  // Group ALL matches (not just filtered) by competition + round/phase for the dropdown
  const allGrouped = {};
  matches.forEach(m => {
    const compKey = m.competition_id || 'unknown';
    const roundKey = m.phase_text ? `phase_${m.phase_text}` : `round_${m.round || 0}`;
    const key = `${compKey}__${roundKey}`;
    const comp = competitions.find(c => c.id === m.competition_id);
    const compName = comp?.name || m.competition_name || '';
    const roundLabel = m.phase_text || `Java ${m.round || '?'}`;
    const label = `${compName} – ${roundLabel}`;
    if (!allGrouped[key]) allGrouped[key] = { label, roundNum: m.round || 0, matches: [] };
    allGrouped[key].matches.push(m);
  });

  // Group filtered matches for display
  const grouped = {};
  filtered.forEach(m => {
    const compKey = m.competition_id || 'unknown';
    const roundKey = m.phase_text ? `phase_${m.phase_text}` : `round_${m.round || 0}`;
    const key = `${compKey}__${roundKey}`;
    const comp = competitions.find(c => c.id === m.competition_id);
    const compName = comp?.name || m.competition_name || '';
    const roundLabel = m.phase_text || `Java ${m.round || '?'}`;
    const label = selectedComp === 'all' ? `${compName} – ${roundLabel}` : roundLabel;
    if (!grouped[key]) grouped[key] = { label, roundNum: m.round || 0, matches: [] };
    grouped[key].matches.push(m);
  });
  
  // Sort newest rounds first (descending), phases last
  const allSortedRounds = Object.keys(allGrouped).sort((a, b) => {
    const aIsPhase = a.includes('__phase_');
    const bIsPhase = b.includes('__phase_');
    if (!aIsPhase && !bIsPhase) return allGrouped[b].roundNum - allGrouped[a].roundNum;
    if (aIsPhase && !bIsPhase) return 1;
    if (!aIsPhase && bIsPhase) return -1;
    return 0;
  });
  const sortedRounds = selectedRound === 'all' ? Object.keys(grouped).sort((a, b) => {
    const aIsPhase = a.includes('__phase_');
    const bIsPhase = b.includes('__phase_');
    if (!aIsPhase && !bIsPhase) return grouped[b].roundNum - grouped[a].roundNum;
    if (aIsPhase && !bIsPhase) return 1;
    if (!aIsPhase && bIsPhase) return -1;
    return 0;
  }) : Object.keys(grouped).filter(k => k === selectedRound);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Kodi u kopjua');
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const refsByRole = (role) => referees.filter(r => r.role === role);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Ndeshjet</h2>
        <div className="flex gap-2">
          <Button onClick={() => { openNew(); setIsTestMatch(true); }} size="sm" variant="outline">🧪 Test Match</Button>
          <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Shto</Button>
        </div>
      </div>

      {selectedComp === 'all' ? (
        <div>
          <p className="text-xs text-muted-foreground mb-3">Zgjidh një ligë për të shfaqur ndeshjet</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {currentSeasonComps.map(c => {
              const count = matches.filter(m => m.competition_id === c.id).length;
              return (
                <button key={c.id} onClick={() => { setSelectedComp(c.id); setSelectedRound('all'); }}
                  className="flex flex-col items-center gap-2 bg-card rounded-2xl border-2 border-border hover:border-primary hover:shadow-md transition-all p-4 group">
                  {c.logo ? <img src={c.logo} alt="" className="w-12 h-12 object-contain" /> : <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold">{c.name?.[0]}</div>}
                  <p className="text-xs font-bold text-center leading-tight group-hover:text-primary transition-colors">{c.name}</p>
                  <span className="text-[10px] text-muted-foreground">{count} ndeshje</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => { setSelectedComp('all'); setSelectedRound('all'); }} className="flex items-center gap-1 text-sm text-primary font-semibold mb-3 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Të gjitha ligat
          </button>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(() => {
              const c = competitions.find(x => x.id === selectedComp);
              return c ? (
                <>
                  {c.logo && <img src={c.logo} alt="" className="w-7 h-7 object-contain" />}
                  <h3 className="text-base font-bold">{c.name}</h3>
                </>
              ) : null;
            })()}
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Java" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Të gjitha javët</SelectItem>
                {allSortedRounds.map(k => <SelectItem key={k} value={k}>{allGrouped[k].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" title="Importo ndeshje nga link/foto"
              onClick={() => { setImportComp(competitions.find(c => c.id === selectedComp)); setImportOpen(true); }}>
              🔗 Importo
            </Button>
          </div>

          {sortedRounds.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nuk ka ndeshje ende</p>}
          {sortedRounds.map(key => (
            <div key={key} className="mb-4">
              {/* Black week band — wide, with the round label in the middle */}
              <div className="bg-black text-white text-center py-2 rounded-lg mb-2 shadow-sm">
                <span className="text-sm font-black tracking-wider uppercase">{grouped[key].label}</span>
              </div>
              <div className="space-y-2">
                {grouped[key].matches.map(match => (
                  <div key={match.id} className={`flex items-center gap-3 bg-card rounded-xl p-3 border ${match.is_test_match ? 'border-yellow-300 bg-yellow-50' : 'border-border'}`}>
                    {match.is_test_match && <span className="text-[9px] bg-yellow-200 text-yellow-800 font-bold px-1 rounded">TEST</span>}
                    {match.deep_stats && <span className="text-[9px] bg-blue-200 text-blue-800 font-bold px-1 rounded">DEEP</span>}
                    {match.super_deep && <span className="text-[9px] bg-yellow-200 text-yellow-800 font-bold px-1 rounded">⚡SD</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{match.home_team_name} vs {match.away_team_name}</p>
                      <p className="text-xs text-muted-foreground">{match.date} {match.time} • {match.stadium}</p>
                    </div>
                    <button
                      onClick={() => copyCode(match.match_code)}
                      className="flex items-center gap-1 text-[10px] bg-muted px-2 py-1 rounded font-mono"
                      title="Kopjo kodin"
                    >
                      <Copy className="w-3 h-3" />
                      {match.match_code}
                    </button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Rikalkulo minutat e lojtarëve" onClick={() => handleRecalcMinutes(match)}><Timer className="w-4 h-4 text-amber-600" /></Button>
                      <Button variant="ghost" size="icon" title="Ngjarjet" onClick={() => { setEventsMatch(match); setEventsOpen(true); }}><ListChecks className="w-4 h-4 text-primary" /></Button>
                      <Button variant="ghost" size="icon" title="Formacioni" onClick={() => { setLineupsMatch(match); setLineupsOpen(true); }}><Users className="w-4 h-4 text-green-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(match)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(match.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminMatchEvents match={eventsMatch} open={eventsOpen} onClose={() => setEventsOpen(false)} />
      <ImportMatchesFromUrl competition={importComp} clubs={clubs} open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />
      <AdminLineupsDialog match={lineupsMatch} open={lineupsOpen} onClose={() => setLineupsOpen(false)} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edito' : 'Krijo'} Ndeshje</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Status */}
            <div>
              <Label>Statusi i Ndeshjes</Label>
              <select value={matchStatus} onChange={e => setMatchStatus(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                <option value="scheduled">Planifikuar</option>
                <option value="first_half">Pjesa 1</option>
                <option value="half_time">Pushim</option>
                <option value="second_half">Pjesa 2</option>
                <option value="full_time">Përfundoi (FT)</option>
                <option value="cancelled">E Anuluar</option>
                <option value="interrupted">E Ndërprerë</option>
                <option value="postponed">E Shtyer</option>
                <option value="official_result">⚖️ Rezultat Zyrtar</option>
              </select>
            </div>

            {isTestMatch && <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2 text-xs text-yellow-800 font-semibold">🧪 TEST MATCH – Nuk shfaqet për publikun</div>}
            {/* Checkboxes row */}
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={showInLive} onChange={e => setShowInLive(e.target.checked)} className="rounded" />
                <span className="text-xs font-medium">Shfaq LIVE</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={hasVar} onChange={e => setHasVar(e.target.checked)} className="rounded" />
                <span className="text-xs font-medium">Ka VAR</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={isCupMatch} onChange={e => setIsCupMatch(e.target.checked)} className="rounded" />
                <span className="text-xs font-medium">Kupë</span>
              </label>
            </div>
            {/* Opsionet e mbulimit — korniza kompakte */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Opsionet e Mbulimit</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                <ToggleChip active={deepStats} onClick={() => setDeepStats(!deepStats)} icon="📊" label="Deep Stats" tint="blue" />
                <ToggleChip active={superDeep} onClick={() => setSuperDeep(!superDeep)} icon="⚡" label="SuperDeep" tint="yellow" />
                <ToggleChip active={basicCoverage} onClick={() => setBasicCoverage(!basicCoverage)} icon="🟢" label="Basic Coverage" tint="green" />
                <ToggleChip active={isTestMatch} onClick={() => setIsTestMatch(!isTestMatch)} icon="🧪" label="Test Match" tint="yellow" />
                <ToggleChip active={ftOnly} onClick={() => setFtOnly(!ftOnly)} icon="📋" label="FT Only" tint="orange" />
                <ToggleChip active={lineupLocked} onClick={() => setLineupLocked(!lineupLocked)} icon="🔒" label="Blloko Formacionet" tint="red" />
                <ToggleChip active={slowUpdate} onClick={() => setSlowUpdate(!slowUpdate)} icon="🐢" label="Përditësim i Ngadaltë" tint="orange" />
              </div>
            </div>
            {/* Minutat shtesë (dëshmi admini) */}
            <div className="border-t pt-3">
              <p className="text-xs font-bold mb-2 text-muted-foreground">Minutat shtesë (dëshmi admini)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Shtesë Pjesa 1 (min)</Label>
                  <Input type="number" min={0} value={adminEtFirstHalf} onChange={e => setAdminEtFirstHalf(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Shtesë Pjesa 2 (min)</Label>
                  <Input type="number" min={0} value={adminEtSecondHalf} onChange={e => setAdminEtSecondHalf(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Disable event buttons */}
            <div>
              <Label className="block mb-2 text-xs">Disable butona ngjarjesh (për agjentë)</Label>
              <div className="grid grid-cols-2 gap-1">
                {['goal','yellow_card','second_yellow','red_card','substitution','missed_penalty'].map(btn => (
                  <label key={btn} className="flex items-center gap-2 p-2 bg-muted/30 rounded cursor-pointer">
                    <input type="checkbox" checked={disabledButtons.includes(btn)} onChange={() => toggleDisabledBtn(btn)} className="rounded" />
                    <span className="text-xs">{btn}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Kompeticioni <span className="text-destructive">*</span></Label>
              <Select value={form.competition_id} onValueChange={v => setForm(p => ({ ...p, competition_id: v, home_team_id: '', away_team_id: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {matchDropdownComps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Round or Phase text */}
        <div>
          <div className="flex gap-2 mb-2">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" checked={roundOrPhase === 'round'} onChange={() => setRoundOrPhase('round')} />
              <span className="text-xs">Java (Round)</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" checked={roundOrPhase === 'phase'} onChange={() => setRoundOrPhase('phase')} />
              <span className="text-xs">Faza (tekst)</span>
            </label>
          </div>
          {roundOrPhase === 'round'
            ? <Input type="number" placeholder="1" value={form.round} onChange={e => setForm(p => ({ ...p, round: e.target.value }))} />
            : (
              <div className="space-y-2">
                <Input placeholder="p.sh. GJYSEMFINALE, FINALE" value={form.phase_text} onChange={e => setForm(p => ({ ...p, phase_text: e.target.value }))} />
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Rendi (1=FINALE, 2=GJTM...)</Label>
                  <Input type="number" min={1} placeholder="1" value={form.phase_order || ''} onChange={e => setForm(p => ({ ...p, phase_order: e.target.value }))} className="w-20 text-center" />
                </div>
              </div>
            )
          }
        </div>
            {/* ⚽ Gola & Ekipet — seksion i dallueshëm me prapvijë të lehtë */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">⚽ Gola & Ekipet</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Gola Vendas</Label>
                  <Input type="number" min={0} value={form.home_score} onChange={e => setForm(p => ({ ...p, home_score: e.target.value }))} className="bg-card text-center font-bold" />
                </div>
                <div>
                  <Label className="text-xs font-bold">Gola Mysafir</Label>
                  <Input type="number" min={0} value={form.away_score} onChange={e => setForm(p => ({ ...p, away_score: e.target.value }))} className="bg-card text-center font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Ekipi Vendas <span className="text-destructive">*</span></Label>
                  <Select value={form.home_team_id} onValueChange={handleHomeTeamChange}>
                    <SelectTrigger className="bg-card font-semibold"><SelectValue placeholder="Zgjedh" /></SelectTrigger>
                    <SelectContent>
                      {compClubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold">Ekipi Mysafir <span className="text-destructive">*</span></Label>
                  <Select value={form.away_team_id} onValueChange={v => setForm(p => ({ ...p, away_team_id: v }))}>
                    <SelectTrigger className="bg-card font-semibold"><SelectValue placeholder="Zgjedh" /></SelectTrigger>
                    <SelectContent>
                      {compClubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <Label>Stadiumi</Label>
              <Select value={form.stadium} onValueChange={v => setForm(p => ({ ...p, stadium: v }))}>
                <SelectTrigger><SelectValue placeholder="Zgjedh stadiumi" /></SelectTrigger>
                <SelectContent>
                  {[...new Set(clubs.map(c => c.stadium).filter(Boolean))].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className="mt-1" placeholder="Ose shkruaj manuale..." value={form.stadium} onChange={e => setForm(p => ({ ...p, stadium: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><Label>Ora</Label><Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
            </div>
            <div>
              <Label>URL Slug (/ndeshja/...)</Label>
              <div className="flex gap-2">
                <Input
                  value={slug}
                  readOnly={!slugManuallyEdited}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="font-mono text-xs"
                  placeholder="auto-gjenerohet nga ekipet dhe data"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setSlugManuallyEdited(p => !p)}>
                  {slugManuallyEdited ? 'Auto' : 'Edit'}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 break-all">/ndeshja/{slug || '...'}</p>
            </div>
            <div>
              <Label>Kodi i Ndeshjes</Label>
              <div className="flex gap-2">
                <Input value={form.match_code} onChange={e => setForm(p => ({ ...p, match_code: e.target.value }))} className="font-mono" />
                <Button variant="outline" onClick={() => setForm(p => ({ ...p, match_code: generateCode() }))}>Gjenero</Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-bold mb-3">Gjyqtarët</h4>
              <div className="space-y-3">
                {[
                  { key: 'referee_main', label: 'Kryesor', role: 'Kryesor' },
                  { key: 'referee_assistant1', label: 'Asistent 1', role: 'Assistant 1' },
                  { key: 'referee_assistant2', label: 'Asistent 2', role: 'Assistant 2' },
                  { key: 'referee_var', label: 'VAR', role: 'VAR' },
                  { key: 'referee_avar', label: 'AVAR', role: 'AVAR' },
                  { key: 'referee_forth', label: 'I Katërt', role: 'Forth Official' },
                ].map(ref => (
                  <div key={ref.key}>
                    <Label>{ref.label}</Label>
                    <Select value={form[ref.key]} onValueChange={v => setForm(p => ({ ...p, [ref.key]: v }))}>
                      <SelectTrigger><SelectValue placeholder="Zgjedh" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">Pa gjyqtar</SelectItem>
                        {refsByRole(ref.role).map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                        {/* Also show all referees */}
                        {referees.filter(r => r.role !== ref.role).map(r => <SelectItem key={r.id} value={r.name}>{r.name} ({r.role})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent assignment */}
            <div>
              <Label>Agjenti i Caktuar (opsional)</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger><SelectValue placeholder="Pa agjent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Pa agjent</SelectItem>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <Label>🎬 Highlights YouTube URL (opsional)</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={form.highlights_url || ''}
                onChange={e => setForm(p => ({ ...p, highlights_url: e.target.value }))}
              />
            </div>

            <Button onClick={handleSave} className="w-full">{editing ? 'Përditëso' : 'Krijo'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleChip({ active, onClick, icon, label, tint }) {
  const tints = {
    blue: 'border-blue-300 bg-blue-50 text-blue-800',
    yellow: 'border-yellow-300 bg-yellow-50 text-yellow-800',
    green: 'border-green-300 bg-green-50 text-green-800',
    orange: 'border-orange-300 bg-orange-50 text-orange-800',
    red: 'border-red-300 bg-red-50 text-red-800',
  };
  return (
    <button type="button" onClick={onClick}
      className={cn('flex items-center gap-1.5 p-2 rounded-lg border text-[11px] font-semibold transition-all text-left',
        active ? tints[tint] : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60')}>
      <span className="text-sm leading-none shrink-0">{icon}</span>
      <span className="flex-1 leading-tight">{label}</span>
      <span className={cn('w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center', active ? 'bg-primary border-primary' : 'border-input')}>
        {active && <Check className="w-2.5 h-2.5 text-white" />}
      </span>
    </button>
  );
}