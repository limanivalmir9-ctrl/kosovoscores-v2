import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function escapeXml(s) {
  return String(s || '').replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

function slugifyTeam(name) {
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

function buildSlug(home, away, date) {
  return [slugifyTeam(home), 'vs', slugifyTeam(away), (date || '').trim()].filter(Boolean).join('-');
}

Deno.serve(async (req) => {
  try {
    const origin = new URL(req.url).origin;
    const base44 = createClientFromRequest(req);

    const [competitions, clubs, players, matches] = await Promise.all([
      base44.asServiceRole.entities.Competition.list('tier', 200),
      base44.asServiceRole.entities.Club.list('-created_date', 1000),
      base44.asServiceRole.entities.Player.list('-created_date', 2000),
      base44.asServiceRole.entities.Match.list('-date', 2000),
    ]);

    const urls = [
      `${origin}/`,
      `${origin}/ligat`,
      `${origin}/top-scorers`,
      `${origin}/kalendar`,
      `${origin}/lajme`,
      `${origin}/yjet-e-javes`,
      `${origin}/live-scores`,
    ];

    // Leagues (competitions)
    competitions
      .filter((c) => !c.hidden && !c.archived)
      .forEach((c) => urls.push(`${origin}/ligat/${c.id}`));

    // Clubs
    clubs
      .filter((c) => c.active !== false)
      .forEach((c) => urls.push(`${origin}/team/${c.id}`));

    // Players (only those with a name)
    players
      .filter((p) => p.active !== false && p.name)
      .forEach((p) => urls.push(`${origin}/player/${p.id}`));

    // Matches (exclude test matches) — SEO-friendly /ndeshja/:slug URLs
    matches
      .filter((m) => !m.is_test_match)
      .forEach((m) => {
        const slug = m.slug || buildSlug(m.home_team_name, m.away_team_name, m.date);
        if (slug) urls.push(`${origin}/ndeshja/${slug}`);
      });

    const body =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n') +
      '\n</urlset>';

    return new Response(body, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
});