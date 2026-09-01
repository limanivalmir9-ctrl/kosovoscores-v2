import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

const ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/702c80214_8c53466ae_logo.png';

function initVapid() {
  const pub = (Deno.env.get('VAPID_PUBLIC_KEY') || '').replace(/[\s"']/g, '');
  const priv = (Deno.env.get('VAPID_PRIVATE_KEY') || '').replace(/[\s"']/g, '');
  const rawSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@kosovoscores.com';
  const subject = 'mailto:' + rawSubject.replace(/^mailto:\s*/i, '').replace(/[<>]/g, '').trim();
  if (pub && priv) webpush.setVapidDetails(subject, pub, priv);
  return pub;
}

Deno.serve(async (req) => {
  try {
    const vapidPublicKey = initVapid();
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch { /* empty */ }

    const { action, subscription, title, matchId, notifBody } = body;

    // ── Get VAPID public key (unauthenticated, needed by frontend to subscribe) ──
    if (action === 'getVapidKey') {
      return Response.json({ vapidPublicKey: vapidPublicKey || '' });
    }

    // All other actions require auth
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Subscribe ────────────────────────────────────────────────────────────
    if (action === 'subscribe' && subscription?.endpoint) {
      const existing = await base44.asServiceRole.entities.PushSubscription.filter({
        user_email: user.email,
        endpoint: subscription.endpoint,
      });

      if (existing.length === 0) {
        await base44.asServiceRole.entities.PushSubscription.create({
          user_email: user.email,
          endpoint: subscription.endpoint,
          auth: subscription.keys?.auth || '',
          p256dh: subscription.keys?.p256dh || '',
          user_agent: req.headers.get('user-agent') || '',
        });
      }
      return Response.json({ success: true });
    }

    // ── Unsubscribe ──────────────────────────────────────────────────────────
    if (action === 'unsubscribe' && subscription?.endpoint) {
      const existing = await base44.asServiceRole.entities.PushSubscription.filter({
        user_email: user.email,
        endpoint: subscription.endpoint,
      });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.PushSubscription.delete(existing[0].id);
      }
      return Response.json({ success: true });
    }

    // ── Update favorite clubs ─────────────────────────────────────────────────
    if (action === 'updateFavorites' && subscription?.endpoint) {
      const existing = await base44.asServiceRole.entities.PushSubscription.filter({
        user_email: user.email,
        endpoint: subscription.endpoint,
      });
      const clubIds = Array.isArray(body.favorite_club_ids) ? body.favorite_club_ids : [];
      if (existing.length > 0) {
        await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, { favorite_club_ids: clubIds });
      } else {
        // Subscribe + set favorites in one step
        await base44.asServiceRole.entities.PushSubscription.create({
          user_email: user.email,
          endpoint: subscription.endpoint,
          auth: subscription.keys?.auth || '',
          p256dh: subscription.keys?.p256dh || '',
          user_agent: req.headers.get('user-agent') || '',
          favorite_club_ids: clubIds,
        });
      }
      return Response.json({ success: true });
    }

    // ── Send test notification ───────────────────────────────────────────────
    if (action === 'sendTest') {
      const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: user.email });
      const payload = JSON.stringify({
        title: title || '🔔 Test KosovoScores',
        body: notifBody || 'Njoftimet push funksionojnë!',
        icon: ICON,
        tag: 'test',
        vibrate: [200, 100, 200],
        data: { url: '/' },
      });

      let sent = 0;
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
            payload
          );
          sent++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
          }
        }
      }
      return Response.json({ success: true, sent });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});