import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Service-role proxy for field agents (anonymous users logged in via match_code).
// RLS on Match/MatchEvent/TopScorer/Standing/Agent is admin-only for writes,
// so agents cannot write directly. This function validates the agent's match_code
// and performs the requested operations as the service role (bypassing RLS),
// with per-op ownership checks so a code for match A can never touch match B.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { match_code, ops } = body || {};
    if (!match_code || !Array.isArray(ops) || ops.length === 0) {
      return Response.json({ ok: false, error: 'match_code and ops[] required' }, { status: 400 });
    }
    const sr = base44.asServiceRole;
    const found = await sr.entities.Match.filter({ match_code });
    const match = found && found[0];
    if (!match) return Response.json({ ok: false, error: 'Kodi i ndeshjes është i pavlefshëm' }, { status: 403 });

    const results = [];
    for (const op of ops) {
      try {
        if (op.op === 'updateMatch') {
          await sr.entities.Match.update(match.id, op.data || {});
          results.push({ ok: true });
        } else if (op.op === 'createEvent') {
          const ev = await sr.entities.MatchEvent.create({ ...(op.data || {}), match_id: match.id });
          results.push({ ok: true, event: ev });
        } else if (op.op === 'updateEvent') {
          const ev = await sr.entities.MatchEvent.get(op.event_id);
          if (!ev || ev.match_id !== match.id) { results.push({ ok: false, error: 'event not in match' }); continue; }
          await sr.entities.MatchEvent.update(op.event_id, op.data || {});
          results.push({ ok: true });
        } else if (op.op === 'deleteEvent') {
          const ev = await sr.entities.MatchEvent.get(op.event_id);
          if (!ev || ev.match_id !== match.id) { results.push({ ok: false, error: 'event not in match' }); continue; }
          await sr.entities.MatchEvent.delete(op.event_id);
          results.push({ ok: true });
        } else if (op.op === 'decrementTopScorer') {
          const scorers = await sr.entities.TopScorer.filter({ competition_id: match.competition_id });
          const sc = scorers.find(s => s.player_name === op.player_name && (s.goals || 0) > 0);
          if (sc) { await sr.entities.TopScorer.update(sc.id, { goals: (sc.goals || 0) - 1 }); results.push({ ok: true, decremented: true }); }
          else results.push({ ok: true, decremented: false });
        } else if (op.op === 'updateTopScorer') {
          const sc = op.scorer_id ? await sr.entities.TopScorer.get(op.scorer_id) : null;
          if (!sc || sc.competition_id !== match.competition_id) { results.push({ ok: false, error: 'scorer not in competition' }); continue; }
          await sr.entities.TopScorer.update(op.scorer_id, op.data || {});
          results.push({ ok: true });
        } else if (op.op === 'createTopScorer') {
          const created = await sr.entities.TopScorer.create({ ...(op.data || {}), competition_id: match.competition_id });
          results.push({ ok: true, scorer: created });
        } else if (op.op === 'updateStanding') {
          const st = await sr.entities.Standing.get(op.standing_id);
          if (!st || st.competition_id !== match.competition_id) { results.push({ ok: false, error: 'standing not in competition' }); continue; }
          await sr.entities.Standing.update(op.standing_id, op.data || {});
          results.push({ ok: true });
        } else if (op.op === 'updateAgent') {
          const ag = await sr.entities.Agent.get(op.agent_id);
          if (!ag) { results.push({ ok: false, error: 'agent not found' }); continue; }
          const covers = (ag.teams_covered || []).includes(match.home_team_id) || (ag.teams_covered || []).includes(match.away_team_id);
          if (!covers) { results.push({ ok: false, error: 'agent not covering match' }); continue; }
          await sr.entities.Agent.update(op.agent_id, op.data || {});
          results.push({ ok: true });
        } else if (op.op === 'rotateMatchCode') {
          const newCode = op.newCode || String(Math.floor(100000 + Math.random() * 900000));
          await sr.entities.Match.update(match.id, { match_code: newCode });
          results.push({ ok: true, newCode });
        } else if (op.op === 'heartbeat') {
          await sr.entities.Match.update(match.id, { agent_last_seen: Date.now() });
          results.push({ ok: true });
        } else {
          results.push({ ok: false, error: 'unknown op: ' + op.op });
        }
      } catch (e) {
        results.push({ ok: false, error: (e && e.message) || String(e) });
      }
    }
    return Response.json({ ok: true, match_id: match.id, results });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}