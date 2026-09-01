import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/702c80214_8c53466ae_logo.png';

// Statuset "aktive" — ndeshjet ku agjenti duhet të jetë online
const LIVE_STATUSES = ['first_half', 'half_time', 'second_half', 'extra_time_first_half', 'extra_time_half_time', 'extra_time_second_half', 'penalties'];
const UPCOMING_WINDOW_MS = 30 * 60 * 1000; // 30 minuta para fillimit
const INACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minuta pa heartbeat

function matchLabel(m) {
  return `${m.home_team_name || '?'} vs ${m.away_team_name || '?'}`;
}


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Security: only allow service-role calls (scheduled automations)
    // We verify by requiring a secret header or just allow all (safe since it's internal)
    const now = Date.now();
    const issues = [];

    // 1) Fetch all live matches
    const liveMatches = await base44.asServiceRole.entities.Match.list('-updated_date', 200);
    const activeMatches = liveMatches.filter(m =>
      LIVE_STATUSES.includes(m.status) && m.show_in_live !== false
    );

    // 2) Fetch scheduled matches starting soon (within 30 min)
    const scheduledMatches = liveMatches.filter(m => {
      if (m.status !== 'scheduled') return false;
      if (!m.date || !m.time) return false;
      const matchTs = new Date(`${m.date}T${m.time}:00`).getTime();
      if (isNaN(matchTs)) return false;
      const diff = matchTs - now;
      return diff >= 0 && diff <= UPCOMING_WINDOW_MS;
    });

    // 3) Check active matches — is agent online (sent heartbeat recently)?
    for (const m of activeMatches) {
      if (!m.assigned_agent_id) continue; // no assigned agent, skip
      const lastSeen = m.agent_last_seen || 0;
      const inactive = now - lastSeen;

      if (inactive > INACTIVE_THRESHOLD_MS) {
        const minInactive = Math.floor(inactive / 60000);
        issues.push({
          type: 'inactive_during_live',
          matchId: m.id,
          label: matchLabel(m),
          minutesInactive: minInactive,
          status: m.status,
        });
      }
    }

    // 4) Check upcoming matches — is agent assigned and online?
    for (const m of scheduledMatches) {
      const matchTs = new Date(`${m.date}T${m.time}:00`).getTime();
      const minsUntil = Math.floor((matchTs - now) / 60000);

      if (!m.assigned_agent_id) {
        issues.push({
          type: 'no_agent_assigned',
          matchId: m.id,
          label: matchLabel(m),
          minsUntil,
        });
        continue;
      }

      const lastSeen = m.agent_last_seen || 0;
      const minsSinceLastSeen = Math.floor((now - lastSeen) / 60000);

      // Agent hasn't connected at all (lastSeen = 0) or hasn't been seen for >20 min before match
      if (lastSeen === 0 || minsSinceLastSeen > 20) {
        issues.push({
          type: 'agent_not_online_before_match',
          matchId: m.id,
          label: matchLabel(m),
          minsUntil,
          lastSeenMinsAgo: lastSeen === 0 ? null : minsSinceLastSeen,
        });
      }
    }

    return Response.json({
      ok: true,
      checked: activeMatches.length + scheduledMatches.length,
      issues: issues.length,
      details: issues,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});