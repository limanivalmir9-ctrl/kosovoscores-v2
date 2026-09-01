import { useEffect } from 'react';

const SITE_NAME = 'KosovoScores';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id, data) {
  if (!data) return;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute('id', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function currentCanonical(pathname) {
  if (pathname && /^https?:\/\//i.test(pathname)) return pathname;
  const origin = window.location.origin;
  return origin + (pathname || window.location.pathname);
}

// React hook for per-page SEO meta + JSON-LD structured data.
// Pass { title, description, canonicalPath, image, type, jsonLd }.
// title is rendered as "<title> | KosovoScores".
export function useSeo({ title, description, canonicalPath, image, type = 'website', jsonLd, appendSiteName = false, noindex = false } = {}) {
  useEffect(() => {
    const fullTitle = title
      ? (appendSiteName ? `${title} | ${SITE_NAME}` : title)
      : `${SITE_NAME} – Rezultate LIVE dhe Statistika të Futbollit në Kosovë`;
    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:locale', 'sq_AL');
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    if (image) {
      upsertMeta('property', 'og:image', image);
      upsertMeta('name', 'twitter:image', image);
    }

    const canonicalUrl = currentCanonical(canonicalPath);
    upsertLink('canonical', canonicalUrl);
    upsertMeta('property', 'og:url', canonicalUrl);

    if (noindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow, noarchive');
    }

    if (jsonLd) {
      upsertJsonLd('ks-jsonld-page', Array.isArray(jsonLd) ? jsonLd : [jsonLd]);
    } else {
      removeJsonLd('ks-jsonld-page');
    }
  }, [title, description, canonicalPath, image, type, JSON.stringify(jsonLd), noindex, appendSiteName]);
}

// Helpers to build common structured-data objects.
export const schema = {
  sportsEvent({ match, homeTeam, awayTeam, competition, url }) {
    const startDate = match.date ? `${match.date}T${match.time || '00:00:00'}` : undefined;
    const isFinished = ['full_time', 'official_result'].includes(match.status);
    const data = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${homeTeam?.name || match.home_team_name} vs ${awayTeam?.name || match.away_team_name}`,
      sport: 'Soccer',
      startDate,
      eventStatus: isFinished ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
      homeTeam: { '@type': 'SportsTeam', name: homeTeam?.name || match.home_team_name },
      awayTeam: { '@type': 'SportsTeam', name: awayTeam?.name || match.away_team_name },
    };
    if (match.stadium) data.location = { '@type': 'Place', name: match.stadium };
    if (competition?.name) data.superEvent = { '@type': 'SportsEvent', name: competition.name };
    if (isFinished) {
      data.homeScore = match.home_score;
      data.awayScore = match.away_score;
    }
    return data;
  },
  sportsTeam({ club, url }) {
    return {
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: club.name,
      sport: 'Soccer',
      url,
      ...(club.logo ? { logo: club.logo } : {}),
      ...(club.stadium ? { homeLocation: { '@type': 'Place', name: club.stadium } } : {}),
      ...(club.coach ? { coach: { '@type': 'Person', name: club.coach } } : {}),
    };
  },
  person({ player, club, url }) {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: player.name,
      url,
      ...(player.photo ? { image: player.photo } : {}),
    };
    if (player.position) data.jobTitle = player.position;
    if (club?.name) data.memberOf = { '@type': 'SportsTeam', name: club.name };
    if (player.nationality) data.nationality = player.nationality;
    return data;
  },
  article({ news, url }) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: news.title,
      url,
      ...(news.image ? { image: news.image } : {}),
      datePublished: news.created_date,
      dateModified: news.updated_date,
      publisher: { '@type': 'Organization', name: 'KosovoScores' },
      inLanguage: 'sq',
    };
  },
  breadcrumb(items) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.label,
        ...(it.to ? { item: `${window.location.origin}${it.to}` } : {}),
      })),
    };
  },
};