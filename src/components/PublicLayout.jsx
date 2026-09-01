import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BottomNav from './BottomNav';
import PublicHeader from './PublicHeader';
import Footer from './Footer';
import PublicDateBar from './PublicDateBar';
import RotatingAdBanner from './RotatingAdBanner';
import AdBanner from './AdBanner';
import { AdProvider, useAds } from '@/lib/AdContext';

// Groups ads by rotation_group
function groupAds(ads) {
  const groups = {};
  const singles = [];
  ads.forEach(ad => {
    if (ad.rotation_group) {
      if (!groups[ad.rotation_group]) groups[ad.rotation_group] = [];
      groups[ad.rotation_group].push(ad);
    } else {
      singles.push(ad);
    }
  });
  return { groups, singles };
}

function AdSlot({ placement, className = '', fallbackClass = '' }) {
  const ads = useAds(placement);
  const { groups, singles } = groupAds(ads);

  if (ads.length === 0) {
    return fallbackClass ? <div className={fallbackClass} /> : null;
  }

  return (
    <div className={className}>
      {Object.entries(groups).map(([groupName, groupAds]) => (
        <RotatingAdBanner key={groupName} ads={groupAds} className="my-0 rounded-none" />
      ))}
      {singles.map(ad => <AdBanner key={ad.id} ad={ad} />)}
    </div>
  );
}

function SideAdColumn({ placement }) {
  const ads = useAds(placement);
  const { groups, singles } = groupAds(ads);
  const hasAds = ads.length > 0;

  return (
    <div className="hidden xl:flex flex-col gap-3 items-center pt-2 shrink-0">
      {hasAds ? (
        <>
          {Object.entries(groups).map(([groupName, groupAds]) => (
            <div key={groupName} className="rounded-xl overflow-hidden border border-border/30 shadow-sm bg-card">
              <RotatingAdBanner ads={groupAds} className="my-0 rounded-none" defaultWidth={160} defaultHeight={600} />
            </div>
          ))}
          {singles.map(ad => (
            <div key={ad.id} className="rounded-xl overflow-hidden border border-border/30 shadow-sm bg-card">
              <AdBanner ad={ad} defaultWidth={160} defaultHeight={600} />
            </div>
          ))}
        </>
      ) : (
        <div className="w-40 rounded-xl border border-dashed border-border/25 bg-card/20 h-72 flex items-center justify-center">
          <p className="text-[10px] text-muted-foreground/30 text-center px-2 leading-tight">Hapësirë<br />Reklamimi<br />(desktop)</p>
        </div>
      )}
    </div>
  );
}

function LayoutInner() {
  const location = useLocation();
  const isMatchFeed = location.pathname.startsWith('/match-feed');
  const isFanChat = location.pathname === '/fanchat';
  const [unreadFanChatCount, setUnreadFanChatCount] = useState(0);
  const [hasLiveMatches, setHasLiveMatches] = useState(false);
  const [fanchatEnabled, setFanchatEnabled] = useState(false);

  const pageFallback = (
    <div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
  );

  // Load unread FanChat messages count — delayed so it doesn't compete with first paint
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const messages = await base44.entities.FanChatMessage.list('-created_date', 200);
        const totalCount = messages.filter(m => !m.is_deleted && m.type === 'message').length;
        const readCount = parseInt(localStorage.getItem('ks_fanchat_read_count') || '0', 10);
        const newCount = Math.max(0, totalCount - readCount);
        setUnreadFanChatCount(Math.min(newCount, 99));
      } catch (_) {}
    };

    // Re-calculate from localStorage immediately whenever path changes (no API call needed)
    const recalcFromCache = () => {
      const readCount = parseInt(localStorage.getItem('ks_fanchat_read_count') || '0', 10);
      const lastTotal = parseInt(localStorage.getItem('ks_fanchat_total_count') || '0', 10);
      setUnreadFanChatCount(Math.max(0, Math.min(lastTotal - readCount, 99)));
    };

    recalcFromCache();
    const unreadTimer = setTimeout(() => loadUnreadCount().then(() => {}).catch(() => {}), 8000);
    const interval = setInterval(loadUnreadCount, 30000);
    return () => { clearTimeout(unreadTimer); clearInterval(interval); };
  }, [location.pathname]);

  // Load live matches
  useEffect(() => {
    const loadLiveMatches = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const matches = await base44.entities.Match.filter({ date: today }, '-time', 50);
        const hasLive = matches.some(m => 
          ['first_half','second_half','half_time','extra_time_first_half','extra_time_second_half','awaiting_extra_time','extra_time_half_time','penalties'].includes(m.status)
        );
        setHasLiveMatches(hasLive);
      } catch (_) {}
    };
    const liveTimer = setTimeout(() => loadLiveMatches(), 5000);
    const interval = setInterval(loadLiveMatches, 10000);
    return () => { clearTimeout(liveTimer); clearInterval(interval); };
  }, []);

  // Load site settings (fan chat visibility)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await base44.entities.AppSettings.list('-created_date', 5);
        if (settings[0]) setFanchatEnabled(!!settings[0].fanchat_enabled);
      } catch (_) {}
    };
    loadSettings();
  }, []);

  if (isMatchFeed) return <Outlet />;

  return (
    <div className="min-h-screen flex flex-col public-surface">
      <PublicHeader fanchatEnabled={fanchatEnabled} />
      <PublicDateBar />

      {/* Desktop 3-column layout */}
      <div className="hidden md:flex flex-1 max-w-[1400px] w-full mx-auto px-6 gap-6 py-4">
        {!isFanChat && <SideAdColumn placement="sidebar_left" />}
        <main className="flex-1 min-w-0 max-w-3xl mx-auto">
        <Suspense fallback={pageFallback}><Outlet /></Suspense>
          {!isFanChat && <AdSlot placement="bottom" className="mt-3 rounded-xl overflow-hidden" />}
        </main>
        {!isFanChat && <SideAdColumn placement="sidebar_right" />}
      </div>

      {/* Mobile single-column layout */}
      <main className="md:hidden flex-1 pb-20 max-w-2xl mx-auto w-full px-3 overflow-hidden">
        {!isFanChat && <AdSlot placement="top" className="mb-3 rounded-xl overflow-hidden" />}
        <Suspense fallback={pageFallback}><Outlet /></Suspense>
        {!isFanChat && <AdSlot placement="bottom" className="mt-3 rounded-xl overflow-hidden" />}
      </main>

      <Footer />
      <BottomNav unreadFanChatCount={unreadFanChatCount} hasLiveMatches={hasLiveMatches} fanchatEnabled={fanchatEnabled} />
    </div>
  );
}

export default function PublicLayout() {
  return (
    <AdProvider>
      <LayoutInner />
    </AdProvider>
  );
}