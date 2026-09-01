import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Push notifications dërgohen nga server automation (sendGoalNotification)
// Frontend dërgon vetëm browser notifications lokale + regjistron subscription
const PUSH_ENABLED = false;
import { toast } from 'sonner';
import moment from 'moment';

// ─── Favorites (match IDs) ────────────────────────────────────────────────────
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('ks_favorites') || '[]'); } catch { return []; }
}

// ─── Followed clubs ───────────────────────────────────────────────────────────
function getFollowedClubs() {
  try { return JSON.parse(localStorage.getItem('ks_followed_clubs') || '[]'); } catch { return []; }
}

function isNotifEnabled() {
  return localStorage.getItem('ks_notif_enabled') !== 'false';
}

// ─── Notification permission ──────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const r = await Notification.requestPermission();
  return r === 'granted';
}

const APP_ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/702c80214_8c53466ae_logo.png';

async function showBrowserNotification(title, body, matchId) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!isNotifEnabled()) return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.active) {
        // Dërgo përmes postMessage (për kompatibilitet të vjetër)
        reg.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body, matchId });
        return;
      }
    }
    // Fallback: direct Notification
    new Notification(title, { body, icon: APP_ICON, badge: APP_ICON, silent: false });
  } catch (_) {
    try { new Notification(title, { body, icon: APP_ICON, badge: APP_ICON, silent: false }); } catch (_2) {}
  }
}

// Dërso push notification përmes backend për Web Push
function sendPushNotification(title, body, matchId) {
  if (!PUSH_ENABLED) return;
  try {
    base44.functions.invoke('pushNotifications', {
      action: 'sendToUser',
      title,
      body,
      matchId,
    }).catch(() => {});
  } catch (_) {}
}

// ─── Audio Engine ─────────────────────────────────────────────────────────────
let _ctx = null;
let _audioUnlocked = false;

function getCtx() {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}

function registerAudioUnlock() {
  if (_audioUnlocked) return;
  const unlock = () => {
    _audioUnlocked = true;
    try {
      const c = getCtx();
      if (c.state === 'suspended') {
        c.resume().catch(() => {});
      }
    } catch (_) {}
  };
  ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'].forEach(ev =>
    document.addEventListener(ev, unlock, { passive: true, capture: true })
  );
}

function playWhen(fn) {
  try {
    setTimeout(() => {
      try {
        const ctx = getCtx();
        const doPlay = () => { try { fn(ctx); } catch (_) {} };
        if (ctx.state === 'running') {
          doPlay();
        } else {
          ctx.resume().then(doPlay).catch(() => {});
        }
      } catch (_) {}
    }, 0);
  } catch (_) {}
}

// ─── Helper: create white noise buffer source ─────────────────────────────────
function makeNoise(ctx, dur) {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.ceil(sr * dur), sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

// ─── WHISTLE ──────────────────────────────────────────────────────────────────
// count=1 → nis ndeshja / 2a pjesë   count=2 → HT   count=3 → FT
export function playWhistle(count = 1) {
  // Spacing: longer whistle for 1-blow (match start), normal spacing for multi
  const blowDur  = count === 1 ? 0.75 : 0.42;   // single blow is longer
  const spacing  = count === 1 ? 0    : 0.65;    // gap between blows

  playWhen((ctx) => {
    const blow = (startOffset) => {
      const t = ctx.currentTime + startOffset;

      // ── Core whistle tone ──────────────────────────────────────────────────
      const tone = ctx.createOscillator();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(2750, t);
      tone.frequency.linearRampToValueAtTime(3100, t + 0.04);
      tone.frequency.setValueAtTime(3100, t + blowDur * 0.6);
      tone.frequency.linearRampToValueAtTime(2700, t + blowDur);

      // Vibrato LFO
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 10;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 60;
      lfo.connect(lfoGain);
      lfoGain.connect(tone.frequency);

      // ── Breath noise layer ─────────────────────────────────────────────────
      const breath = makeNoise(ctx, blowDur);
      const breathHp = ctx.createBiquadFilter();
      breathHp.type = 'highpass';
      breathHp.frequency.value = 2400;
      const breathGain = ctx.createGain();
      breathGain.gain.value = 0.04;
      breath.connect(breathHp);
      breathHp.connect(breathGain);

      // ── Amplitude envelope ─────────────────────────────────────────────────
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.7, t + 0.018);
      env.gain.setValueAtTime(0.65, t + blowDur * 0.75);
      env.gain.exponentialRampToValueAtTime(0.0001, t + blowDur);

      tone.connect(env);
      breathGain.connect(env);
      env.connect(ctx.destination);

      lfo.start(t);  tone.start(t);  breath.start(t);
      lfo.stop(t + blowDur + 0.05);
      tone.stop(t + blowDur + 0.05);
      breath.stop(t + blowDur + 0.05);
    };

    blow(0);
    if (count >= 2) blow(spacing);
    if (count >= 3) blow(spacing * 2);
  });
}

// ─── GOAL — shurme festive e tifozeve ─────────────────────────────────────────
export function playGoalSound() {
  playWhen((ctx) => {
    const now = ctx.currentTime;
    const sr  = ctx.sampleRate;

    // ── 1. BOOM kick at the very start ──────────────────────────────────────
    const kick = ctx.createOscillator();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(150, now);
    kick.frequency.exponentialRampToValueAtTime(28, now + 0.25);
    const kickG = ctx.createGain();
    kickG.gain.setValueAtTime(0.001, now);
    kickG.gain.linearRampToValueAtTime(0.9, now + 0.008);
    kickG.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    kick.connect(kickG); kickG.connect(ctx.destination);
    kick.start(now); kick.stop(now + 0.35);

    // ── 2. Instant "YEEAAH" crowd burst — hi noise spike ───────────────────
    const burst = makeNoise(ctx, 0.8);
    const burstHp = ctx.createBiquadFilter();
    burstHp.type = 'highpass';
    burstHp.frequency.value = 1800;
    const burstG = ctx.createGain();
    burstG.gain.setValueAtTime(0.001, now);
    burstG.gain.linearRampToValueAtTime(0.35, now + 0.04);
    burstG.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    burst.connect(burstHp); burstHp.connect(burstG); burstG.connect(ctx.destination);
    burst.start(now); burst.stop(now + 0.8);

    // ── 3. Sustained crowd roar — low-mid noise swell (4 s) ─────────────────
    const roarDur = 4.5;
    const roar = makeNoise(ctx, roarDur);
    const roarBp = ctx.createBiquadFilter();
    roarBp.type = 'bandpass';
    roarBp.frequency.value = 600;
    roarBp.Q.value = 0.5;
    const roarG = ctx.createGain();
    roarG.gain.setValueAtTime(0.001, now);
    roarG.gain.linearRampToValueAtTime(0.55, now + 0.1);
    roarG.gain.setValueAtTime(0.45, now + 2.0);
    roarG.gain.exponentialRampToValueAtTime(0.0001, now + roarDur);
    roar.connect(roarBp); roarBp.connect(roarG); roarG.connect(ctx.destination);
    roar.start(now); roar.stop(now + roarDur);

    // ── 4. Clapping rhythm layer ─────────────────────────────────────────────
    const clapDur = 3.2;
    const clap = ctx.createBuffer(1, Math.ceil(sr * clapDur), sr);
    const cd = clap.getChannelData(0);
    for (let i = 0; i < cd.length; i++) {
      const t = i / sr;
      const mod = Math.max(0, Math.sin(2 * Math.PI * 5 * t));  // ~5 claps/s
      cd[i] = (Math.random() * 2 - 1) * mod;
    }
    const clapSrc = ctx.createBufferSource();
    clapSrc.buffer = clap;
    const clapBp = ctx.createBiquadFilter();
    clapBp.type = 'bandpass';
    clapBp.frequency.value = 1100;
    clapBp.Q.value = 1.5;
    const clapG = ctx.createGain();
    clapG.gain.setValueAtTime(0.001, now + 0.2);
    clapG.gain.linearRampToValueAtTime(0.22, now + 0.6);
    clapG.gain.exponentialRampToValueAtTime(0.0001, now + clapDur);
    clapSrc.connect(clapBp); clapBp.connect(clapG); clapG.connect(ctx.destination);
    clapSrc.start(now); clapSrc.stop(now + clapDur);

    // ── 5. Low rumble undertone ──────────────────────────────────────────────
    const rumble = makeNoise(ctx, 4.0);
    const rumbleLp = ctx.createBiquadFilter();
    rumbleLp.type = 'lowpass';
    rumbleLp.frequency.value = 280;
    const rumbleG = ctx.createGain();
    rumbleG.gain.setValueAtTime(0.001, now);
    rumbleG.gain.linearRampToValueAtTime(0.5, now + 0.12);
    rumbleG.gain.setValueAtTime(0.4, now + 2.2);
    rumbleG.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);
    rumble.connect(rumbleLp); rumbleLp.connect(rumbleG); rumbleG.connect(ctx.destination);
    rumble.start(now); rumble.stop(now + 4.0);
  });
}

// ─── RED CARD — zhurme deshperuese e tifozeve ────────────────────────────────
export function playRedCardSound() {
  playWhen((ctx) => {
    const now = ctx.currentTime;
    const sr  = ctx.sampleRate;

    // ── 1. Sharp "OHH!" burst ────────────────────────────────────────────────
    const burst = makeNoise(ctx, 0.35);
    const burstBp = ctx.createBiquadFilter();
    burstBp.type = 'bandpass';
    burstBp.frequency.value = 900;
    burstBp.Q.value = 1.2;
    const burstG = ctx.createGain();
    burstG.gain.setValueAtTime(0.001, now);
    burstG.gain.linearRampToValueAtTime(0.65, now + 0.03);
    burstG.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    burst.connect(burstBp); burstBp.connect(burstG); burstG.connect(ctx.destination);
    burst.start(now); burst.stop(now + 0.35);

    // ── 2. Descending "Awwww" groan — bandpass sweeps down ──────────────────
    const groanDur = 3.8;
    const groan = makeNoise(ctx, groanDur);
    const groanBp = ctx.createBiquadFilter();
    groanBp.type = 'bandpass';
    groanBp.frequency.setValueAtTime(800, now + 0.05);
    groanBp.frequency.linearRampToValueAtTime(220, now + 2.5);
    groanBp.Q.value = 4;
    const groanG = ctx.createGain();
    groanG.gain.setValueAtTime(0.001, now + 0.03);
    groanG.gain.linearRampToValueAtTime(0.5, now + 0.2);
    groanG.gain.setValueAtTime(0.38, now + 1.0);
    groanG.gain.exponentialRampToValueAtTime(0.0001, now + groanDur);
    groan.connect(groanBp); groanBp.connect(groanG); groanG.connect(ctx.destination);
    groan.start(now); groan.stop(now + groanDur);

    // ── 3. Falling sawtooth tone — vocal "ohhh" impression ──────────────────
    const tone = ctx.createOscillator();
    tone.type = 'sawtooth';
    tone.frequency.setValueAtTime(380, now + 0.05);
    tone.frequency.linearRampToValueAtTime(140, now + 2.5);
    const toneLp = ctx.createBiquadFilter();
    toneLp.type = 'lowpass';
    toneLp.frequency.value = 700;
    const toneG = ctx.createGain();
    toneG.gain.setValueAtTime(0.001, now + 0.05);
    toneG.gain.linearRampToValueAtTime(0.1, now + 0.2);
    toneG.gain.setValueAtTime(0.07, now + 1.2);
    toneG.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
    tone.connect(toneLp); toneLp.connect(toneG); toneG.connect(ctx.destination);
    tone.start(now); tone.stop(now + 2.9);

    // ── 4. Low disappointed rumble ───────────────────────────────────────────
    const rumble = makeNoise(ctx, 3.0);
    const rumbleLp = ctx.createBiquadFilter();
    rumbleLp.type = 'lowpass';
    rumbleLp.frequency.value = 180;
    const rumbleG = ctx.createGain();
    rumbleG.gain.setValueAtTime(0.001, now);
    rumbleG.gain.linearRampToValueAtTime(0.35, now + 0.3);
    rumbleG.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
    rumble.connect(rumbleLp); rumbleLp.connect(rumbleG); rumbleG.connect(ctx.destination);
    rumble.start(now); rumble.stop(now + 3.0);
  });
}

// ─── Web Push Registration ───────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const res = await base44.functions.invoke('pushNotifications', { action: 'getVapidKey' });
    const vapidPublicKey = res?.data?.vapidPublicKey;
    if (!vapidPublicKey) return;

    const registration = await navigator.serviceWorker.ready;

    // iOS: unsubscribe existing if any to force fresh subscription
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      // Re-register to backend in case it was lost
      await base44.functions.invoke('pushNotifications', {
        action: 'subscribe',
        subscription: existing.toJSON(),
      }).catch(() => {});
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    await base44.functions.invoke('pushNotifications', {
      action: 'subscribe',
      subscription: subscription.toJSON(),
    });
  } catch (_) {
    // Push nuk është i disponueshëm — vazhdo në heshtje
  }
}

// ─── Notified event IDs (persisted across refresh) ───────────────────────────
const NOTIFIED_KEY = 'ks_notified_event_ids';
function getNotifiedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')); } catch { return new Set(); }
}
function addNotifiedId(id) {
  try {
    const ids = getNotifiedIds();
    ids.add(id);
    // Keep only the last 500 to avoid unbounded growth
    const arr = [...ids].slice(-500);
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
  } catch {}
}
function hasBeenNotified(id) {
  return getNotifiedIds().has(id);
}

// ─── Main Hook ────────────────────────────────────────────────────────────────
export default function useFavoriteGoalNotifier() {
  const prevState = useRef({});
  const initializedRef = useRef(false);
  const webPushSetupRef = useRef(false);

  // Register Service Worker + unlock AudioContext on any user interaction
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        // iOS: ri-subscribe sa herë që app hapet në standalone mode
        if (!webPushSetupRef.current && 'PushManager' in window && Notification.permission === 'granted') {
          webPushSetupRef.current = true;
          subscribeToPush().catch(() => {});
        }
      }).catch(() => {});
    }
    registerAudioUnlock();
    
    // Android / Desktop: subscribe normalisht
    if (!webPushSetupRef.current && 'PushManager' in window && Notification.permission === 'granted') {
      webPushSetupRef.current = true;
      subscribeToPush().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const today = moment().format('YYYY-MM-DD');
      base44.entities.Match.filter({ date: today }, '-updated_date', 200).then(rawMatches => {
        const matches = rawMatches.map(m => { try { return JSON.parse(JSON.stringify(m)); } catch { return m; } });
        const favs = getFavorites();
        const followedClubs = getFollowedClubs();
        matches.forEach(m => {
          const isFollowedMatch = favs.includes(m.id) ||
            followedClubs.includes(m.home_team_id) ||
            followedClubs.includes(m.away_team_id);
          if (!isFollowedMatch) return;
          prevState.current[m.id] = {
            home_score: m.home_score ?? 0,
            away_score: m.away_score ?? 0,
            status: m.status,
            home_red_cards: m.home_red_cards ?? 0,
            away_red_cards: m.away_red_cards ?? 0,
          };
        });
      }).catch(() => {});
    }

    // ── Missed Penalty detection via MatchEvent ──
    const unsubMissedPen = base44.entities.MatchEvent.subscribe((event) => {
      if (event.type !== 'create') return;
      let ev;
      try { ev = JSON.parse(JSON.stringify(event.data)); } catch { ev = event.data; }
      if (ev.type !== 'missed_penalty') return;

      const favs = getFavorites();
      if (!favs.includes(ev.match_id)) return;

      // Avoid duplicate notifications after refresh
      const notifId = `missedpen-${ev.id || ev.match_id + '-' + ev.minute}`;
      if (hasBeenNotified(notifId)) return;
      addNotifiedId(notifId);

      const playerName = ev.player_name ? ` (${ev.player_name})` : '';
      playRedCardSound();
      toast(`❌ Penalti e Humbur${playerName}`, { duration: 7000 });
      showBrowserNotification('❌ Penalti e Humbur', `Penalti i humbur${playerName}`, ev.match_id);
    });

    const unsubscribe = base44.entities.Match.subscribe((event) => {
      if (event.type !== 'update') return;
      let m;
      try { m = JSON.parse(JSON.stringify(event.data)); } catch { m = event.data; }
      const favs = getFavorites();
      const followedClubs = getFollowedClubs();
      const isTracked = favs.includes(m.id) ||
        followedClubs.includes(m.home_team_id) ||
        followedClubs.includes(m.away_team_id);
      if (!isTracked) return;

      const home = m.home_team_name || '';
      const away = m.away_team_name || '';
      const score = `${m.home_score ?? 0} – ${m.away_score ?? 0}`;
      const matchLabel = `${home} vs ${away}`;

      // If we have no previous state yet for this match (race condition on init),
      // save current state and skip — we don't want false positives on first update.
      if (!prevState.current[m.id]) {
        prevState.current[m.id] = {
          home_score: m.home_score ?? 0,
          away_score: m.away_score ?? 0,
          status: m.status,
          home_red_cards: m.home_red_cards ?? 0,
          away_red_cards: m.away_red_cards ?? 0,
        };
        return;
      }

      const prev = prevState.current[m.id];
      const ns = m.status;
      const os = prev.status;

      // ── Status changes ──
      if (os !== ns) {
        if (ns === 'first_half' && (os === 'scheduled' || os === 'awaiting_extra_time')) {
          playWhistle(1);
          toast('🟢 Ndeshja nisi!', { description: matchLabel, duration: 7000 });
          showBrowserNotification(`${home.toUpperCase()} vs ${away.toUpperCase()}`, '🟢 Ndeshja nisi!', m.id);
        }
        if (ns === 'half_time') {
          playWhistle(2);
          toast('⏸ Pushim (HT)', { description: `${matchLabel} • ${score}`, duration: 6000 });
          showBrowserNotification(`${home.toUpperCase()} ${m.home_score ?? 0} - ${m.away_score ?? 0} ${away.toUpperCase()}`, '⏸ Pushim (HT)', m.id);
        }
        if (ns === 'second_half') {
          playWhistle(1);
          toast('▶️ Fillon Pjesa e Dytë', { description: `${matchLabel} • ${score}`, duration: 6000 });
          showBrowserNotification(`${home.toUpperCase()} ${m.home_score ?? 0} - ${m.away_score ?? 0} ${away.toUpperCase()}`, '▶️ Fillon Pjesa e Dytë', m.id);
        }
        if (ns === 'full_time') {
          playWhistle(3);
          toast('🏁 Ndeshja Përfundoi!', { description: `${matchLabel} • ${score}`, duration: 8000 });
          showBrowserNotification(`${home.toUpperCase()} ${m.home_score ?? 0} - ${m.away_score ?? 0} ${away.toUpperCase()}`, '🏁 Ndeshja Përfundoi!', m.id);
        }
      }

      // ── Goals ──
      const nh = m.home_score ?? 0;
      const na = m.away_score ?? 0;
      if (nh > (prev.home_score ?? 0)) {
        const gid = `goal-home-${m.id}-${nh}-${na}`;
        if (!hasBeenNotified(gid)) {
          addNotifiedId(gid);
          playGoalSound();
          toast(`⚽ GOL! ${home}`, { description: `${matchLabel} • ${nh} – ${na}`, duration: 8000 });
          showBrowserNotification(`${home.toUpperCase()} ${nh} - ${na} ${away.toUpperCase()}`, `⚽ GOL – ${home}`, m.id);
          sendPushNotification(`⚽ ${home.toUpperCase()} GOL!`, `${home} ${nh} - ${na} ${away}`, m.id);
        }
      }
      if (na > (prev.away_score ?? 0)) {
        const gid = `goal-away-${m.id}-${nh}-${na}`;
        if (!hasBeenNotified(gid)) {
          addNotifiedId(gid);
          playGoalSound();
          toast(`⚽ GOL! ${away}`, { description: `${matchLabel} • ${nh} – ${na}`, duration: 8000 });
          showBrowserNotification(`${home.toUpperCase()} ${nh} - ${na} ${away.toUpperCase()}`, `⚽ GOL – ${away}`, m.id);
          sendPushNotification(`⚽ ${away.toUpperCase()} GOL!`, `${home} ${nh} - ${na} ${away}`, m.id);
        }
      }

      // ── Red cards ──
      const nhr = m.home_red_cards ?? 0;
      const nar = m.away_red_cards ?? 0;
      if (nhr > (prev.home_red_cards ?? 0)) {
        const rid = `redcard-home-${m.id}-${nhr}`;
        if (!hasBeenNotified(rid)) {
          addNotifiedId(rid);
          playRedCardSound();
          toast(`🟥 Karton i Kuq – ${home}`, { description: matchLabel, duration: 7000 });
          showBrowserNotification(`${home.toUpperCase()} vs ${away.toUpperCase()}`, `🟥 Karton i Kuq – ${home}`, m.id);
          sendPushNotification(`🟥 Karton i Kuq`, `${home}`, m.id);
        }
      }
      if (nar > (prev.away_red_cards ?? 0)) {
        const rid = `redcard-away-${m.id}-${nar}`;
        if (!hasBeenNotified(rid)) {
          addNotifiedId(rid);
          playRedCardSound();
          toast(`🟥 Karton i Kuq – ${away}`, { description: matchLabel, duration: 7000 });
          showBrowserNotification(`${home.toUpperCase()} vs ${away.toUpperCase()}`, `🟥 Karton i Kuq – ${away}`, m.id);
          sendPushNotification(`🟥 Karton i Kuq`, `${away}`, m.id);
        }
      }

      // ── Update snapshot ──
      prevState.current[m.id] = {
        home_score: m.home_score ?? 0,
        away_score: m.away_score ?? 0,
        status: m.status,
        home_red_cards: m.home_red_cards ?? 0,
        away_red_cards: m.away_red_cards ?? 0,
      };
    });

    return () => { unsubMissedPen(); unsubscribe(); };
  }, []);
}