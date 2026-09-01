import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import FootballPitch from './FootballPitch.jsx';
import PlayerPicker from '@/components/matchfeed/PlayerPicker';
import PreMatchDetailsDialog from './PreMatchDetailsDialog.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SHOT_ON_ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/0097eee59_SHOOTON.png';
const SHOT_OFF_ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/03d49bf3c_SHOOTOFF.png';

const GAME_EVENTS = [
  { key: 'corner',    label: 'Korner',              icon: '🚩',            color: 'orange' },
  { key: 'shot_on',   label: 'Shut në portë',       iconUrl: SHOT_ON_ICON,  color: 'green' },
  { key: 'shot_off',  label: 'Shut jashtë',         iconUrl: SHOT_OFF_ICON, color: 'blue' },
  { key: 'foul',      label: 'Faul',                icon: '🤚',            color: 'yellow' },
  { key: 'offside',   label: 'Ofsajd',              icon: '🚩',            color: 'purple' },
  { key: 'free_kick', label: 'Goditje e Rrezikshme', icon: '⚡',            color: 'orange' },
];

const DISCIPLINARY_EVENTS = [
  { key: 'yellow',       label: 'Karton i Verdhë', icon: '🟨', color: 'yellow', needsCardPlayer: true },
  { key: 'red',          label: 'Karton i Kuq',    icon: '🟥', color: 'red',    needsCardPlayer: true },
  { key: 'penalty',      label: 'Penalti',         icon: '⚡', color: 'red',    isPenalty: true },
  { key: 'substitution', label: 'Zëvendësim',      icon: '🔄', color: 'green',  needsPlayer: true },
  { key: 'injury',       label: 'Lëndim',          icon: '🚑', color: 'red',    isInjury: true },
];

const COLOR_MAP = {
  orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-400 hover:bg-orange-100',
  green:  'bg-green-50 border-green-200 text-green-700 hover:border-green-400 hover:bg-green-100',
  blue:   'bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-100',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:border-yellow-400 hover:bg-yellow-100',
  purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:border-purple-400 hover:bg-purple-100',
  red:    'bg-red-50 border-red-200 text-red-700 hover:border-red-400 hover:bg-red-100',
};

// 4 corner positions for corner picker
const CORNER_POSITIONS = [
  { id: 'TL', label: 'Këndi lart-majtas', x: 2,  y: 2  },
  { id: 'TR', label: 'Këndi lart-djathtas', x: 98, y: 2  },
  { id: 'BL', label: 'Këndi poshtë-majtas', x: 2,  y: 98 },
  { id: 'BR', label: 'Këndi poshtë-djathtas', x: 98, y: 98 },
];

function calcMinute(match) {
  const now = Date.now();
  if (match.status === 'first_half' && match.match_start_timestamp)
    return Math.max(1, Math.ceil((now - match.match_start_timestamp) / 60000));
  if (match.status === 'second_half' && match.second_half_start_timestamp)
    return Math.max(46, 45 + Math.ceil((now - match.second_half_start_timestamp) / 60000));
  if (match.status === 'extra_time_first_half' && match.extra_time_start_timestamp)
    return 90 + Math.ceil((now - match.extra_time_start_timestamp) / 60000);
  if (match.status === 'extra_time_second_half' && match.extra_time_sh_start_timestamp)
    return 105 + Math.ceil((now - match.extra_time_sh_start_timestamp) / 60000);
  return match.minute || 0;
}

export default function SuperDeepAgentPanel({ match, updateMatch, events, homePlayers, awayPlayers, loadData, readOnly }) {
  const [subDialog, setSubDialog] = useState(null);
  const [playerOut, setPlayerOut] = useState('');
  const [playerIn, setPlayerIn] = useState('');
  const [injuryDialog, setInjuryDialog] = useState(null);
  const [injuryPlayer, setInjuryPlayer] = useState('');
  const [goalDialog, setGoalDialog] = useState(null);
  const [goalScorer, setGoalScorer] = useState('');
  const [goalAssist, setGoalAssist] = useState('');
  const [penaltyDialog, setPenaltyDialog] = useState(null);
  const [penaltyTeamLocal, setPenaltyTeamLocal] = useState(null);
  const [penaltyPlayer, setPenaltyPlayer] = useState('');
  const [penaltyPhase, setPenaltyPhase] = useState('player');
  const [cardDialog, setCardDialog] = useState(null);
  const [cardPlayer, setCardPlayer] = useState('');
  const [cornerDialog, setCornerDialog] = useState(null);
  const [varDialog, setVarDialog] = useState(false);
  const [varTeam, setVarTeam] = useState(null);
  const [varReason, setVarReason] = useState(null);
  const [preMatchOpen, setPreMatchOpen] = useState(false);
  const [penaltyFlash, setPenaltyFlash] = useState(false);
  const [penaltyFlashTeam, setPenaltyFlashTeam] = useState(null);
  // Optimistic local possession state for instant UI feedback
  const [localPossession, setLocalPossession] = useState(null);
  const penaltyFlashTimerRef = useRef(null);

  const isLive = ['first_half', 'second_half', 'extra_time_first_half', 'extra_time_second_half'].includes(match.status);
  const isActive = isLive || match.status === 'half_time';
  const hasInjury = match.sd_last_event?.key?.startsWith('injury');

  const homeColor = match.sd_home_color || '#3b82f6';
  const awayColor = match.sd_away_color || '#ef4444';
  const homeSide = match.sd_home_side || 'left';

  // Use localPossession for immediate feedback, fall back to match data
  const currentPossession = localPossession !== null ? localPossession : match.sd_possession;
  const currentZone = match.sd_zone || 'midfield';

  // Sync localPossession when match data updates from server
  useEffect(() => {
    setLocalPossession(null); // Let match data take over
  }, [match.sd_possession]);

  // Red card counts from sdStats
  const redCards = {
    home: (match.sd_stats?.red_home || 0),
    away: (match.sd_stats?.red_away || 0),
  };

  // Helper: switch possession & accumulate time — OPTIMISTIC (instant UI)
  const switchPossession = async (newPossession) => {
    if (currentPossession === newPossession) return;
    setLocalPossession(newPossession);
    const now = Date.now();
    const base_home = match.stats_possession_home_ms || 0;
    const base_away = match.stats_possession_away_ms || 0;
    const elapsed = match.stats_possession_last_switch ? now - match.stats_possession_last_switch : 0;
    // Recompute zone with new possession (ball pos stays same, only team flips)
    const newZone = computeZoneFromBallPos(match.sd_ball_pos, newPossession, effectiveHomeSide);
    base44.entities.Match.update(match.id, {
      sd_possession: newPossession,
      sd_zone: newZone,
      stats_possession_last_switch: now,
      stats_possession_home_ms: match.sd_possession === 'home' ? base_home + elapsed : base_home,
      stats_possession_away_ms: match.sd_possession === 'away' ? base_away + elapsed : base_away,
    });
  };

  // Auto-compute zone from ball x position relative to possessing team's goal
  const computeZoneFromBallPos = (pos, possession, effectiveHomeSide) => {
    if (!pos || !possession) return 'midfield';
    const ballX = pos.x; // 0-100
    // Find the possessing team's own goal x
    const teamAttacksRight = (possession === 'home' && effectiveHomeSide === 'left') || (possession === 'away' && effectiveHomeSide === 'right');
    // Distance from own goal (0 = at own goal, 100 = at opponent goal)
    const distFromOwnGoal = teamAttacksRight ? ballX : (100 - ballX);
    if (distFromOwnGoal <= 35) return 'defence';
    if (distFromOwnGoal <= 65) return 'midfield';
    return 'attack';
  };

  // Determine effective home side (flipped in 2nd half)
  const isSecondHalf = ['second_half', 'extra_time_first_half', 'extra_time_second_half'].includes(match.status);
  const effectiveHomeSide = isSecondHalf ? (homeSide === 'left' ? 'right' : 'left') : homeSide;

  const buildPossessionSwitch = (toTeam) => {
    const now = Date.now();
    const base_home = match.stats_possession_home_ms || 0;
    const base_away = match.stats_possession_away_ms || 0;
    const elapsed = match.stats_possession_last_switch ? now - match.stats_possession_last_switch : 0;
    return {
      sd_possession: toTeam,
      stats_possession_last_switch: now,
      stats_possession_home_ms: match.sd_possession === 'home' ? base_home + elapsed : base_home,
      stats_possession_away_ms: match.sd_possession === 'away' ? base_away + elapsed : base_away,
    };
  };

  const fireSDEvent = async (key, team, player = null, extraUpdates = {}) => {
    const sdStats = match.sd_stats || {};
    const statKey = `${key}_${team}`;
    const updates = {
      sd_last_event: { key: `${key}_${team}`, ts: Date.now(), team, player },
      sd_stats: { ...sdStats, [statKey]: (sdStats[statKey] || 0) + 1 },
      ...extraUpdates,
    };

    // shot_off: transfer possession to opponent and move ball to OPPONENT's goal kick spot
    if (key === 'shot_off') {
      const opponent = team === 'home' ? 'away' : 'home';
      const opponentPenaltyX = opponent === 'home'
        ? (effectiveHomeSide === 'left' ? 11 : 89)
        : (effectiveHomeSide === 'left' ? 89 : 11);
      updates.sd_ball_pos = { x: opponentPenaltyX, y: 50 };
      setLocalPossession(opponent);
      Object.assign(updates, buildPossessionSwitch(opponent));
    }

    // corner: handled separately
    if (key === 'corner') return;

    // free_kick: move ball near opponent box
    if (key === 'free_kick') {
      const attackRight = (team === 'home' && effectiveHomeSide === 'left') || (team === 'away' && effectiveHomeSide === 'right');
      updates.sd_ball_pos = { x: attackRight ? 78 : 22, y: 30 + (Math.random() * 20 - 10) };
    }

    // offside: switch possession to opponent, ball stays where it is
    if (key === 'offside') {
      const opponent = team === 'home' ? 'away' : 'home';
      setLocalPossession(opponent);
      Object.assign(updates, buildPossessionSwitch(opponent));
    }

    // foul: show OPPONENT team name in animation
    if (key === 'foul') {
      const opponent = team === 'home' ? 'away' : 'home';
      updates.sd_last_event = { key: `foul_${opponent}`, ts: Date.now(), team: opponent, player };
    }

    await base44.entities.Match.update(match.id, updates);

    // Log only certain SD events as MatchEvents (not shot_on, shot_off, offside, injury — stats only)
    const sdEventToMatchType = {
      corner: 'corner',
      foul: 'foul',
      free_kick: 'free_kick',
      yellow: 'yellow_card',
      red: 'red_card',
      substitution: 'substitution',
    };
    if (sdEventToMatchType[key]) {
      base44.entities.MatchEvent.create({
        match_id: match.id,
        team,
        type: sdEventToMatchType[key],
        minute: calcMinute(match),
        event_timestamp: Date.now(),
        player_name: player || '',
      }).catch(() => {});
    }

    loadData();
  };

  // Ball move from pitch tap — auto-computes zone, clears corner arrow
  const handleBallMove = async (pos) => {
    if (readOnly) return;
    const newZone = computeZoneFromBallPos(pos, currentPossession, effectiveHomeSide);
    const updates = { sd_ball_pos: pos, sd_zone: newZone, sd_corner_arrow: null };
    await base44.entities.Match.update(match.id, updates);
  };

  // Possession change from swipe on pitch
  const handlePossessionChange = (team) => {
    if (readOnly || !isActive) return;
    switchPossession(team);
  };

  const handleGameEvent = async (evtKey, team) => {
    if (readOnly || !isActive) return;
    if (evtKey === 'corner') {
      setCornerDialog({ team });
      return;
    }
    await fireSDEvent(evtKey, team);
    toast.success(`${evtKey} — ${team === 'home' ? match.home_team_name : match.away_team_name}`);
  };

  const handleDisciplinary = async (evtKey, team) => {
    if (readOnly || !isActive) return;
    if (evtKey === 'substitution') { setSubDialog({ team }); setPlayerOut(''); setPlayerIn(''); return; }
    if (evtKey === 'injury') { setInjuryDialog({ team }); setInjuryPlayer(''); return; }
    if (evtKey === 'penalty') {
      setPenaltyTeamLocal(team);
      setPenaltyPlayer('');
      setPenaltyPhase('player');
      setPenaltyDialog(true);
      return;
    }
    if (evtKey === 'yellow' || evtKey === 'red') { setCardDialog({ team, key: evtKey }); setCardPlayer(''); return; }
    await fireSDEvent(evtKey, team);
  };

  // Corner: execute from a specific corner
  const handleCornerExecute = async (corner) => {
    const team = cornerDialog.team;
    setCornerDialog(null);
    const sdStats = match.sd_stats || {};
    // Arrow points toward the OPPONENT's goal (where the team attacks)
    // home attacks toward right if homeSide='left'; toward left if homeSide='right'
    const teamAttacksRight = team === 'home' ? homeSide === 'left' : homeSide === 'right';
    const goalX = teamAttacksRight ? 89 : 11; // opponent penalty spot
    const arrowTo = { x: goalX, y: 30 };
    await base44.entities.Match.update(match.id, {
      sd_last_event: { key: `corner_${team}`, ts: Date.now(), team, player: null },
      sd_stats: { ...sdStats, [`corner_${team}`]: (sdStats[`corner_${team}`] || 0) + 1 },
      sd_ball_pos: { x: corner.x, y: corner.y },
      sd_corner_arrow: { fromX: corner.x, fromY: corner.y, toX: arrowTo.x, toY: arrowTo.y },
    });
    loadData();
    toast.success(`Korner — ${team === 'home' ? match.home_team_name : match.away_team_name}`);
  };

  // Penalty flow
  const startPenaltyAnimation = async (team) => {
    const teamAttackSide = team === 'home' ? homeSide : (homeSide === 'left' ? 'right' : 'left');
    const penaltyX = teamAttackSide === 'right' ? 89 : 11;
    const sdStats = match.sd_stats || {};
    await base44.entities.Match.update(match.id, {
      sd_last_event: { key: `penalty_${team}`, ts: Date.now(), team, player: penaltyPlayer || null },
      sd_ball_pos: { x: penaltyX, y: 50 },
      sd_stats: { ...sdStats, [`penalty_${team}`]: (sdStats[`penalty_${team}`] || 0) + 1 },
    });
    setPenaltyFlash(true);
    setPenaltyFlashTeam(team);
    if (penaltyFlashTimerRef.current) clearTimeout(penaltyFlashTimerRef.current);
    loadData();
  };

  const handlePenaltyPlayerConfirm = async () => {
    // Start animation immediately, then show outcome buttons
    await startPenaltyAnimation(penaltyTeamLocal);
    setPenaltyPhase('outcome');
  };

  const handlePenaltyGoal = async () => {
    const team = penaltyTeamLocal;
    setPenaltyDialog(false);
    setPenaltyFlash(false);
    setPenaltyFlashTeam(null);
    // Immediately dismiss penalty ball from public view
    await base44.entities.Match.update(match.id, { sd_last_event: null });
    const minute = calcMinute(match);
    const scoreKey = team === 'home' ? 'home_score' : 'away_score';
    const newScore = (match[scoreKey] || 0) + 1;
    const opponent = team === 'home' ? 'away' : 'home';
    // Ball to center, possession to opponent
    const now = Date.now();
    const base_home = match.stats_possession_home_ms || 0;
    const base_away = match.stats_possession_away_ms || 0;
    const elapsed = match.stats_possession_last_switch ? now - match.stats_possession_last_switch : 0;
    await base44.entities.Match.update(match.id, {
      [scoreKey]: newScore,
      sd_last_event: { key: 'goal', ts: Date.now(), team, player: penaltyPlayer || null },
      sd_ball_pos: { x: 50, y: 50 },
      sd_possession: opponent,
      stats_possession_last_switch: now,
      stats_possession_home_ms: match.sd_possession === 'home' ? base_home + elapsed : base_home,
      stats_possession_away_ms: match.sd_possession === 'away' ? base_away + elapsed : base_away,
    });
    await base44.entities.MatchEvent.create({
      match_id: match.id, team, type: 'penalty_goal', minute,
      event_timestamp: Date.now(), player_name: penaltyPlayer || '',
      is_penalty: true,
      home_score_after: team === 'home' ? newScore : (match.home_score || 0),
      away_score_after: team === 'away' ? newScore : (match.away_score || 0),
    });
    toast.success('⚽ Penalti GOL!');
    loadData();
  };

  const handlePenaltyMissed = async () => {
    const team = penaltyTeamLocal;
    setPenaltyDialog(false);
    setPenaltyFlash(false);
    setPenaltyFlashTeam(null);
    // Show missed animation briefly then clear
    await base44.entities.Match.update(match.id, {
      sd_last_event: { key: `penalty_missed_${team}`, ts: Date.now(), team, player: penaltyPlayer || null },
    });
    await base44.entities.MatchEvent.create({
      match_id: match.id, team, type: 'missed_penalty',
      minute: calcMinute(match), event_timestamp: Date.now(),
      player_name: penaltyPlayer || '', is_penalty: true,
    });
    toast('❌ Penalti e humbur');
    // Clear penalty animation immediately (no delay)
    await base44.entities.Match.update(match.id, { sd_last_event: null });
    loadData();
  };

  // Card
  const handleCardConfirm = async () => {
    const { team, key } = cardDialog;
    await fireSDEvent(key, team, cardPlayer || null);
    toast.success(`${key === 'yellow' ? '🟨' : '🟥'} Karton — ${cardPlayer || ''}`);
    setCardDialog(null);
  };

  // Goal
  const handleGoalOpen = (team) => {
    if (readOnly || !isActive) return;
    setGoalDialog({ team }); setGoalScorer(''); setGoalAssist('');
  };

  const handleGoalConfirm = async () => {
    const team = goalDialog.team;
    const minute = calcMinute(match);
    const scoreKey = team === 'home' ? 'home_score' : 'away_score';
    const newScore = (match[scoreKey] || 0) + 1;
    const opponent = team === 'home' ? 'away' : 'home';
    const now = Date.now();
    const base_home = match.stats_possession_home_ms || 0;
    const base_away = match.stats_possession_away_ms || 0;
    const elapsed = match.stats_possession_last_switch ? now - match.stats_possession_last_switch : 0;
    await base44.entities.Match.update(match.id, {
      sd_last_event: { key: 'goal', ts: Date.now(), team, player: goalScorer || null },
      [scoreKey]: newScore,
      // Ball to center, give possession to team that conceded
      sd_ball_pos: { x: 50, y: 50 },
      sd_possession: opponent,
      stats_possession_last_switch: now,
      stats_possession_home_ms: match.sd_possession === 'home' ? base_home + elapsed : base_home,
      stats_possession_away_ms: match.sd_possession === 'away' ? base_away + elapsed : base_away,
    });
    await base44.entities.MatchEvent.create({
      match_id: match.id, team, type: 'goal', minute,
      event_timestamp: Date.now(), player_name: goalScorer || '',
      assist_player_name: goalAssist || '',
      home_score_after: team === 'home' ? newScore : (match.home_score || 0),
      away_score_after: team === 'away' ? newScore : (match.away_score || 0),
    });
    toast.success('⚽ GOL u regjistrua!');
    setGoalDialog(null);
    loadData();
  };

  const handleSubConfirm = async () => {
    const team = subDialog.team;
    const playerStr = playerOut && playerIn ? `${playerOut} → ${playerIn}` : playerOut || playerIn || null;
    await fireSDEvent('substitution', team, playerStr);
    toast.success('Zëvendësim u regjistrua');
    setSubDialog(null);
  };

  const handleInjuryConfirm = async () => {
    const team = injuryDialog.team;
    await fireSDEvent('injury', team, injuryPlayer || null);
    toast.success('Lëndimi u regjistrua');
    setInjuryDialog(null);
  };

  const handleMatchRestart = async () => {
    await base44.entities.Match.update(match.id, { sd_last_event: null });
    setPenaltyFlash(false);
    setPenaltyFlashTeam(null);
    loadData();
    toast.success('Animacioni u fshi');
  };

  // Dismiss any event animation OR corner arrow by clicking on the pitch
  const handleDismissOverlay = async () => {
    const updates = {};
    if (match.sd_last_event) updates.sd_last_event = null;
    if (match.sd_corner_arrow) updates.sd_corner_arrow = null;
    if (Object.keys(updates).length > 0) {
      await base44.entities.Match.update(match.id, updates);
      loadData();
      toast.success('Animacioni u mbyll');
    }
  };

  // Build sdLastEvent for agent pitch (same as public view)
  const SD_EVENT_DISPLAY_AGENT = {
    corner_home: { icon: '🚩', getLabel: () => 'Korner', getTeam: () => 'home' },
    corner_away: { icon: '🚩', getLabel: () => 'Korner', getTeam: () => 'away' },
    shot_on_home: { icon: '🎯', getLabel: () => 'Shut në portë', getTeam: () => 'home' },
    shot_on_away: { icon: '🎯', getLabel: () => 'Shut në portë', getTeam: () => 'away' },
    shot_off_home: { icon: '💨', getLabel: () => 'Shut jashtë', getTeam: () => 'home' },
    shot_off_away: { icon: '💨', getLabel: () => 'Shut jashtë', getTeam: () => 'away' },
    yellow_home: { icon: '🟨', getLabel: () => 'Karton i verdhë', getTeam: () => 'home' },
    yellow_away: { icon: '🟨', getLabel: () => 'Karton i verdhë', getTeam: () => 'away' },
    red_home: { icon: '🟥', getLabel: () => 'Karton i kuq', getTeam: () => 'home' },
    red_away: { icon: '🟥', getLabel: () => 'Karton i kuq', getTeam: () => 'away' },
    substitution_home: { icon: '🔄', getLabel: () => 'Zëvendësim', getTeam: () => 'home', isSubstitution: true },
    substitution_away: { icon: '🔄', getLabel: () => 'Zëvendësim', getTeam: () => 'away', isSubstitution: true },
    free_kick_home: { icon: '⚡', getLabel: () => 'Goditje e Rrezikshme', getTeam: () => 'home' },
    free_kick_away: { icon: '⚡', getLabel: () => 'Goditje e Rrezikshme', getTeam: () => 'away' },
    var_home: { icon: null, iconUrl: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/850b9973b_VARCHECK.png', getLabel: () => 'VAR CHECK', getTeam: () => 'home', isVar: true },
    var_away: { icon: null, iconUrl: 'https://media.base44.com/images/public/69c340685dca7075d7622e15/850b9973b_VARCHECK.png', getLabel: () => 'VAR CHECK', getTeam: () => 'away', isVar: true },
    offside_home: { icon: '🚩', getLabel: () => 'Ofsajd', getTeam: () => 'home' },
    offside_away: { icon: '🚩', getLabel: () => 'Ofsajd', getTeam: () => 'away' },
    penalty_home: { icon: '⚡', getLabel: () => 'Penalti', getTeam: () => 'home' },
    penalty_away: { icon: '⚡', getLabel: () => 'Penalti', getTeam: () => 'away' },
    penalty_missed_home: { icon: '❌', getLabel: () => 'Penalti e humbur', getTeam: () => 'home' },
    penalty_missed_away: { icon: '❌', getLabel: () => 'Penalti e humbur', getTeam: () => 'away' },
    foul_home: { icon: '🤚', getLabel: () => 'Faul', getTeam: () => 'home' },
    foul_away: { icon: '🤚', getLabel: () => 'Faul', getTeam: () => 'away' },
    injury_home: { icon: '🚑', getLabel: () => 'Lëndim', getTeam: () => 'home', isInjury: true },
    injury_away: { icon: '🚑', getLabel: () => 'Lëndim', getTeam: () => 'away', isInjury: true },
  };

  const agentSdLastEvent = (() => {
    const evt = match.sd_last_event;
    if (!evt || !evt.key || evt.key === 'goal') return null;
    const disp = SD_EVENT_DISPLAY_AGENT[evt.key];
    if (!disp) return null;
    const team = disp.getTeam();
    const teamName = team === 'home' ? match.home_team_name : match.away_team_name;
    const teamColor = team === 'home' ? homeColor : awayColor;
    let playerOut = null, playerIn = null, playerName = null;
    if (disp.isSubstitution && evt.player && evt.player.includes('→')) {
      const parts = evt.player.split('→');
      playerOut = parts[0]?.trim() || null;
      playerIn = parts[1]?.trim() || null;
    } else if (!disp.isVar) {
      playerName = evt.player || null;
    }
    const label = disp.isVar && evt.varLabel ? evt.varLabel : disp.getLabel();
    return { icon: disp.icon, iconUrl: disp.iconUrl || null, label, teamName: disp.isVar ? null : teamName, teamColor, playerName, playerOut, playerIn, isVar: disp.isVar || false, isInjury: disp.isInjury || false };
  })();

  const VAR_ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/850b9973b_VARCHECK.png';

  const VAR_REASONS = [
    { key: 'penalty', label: 'VAR PO SHIKON PËR PENALTI' },
    { key: 'goal', label: 'VAR PO SHIKON GOLIN' },
    { key: 'red_card', label: 'VAR PO SHIKON PËR KARTON TË KUQ' },
  ];

  const handleVarConfirm = async () => {
    if (!varTeam || !varReason) return;
    const teamName = varTeam === 'home' ? match.home_team_name : match.away_team_name;
    const reasonLabel = VAR_REASONS.find(r => r.key === varReason)?.label || '';
    await base44.entities.Match.update(match.id, {
      sd_last_event: {
        key: `var_${varTeam}`,
        ts: Date.now(),
        team: varTeam,
        player: `${reasonLabel} (${teamName})`,
        varIconUrl: VAR_ICON,
        varLabel: `${reasonLabel}`,
        varTeamName: teamName,
      },
    });
    setVarDialog(false);
    setVarTeam(null);
    setVarReason(null);
    loadData();
    toast.success('VAR u aktivizua');
  };

  const teamPlayers = (team) => team === 'home' ? homePlayers : awayPlayers;

  const subbedOutHome = events.filter(e => e.type === 'substitution' && e.team === 'home' && e.player_out_name).map(e => e.player_out_name);
  const subbedOutAway = events.filter(e => e.type === 'substitution' && e.team === 'away' && e.player_out_name).map(e => e.player_out_name);
  const subbedInHome = events.filter(e => e.type === 'substitution' && e.team === 'home' && e.player_in_name).map(e => e.player_in_name);
  const subbedInAway = events.filter(e => e.type === 'substitution' && e.team === 'away' && e.player_in_name).map(e => e.player_in_name);

  const starterPlayers = (team) => {
    const subbedOut = team === 'home' ? subbedOutHome : subbedOutAway;
    return teamPlayers(team).filter(p => !subbedOut.includes(p.name));
  };
  const benchPlayers = (team) => {
    const subbedIn = team === 'home' ? subbedInHome : subbedInAway;
    return teamPlayers(team).filter(p => !p.starter && !subbedIn.includes(p.name));
  };

  const renderBtn = (evt, team, onClick) => {
    const colorCls = COLOR_MAP[evt.color] || COLOR_MAP.blue;
    const disabled = readOnly || !isActive;
    return (
      <button
        key={evt.key + team}
        onClick={() => onClick(evt.key, team)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl border font-semibold text-xs transition-all',
          disabled ? 'opacity-40 cursor-not-allowed bg-muted border-border text-muted-foreground' : colorCls + ' active:scale-95'
        )}
      >
        {evt.iconUrl ? <img src={evt.iconUrl} alt={evt.label} className="w-4 h-4 object-contain" /> : <span>{evt.icon}</span>}
        <span>{evt.label}</span>
      </button>
    );
  };

  const isPreMatch = match.status === 'scheduled';
  const referees = isPreMatch ? { main: match.referee_main, assistant1: match.referee_assistant1, assistant2: match.referee_assistant2 } : null;

  return (
    <div className="space-y-4">
      {/* Pre-match setup */}
      {!match.sd_pre_match_set && (
        <button onClick={() => setPreMatchOpen(true)} className="w-full py-3 rounded-xl bg-yellow-400 text-yellow-900 font-black text-sm active:scale-95 transition-all border-2 border-yellow-500">
          ⚙️ Konfiguro para ndeshjes
        </button>
      )}
      {match.sd_pre_match_set && !isLive && (
        <button onClick={() => setPreMatchOpen(true)} className="w-full py-2 rounded-xl bg-muted border border-border text-muted-foreground font-semibold text-xs active:scale-95 transition-all">
          ⚙️ Ndrysho konfigurimet
        </button>
      )}

      {/* Pitch */}
      <div className="rounded-2xl overflow-hidden border border-border">
        <FootballPitch
          onBallMove={handleBallMove}
          onPossessionChange={handlePossessionChange}
          homeSide={homeSide}
          possession={currentPossession}
          homeTeamName={match.home_team_name}
          awayTeamName={match.away_team_name}
          readOnly={readOnly}
          homeColor={homeColor}
          awayColor={awayColor}
          ballPos={match.sd_ball_pos || null}
          cornerArrow={match.sd_corner_arrow || null}
          ballVisible={match.sd_ball_visible !== false && match.status !== 'half_time'}
          matchStatus={match.status}
          sdStats={match.sd_stats || {}}
          halfTimeStats={true}
          penaltyFlash={penaltyFlash}
          penaltyTeam={penaltyFlashTeam}
          referees={referees}
          redCards={redCards}
          showWeatherOnPitch={isPreMatch && match.sd_weather ? { weather: match.sd_weather, temp: match.sd_temp } : null}
          sdLastEvent={agentSdLastEvent}
          onDismissOverlay={handleDismissOverlay}
        />
        <div className="px-3 py-1.5 text-center text-[10px] text-muted-foreground">
          Kliko në fushë → lëviz topin &nbsp;·&nbsp; Rrëshqit majtas/djathtas → posedim
        </div>
      </div>

      {/* Possession buttons — hidden before match starts, kickoff selector when scheduled */}
      {isPreMatch ? (
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase text-muted-foreground text-center">Kush e nis topin i parë?</p>
          <div className="grid grid-cols-2 gap-2">
            {['home', 'away'].map(team => (
              <button
                key={team}
                onClick={() => {
                  if (!readOnly) {
                    setLocalPossession(team);
                    base44.entities.Match.update(match.id, { sd_possession: team, stats_possession_kick_off_team: team });
                  }
                }}
                disabled={readOnly}
                className={cn(
                  'py-2 rounded-xl border-2 font-bold text-xs transition-all',
                  currentPossession === team
                    ? 'text-white border-transparent'
                    : 'bg-muted border-border text-muted-foreground',
                  readOnly ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
                )}
                style={currentPossession === team ? { background: team === 'home' ? homeColor : awayColor } : {}}
              >
                ⚽ {team === 'home' ? match.home_team_name : match.away_team_name}
              </button>
            ))}
          </div>
        </div>
      ) : isActive ? (
        <div className="grid grid-cols-2 gap-2">
          {['home', 'away'].map(team => (
            <button
              key={team}
              onClick={() => { if (!readOnly) switchPossession(team); }}
              disabled={readOnly}
              className={cn(
                'py-2 rounded-xl border-2 font-bold text-xs transition-all',
                currentPossession === team
                  ? 'text-white border-transparent'
                  : 'bg-muted border-border text-muted-foreground',
                readOnly ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
              )}
              style={currentPossession === team ? { background: team === 'home' ? homeColor : awayColor } : {}}
            >
              ⚽ {team === 'home' ? match.home_team_name : match.away_team_name}
            </button>
          ))}
        </div>
      ) : null}



      {/* Ball visible / kickoff */}
      {(match.status === 'scheduled' || match.status === 'half_time') && (
        <button onClick={() => updateMatch({
          sd_ball_visible: true,
          // For second half start, reset ball to center
          ...(match.status === 'half_time' ? { sd_ball_pos: { x: 50, y: 50 } } : {}),
        })} className="w-full py-3 rounded-xl bg-primary text-white font-black text-sm active:scale-95 transition-all">
          ⚽ Gati të fillojë
        </button>
      )}



      {/* VAR button / dismiss */}
      {isActive && (() => {
        const varActive = match.sd_last_event?.key?.startsWith('var_');
        if (varActive) {
          return (
            <button
              onClick={async () => {
                await base44.entities.Match.update(match.id, { sd_last_event: null });
                loadData();
                toast.success('VAR u mbyll');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-black text-sm transition-all bg-red-600 border-red-500 text-white hover:bg-red-700 active:scale-95"
            >
              ✕ Mbyll VAR CHECK
            </button>
          );
        }
        return (
          <button
            onClick={() => { setVarDialog(true); setVarTeam(null); setVarReason(null); }}
            disabled={readOnly}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-black text-sm transition-all',
              readOnly ? 'opacity-40 cursor-not-allowed bg-muted border-border text-muted-foreground' : 'bg-blue-950 border-blue-800 text-white hover:bg-blue-900 active:scale-95'
            )}
          >
            <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/850b9973b_VARCHECK.png" alt="VAR" className="w-6 h-6 object-contain brightness-0 invert" />
            VAR CHECK
          </button>
        );
      })()}

      {/* Goal buttons */}
      <div className="grid grid-cols-2 gap-3">
        {['home', 'away'].map(team => (
          <button
            key={team}
            onClick={() => handleGoalOpen(team)}
            disabled={readOnly || !isActive}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-xl border-2 font-black text-sm transition-all',
              readOnly || !isActive
                ? 'opacity-40 cursor-not-allowed bg-muted border-border text-muted-foreground'
                : 'bg-green-50 border-green-400 text-green-800 hover:bg-green-100 active:scale-95'
            )}
          >
            <span className="text-[10px] font-black" style={{ color: team === 'home' ? homeColor : awayColor }}>
              {team === 'home' ? match.home_team_name : match.away_team_name}
            </span>
            <span>⚽ GOL</span>
          </button>
        ))}
      </div>

      {/* Event buttons */}
      <div className="grid grid-cols-2 gap-3">
        {['home', 'away'].map(team => (
          <div key={team} className="space-y-3">
            <p className="text-xs font-black text-center truncate" style={{ color: team === 'home' ? homeColor : awayColor }}>
              {team === 'home' ? match.home_team_name : match.away_team_name}
            </p>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2 space-y-1.5">
              <p className="text-[9px] font-black uppercase text-blue-400 text-center">Lojë</p>
              {GAME_EVENTS.map(evt => renderBtn(evt, team, handleGameEvent))}
            </div>
            <div className="bg-red-50/50 border border-red-100 rounded-xl p-2 space-y-1.5">
              <p className="text-[9px] font-black uppercase text-red-400 text-center">Disiplinë</p>
              {DISCIPLINARY_EVENTS.map(evt => renderBtn(evt, team, handleDisciplinary))}
            </div>
          </div>
        ))}
      </div>

      {/* Event log — agent only, with delete — ALL events */}
      {events && events.length > 0 && (
        <div className="bg-muted/40 border border-border rounded-2xl p-3">
          <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">📋 Log Ngjarjesh ({events.length})</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {[...events].sort((a, b) => (b.event_timestamp || 0) - (a.event_timestamp || 0)).map(evt => {
              const typeIcons = {
                goal: '⚽', penalty_goal: '⚽⚡', own_goal: '⚽🔴',
                yellow_card: '🟨', red_card: '🟥', second_yellow: '🟨🟥',
                substitution: '🔄', missed_penalty: '❌', var_canceled: '🖥️',
                shot_on: '🎯', shot_off: '💨', corner: '🚩',
                foul: '🤚', offside: '🚩', free_kick: '⚡',
                injury: '🚑', penalty: '⚡',
              };
              const icon = typeIcons[evt.type] || '•';
              return (
                <div key={evt.id} className="flex items-center justify-between gap-2 bg-card rounded-lg px-2 py-1.5 text-xs">
                  <span className="text-muted-foreground font-mono w-6 shrink-0">{evt.minute}'</span>
                  <span className="text-base leading-none shrink-0">{icon}</span>
                  <span className="flex-1 font-semibold text-foreground truncate">
                    {evt.player_name && evt.player_name !== '' ? evt.player_name : evt.type}
                  </span>
                  <span className="text-[9px] font-black px-1 rounded shrink-0" style={{ color: evt.team === 'home' ? homeColor : awayColor }}>
                    {evt.team === 'home' ? 'V' : 'M'}
                  </span>
                  <button
                    onClick={async () => {
                      const statKeyMap = {
                        goal: 'goal', penalty_goal: 'penalty_goal', missed_penalty: 'penalty',
                        yellow_card: 'yellow', red_card: 'red', substitution: 'substitution',
                        shot_on: 'shot_on', shot_off: 'shot_off', corner: 'corner',
                        foul: 'foul', offside: 'offside',
                      };
                      const sdStatKey = statKeyMap[evt.type];
                      const sdStats = match.sd_stats || {};
                      const statFullKey = sdStatKey ? `${sdStatKey}_${evt.team}` : null;
                      const updatedStats = statFullKey && sdStats[statFullKey] > 0
                        ? { ...sdStats, [statFullKey]: sdStats[statFullKey] - 1 }
                        : sdStats;
                      await base44.entities.MatchEvent.delete(evt.id);
                      if (statFullKey && updatedStats !== sdStats) {
                        await base44.entities.Match.update(match.id, { sd_stats: updatedStats });
                      }
                      loadData();
                      toast.success('Ngjarja u fshi');
                    }}
                    className="text-red-400 hover:text-red-600 font-black text-xs px-1 transition-colors shrink-0"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PreMatchDetailsDialog match={match} open={preMatchOpen} onClose={() => setPreMatchOpen(false)} onSaved={() => { setPreMatchOpen(false); loadData(); }} />

      {/* Corner picker dialog — visual mini pitch */}
      <Dialog open={!!cornerDialog} onOpenChange={() => setCornerDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>🚩 Zgjedh kendin e kornerit</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground text-center -mt-2 mb-1">
            {cornerDialog?.team === 'home' ? match.home_team_name : match.away_team_name}
          </p>
          {/* Visual mini pitch with 4 corner buttons */}
          <div
            className="relative rounded-xl overflow-hidden mx-auto"
            style={{ width: '100%', paddingBottom: '60%', background: 'linear-gradient(180deg,#2d7a2d,#1e5c1e)' }}
          >
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
              <rect x="2" y="2" width="96" height="56" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
              <line x1="50" y1="2" x2="50" y2="58" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
              <circle cx="50" cy="30" r="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
              <rect x="2" y="16" width="16" height="28" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
              <rect x="82" y="16" width="16" height="28" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
            </svg>
            {/* 4 corner buttons overlaid at corners */}
            {CORNER_POSITIONS.map(c => {
              const isLeft = c.x < 50;
              const isTop = c.y < 50;
              return (
                <button
                  key={c.id}
                  onClick={() => handleCornerExecute(c)}
                  className="absolute flex items-center justify-center active:scale-95 transition-all"
                  style={{
                    [isLeft ? 'left' : 'right']: '2%',
                    [isTop ? 'top' : 'bottom']: '4%',
                    width: '28%',
                    padding: '6px 0',
                    borderRadius: '8px',
                    background: 'rgba(251,146,60,0.85)',
                    border: '2px solid #f97316',
                    color: 'white',
                    fontWeight: '800',
                    fontSize: '9px',
                    lineHeight: '1.2',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  🚩<br />{isTop ? 'Lart' : 'Poshtë'}<br />{isLeft ? 'Majtas' : 'Djathtas'}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" onClick={() => setCornerDialog(null)} className="w-full mt-2 text-xs text-muted-foreground">Anulo</Button>
        </DialogContent>
      </Dialog>

      {/* Goal dialog */}
      <Dialog open={!!goalDialog} onOpenChange={() => setGoalDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>⚽ GOL – {goalDialog?.team === 'home' ? match.home_team_name : match.away_team_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <PlayerPicker label="Golashënuesi (opsional)" players={teamPlayers(goalDialog?.team || 'home')} value={goalScorer} onChange={setGoalScorer} placeholder="Zgjedh lojtarin" emptyLabel="Pa emër" />
            <PlayerPicker label="Asistenti (opsional)" players={teamPlayers(goalDialog?.team || 'home')} value={goalAssist} onChange={setGoalAssist} placeholder="Zgjedh asistentin" emptyLabel="Pa asist" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGoalDialog(null)} className="flex-1">Anulo</Button>
              <Button onClick={handleGoalConfirm} className="flex-1 bg-green-600 hover:bg-green-700">⚽ Konfirmo Golin</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Penalty dialog — two phases */}
      <Dialog open={!!penaltyDialog} onOpenChange={() => { setPenaltyDialog(false); setPenaltyFlash(false); setPenaltyFlashTeam(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>⚡ Penalti – {penaltyTeamLocal === 'home' ? match.home_team_name : match.away_team_name}</DialogTitle>
          </DialogHeader>
          {penaltyPhase === 'player' ? (
            <div className="space-y-4">
              <PlayerPicker label="Lojtari që godet (opsional)" players={teamPlayers(penaltyTeamLocal || 'home')} value={penaltyPlayer} onChange={setPenaltyPlayer} placeholder="Zgjedh lojtarin" emptyLabel="Pa emër" />
              <Button onClick={handlePenaltyPlayerConfirm} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black">
                ▶ Fillo animacionin e penaltisë
              </Button>
              <Button variant="ghost" onClick={() => { setPenaltyDialog(false); }} className="w-full text-xs text-muted-foreground">Anulo</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm font-bold text-muted-foreground">⚽ Cili ishte rezultati i penaltisë?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handlePenaltyGoal} className="bg-green-600 hover:bg-green-700 font-black py-8 text-lg">⚽ GOAL</Button>
                <Button onClick={handlePenaltyMissed} variant="outline" className="border-red-400 text-red-600 hover:bg-red-50 font-black py-8 text-lg">❌ MISSED</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Card dialog */}
      <Dialog open={!!cardDialog} onOpenChange={() => setCardDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{cardDialog?.key === 'yellow' ? '🟨' : '🟥'} Karton – {cardDialog?.team === 'home' ? match.home_team_name : match.away_team_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <PlayerPicker label="Lojtari (opsional)" players={teamPlayers(cardDialog?.team || 'home')} value={cardPlayer} onChange={setCardPlayer} placeholder="Zgjedh lojtarin" emptyLabel="Pa emër" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCardDialog(null)} className="flex-1">Anulo</Button>
              <Button onClick={handleCardConfirm} className="flex-1">Konfirmo Kartonin</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Substitution dialog */}
      <Dialog open={!!subDialog} onOpenChange={() => setSubDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>🔄 Zëvendësim – {subDialog?.team === 'home' ? match.home_team_name : match.away_team_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="ring-2 ring-red-400 rounded-xl bg-red-50/60 p-2">
              <PlayerPicker label="Lojtari që del" players={starterPlayers(subDialog?.team || 'home')} value={playerOut} onChange={setPlayerOut} placeholder="Zgjedh" emptyLabel="Pa emër" />
            </div>
            <div className="ring-2 ring-green-400 rounded-xl bg-green-50/60 p-2">
              <PlayerPicker label="Lojtari që futet" players={benchPlayers(subDialog?.team || 'home')} value={playerIn} onChange={setPlayerIn} placeholder="Zgjedh" emptyLabel="Pa emër" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSubDialog(null)} className="flex-1">Anulo</Button>
              <Button onClick={handleSubConfirm} className="flex-1">Konfirmo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VAR dialog */}
      <Dialog open={varDialog} onOpenChange={() => setVarDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/850b9973b_VARCHECK.png" alt="VAR" className="w-7 h-7 object-contain" />
              VAR CHECK
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">Zgjedh ekipin:</p>
              <div className="grid grid-cols-2 gap-2">
                {['home', 'away'].map(team => (
                  <button
                    key={team}
                    onClick={() => setVarTeam(team)}
                    className={cn(
                      'py-2.5 rounded-xl border-2 font-bold text-xs transition-all',
                      varTeam === team ? 'text-white border-transparent' : 'bg-muted border-border text-muted-foreground'
                    )}
                    style={varTeam === team ? { background: team === 'home' ? homeColor : awayColor } : {}}
                  >
                    {team === 'home' ? match.home_team_name : match.away_team_name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">Arsyeja:</p>
              <div className="space-y-2">
                {VAR_REASONS.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setVarReason(r.key)}
                    className={cn(
                      'w-full py-2.5 px-3 rounded-xl border-2 font-bold text-xs text-left transition-all',
                      varReason === r.key ? 'bg-blue-950 border-blue-700 text-white' : 'bg-muted border-border text-muted-foreground hover:border-blue-400'
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setVarDialog(false)} className="flex-1">Anulo</Button>
              <Button
                onClick={handleVarConfirm}
                disabled={!varTeam || !varReason}
                className="flex-1 bg-blue-950 hover:bg-blue-900 text-white font-black"
              >
                Konfirmo VAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Injury dialog */}
      <Dialog open={!!injuryDialog} onOpenChange={() => setInjuryDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>🚑 Lëndim – {injuryDialog?.team === 'home' ? match.home_team_name : match.away_team_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <PlayerPicker label="Lojtari i lënduar (opsional)" players={teamPlayers(injuryDialog?.team || 'home')} value={injuryPlayer} onChange={setInjuryPlayer} placeholder="Zgjedh lojtarin" emptyLabel="Pa emër" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setInjuryDialog(null)} className="flex-1">Anulo</Button>
              <Button onClick={handleInjuryConfirm} className="flex-1 bg-red-500 hover:bg-red-600">Konfirmo Lëndimin</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}