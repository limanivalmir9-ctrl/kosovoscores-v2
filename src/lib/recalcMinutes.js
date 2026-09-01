import { base44 } from '@/api/base44Client';
import { getPlayerMatchMinutes } from '@/lib/playerStats';

/**
 * Rikalkulon minutat për të gjithë lojtarët e një ndeshjeje (formacioni vendor + mysafir)
 * dhe kthen listën e rekordeve për ruajtje në entitetin PlayerMatchMinutes.
 *
 * @param {object} match - Ndeshja (me home_lineup / away_lineup / status / etj.)
 * @param {Array} events - MatchEvent për këtë ndeshje
 * @returns {Array<{match_id, player_id, player_name, club_id, minutes}>}
 */
export function computeMatchMinutes(match, events) {
  const out = [];
  const build = (lineup, clubId) => {
    (lineup || []).forEach(entry => {
      if (!entry?.player_id) return;
      const mins = getPlayerMatchMinutes(entry.player_id, clubId, match, events || []);
      if (mins === null) return; // nuk ka luajtur
      out.push({
        match_id: match.id,
        player_id: entry.player_id,
        player_name: entry.name || '',
        club_id: clubId,
        minutes: mins,
        recalc_date: Date.now(),
      });
    });
  };
  build(match.home_lineup, match.home_team_id);
  build(match.away_lineup, match.away_team_id);
  return out;
}

/**
 * Rikalkulon dhe ruajn minutat për një ndeshje në entitetin PlayerMatchMinutes.
 * Fshin rekordet e vjetra për këtë ndeshje dhe krijon të rejat.
 *
 * @param {object} match
 * @returns {Promise<{saved:number}>}
 */
export async function recalcAndSaveMatchMinutes(match) {
  const events = await base44.entities.MatchEvent.filter({ match_id: match.id }, 'minute', 500);
  const records = computeMatchMinutes(match, events);
  // Fshi rekordet e vjetra për këtë ndeshje
  await base44.entities.PlayerMatchMinutes.deleteMany({ match_id: match.id });
  if (records.length > 0) {
    await base44.entities.PlayerMatchMinutes.bulkCreate(records);
  }
  return { saved: records.length };
}