import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';

import MatchFeedPanel from '../components/matchfeed/MatchFeedPanel';
import BasicCoveragePanel from '../components/matchfeed/BasicCoveragePanel';
import AgentContact from './AgentContact';
import MatchesFilter from '../components/matchfeed/MatchesFilter';
import AgentStats from './AgentStats';
import InstallPWABanner from '../components/InstallPWABanner';
import MultiMatchController from '../components/matchfeed/MultiMatchController';

const AGENT_SESSION_KEY = 'ks_match_feed_agent';
function getStoredAgent() {
  try {return JSON.parse(localStorage.getItem(AGENT_SESSION_KEY) || 'null');} catch {return null;}
}

const STORED_MATCH_KEY = 'ks_agent_match';

function getStoredMatch() {
  try {return JSON.parse(localStorage.getItem(STORED_MATCH_KEY) || 'null');} catch {return null;}
}

export default function MatchFeed() {
  const [code, setCode] = useState('');
  const [match, setMatch] = useState(getStoredMatch);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Agent login
  const [agentSession, setAgentSession] = useState(getStoredAgent);
  const [agentUsername, setAgentUsername] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [agentLoginError, setAgentLoginError] = useState('');
  const [agentLoginLoading, setAgentLoginLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [agentStats, setAgentStats] = useState(null);
  const [nextMatch, setNextMatch] = useState(null);
  const [copiedNext, setCopiedNext] = useState(false);
  const [allMatches, setAllMatches] = useState([]);
  const [showMatches, setShowMatches] = useState(false);
  const [unreadAdminMsgs, setUnreadAdminMsgs] = useState(0);
  const [coverageConfirmation, setCoverageConfirmation] = useState(null); // existing confirmation for nextMatch
  const [showMultiMatch, setShowMultiMatch] = useState(false);
  const [multiMatchExited, setMultiMatchExited] = useState(false);
  const [multiMatchCount, setMultiMatchCount] = useState(0);

  useEffect(() => {
    if (!agentSession) {setAgentStats(null); setNextMatch(null); setAllMatches([]); setUnreadAdminMsgs(0); return;}
    const fetchStats = async () => {
      setAgentStats({
        matches: agentSession.total_matches_covered || 0,
        avgRating: agentSession.average_rating || null
      });
      // Fetch all assigned matches for this agent
      const [assigned, unreadMsgs] = await Promise.all([
        base44.entities.Match.filter({ assigned_agent_id: agentSession.id }, 'date', 50),
        base44.entities.AgentDirectMessage.filter({ agent_id: agentSession.id, sender: 'admin', read_by_agent: false }),
      ]);
      setUnreadAdminMsgs(unreadMsgs.length);
      setAllMatches(assigned);

      // Basic Coverage: agent is taken directly into the simplified panel — no code entry
      if (!getStoredMatch()) {
        const basicMatch = assigned.find(m => m.basic_coverage && (m.status === 'scheduled' || liveStatuses.includes(m.status)));
        if (basicMatch) { localStorage.setItem(STORED_MATCH_KEY, JSON.stringify(basicMatch)); setMatch(basicMatch); return; }
      }

      const upcoming = assigned
        .filter(m => m.status === 'scheduled' || m.status === 'first_half' || m.status === 'half_time' || m.status === 'second_half')
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
      const next = upcoming[0] || null;
      setNextMatch(next);

      // Check for mobile multi-match: agent has 2+ upcoming matches (next 48h or currently live)
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      const liveStatuses = ['first_half','half_time','second_half','awaiting_extra_time',
        'extra_time_first_half','extra_time_half_time','extra_time_second_half','penalties'];
      const multiCandidates = assigned.filter(m =>
        liveStatuses.includes(m.status) ||
        (m.status === 'scheduled' && m.date >= today && m.date <= in48h)
      );
      setMultiMatchCount(multiCandidates.length);
      if (multiCandidates.length >= 2 && !multiMatchExited) {
        setShowMultiMatch(true);
        return;
      }

      // Check coverage confirmation for next match
      if (next) {
        const confs = await base44.entities.MatchCoverageConfirmation.filter({ agent_id: agentSession.id, match_id: next.id });
        setCoverageConfirmation(confs[0] || null);
      } else {
        setCoverageConfirmation(null);
      }
    };
    fetchStats();
    const unsub = base44.entities.AgentDirectMessage.subscribe(() => fetchStats());
    return unsub;
  }, [agentSession?.id]);

  const handleLogin = async () => {
    if (!code || code.length !== 6) {
      setError('Kodi duhet të jetë 6 shifra');
      return;
    }
    setLoading(true);
    setError('');
    const matches = await base44.entities.Match.filter({ match_code: code }, '-date', 1);
    if (matches.length === 0) {
      setError('Kodi nuk është i vlefshëm');
      setLoading(false);
      return;
    }
    const m = matches[0];
    // Block access 24h after full_time
    if (m.status === 'full_time') {
      const updatedAt = m.updated_date ? new Date(m.updated_date).getTime() : 0;
      if (Date.now() - updatedAt > 24 * 60 * 60 * 1000) {
        setError('Kodi nuk është i vlefshëm – ndeshja ka përfunduar');
        setLoading(false);
        return;
      }
    }
    localStorage.setItem(STORED_MATCH_KEY, JSON.stringify(m));
    setMatch(m);
    setLoading(false);
  };

  const handleAgentLogin = async () => {
    if (!agentUsername || !agentPassword) {setAgentLoginError('Plotëso të gjitha fushat');return;}
    setAgentLoginLoading(true);
    setAgentLoginError('');
    const agents = await base44.entities.Agent.filter({ username: agentUsername.trim() });
    const found = agents.find((a) => a.password_plain === agentPassword.trim());
    if (!found) {
      setAgentLoginError('Username ose password gabim');
      setAgentLoginLoading(false);
      return;
    }
    localStorage.setItem(AGENT_SESSION_KEY, JSON.stringify(found));
    setAgentSession(found);
    setAgentLoginLoading(false);
  };

  if (showMultiMatch && agentSession) {
    return <MultiMatchController agentSession={agentSession} onExitMulti={() => {
      setShowMultiMatch(false);
      setMultiMatchExited(true);
    }} />;
  }

  if (showStats && agentSession) {
    return <AgentStats agent={agentSession} onBack={() => setShowStats(false)} />;
  }

  if (showContact) {
    const agentFullName = `${agentSession?.first_name || ''} ${agentSession?.last_name || ''}`.trim();
    return <AgentContact
      matchCode={null}
      agentUsername={agentSession?.username || agentSession?.first_name || ''}
      agentFullName={agentFullName}
      agentId={agentSession?.id}
      onBack={() => { setShowContact(false); setUnreadAdminMsgs(0); }}
    />;
  }

  if (match) {
    const handleLogout = () => { localStorage.removeItem(STORED_MATCH_KEY); setMatch(null); };
    return match.basic_coverage
      ? <BasicCoveragePanel match={match} onLogout={handleLogout} />
      : <MatchFeedPanel match={match} onLogout={handleLogout} />;
  }

  // Login gate
  if (!agentSession) {
    return (
      <div className="bg-slate-50 px-4 min-h-screen flex flex-col items-center justify-center">
        <InstallPWABanner />
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center mb-6">
            <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/0a1b2ee68_FINALNEWLOGO.png" alt="KosovoScores" className="h-20 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-center mb-1">KosovoScores</h1>
          <p className="text-sm font-bold text-primary uppercase tracking-widest text-center mb-6">Match Feed – Kyçu</p>
          <div className="bg-transparent p-6 rounded-2xl border border-border space-y-4">
            <div><Label>Username</Label><Input value={agentUsername} onChange={(e) => setAgentUsername(e.target.value)} placeholder="username" /></div>
            <div><Label>Password</Label><Input type="password" value={agentPassword} onChange={(e) => setAgentPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAgentLogin()} /></div>
            {agentLoginError && <p className="text-xs text-destructive">{agentLoginError}</p>}
            <Button onClick={handleAgentLogin} className="w-full" disabled={agentLoginLoading}>
              {agentLoginLoading ? 'Duke u kyçur...' : 'Kyçu'}
            </Button>
          </div>
        </div>
      </div>);

  }

  const copyNextCode = () => {
    if (!nextMatch?.match_code) return;
    navigator.clipboard.writeText(nextMatch.match_code);
    setCopiedNext(true);
    setTimeout(() => setCopiedNext(false), 2000);
  };

  const goToAgentPortal = () => {
    // Pass session to AgentMatchBrowser via localStorage so no re-login needed
    if (agentSession) {
      localStorage.setItem('ks_agent_portal_session', JSON.stringify(agentSession));
    }
    window.location.href = '/agent-portal';
  };

  const handleCoverageConfirm = async (confirmed) => {
    if (!nextMatch || !agentSession) return;
    const data = {
      agent_id: agentSession.id,
      agent_name: `${agentSession.first_name} ${agentSession.last_name}`,
      match_id: nextMatch.id,
      match_label: `${nextMatch.home_team_name} vs ${nextMatch.away_team_name}`,
      match_date: nextMatch.date,
      match_time: nextMatch.time || '',
      confirmed,
      read_by_admin: false,
    };
    if (coverageConfirmation) {
      await base44.entities.MatchCoverageConfirmation.update(coverageConfirmation.id, { confirmed, read_by_admin: false });
      setCoverageConfirmation({ ...coverageConfirmation, confirmed });
    } else {
      const created = await base44.entities.MatchCoverageConfirmation.create(data);
      setCoverageConfirmation(created);
    }
  };

  // Check if next match is within 24h
  const isWithin24h = nextMatch && (() => {
    const matchDateTime = new Date(`${nextMatch.date}T${nextMatch.time || '23:59'}:00`);
    const diffMs = matchDateTime.getTime() - Date.now();
    return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
  })();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start pt-6 px-4 pb-10">
      <InstallPWABanner />
      <div className="w-full max-w-sm">

        {/* Logo small top */}
        <div className="flex items-center justify-center mb-4">
          <img
            src="https://media.base44.com/images/public/69c340685dca7075d7622e15/0a1b2ee68_FINALNEWLOGO.png"
            alt="KosovoScores"
            className="h-14 object-contain" />
        </div>

        {/* Agent greeting */}
        <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
          Mirësevjen, {agentSession.first_name}!
        </p>

        {/* Multi Match banner — shown when admin assigned multi matches */}
        {multiMatchCount > 0 && (
          <button
            onClick={() => setShowMultiMatch(true)}
            className="w-full mb-4 flex items-center justify-between gap-3 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-2xl px-4 py-3.5 transition-all active:scale-95 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div className="text-left">
                <p className="text-sm font-black">Multi Match Control</p>
                <p className="text-[10px] opacity-80">Kalo ndërmjet {multiMatchCount} ndeshjeve</p>
              </div>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-black">{multiMatchCount} ▶</div>
          </button>
        )}

        {/* Code input box — always visible for single match entry */}
        <div className="mb-5 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 text-center">🔑 Kyçu me Kod Ndeshje</p>
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            placeholder="000000"
            className="text-center text-2xl font-mono tracking-[0.3em] h-14 mb-3"
            maxLength={6}
            inputMode="numeric"
            pattern="[0-9]*"
            type="tel"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {error && <p className="text-xs text-destructive mb-2 text-center">{error}</p>}
          <Button onClick={handleLogin} className="w-full" disabled={loading || code.length !== 6}>
            {loading ? 'Duke u kyçur...' : 'Kyçu në Ndeshje'}
          </Button>
        </div>

        {/* Next match card */}
        {nextMatch ? (
          <div className="mb-5 bg-card border-2 border-primary rounded-2xl p-4 text-left shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 text-center">⚽ Ndeshja e Radhës</p>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {nextMatch.home_team_logo && <img src={nextMatch.home_team_logo} alt="" className="w-8 h-8 object-contain shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{nextMatch.home_team_name} vs {nextMatch.away_team_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {nextMatch.date}{nextMatch.time ? ` • ${nextMatch.time}` : ''}{nextMatch.competition_name ? ` • ${nextMatch.competition_name}` : ''}
                  </p>
                </div>
              </div>
              {nextMatch.away_team_logo && <img src={nextMatch.away_team_logo} alt="" className="w-8 h-8 object-contain shrink-0" />}
            </div>
            {nextMatch.match_code ? (
              <button
                onClick={copyNextCode}
                className="w-full flex items-center justify-center gap-2 font-mono text-base font-black bg-primary text-primary-foreground px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-all active:scale-95"
              >
                🔑 Kodi: {nextMatch.match_code}
                {copiedNext
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                }
              </button>
            ) : (
              <p className="text-xs text-muted-foreground text-center italic">Kodi gjenerohet para fillimit të ndeshjes</p>
            )}

            {/* Coverage confirmation — show 24h before match */}
            {isWithin24h && (
              <div className="mt-3 border-t border-primary/20 pt-3">
                <p className="text-xs font-bold text-center text-primary mb-2">❓ Konfirmo Mbulimin e Ndeshjes</p>
                {coverageConfirmation !== null ? (
                  <div className={`text-center text-xs font-bold rounded-xl px-3 py-2 ${coverageConfirmation.confirmed ? 'bg-green-500/15 text-green-700' : 'bg-red-500/15 text-red-700'}`}>
                    {coverageConfirmation.confirmed ? '✅ Konfirmove: PO — Do ta mbuloj' : '❌ Konfirmove: JO — Nuk do ta mbuloj'}
                    <button onClick={() => setCoverageConfirmation(null)} className="ml-2 underline text-[10px] opacity-70">ndrysho</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCoverageConfirm(true)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl py-2 transition-all active:scale-95"
                    >
                      ✅ PO
                    </button>
                    <button
                      onClick={() => handleCoverageConfirm(false)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl py-2 transition-all active:scale-95"
                    >
                      ❌ JO
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-5 bg-card border border-border rounded-2xl p-4 text-center text-xs text-muted-foreground">
            Nuk ka ndeshje të caktuara së afërmi
          </div>
        )}



        {/* Navigation buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">

          {allMatches.length > 0 && (
            <button
              onClick={() => setShowMatches(!showMatches)}
              className="flex flex-col items-center justify-center gap-2 bg-card border-2 border-primary/20 hover:border-primary/50 rounded-2xl p-4 transition-all active:scale-95 shadow-sm"
            >
              <span className="text-2xl">📋</span>
              <span className="text-xs font-bold text-foreground leading-tight text-center">Ndeshjet e Caktuara</span>
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{allMatches.length}</span>
            </button>
          )}
          <button
            onClick={goToAgentPortal}
            className="flex flex-col items-center justify-center gap-2 bg-card border-2 border-blue-200 hover:border-blue-400 rounded-2xl p-4 transition-all active:scale-95 shadow-sm"
          >
            <span className="text-2xl">✍️</span>
            <span className="text-xs font-bold text-foreground leading-tight text-center">Apliko për Ndeshje</span>
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="flex flex-col items-center justify-center gap-2 bg-card border-2 border-yellow-200 hover:border-yellow-400 rounded-2xl p-4 transition-all active:scale-95 shadow-sm"
          >
            <span className="text-2xl">📊</span>
            <span className="text-xs font-bold text-foreground leading-tight text-center">Statistikat e Mia</span>
          </button>
          <button
            onClick={() => setShowContact(true)}
            className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl p-4 transition-all active:scale-95 shadow-sm border-2 ${
              unreadAdminMsgs > 0
                ? 'bg-red-50 border-red-400 animate-pulse'
                : 'bg-card border-green-200 hover:border-green-400'
            }`}
          >
            <span className="text-2xl">📩</span>
            <span className={`text-xs font-bold leading-tight text-center ${unreadAdminMsgs > 0 ? 'text-red-600' : 'text-foreground'}`}>
              Kontakt me Adminin
            </span>
            {unreadAdminMsgs > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow">
                {unreadAdminMsgs}
              </span>
            )}
          </button>
        </div>

        {/* Matches filter panel */}
        {showMatches && allMatches.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <MatchesFilter
              matches={allMatches}
              onSelectMatch={(m) => {
                localStorage.setItem('ks_agent_match', JSON.stringify(m));
                setMatch(m);
              }}
            />
          </div>
        )}

        {/* Logout */}
        <div className="text-center mt-6">
          <button
            onClick={() => { localStorage.removeItem(AGENT_SESSION_KEY); setAgentSession(null); }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Dil nga llogaria
          </button>
        </div>
      </div>
    </div>);

}