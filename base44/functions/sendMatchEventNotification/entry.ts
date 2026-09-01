import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

const ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/702c80214_8c53466ae_logo.png';

function shortTeam(name, max = 16) {
  if (!name) return '';
  if (name.length <= max) return name;
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, max);
  return words[0] + ' ' + words.slice(1).map(w => w[0]).join('.');
}

function initVapid() {
  const pub = (Deno.env.get('VAPID_PUBLIC_KEY') || '').replace(/[\s"']/g, '');
  const priv = (Deno.env.get('VAPID_PRIVATE_KEY') || '').replace(/[\s"']/g, '');
  const rawSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@kosovoscores.com';
  const subject = 'mailto:' + rawSubject.replace(/^mailto:\s*/i, '').replace(/[<>]/g, '').trim();
  if (pub && priv) webpush.setVapidDetails(subject, pub, priv);
  return !!pub && !!priv;
}

async function sendToFollowers(base44, notif, homeTeamId, awayTeamId) {
  const allSubs = await base44.asServiceRole.entities.PushSubscription.list('-created_date', 1000);
  if (allSubs.length === 0) return { sent: 0 };

  const targeted = allSubs.filter(sub => {
    const favs = sub.favorite_club_ids;
    if (!favs || favs.length === 0) return true;
    return favs.includes(homeTeamId) || favs.includes(awayTeamId);
  });

  if (targeted.length === 0) return { sent: 0 };

  const payload = JSON.stringify(notif);
  let sent = 0;
  const toDelete = [];

  await Promise.allSettled(targeted.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        payload
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) toDelete.push(sub.id);
    }
  }));

  await Promise.allSettled(toDelete.map(id => base44.asServiceRole.entities.PushSubscription.delete(id)));
  return { sent, cleaned: toDelete.length };
}

Deno.serve(async (req) => {
  try {
    if (!initVapid()) return Response.json({ skipped: 'VAPID not configured' });

    const base44 = createClientFromRequest(req);

    let payload = {};
    try { payload = await req.json(); } catch { /* empty body */ }

    const { data } = payload;
    if (!data) return Response.json({ skipped: 'no data' });

    // Only handle missed_penalty events
    if (data.type !== 'missed_penalty') return Response.json({ skipped: 'not a missed_penalty event' });

    // Fetch the match to get team names
    const matchId = data.match_id;
    if (!matchId) return Response.json({ skipped: 'no match_id' });

    const match = await base44.asServiceRole.entities.Match.get(matchId);
    if (!match) return Response.json({ skipped: 'match not found' });

    const homeTeam = shortTeam(match.home_team_name || 'Vendas');
    const awayTeam = shortTeam(match.away_team_name || 'Mysafir');
    const score = `${match.home_score ?? 0} - ${match.away_score ?? 0}`;

    const teamName = data.team === 'home' ? homeTeam : awayTeam;
    const playerName = data.player_name ? ` (${data.player_name})` : '';

    const notif = {
      title: `❌ Penalti e Humbur — ${teamName}`,
      body: `${homeTeam} ${score} ${awayTeam}${playerName}`,
      icon: ICON,
      tag: `missed-pen-${matchId}-${Date.now()}`,
      vibrate: [200, 100, 200],
      data: { url: `/match/${matchId}`, matchId },
    };

    const result = await sendToFollowers(base44, notif, match.home_team_id, match.away_team_id);
    return Response.json({ success: true, ...result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});