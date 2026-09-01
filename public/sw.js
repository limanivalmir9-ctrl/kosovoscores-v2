// KosovoScores Service Worker
// Handles push notifications when app is closed or screen is locked

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push event: triggered by server even when app is closed ──────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'KosovoScores', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'KosovoScores';
  const options = {
    body: data.body || '',
    icon: data.icon || 'https://media.base44.com/images/public/69c340685dca7075d7622e15/702c80214_8c53466ae_logo.png',
    // badge: intentionally omitted — hides favicon/domain badge on Android
    tag: data.tag || 'kosovoscores-default',
    vibrate: data.vibrate || [200, 100, 200],
    silent: false,
    requireInteraction: false,
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click: open/focus the match page ────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  const absoluteUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === absoluteUrl && 'focus' in client) {
          return client.focus();
        }
      }
      for (const client of clientList) {
        if ('navigate' in client) {
          return client.navigate(absoluteUrl).then(c => c && c.focus());
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
      }
    })
  );
});

// ── Message from frontend: show notification via postMessage ─────────────────
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;
  const { title, body, matchId } = event.data;
  const icon = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/702c80214_8c53466ae_logo.png';
  self.registration.showNotification(title, {
    body,
    icon,
    // badge: intentionally omitted — hides favicon/domain badge on Android
    tag: matchId ? `match-${matchId}` : 'kosovoscores',
    vibrate: [200, 100, 200],
    silent: false,
    data: { url: matchId ? `/match/${matchId}` : '/' },
  });
});
