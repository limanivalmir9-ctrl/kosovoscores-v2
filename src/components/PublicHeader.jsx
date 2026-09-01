import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import { publicNavItems } from '@/lib/publicNav';

// Root paths that show the brand banner instead of a back button
const ROOT_PATHS = new Set(['/', '/ligat', '/lajme', '/top-scorers', '/donacion', '/kontakti', '/kalendar']);

function isRootPath(pathname) {
  return ROOT_PATHS.has(pathname);
}

// Derive a human-readable title from the current path
function getPageTitle(pathname) {
  if (pathname.startsWith('/ligat/')) return 'Kompeticion';
  if (pathname.startsWith('/match/')) return 'Ndeshja';
  return '';
}

const LOGO = "https://media.base44.com/images/public/69c340685dca7075d7622e15/484d55ee9_kosovo_logo_2.png";

export default function PublicHeader({ fanchatEnabled = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const isRoot = isRootPath(location.pathname);
  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));
  const navItems = publicNavItems.filter(i => i.path !== '/fanchat' || fanchatEnabled);

  const SearchButton = ({ className }) => (
    <button
      onClick={() => setSearchOpen(true)}
      className={cn('flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 active:scale-95 transition-all', className)}
      title="Kërko"
      aria-label="Kërko"
    >
      <Search className="w-4 h-4 text-foreground" />
    </button>
  );

  return (
    <>
      {/* ── Mobile ── */}
      <header className="md:hidden w-full relative bg-card border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <AnimatePresence mode="wait" initial={false}>
          {isRoot ? (
            <motion.div
              key="banner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <img
                src="https://media.base44.com/images/public/69c340685dca7075d7622e15/883324c90_Kososcores.jpg"
                alt="KosovoScores"
                className="w-full block"
                style={{ maxHeight: '97px', objectFit: 'cover', objectPosition: 'center' }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="flex items-center h-14 px-3 gap-3"
            >
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <span className="font-semibold text-sm text-foreground flex-1">
                {getPageTitle(location.pathname)}
              </span>
              <SearchButton />
              <NotificationBell />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search + Notification bell overlaid on the banner when on root */}
        {isRoot && (
          <div className="absolute right-2 flex flex-col items-center gap-1" style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}>
            <NotificationBell />
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-6 h-6 rounded-full bg-black/35 backdrop-blur-sm hover:bg-black/45 active:scale-95 transition-all"
              title="Kërko"
              aria-label="Kërko"
            >
              <Search className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
      </header>

      {/* ── Desktop / Tablet — clean sticky nav ── */}
      <header className="hidden md:block sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center h-20 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img
                src={LOGO}
                alt="KosovoScores"
                className="h-[73px] object-contain"
              />
            </Link>
            <a
              href="https://instagram.com/kosovoscores"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors shrink-0"
              aria-label="KosovoScores në Instagram"
              title="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>

            {/* Navigation */}
            <nav className="flex-1 flex items-center justify-center gap-1 min-w-0">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'group relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 whitespace-nowrap',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:shadow-sm hover:-translate-y-0.5'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 transition-transform group-hover:scale-110', item.label === 'LIVE' && active && 'animate-pulse-live')} />
                    <span className="hidden lg:inline">{item.label}</span>
                    {!active && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-5 bg-primary rounded-full transition-all duration-300" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right: search + bell */}
            <div className="flex items-center gap-3 shrink-0">
              <SearchButton />
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}