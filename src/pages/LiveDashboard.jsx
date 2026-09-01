import { useState, useEffect, useRef, useCallback } from 'react';

// Strip SDK proxy wrappers by converting to plain JS object
function toPlain(obj) {
  try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
}
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { trackEvent } from '@/lib/trackAnalytics';
import { useSeo } from '@/lib/seo';
import CompetitionMatchGroup from '../components/CompetitionMatchGroup';
import AdBanner from '../components/AdBanner';
import RotatingAdBanner from '../components/RotatingAdBanner';
import SkeletonDashboard from '../components/SkeletonDashboard';
import LiveSponsors from '../components/LiveSponsors';
import { shouldShowAd } from '@/lib/adDevice';
import moment from 'moment';
import { Link } from 'react-router-dom';

// Module-level cache so navigating back is instant
let _cachedData = null;

export default function LiveDashboard() {
  const [matches, setMatches] = useState(_cachedData?.matches || []);
  const [competitions, setCompetitions] = useState(_cachedData?.competitions || []);
  const [ads, setAds] = useState(_cachedData?.ads || []);
  // Show loading only if no cached data, but always re-fetch on mount
  const [loading, setLoading] = useState(!_cachedData);
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [nextMatch, setNextMatch] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [selectedCompIds, setSelectedCompIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ks_filter_comps') || 'null') || null; } catch { return null; }
  });
  const touchStartY = useRef(null);
  const trackedRef = useRef(false);

  useSeo({
    title: 'KosovoScores – Rezultate LIVE dhe Statistika të Futbollit në Kosovë',
    description: 'KosovoScores - Rezultatet Live te Superliges se Kosoves, renditja, golat dhe statistikat ne kohe reale. LiveScore per te gjitha ligat e Kosoves.',
    canonicalPath: '/',
    appendSiteName: false,
  });

  const loadData = useCallback(async () => {
    try {
      const today = moment().format('YYYY-MM-DD');
      const [allMatchesToday, allComps, allAds] = await Promise.all([
        base44.entities.Match.filter({ date: today }, '-time', 300),
        base44.entities.Competition.list('tier', 50),
        base44.entities.Ad.filter({ active: true }, '-created_date', 50),
      ]);
      const fetched = allMatchesToday.filter(m => !m.is_test_match && m.show_in_live !== false).map(toPlain);
      // Merge with cached: përgjigje të pjesshta/boshe (nën ngarkesë) nuk fshijnë ndeshjet live
      setMatches(prev => {
        const byId = {};
        prev.forEach(m => { if (m.date === today) byId[m.id] = m; });
        fetched.forEach(m => { byId[m.id] = m; });
        const merged = Object.values(byId);
        _cachedData = { matches: merged, competitions: allComps, ads: allAds };
        return merged;
      });
      setCompetitions(allComps);
      setAds(allAds);
    } catch (e) {
      // Network error — keep showing cached data, don't wipe the list
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Always fetch fresh on mount
    loadData();
    // Polling every 15 seconds — avoids hammering the server while keeping data fresh
    const interval = setInterval(() => loadData(), 15000);
    // Refresh when tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', onVisible);
    // pageshow covers browser back/forward cache
    const onPageShow = (e) => { if (e.persisted) loadData(); };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [loadData]);

  useEffect(() => {
    // Real-time: update match directly from event data — no extra API call
    const u1 = base44.entities.Match.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        const m = toPlain(event.data);
        if (m.is_test_match || m.show_in_live === false) return;
        setMatches(prev => {
          const idx = prev.findIndex(x => x.id === m.id);
          if (idx === -1) return prev; // don't reload — avoid wiping the list
          const next = [...prev];
          next[idx] = m;
          if (_cachedData) _cachedData.matches = next;
          return next;
        });
      } else if (event.type === 'create') {
        loadData(); // new match added today
      }
      // 'delete' ignored — let polling handle it to avoid accidental wipes
    });
    // MatchEvent subscription removed — polling handles score refresh to avoid flooding
    return () => { u1(); };
  }, [loadData]);

  // Track analytics with geo
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackEvent('page_view', { page: 'Live Dashboard' });
  }, []);

  // When there are no matches today, find the next upcoming match for the countdown
  useEffect(() => {
    if (matches.length > 0) { setNextMatch(null); return; }
    let cancelled = false;
    const findNext = async () => {
      try {
        const upcoming = await base44.entities.Match.filter({ status: 'scheduled' }, 'date', 100);
        const now = Date.now();
        const valid = upcoming
          .filter(m => !m.is_test_match && m.show_in_live !== false)
          .filter(m => {
            const dt = moment(`${m.date} ${m.time || '00:00'}`);
            return dt.isValid() && dt.valueOf() >= now;
          })
          .sort((a, b) => moment(`${a.date} ${a.time || '00:00'}`).valueOf() - moment(`${b.date} ${b.time || '00:00'}`).valueOf());
        if (!cancelled && valid.length > 0) setNextMatch(valid[0]);
      } catch (_) {}
    };
    findNext();
    return () => { cancelled = true; };
  }, [matches.length]);

  // Countdown ticker
  useEffect(() => {
    if (!nextMatch) { setCountdown(''); return; }
    const tick = () => {
      const target = moment(`${nextMatch.date} ${nextMatch.time || '00:00'}`);
      const diff = target.valueOf() - Date.now();
      if (diff <= 0) { setCountdown('Po fillon...'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextMatch]);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setPullY(Math.min(dy * 0.4, 70));
  };
  const handleTouchEnd = async () => {
    if (pullY >= 60) {
      setRefreshing(true);
      await loadData();
      setRefreshing(false);
    }
    setPullY(0);
    touchStartY.current = null;
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  // Persist filter selection
  const toggleComp = (id) => {
    setSelectedCompIds(prev => {
      let next;
      if (prev === null) {
        // First click: filter to only this one
        next = [id];
      } else if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
        if (next.length === 0) next = null; // all selected = no filter
      } else {
        next = [...prev, id];
      }
      localStorage.setItem('ks_filter_comps', JSON.stringify(next));
      return next;
    });
  };

  // Group matches by competition, sort within each group by time ascending
  const grouped = {};
  matches.forEach(m => {
    const cid = m.competition_id || 'unknown';
    if (!grouped[cid]) grouped[cid] = [];
    grouped[cid].push(m);
  });
  Object.values(grouped).forEach(arr => arr.sort((a, b) => (a.time || '').localeCompare(b.time || '')));

  // Sort groups by competition tier (TIER 1 first)
  const allSortedGroups = Object.entries(grouped).sort((a, b) => {
    const compA = competitions.find(c => c.id === a[0]);
    const compB = competitions.find(c => c.id === b[0]);
    return (compA?.tier || 99) - (compB?.tier || 99);
  });

  // Apply competition filter
  const sortedGroups = selectedCompIds
    ? allSortedGroups.filter(([cid]) => selectedCompIds.includes(cid))
    : allSortedGroups;

  // All competitions that have matches today (for filter bar)
  const competitionsToday = allSortedGroups.map(([cid]) => competitions.find(c => c.id === cid)).filter(Boolean);

  // Flatten ads for placement between groups
  const activeAds = ads.filter(a => a.placement !== 'float');
  const floatAds = ads.filter(a => a.placement === 'float' && a.active);
  const sideAds = ads.filter(a => a.placement === 'side_desktop' && shouldShowAd(a));
  const sponsorAds = ads.filter(a => a.placement === 'sponsor' && a.active && shouldShowAd(a));
  const hasLiveMatches = matches.some(m => ['first_half','second_half','half_time','extra_time_first_half','extra_time_second_half','awaiting_extra_time','extra_time_half_time','penalties'].includes(m.status));

  // Group ads by rotation_group; ungrouped ads are shown individually
  const buildAdSlots = (adList) => {
    const seen = new Set();
    const slots = []; // each slot is either a single ad or a rotation group array
    const groupMap = {};
    adList.forEach(ad => {
      if (ad.rotation_group) {
        if (!groupMap[ad.rotation_group]) {
          groupMap[ad.rotation_group] = [];
          slots.push({ type: 'rotation', group: ad.rotation_group, ads: groupMap[ad.rotation_group] });
        }
        groupMap[ad.rotation_group].push(ad);
      } else {
        if (!seen.has(ad.id)) {
          seen.add(ad.id);
          slots.push({ type: 'single', ad });
        }
      }
    });
    return slots;
  };

  const activeAdSlots = buildAdSlots(activeAds);

  const renderAdSlot = (slot, key) => {
    if (slot.type === 'rotation') {
      return <RotatingAdBanner key={key} ads={slot.ads} />;
    }
    return <AdBanner key={key} ad={slot.ad} />;
  };

  return (
    <div className="py-4 relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <h1 className="sr-only">Rezultate LIVE të Futbollit në Kosovë – KosovoScores</h1>
      {/* Float ads - absolutely positioned */}
      {floatAds.filter(shouldShowAd).map(ad => (
        <a
          key={ad.id}
          href={ad.link || undefined}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            left: `${ad.pos_x ?? 50}%`,
            top: `${ad.pos_y ?? 10}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
          }}
        >
          <img
            src={ad.image}
            alt="Ad"
            className="rounded-lg shadow-md"
            style={{ maxWidth: ad.width ? `${ad.width}px` : '280px', maxHeight: ad.height ? `${ad.height}px` : '54px', objectFit: 'contain' }}
          />
        </a>
      ))}
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {pullY > 10 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center mb-2"
            style={{ marginTop: pullY - 20 }}
          >
            <div className={`w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full ${refreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullY * 3}deg)` }} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Competition filter bar */}
      {competitionsToday.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => { setSelectedCompIds(null); localStorage.removeItem('ks_filter_comps'); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              selectedCompIds === null
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/40'
            }`}
          >
            Të Gjitha
          </button>
          {competitionsToday.map(comp => {
            const isActive = selectedCompIds?.includes(comp.id);
            return (
              <button
                key={comp.id}
                onClick={() => toggleComp(comp.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  isActive
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-muted-foreground border-border hover:border-foreground/40'
                }`}
              >
                {comp.logo && <img src={comp.logo} alt="" className="w-4 h-4 object-contain" />}
                <span>{comp.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {sortedGroups.length === 0 ? (
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 mx-auto mb-5 flex items-center justify-center shadow-sm">
            <span className="text-3xl">⚽</span>
          </div>
          <h2 className="text-lg font-black text-foreground">Nuk ka ndeshje sot</h2>
          <p className="text-sm text-muted-foreground mt-1">Po presim fillimin e ndeshjes së ardhshme</p>

          {nextMatch ? (
            (() => {
              const target = moment(`${nextMatch.date} ${nextMatch.time || '00:00'}`).valueOf();
              const diff = Math.max(0, target - Date.now());
              const dd = Math.floor(diff / 86400000);
              const hh = Math.floor((diff % 86400000) / 3600000);
              const mm = Math.floor((diff % 3600000) / 60000);
              const ss = Math.floor((diff % 60000) / 1000);
              const blocks = dd > 0
                ? [['D', dd], ['H', hh], ['M', mm], ['S', ss]]
                : [['H', hh], ['M', mm], ['S', ss]];
              return (
                <div className="mt-6 space-y-5">
                  <div className="flex items-center justify-center gap-2">
                    {blocks.map(([label, val]) => (
                      <div key={label} className="flex flex-col items-center">
                        <div className="w-14 h-16 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center">
                          <span className="text-2xl font-black tabular-nums text-foreground">{String(val).padStart(2, '0')}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{label}</span>
                      </div>
                    ))}
                  </div>
                  <Link to={`/match/${nextMatch.id}`} className="block bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all group">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary text-center mb-3">Ndeshja e ardhshme</p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 flex flex-col items-center text-center min-w-0">
                        {nextMatch.home_team_logo ? <img src={nextMatch.home_team_logo} alt="" className="w-10 h-10 object-contain mb-1" /> : <div className="w-10 h-10 mb-1" />}
                        <span className="text-xs font-bold truncate w-full">{nextMatch.home_team_name}</span>
                      </div>
                      <div className="text-center px-2 shrink-0">
                        <p className="text-[10px] text-muted-foreground">{moment(nextMatch.date).format('DD.MM.YYYY')}</p>
                        <p className="text-sm font-black text-primary tabular-nums">{nextMatch.time || '--:--'}</p>
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground group-hover:text-primary transition-colors">Shiko detajet →</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center text-center min-w-0">
                        {nextMatch.away_team_logo ? <img src={nextMatch.away_team_logo} alt="" className="w-10 h-10 object-contain mb-1" /> : <div className="w-10 h-10 mb-1" />}
                        <span className="text-xs font-bold truncate w-full">{nextMatch.away_team_name}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })()
          ) : (
            <p className="text-xs text-muted-foreground mt-4">Kthehu më vonë për rezultate live</p>
          )}
        </div>
      ) : (
        <div className="flex gap-4">
          <div className="flex-1 min-w-0 space-y-4">
        {sortedGroups.map(([compId, compMatches], index) => {
          const comp = competitions.find(c => c.id === compId);
          const compAds = ads.filter(a => a.competition_id === compId);
          const topAd = compAds.find(a => a.placement === 'top');
          const bottomAd = compAds.find(a => a.placement === 'bottom');

          return (
            <div key={compId}>
              {/* Between-group ad */}
              {index > 0 && activeAdSlots[index] && (
                <div className="mb-3">
                  {renderAdSlot(activeAdSlots[index], `between-${index}`)}
                </div>
              )}
              <CompetitionMatchGroup
                competition={comp}
                matches={compMatches}
                topAd={topAd}
                bottomAd={bottomAd}
              />
            </div>
          );
        })}
          </div>
          {/* Side ads - desktop only */}
          {sideAds.length > 0 && (
            <div className="hidden lg:flex flex-col gap-3 flex-shrink-0">
              {sideAds.map(ad => (
                <a key={ad.id} href={ad.link || '#'} target="_blank" rel="noopener noreferrer"
                  className="block overflow-hidden rounded-xl border border-border hover:opacity-90 transition-opacity"
                  style={{ width: ad.width ? `${ad.width}px` : '180px', height: ad.height ? `${ad.height}px` : '180px' }}
                >
                  <img src={ad.image} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile sponsors: grayscale when no live, slider when live */}
      <LiveSponsors sponsors={sponsorAds} hasLiveMatches={hasLiveMatches} />
    </div>
  );
}