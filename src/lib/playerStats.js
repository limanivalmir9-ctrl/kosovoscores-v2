import moment from 'moment';

const FINISHED = ['full_time', 'official_result'];

// Only matches in these competitions count toward player minutes/stats (friendlies excluded)
const ALLOWED_COMPETITIONS = ['ALBI MALL SUPERLIGA', 'KUPA E KOSOVES'];
function isCountedCompetition(match) {
  const n = (match.competition_name || '').toUpperCase().replace(/Ë/g, 'E').replace(/\s+/g, ' ').trim();
  return ALLOWED_COMPETITIONS.some(a => n === a || n.includes(a));
}

function effectiveMinute(e) {
  // Minutat shtesë (stoppage) nuk llogariten — vetëm minuta e rregullt
  return e.minute || 0;
}

function isLateSubEntry(subIn) {
  if (!subIn) return false;
  const m = subIn.minute || 0;
  const et = subIn.extra_time_minute || 0;
  // Lojtar që futet nga minuta 88:01 e tutje (min 89+, ose 88 me shtesë)
  return m >= 89 || (m === 88 && et >= 1);
}
// Minuta e futjes/daljes përfshirë shtesën (90+3 → 93) — kjo bën që zëvendësimi i vonë
// të llogarisë saktë minutat e luajtura përfshirë stoppage time e pjesës së dytë.
function eventMinute(e) {
  if (!e) return 0;
  return (e.minute || 0) + (e.extra_time_minute || 0);
}

function matchTotalMinutes(match, playedFirstHalf = false) {
  if (match.penalty_winner || match.extra_time_start_timestamp) return 120;
  // Përfshij minutat shtesë të të dy pjesëve: shtesa e pjesës së parë vetëm për
  // lojtarët që ishin në fushë gjatë pjesës së parë; shtesa e pjesës së dytë për të gjithë.
  // Kapet më pas në 90 minuta për lojtar.
  const firstStoppage = match.admin_et_first_half || 0;
  const secondStoppage = match.admin_et_second_half || 0;
  return 90 + (playedFirstHalf ? firstStoppage : 0) + secondStoppage;
}

/**
 * Compute season stats for a player from finished matches and their events.
 * - apps: +1 when the player is a starter in the lineup OR enters as a substitute.
 * - minutes: starter counts from minute 0; if subbed out at minute N, counts N minutes.
 *   Substitute counts from the minute they entered until match end (or subbed out).
 *   Minutat shtesë (stoppage time) të pjesës së parë/dytë nuk llogariten.
 * - goals / assists / yellow / red: from MatchEvent records.
 * - byCompetition: per-competition (league vs cup) breakdown of the same metrics.
 *
 * NOTE: MatchEvent substitution/goal/card records store player NAMES (player_in_name,
 * player_out_name, player_name), not IDs — so matching is done by name against the
 * lineup entry's name.
 */
export function computePlayerStats(playerId, clubId, matches, events, storedMinutesByMatch) {
  let apps = 0, minutes = 0, goals = 0, assists = 0, yellow = 0, red = 0;
  const byComp = {};

  const byMatch = {};
  (events || []).forEach(e => {
    if (!byMatch[e.match_id]) byMatch[e.match_id] = [];
    byMatch[e.match_id].push(e);
  });

  (matches || []).forEach(match => {
    if (!FINISHED.includes(match.status)) return;
    if (!isCountedCompetition(match)) return;
    const isHome = match.home_team_id === clubId;
    const lineup = isHome ? match.home_lineup : match.away_lineup;
    const me = lineup?.find(l => l.player_id === playerId);
    const myName = me?.name;
    const isStarter = me?.starter === true;
    const matchEvents = byMatch[match.id] || [];

    const matchesName = (e, nameField, idField) =>
      e[idField] === playerId || (myName && e[nameField] === myName);

    const subIn = matchEvents.find(e => e.type === 'substitution' && matchesName(e, 'player_in_name', 'player_in_id'));
    const subOut = matchEvents.find(e => e.type === 'substitution' && matchesName(e, 'player_out_name', 'player_out_id'));
    const redCard = matchEvents.find(e => (e.type === 'red_card' || e.type === 'second_yellow') && matchesName(e, 'player_name', 'player_id'));

    const stored = storedMinutesByMatch ? storedMinutesByMatch[match.id] : undefined;
    const played = stored !== undefined ? true : (isStarter || !!subIn);
    if (!played) return;
    apps++;

    let mins;
    if (stored !== undefined) {
      // Vlerë e rikalkuluar/manual — e ruajtur si e saktë
      mins = stored;
    } else {
      const isAlbi = /ALBI MALL SUPERLIGA/i.test(match.competition_name || '');
      const playedFirstHalf = isStarter || (subIn && (subIn.minute || 0) <= 45);
      const total = matchTotalMinutes(match, playedFirstHalf);
      let startMin = isStarter ? 0 : eventMinute(subIn);
      // Lojtarët që futen para fillimit të pjesës së dytë (zëvendësim i pushimit, min 46) llogariten nga min 45
      if (startMin === 46) startMin = 45;
      let endMin = total;
      if (redCard) endMin = eventMinute(redCard);
      else if (subOut) endMin = eventMinute(subOut);
      // Asnjë lojtar nuk mund të kalojë 90 minuta për ndeshje (përfshirë kohën shtesë)
      mins = isAlbi ? Math.min(90, Math.max(0, Math.round(endMin - startMin))) : 0;
    }
    minutes += mins;

    let g = 0, a = 0, y = 0, r = 0;
    matchEvents.forEach(e => {
      const isMe = e.player_id === playerId || (myName && e.player_name === myName);
      if (!isMe) return;
      if (e.type === 'goal' || e.type === 'penalty_goal') g++;
      if (e.type === 'yellow_card' || e.type === 'second_yellow') y++;
      if (e.type === 'red_card' || e.type === 'second_yellow') r++;
    });
    matchEvents.forEach(e => {
      if (e.assist_player_id === playerId || (myName && e.assist_player_name === myName)) a++;
    });
    goals += g; assists += a; yellow += y; red += r;

    const compKey = match.competition_id || match.competition_name || 'tjeter';
    if (!byComp[compKey]) {
      byComp[compKey] = {
        id: compKey,
        name: match.competition_name || 'Kompeticion',
        is_cup: !!match.is_cup_match,
        apps: 0, minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0,
      };
    }
    const c = byComp[compKey];
    c.apps += 1;
    c.minutes += mins;
    c.goals += g;
    c.assists += a;
    c.yellow += y;
    c.red += r;
  });

  const byCompetition = Object.values(byComp).sort((a, b) => (a.is_cup ? 1 : 0) - (b.is_cup ? 1 : 0) || b.minutes - a.minutes);
  return { apps, minutes, goals, assists, yellow, red, byCompetition };
}

/**
 * Minutes played by a player in a single match.
 * Returns the minute count, or null if the player did not participate.
 */
export function getPlayerMatchMinutes(playerId, clubId, match, matchEvents) {
  if (!FINISHED.includes(match.status)) return null;
  const isHome = match.home_team_id === clubId;
  const lineup = isHome ? match.home_lineup : match.away_lineup;
  const me = lineup?.find(l => l.player_id === playerId);
  const myName = me?.name;
  const isStarter = me?.starter === true;
  const evs = matchEvents || [];
  const matchesName = (e, nameField, idField) =>
    e[idField] ? e[idField] === playerId : (myName && e[nameField] === myName);
  const subIn = evs.find(e => e.type === 'substitution' && matchesName(e, 'player_in_name', 'player_in_id'));
  const subOut = evs.find(e => e.type === 'substitution' && matchesName(e, 'player_out_name', 'player_out_id'));
  const redCard = evs.find(e => (e.type === 'red_card' || e.type === 'second_yellow') && matchesName(e, 'player_name', 'player_id'));
  const played = isStarter || !!subIn;
  if (!played) return null;
  const playedFirstHalf = isStarter || (subIn && (subIn.minute || 0) <= 45);
  const total = matchTotalMinutes(match, playedFirstHalf);
  let startMin = isStarter ? 0 : eventMinute(subIn);
  // Lojtarët që futen para fillimit të pjesës së dytë (zëvendësim i pushimit, min 46) llogariten nga min 45
  if (startMin === 46) startMin = 45;
  let endMin = total;
  if (redCard) endMin = eventMinute(redCard);
  else if (subOut) endMin = eventMinute(subOut);
  // Asnjë lojtar nuk mund të kalojë 90 minuta për ndeshje (përfshirë kohën shtesë)
  return Math.min(90, Math.max(0, Math.round(endMin - startMin)));
}