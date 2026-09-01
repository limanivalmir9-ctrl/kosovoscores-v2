import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

const ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/702c80214_8c53466ae_logo.png';

// Shkurton emrin e ekipit nëse është shumë i gjatë
function shortTeam(name, max = 16) {
  if (!name) return '';
  if (name.length <= max) return name;
  // Merr fjalën e parë + shkronjën e parë të fjalës tjetër
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

  // Filter: send only to subscribers following home or away team
  // If a subscriber has no favorite_club_ids set (old subscription), send to everyone (backwards compat)
  const targeted = allSubs.filter(sub => {
    const favs = sub.favorite_club_ids;
    if (!favs || favs.length === 0) return true; // backwards compat: send to all unfiltered
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

    const { data, old_data } = payload;
    if (!data) return Response.json({ skipped: 'no data' });

    const matchId = data.id;
    const homeTeam = shortTeam(data.home_team_name || 'Vendas');
    const awayTeam = shortTeam(data.away_team_name || 'Mysafir');
    const newHome = data.home_score ?? 0;
    const newAway = data.away_score ?? 0;
    const oldHome = old_data?.home_score ?? 0;
    const oldAway = old_data?.away_score ?? 0;
    const oldStatus = old_data?.status || '';
    const newStatus = data.status || '';
    const score = `${newHome} - ${newAway}`;
    const matchLabel = `${homeTeam} ${score} ${awayTeam}`;

    let notif = null;

    // ── Goals ───────────────────────────────────────────────────────────────
    if (newHome > oldHome) {
      notif = {
        title: `⚽ GOL! ${homeTeam}`,
        body: matchLabel,
        icon: ICON,
        tag: `goal-${matchId}-${newHome}-${newAway}`,
        vibrate: [300, 100, 300, 100, 300],
        data: { url: `/match/${matchId}`, matchId },
      };
    } else if (newAway > oldAway) {
      notif = {
        title: `⚽ GOL! ${awayTeam}`,
        body: matchLabel,
        icon: ICON,
        tag: `goal-${matchId}-${newHome}-${newAway}`,
        vibrate: [300, 100, 300, 100, 300],
        data: { url: `/match/${matchId}`, matchId },
      };

    // ── Red Cards ────────────────────────────────────────────────────────────
    } else if ((data.home_red_cards ?? 0) > (old_data?.home_red_cards ?? 0)) {
      notif = {
        title: `🟥 Karton i Kuq — ${homeTeam}`,
        body: matchLabel,
        icon: ICON,
        tag: `red-${matchId}-home`,
        vibrate: [200, 100, 200],
        data: { url: `/match/${matchId}`, matchId },
      };
    } else if ((data.away_red_cards ?? 0) > (old_data?.away_red_cards ?? 0)) {
      notif = {
        title: `🟥 Karton i Kuq — ${awayTeam}`,
        body: matchLabel,
        icon: ICON,
        tag: `red-${matchId}-away`,
        vibrate: [200, 100, 200],
        data: { url: `/match/${matchId}`, matchId },
      };

    // ── Match Status Changes ─────────────────────────────────────────────────
    } else if (oldStatus !== newStatus) {
      if (newStatus === 'first_half' && (oldStatus === 'scheduled' || !oldStatus)) {
        notif = {
          title: `🟢 Ndeshja Nisi!`,
          body: `${homeTeam} vs ${awayTeam}`,
          icon: ICON,
          tag: `status-${matchId}-start`,
          vibrate: [100, 50, 100],
          data: { url: `/match/${matchId}`, matchId },
        };
      } else if (newStatus === 'half_time') {
        notif = {
          title: `⏸ Pushim — ${score}`,
          body: `${homeTeam} vs ${awayTeam}`,
          icon: ICON,
          tag: `status-${matchId}-ht`,
          vibrate: [100, 50, 100],
          data: { url: `/match/${matchId}`, matchId },
        };
      } else if (newStatus === 'second_half') {
        notif = {
          title: `▶️ Fillon Pjesa e Dytë`,
          body: `${homeTeam} ${score} ${awayTeam}`,
          icon: ICON,
          tag: `status-${matchId}-sh`,
          vibrate: [100, 50, 100],
          data: { url: `/match/${matchId}`, matchId },
        };
      } else if (newStatus === 'full_time') {
        notif = {
          title: `🏁 Ndeshja Mbaroi!`,
          body: `${homeTeam} ${score} ${awayTeam}`,
          icon: ICON,
          tag: `status-${matchId}-ft`,
          vibrate: [200, 100, 200],
          data: { url: `/match/${matchId}`, matchId },
        };
      }
    }

    if (!notif) return Response.json({ skipped: 'no relevant change' });

    const result = await sendToFollowers(base44, notif, data.home_team_id, data.away_team_id);
    return Response.json({ success: true, ...result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});