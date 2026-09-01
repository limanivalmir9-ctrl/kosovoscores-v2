import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import { lazy, Suspense, useEffect } from 'react';

// Eager: layout + homepage only — required for first paint (LCP)
import PublicLayout from './components/PublicLayout';
import LiveDashboard from './pages/LiveDashboard';
import useFavoriteGoalNotifier from '@/hooks/useFavoriteGoalNotifier';
import SplashScreen from '@/components/SplashScreen';

// Public pages — lazy: public users download only the page they navigate to
const Ligat = lazy(() => import('./pages/Ligat'));
const CompetitionDetail = lazy(() => import('./pages/CompetitionDetail'));
const MatchDetail = lazy(() => import('./pages/MatchDetail.jsx'));
const MatchRedirect = lazy(() => import('./pages/MatchRedirect.jsx'));
const TeamDetail = lazy(() => import('./pages/TeamDetail.jsx'));
const PlayerDetail = lazy(() => import('./pages/PlayerDetail.jsx'));
const Lajme = lazy(() => import('./pages/Lajme'));
const TopScorers = lazy(() => import('./pages/TopScorers'));
const Donacion = lazy(() => import('./pages/Donacion'));
const Kontakti = lazy(() => import('./pages/Kontakti'));
const Kalendar = lazy(() => import('./pages/Kalendar.jsx'));
const FanChat = lazy(() => import('./pages/FanChat.jsx'));
const LiveScores = lazy(() => import('./pages/LiveScores'));
const WeekStars = lazy(() => import('./pages/WeekStars'));

// Agent pages — lazy (never in the public bundle)
const MatchFeed = lazy(() => import('./pages/MatchFeed'));
const AgentMatchBrowser = lazy(() => import('./pages/AgentMatchBrowser'));
const AgentContact = lazy(() => import('./pages/AgentContact'));

// Admin pages — lazy (public users never download admin code)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCompetitions = lazy(() => import('./pages/admin/AdminCompetitions'));
const AdminProfileVisibility = lazy(() => import('./pages/admin/AdminProfileVisibility'));
const AdminClubs = lazy(() => import('./pages/admin/AdminClubs'));
const AdminTransferClubs = lazy(() => import('./pages/admin/AdminTransferClubs'));
const AdminPlayers = lazy(() => import('./pages/admin/AdminPlayers'));
const AdminMatches = lazy(() => import('./pages/admin/AdminMatches'));
const AdminReferees = lazy(() => import('./pages/admin/AdminReferees'));
const AdminCoaches = lazy(() => import('./pages/admin/AdminCoaches'));
const AdminNews = lazy(() => import('./pages/admin/AdminNews'));
const AdminTopScorers = lazy(() => import('./pages/admin/AdminTopScorers'));
const AdminAds = lazy(() => import('./pages/admin/AdminAds'));
const AdminStandings = lazy(() => import('./pages/admin/AdminStandings'));
const AdminContacts = lazy(() => import('./pages/admin/AdminContacts'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics.jsx'));
const AdminAgents = lazy(() => import('./pages/admin/AdminAgents.jsx'));
const AdminMatchesToday = lazy(() => import('./pages/admin/AdminMatchesToday'));
const AdminAgentChat = lazy(() => import('./pages/admin/AdminAgentChat'));
const AdminMatchApplications = lazy(() => import('./pages/admin/AdminMatchApplications'));
const AdminTransferPlayers = lazy(() => import('./pages/admin/AdminTransferPlayers'));
const AdminPlayerMagazine = lazy(() => import('./pages/admin/AdminPlayerMagazine'));
const AdminDonacion = lazy(() => import('./pages/admin/AdminDonacion'));
const AdminSubAdmins = lazy(() => import('./pages/admin/AdminSubAdmins'));
const AdminAgentAlerts = lazy(() => import('./pages/admin/AdminAgentAlerts'));
const AdminFanChat = lazy(() => import('./pages/admin/AdminFanChat'));
const AdminApiKeys = lazy(() => import('./pages/admin/AdminApiKeys'));
const AdminMultiMatch = lazy(() => import('./pages/admin/AdminMultiMatch'));
const AdminWeekStars = lazy(() => import('./pages/admin/AdminWeekStars'));
const AdminTrophies = lazy(() => import('./pages/admin/AdminTrophies'));

// Keep light mode always for public pages
function useSystemTheme() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);
}

const AuthenticatedApp = () => {
  useSystemTheme();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  useFavoriteGoalNotifier();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <SplashScreen onDone={() => {}} />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    else if (authError.type === 'auth_required') {
      // Allow public agent routes without auth
      const path = window.location.pathname;
      if (path === '/ks-agentA26A02' || path === '/agent-portal' || path.startsWith('/ks-agentA26A02') || path.startsWith('/agent-portal')) {
        // render routes below without redirect
      } else {
        navigateToLogin(); return null;
      }
    }
  }

  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LiveDashboard />} />
        <Route path="/ligat" element={<Ligat />} />
        <Route path="/ligat/:id" element={<CompetitionDetail />} />
        <Route path="/ndeshja/:slug" element={<MatchDetail />} />
        <Route path="/match/:id" element={<MatchRedirect />} />
        <Route path="/team/:id" element={<TeamDetail />} />
        <Route path="/player/:id" element={<PlayerDetail />} />
        <Route path="/lajme" element={<Lajme />} />
        <Route path="/top-scorers" element={<TopScorers />} />
        <Route path="/donacion" element={<Donacion />} />
        <Route path="/kontakti" element={<Kontakti />} />
        <Route path="/kalendar" element={<Kalendar />} />
        <Route path="/fanchat" element={<FanChat />} />
        <Route path="/live-scores" element={<LiveScores />} />
        <Route path="/yjet-e-javes" element={<WeekStars />} />
      </Route>

      <Route path="/ks-agentA26A02" element={<MatchFeed />} />
      <Route path="/agent-portal" element={<AgentMatchBrowser />} />

      <Route element={<AdminLayout />}>
        <Route path="/ks-panel-7k4m9" element={<AdminDashboard />} />
        <Route path="/ks-panel-7k4m9/analytics" element={<AdminAnalytics />} />
        <Route path="/ks-panel-7k4m9/competitions" element={<AdminCompetitions />} />
        <Route path="/ks-panel-7k4m9/profile-visibility" element={<AdminProfileVisibility />} />
        <Route path="/ks-panel-7k4m9/clubs" element={<AdminClubs />} />
        <Route path="/ks-panel-7k4m9/clubs/:clubId/players" element={<AdminPlayers />} />
        <Route path="/ks-panel-7k4m9/transfer-clubs" element={<AdminTransferClubs />} />
        <Route path="/ks-panel-7k4m9/trophies" element={<AdminTrophies />} />
        <Route path="/ks-panel-7k4m9/matches" element={<AdminMatches />} />
        <Route path="/ks-panel-7k4m9/coaches" element={<AdminCoaches />} />
        <Route path="/ks-panel-7k4m9/referees" element={<AdminReferees />} />
        <Route path="/ks-panel-7k4m9/news" element={<AdminNews />} />
        <Route path="/ks-panel-7k4m9/top-scorers" element={<AdminTopScorers />} />
        <Route path="/ks-panel-7k4m9/ads" element={<AdminAds />} />
        <Route path="/ks-panel-7k4m9/standings" element={<AdminStandings />} />
        <Route path="/ks-panel-7k4m9/contacts" element={<AdminContacts />} />
        <Route path="/ks-panel-7k4m9/agents" element={<AdminAgents />} />
        <Route path="/ks-panel-7k4m9/matches-today" element={<AdminMatchesToday />} />
        <Route path="/ks-panel-7k4m9/agent-chat" element={<AdminAgentChat />} />
        <Route path="/ks-panel-7k4m9/match-applications" element={<AdminMatchApplications />} />
        <Route path="/ks-panel-7k4m9/transfer-players" element={<AdminTransferPlayers />} />
        <Route path="/ks-panel-7k4m9/magazine" element={<AdminPlayerMagazine />} />
        <Route path="/ks-panel-7k4m9/donacion" element={<AdminDonacion />} />
        <Route path="/ks-panel-7k4m9/sub-admins" element={<AdminSubAdmins />} />
        <Route path="/ks-panel-7k4m9/agent-alerts" element={<AdminAgentAlerts />} />
        <Route path="/ks-panel-7k4m9/fanchat" element={<AdminFanChat />} />
        <Route path="/ks-panel-7k4m9/api-keys" element={<AdminApiKeys />} />
        <Route path="/ks-panel-7k4m9/multi-match" element={<AdminMultiMatch />} />
        <Route path="/ks-panel-7k4m9/week-stars" element={<AdminWeekStars />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};

// Dynamically set <meta name="robots"> based on the current route:
// admin + agent routes get noindex,nofollow,noarchive; public routes get index,follow.
function RouteRobotsMeta() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    const isSensitive = path.startsWith('/ks-panel-7k4m9') || path.startsWith('/ks-agentA26A02') || path.startsWith('/agent-portal') || path.startsWith('/match-feed') || path === '/fanchat';
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', isSensitive ? 'noindex, nofollow, noarchive' : 'index, follow');
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <RouteRobotsMeta />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="bottom-center" richColors closeButton />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;