import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// KosovoScores Public API
// Provides read-only access to matches, events, standings and competition data.
// Usage: POST /publicApi with { action, ... }
// Authentication: pass api_key in the request body or x-api-key header.
// API keys are stored in the ApiKey entity and must be active.

Deno.serve(async (req) => {
  // CORS headers for external websites
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Support both GET (query params) and POST (body)
    let params = {};
    if (req.method === 'POST') {
      params = await req.json().catch(() => ({}));
    } else {
      const url = new URL(req.url);
      url.searchParams.forEach((v, k) => { params[k] = v; });
    }

    const apiKey = params.api_key || req.headers.get('x-api-key') || '';

    // Validate API key against ApiKey entity
    if (!apiKey) {
      return Response.json({ error: 'API key mungon. Shto api_key në kërkesë.', code: 401 }, { status: 401, headers: corsHeaders });
    }

    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key: apiKey, active: true });
    if (!keys || keys.length === 0) {
      return Response.json({ error: 'API key i pavlefshëm ose i çaktivizuar.', code: 403 }, { status: 403, headers: corsHeaders });
    }

    // Log usage (fire and forget)
    base44.asServiceRole.entities.ApiKey.update(keys[0].id, {
      last_used: new Date().toISOString(),
      usage_count: (keys[0].usage_count || 0) + 1,
    }).catch(() => {});

    const action = params.action || 'live_matches';

    // ── GET LIVE / TODAY MATCHES ──────────────────────────────────────────────
    if (action === 'live_matches') {
      const liveStatuses = ['first_half', 'half_time', 'second_half', 'awaiting_extra_time', 'extra_time_first_half', 'extra_time_half_time', 'extra_time_second_half', 'penalties'];
      const allMatches = await base44.asServiceRole.entities.Match.filter({ show_in_live: true }, '-date', 100);
      const live = allMatches.filter(m => liveStatuses.includes(m.status));
      return Response.json({ ok: true, count: live.length, matches: live.map(formatMatch) }, { headers: corsHeaders });
    }

    // ── GET MATCHES BY DATE ───────────────────────────────────────────────────
    if (action === 'matches_by_date') {
      const date = params.date; // YYYY-MM-DD
      if (!date) return Response.json({ error: 'Parametri date mungon (YYYY-MM-DD)' }, { status: 400, headers: corsHeaders });
      const matches = await base44.asServiceRole.entities.Match.filter({ date }, 'time', 50);
      return Response.json({ ok: true, date, count: matches.length, matches: matches.map(formatMatch) }, { headers: corsHeaders });
    }

    // ── GET SINGLE MATCH WITH EVENTS ─────────────────────────────────────────
    if (action === 'match') {
      const { match_id } = params;
      if (!match_id) return Response.json({ error: 'match_id mungon' }, { status: 400, headers: corsHeaders });
      const [match, events] = await Promise.all([
        base44.asServiceRole.entities.Match.get(match_id),
        base44.asServiceRole.entities.MatchEvent.filter({ match_id }, 'minute', 200),
      ]);
      if (!match) return Response.json({ error: 'Ndeshja nuk u gjet' }, { status: 404, headers: corsHeaders });
      return Response.json({ ok: true, match: formatMatch(match), events: events.map(formatEvent) }, { headers: corsHeaders });
    }

    // ── GET COMPETITION STANDINGS ─────────────────────────────────────────────
    if (action === 'standings') {
      const { competition_id } = params;
      if (!competition_id) return Response.json({ error: 'competition_id mungon' }, { status: 400, headers: corsHeaders });
      const [standings, competition] = await Promise.all([
        base44.asServiceRole.entities.Standing.filter({ competition_id }, 'position', 50),
        base44.asServiceRole.entities.Competition.get(competition_id),
      ]);
      return Response.json({ ok: true, competition: competition ? { id: competition.id, name: competition.name, season: competition.season, logo: competition.logo } : null, standings }, { headers: corsHeaders });
    }

    // ── LIST COMPETITIONS ─────────────────────────────────────────────────────
    if (action === 'competitions') {
      const competitions = await base44.asServiceRole.entities.Competition.list('tier', 20);
      return Response.json({ ok: true, competitions: competitions.map(c => ({ id: c.id, name: c.name, season: c.season, logo: c.logo, tier: c.tier, color: c.color })) }, { headers: corsHeaders });
    }

    // ── GET TOP SCORERS ───────────────────────────────────────────────────────
    if (action === 'top_scorers') {
      const { competition_id } = params;
      const filter = competition_id ? { competition_id } : {};
      const scorers = await base44.asServiceRole.entities.TopScorer.filter(filter, '-goals', 30);
      return Response.json({ ok: true, scorers }, { headers: corsHeaders });
    }

    // ── GET MATCH EVENTS ONLY ─────────────────────────────────────────────────
    if (action === 'match_events') {
      const { match_id } = params;
      if (!match_id) return Response.json({ error: 'match_id mungon' }, { status: 400, headers: corsHeaders });
      const events = await base44.asServiceRole.entities.MatchEvent.filter({ match_id }, 'minute', 200);
      return Response.json({ ok: true, match_id, count: events.length, events: events.map(formatEvent) }, { headers: corsHeaders });
    }

    // ── GET RECENT MATCHES (last N) ───────────────────────────────────────────
    if (action === 'recent_matches') {
      const limit = Math.min(parseInt(params.limit) || 20, 50);
      const competition_id = params.competition_id;
      const filter = competition_id ? { competition_id } : {};
      const matches = await base44.asServiceRole.entities.Match.filter(filter, '-date', limit);
      const finished = matches.filter(m => m.status === 'full_time');
      return Response.json({ ok: true, count: finished.length, matches: finished.map(formatMatch) }, { headers: corsHeaders });
    }

    return Response.json({ error: `Veprimi "${action}" nuk ekziston. Veprimet e mundshme: live_matches, matches_by_date, match, match_events, standings, competitions, top_scorers, recent_matches` }, { status: 400, headers: corsHeaders });

  } catch (error) {
    return Response.json({ error: 'Gabim i brendshëm i serverit.' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMatch(m) {
  return {
    id: m.id,
    competition_id: m.competition_id,
    competition_name: m.competition_name || '',
    round: m.round,
    date: m.date,
    time: m.time,
    status: m.status,
    minute: m.minute || 0,
    home_team: { id: m.home_team_id, name: m.home_team_name, logo: m.home_team_logo },
    away_team: { id: m.away_team_id, name: m.away_team_name, logo: m.away_team_logo },
    score: { home: m.home_score || 0, away: m.away_score || 0 },
    red_cards: { home: m.home_red_cards || 0, away: m.away_red_cards || 0 },
    stadium: m.stadium || '',
    referee: m.referee_main || '',
    stats: m.deep_stats ? {
      corners: { home: m.stats_home_corners || 0, away: m.stats_away_corners || 0 },
      shots: { home: m.stats_home_shots || 0, away: m.stats_away_shots || 0 },
      shots_off: { home: m.stats_home_shots_off || 0, away: m.stats_away_shots_off || 0 },
    } : null,
    highlights_url: m.highlights_url || null,
  };
}

function formatEvent(e) {
  return {
    id: e.id,
    match_id: e.match_id,
    type: e.type,
    team: e.team,
    minute: e.minute,
    extra_time_minute: e.extra_time_minute || null,
    player: e.player_name || null,
    player_id: e.player_id || null,
    assist: e.assist_player_name || null,
    player_out: e.player_out_name || null,
    player_in: e.player_in_name || null,
    score_after: (e.home_score_after !== undefined && e.away_score_after !== undefined)
      ? { home: e.home_score_after, away: e.away_score_after } : null,
  };
}