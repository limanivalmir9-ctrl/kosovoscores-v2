// Shared slug helpers for SEO-friendly match URLs (/ndeshja/:slug).
// Slug format: hometeam-vs-awayteam-yyyy-mm-dd (lowercase, no special chars).

export function slugifyTeam(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/ë/g, 'e').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

/**
 * Build a match slug from home team, away team and date.
 * @returns string e.g. "ballkani-vs-drita-2026-08-19"
 */
export function buildMatchSlug(homeTeam, awayTeam, date) {
  const h = slugifyTeam(homeTeam);
  const a = slugifyTeam(awayTeam);
  const d = (date || '').trim();
  return [h, 'vs', a, d].filter(Boolean).join('-');
}

/**
 * Generate a unique slug given a list of existing slugs (to avoid collisions).
 * If the base slug collides, appends a short id suffix.
 */
export function ensureUniqueSlug(baseSlug, existingSlugs = new Set(), idHint = '') {
  if (!existingSlugs.has(baseSlug)) return baseSlug;
  const suffix = (idHint || '').slice(-4) || Math.random().toString(36).slice(2, 6);
  const unique = `${baseSlug}-${suffix}`;
  return unique;
}