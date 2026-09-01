import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support two callers:
    //   1. Direct HTTP call: { competition_id }
    //   2. Entity-update automation: { event, data, old_data, payload_too_large }
    let competition_id = body?.competition_id;
    if (!competition_id && body?.data) competition_id = body.data.competition_id;
    if (!competition_id && body?.old_data) competition_id = body.old_data.competition_id;

    // If the automation payload was too large (data omitted), fetch the match by id.
    if (!competition_id && body?.event?.entity_id) {
      try {
        const m = await base44.asServiceRole.entities.Match.get(body.event.entity_id);
        competition_id = m?.competition_id;
      } catch (_) { /* ignore — handled below */ }
    }

    if (!competition_id) {
      return Response.json({ error: 'competition_id mungon' }, { status: 400 });
    }

    // Get all full_time and official_result matches for this competition
    const [ftMatches, orMatches] = await Promise.all([
      base44.asServiceRole.entities.Match.filter({ competition_id, status: 'full_time' }),
      base44.asServiceRole.entities.Match.filter({ competition_id, status: 'official_result' }),
    ]);
    const matches = [...ftMatches, ...orMatches];

    // Build standings map
    const standings = {};

    const ensureClub = (id, name, logo) => {
      if (!standings[id]) {
        standings[id] = {
          club_id: id,
          club_name: name || '',
          club_logo: logo || '',
          competition_id,
          played: 0, won: 0, drawn: 0, lost: 0,
          goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
        };
      }
    };

    for (const m of matches) {
      if (m.is_cup_match) continue; // skip cup matches from standings
      ensureClub(m.home_team_id, m.home_team_name, m.home_team_logo);
      ensureClub(m.away_team_id, m.away_team_name, m.away_team_logo);

      const hg = m.home_score || 0;
      const ag = m.away_score || 0;

      standings[m.home_team_id].played++;
      standings[m.away_team_id].played++;
      standings[m.home_team_id].goals_for += hg;
      standings[m.home_team_id].goals_against += ag;
      standings[m.away_team_id].goals_for += ag;
      standings[m.away_team_id].goals_against += hg;

      if (hg > ag) {
        standings[m.home_team_id].won++;
        standings[m.home_team_id].points += 3;
        standings[m.away_team_id].lost++;
      } else if (hg < ag) {
        standings[m.away_team_id].won++;
        standings[m.away_team_id].points += 3;
        standings[m.home_team_id].lost++;
      } else {
        standings[m.home_team_id].drawn++;
        standings[m.home_team_id].points++;
        standings[m.away_team_id].drawn++;
        standings[m.away_team_id].points++;
      }
    }

    // Compute GD and sort
    const sorted = Object.values(standings)
      .map(s => ({ ...s, goal_difference: s.goals_for - s.goals_against }))
      .sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_for - a.goals_for);

    // Get existing standing records for this competition
    const existing = await base44.asServiceRole.entities.Standing.filter({ competition_id });
    const existingMap = {};
    for (const s of existing) existingMap[s.club_id] = s;

    // Upsert each standing
    for (let i = 0; i < sorted.length; i++) {
      const data = { ...sorted[i], position: i + 1 };
      if (existingMap[data.club_id]) {
        await base44.asServiceRole.entities.Standing.update(existingMap[data.club_id].id, data);
      } else {
        await base44.asServiceRole.entities.Standing.create(data);
      }
    }

    return Response.json({ ok: true, updated: sorted.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});