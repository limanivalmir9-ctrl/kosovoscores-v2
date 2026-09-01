import { base44 } from '@/api/base44Client';

// Persistent device ID — same device always same ID
function getDeviceId() {
  let did = localStorage.getItem('ks_device_id');
  if (!did) {
    did = 'dev_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem('ks_device_id', did);
  }
  return did;
}

// Throttle: only 1 page_view per device per 24 hours
function shouldTrackVisit() {
  const key = 'ks_last_visit';
  const last = parseInt(localStorage.getItem(key) || '0', 10);
  const now = Date.now();
  if (now - last < 24 * 60 * 60 * 1000) return false;
  localStorage.setItem(key, now.toString());
  return true;
}

// Cache geo so we only fetch once per session
let _geoCache = null;

async function getGeo() {
  if (_geoCache !== null) return _geoCache;
  const cached = sessionStorage.getItem('ks_geo');
  if (cached) {
    _geoCache = JSON.parse(cached);
    return _geoCache;
  }
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('geo fail');
    const data = await res.json();
    _geoCache = {
      country: data.country_code || '',
      country_name: data.country_name || '',
      region: data.region || '',
      city: data.city || '',
    };
    sessionStorage.setItem('ks_geo', JSON.stringify(_geoCache));
    return _geoCache;
  } catch {
    _geoCache = {};
    return _geoCache;
  }
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone/.test(ua)) return 'mobile';
  return 'desktop';
}

// Track a page_view — deduped per device per 24h
export async function trackPageView(page = '') {
  if (!shouldTrackVisit()) return;
  const geo = await getGeo();
  await base44.entities.Analytics.create({
    event: 'page_view',
    page: page || window.location.pathname,
    session_id: getDeviceId(), // reuse field but now means device_id
    user_agent: navigator.userAgent.slice(0, 200),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    language: navigator.language || '',
    referrer: document.referrer ? document.referrer.slice(0, 200) : '',
    ...geo,
  });
}

// Track any other event freely (PWA installs, etc.) — no dedup
export async function trackEvent(event, extra = {}) {
  const geo = await getGeo();
  await base44.entities.Analytics.create({
    event,
    session_id: getDeviceId(),
    user_agent: navigator.userAgent.slice(0, 200),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    language: navigator.language || '',
    referrer: document.referrer ? document.referrer.slice(0, 200) : '',
    ...geo,
    ...extra,
  });
}

export function getDeviceIdOnly() {
  return getDeviceId();
}

// Keep backward compat
export function getSessionIdOnly() {
  return getDeviceId();
}