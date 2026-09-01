// Device targeting helper for ads.
// An ad's `device` field controls where it appears: 'both' | 'mobile' | 'desktop'.
// We treat <768px as mobile (matches the Tailwind md breakpoint used across the app).

export function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function shouldShowAd(ad) {
  if (!ad || !ad.device || ad.device === 'both') return true;
  const mobile = isMobileViewport();
  if (ad.device === 'mobile') return mobile;
  if (ad.device === 'desktop') return !mobile;
  return true;
}