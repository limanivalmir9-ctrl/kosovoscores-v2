import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield, Trophy, Users, Calendar, Newspaper, Star, Image, UserCheck,
  ArrowLeft, Table, Mail, BarChart2, UserSquare, MessageSquare, LogOut,
  Tv2, ClipboardList, ArrowRightLeft, Heart, ShieldCheck, BellRing,
  ChevronLeft, Menu, X, LayoutDashboard, MessageCircleHeart, KeyRound, Layers, MoveRight, Eye, Award, Package, UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminGate from '@/components/AdminGate';
import { clearAdminSession, getAdminSession, isMasterAdmin, hasAccess } from '@/lib/adminAuth';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const ALL_LINKS = [
  { path: '/ks-panel-7k4m9', label: 'Ballina', icon: LayoutDashboard, exact: true, section: null, color: 'text-slate-600' },
  { path: '/ks-panel-7k4m9/matches-today', label: 'Ndeshjet Sot', icon: Tv2, section: 'matches-today', color: 'text-red-500', highlight: true, prominent: true },
  { path: '/ks-panel-7k4m9/matches', label: 'Ndeshjet', icon: Calendar, section: 'matches', color: 'text-orange-500', prominent: true },
  { path: '/ks-panel-7k4m9/clubs', label: 'Klubet', icon: Users, section: 'clubs', color: 'text-emerald-500', prominent: true },
  { path: '/ks-panel-7k4m9/agents', label: 'Agjentët', icon: UserSquare, section: 'agents', color: 'text-indigo-500' },
  { path: '/ks-panel-7k4m9/contacts', label: 'Kontaktet', icon: Mail, section: 'contacts', color: 'text-teal-500', prominent: true },
  { path: '/ks-panel-7k4m9/competitions', label: 'Kompeticionet', icon: Trophy, section: 'competitions', color: 'text-blue-500' },
  { path: '/ks-panel-7k4m9/week-stars', label: 'Yjet e Javës', icon: Star, section: 'top-scorers', color: 'text-amber-400' },
  { path: '/ks-panel-7k4m9/magazine', label: 'Magazina', icon: Package, section: 'clubs', color: 'text-amber-500' },

  { path: '/ks-panel-7k4m9/analytics', label: 'Statistikat', icon: BarChart2, section: 'analytics', color: 'text-violet-500' },
  { path: '/ks-panel-7k4m9/profile-visibility', label: 'Dukshmëria e Profileve', icon: Eye, section: 'competitions', color: 'text-teal-500' },
  { path: '/ks-panel-7k4m9/transfer-clubs', label: 'Transfero Klubet', icon: MoveRight, section: 'clubs', color: 'text-emerald-400' },
  { path: '/ks-panel-7k4m9/trophies', label: 'Trofetë', icon: Award, section: 'clubs', color: 'text-yellow-600' },
  { path: '/ks-panel-7k4m9/coaches', label: 'Trajnerët', icon: UserCog, section: 'clubs', color: 'text-cyan-600' },
  { path: '/ks-panel-7k4m9/referees', label: 'Gjyqtarët', icon: UserCheck, section: 'referees', color: 'text-slate-500' },
  { path: '/ks-panel-7k4m9/standings', label: 'Tabelat', icon: Table, section: 'standings', color: 'text-purple-500' },
  { path: '/ks-panel-7k4m9/top-scorers', label: 'Golashënuesit', icon: Star, section: 'top-scorers', color: 'text-yellow-500' },
  { path: '/ks-panel-7k4m9/news', label: 'Lajme', icon: Newspaper, section: 'news', color: 'text-cyan-500' },
  { path: '/ks-panel-7k4m9/ads', label: 'Reklamat', icon: Image, section: 'ads', color: 'text-rose-500' },
  { path: '/ks-panel-7k4m9/agent-chat', label: 'Chat Agjentë', icon: MessageSquare, section: 'agent-chat', color: 'text-pink-500' },
  { path: '/ks-panel-7k4m9/match-applications', label: 'Aplikimet', icon: ClipboardList, section: 'match-applications', color: 'text-amber-500' },
  { path: '/ks-panel-7k4m9/multi-match', label: 'Multi Match', icon: Layers, section: 'matches-today', color: 'text-violet-500' },
  { path: '/ks-panel-7k4m9/transfer-players', label: 'Transfero', icon: ArrowRightLeft, section: 'transfer-players', color: 'text-lime-500' },
  { path: '/ks-panel-7k4m9/donacion', label: 'Donacionet', icon: Heart, section: 'donacion', color: 'text-pink-400' },

  { path: '/ks-panel-7k4m9/api-keys', label: 'API Publike', icon: KeyRound, section: '__master__', color: 'text-purple-400' },
  { path: '/ks-panel-7k4m9/sub-admins', label: 'Nën-Adminët', icon: ShieldCheck, section: '__master__', color: 'text-slate-400' },
];

export default function AdminLayout() {
  const location = useLocation();
  const session = getAdminSession();
  const master = isMasterAdmin();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleLinks = ALL_LINKS.filter(link => {
    if (link.section === null) return true;
    if (link.section === '__master__') return master;
    return hasAccess(link.section);
  });

  const navigate = useNavigate();

  // Section guard: a sub-admin who navigates (direct URL) to a section they don't
  // have access to is redirected to their first allowed page. Keeps a news-only
  // author out of matches/clubs/etc. even via typed URLs.
  useEffect(() => {
    if (!session || master) return;
    const current = ALL_LINKS.find(l =>
      l.path === location.pathname ||
      (l.path !== '/ks-panel-7k4m9' && location.pathname.startsWith(l.path))
    );
    if (current && current.section && current.section !== '__master__' && !hasAccess(current.section)) {
      const first = visibleLinks.find(l => l.section && l.section !== '__master__' && hasAccess(l.section));
      navigate(first ? first.path : '/ks-panel-7k4m9/news', { replace: true });
    }
  }, [location.pathname, session, master, navigate, visibleLinks]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Header */}
      <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-white/10', collapsed && 'justify-center px-2')}>
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate">KS Admin</p>
            <p className="text-[10px] text-white/50 truncate">
              {master ? '⭐ Super Admin' : session?.name || ''}
            </p>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleLinks.map(link => {
          const Icon = link.icon;
          const isActive = link.exact
            ? location.pathname === link.path
            : location.pathname.startsWith(link.path) && !(link.exact === false && location.pathname === '/ks-panel-7k4m9');

          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? link.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group relative',
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
                link.prominent && 'text-sm font-bold py-2.5',
                link.prominent && !isActive && 'bg-white/10 text-white',
                link.prominent && isActive && 'bg-white/25 text-white',
                collapsed && 'justify-center px-0 w-10 h-10 mx-auto',
                link.highlight && !isActive && 'text-red-300 hover:text-red-100'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : link.color, 'opacity-90')} />
              {!collapsed && <span className="truncate">{link.label}</span>}
              {link.highlight && !collapsed && (
                <span className="ml-auto w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className={cn('border-t border-white/10 px-2 py-3 space-y-1', collapsed && 'flex flex-col items-center')}>
        <Link
          to="/"
          className={cn('flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-white/50 hover:bg-white/10 hover:text-white transition-all', collapsed && 'justify-center px-0 w-10 h-10')}
          title={collapsed ? 'Kthehu' : undefined}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          {!collapsed && 'Kthehu te faqja'}
        </Link>
        <button
          onClick={() => { clearAdminSession(); window.location.reload(); }}
          className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-white/50 hover:bg-red-500/20 hover:text-red-300 transition-all', collapsed && 'justify-center px-0 w-10 h-10')}
          title={collapsed ? 'Dil' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Dil'}
        </button>
      </div>
    </div>
  );

  if (!isLoadingAuth && (!isAuthenticated || user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold mb-2">Kërkyet hyrja admin</h1>
          <p className="text-sm text-muted-foreground mb-5">Për të menaxhuar ndeshjet, duhet të jeni i kyçur me llogarinë admin të Base44. Klikoni më poshtë për t'u kyçur.</p>
          <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="w-full py-5 font-bold">Hyr si Admin</Button>
        </div>
      </div>
    );
  }

  return (
    <AdminGate>
      <div className="flex h-screen overflow-hidden bg-background">

        {/* Desktop Sidebar */}
        <aside className={cn(
          'hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-900 to-slate-800 relative',
          collapsed ? 'w-14' : 'w-56'
        )}>
          <SidebarContent />
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 text-white flex items-center justify-center hover:bg-slate-600 transition-colors z-10"
          >
            <ChevronLeft className={cn('w-3 h-3 transition-transform duration-300', collapsed && 'rotate-180')} />
          </button>
        </aside>

        {/* Mobile overlay sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar (mobile) */}
          <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">KS Admin</span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </AdminGate>
  );
}