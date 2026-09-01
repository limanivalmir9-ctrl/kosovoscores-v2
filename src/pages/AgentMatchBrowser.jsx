import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Copy, Check, Trash2, BarChart2, Camera, Loader2 } from 'lucide-react';
import AgentStats from './AgentStats';
import AgentInstallBanner from '@/components/agent/AgentInstallBanner';

function getStoredAgent() {
  try {
    // First check sessionStorage, then fall back to MatchFeed SSO token in localStorage
    const fromSession = JSON.parse(sessionStorage.getItem('ks_agent_session') || 'null');
    if (fromSession) return fromSession;
    const fromMatchFeed = JSON.parse(localStorage.getItem('ks_agent_portal_session') || 'null');
    if (fromMatchFeed) {
      // Promote to sessionStorage and clear the SSO token
      sessionStorage.setItem('ks_agent_session', JSON.stringify(fromMatchFeed));
      localStorage.removeItem('ks_agent_portal_session');
      return fromMatchFeed;
    }
    return null;
  } catch { return null; }
}

export default function AgentMatchBrowser() {
  const [agent, setAgent] = useState(getStoredAgent);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [matches, setMatches] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null); // match_id being uploaded
  const [todayMatches, setTodayMatches] = useState([]);

  // Futje direkte në match control (MatchFeed) për ndeshjen e konfirmuar sot
  const enterMatchControl = (match) => {
    localStorage.setItem('ks_agent_match', JSON.stringify(match));
    localStorage.setItem('ks_match_feed_agent', JSON.stringify(agent));
    window.location.href = '/ks-agentA26A02';
  };

  const copyCode = (code, matchId) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(matchId);
    toast.success('Kodi u kopjua!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleLogin = async () => {
    if (!username || !password) { setLoginError('Plotëso të gjitha fushat'); return; }
    setLoginLoading(true);
    setLoginError('');
    const agents = await base44.entities.Agent.filter({ username: username.trim() });
    const found = agents.find(a => a.password_plain === password.trim());
    if (!found) {
      setLoginError('Username ose password gabim');
      setLoginLoading(false);
      return;
    }
    sessionStorage.setItem('ks_agent_session', JSON.stringify(found));
    setAgent(found);
    setLoginLoading(false);
  };

  const loadData = async () => {
    if (!agent) return;
    setLoading(true);
    const [scheduledMatches, allApps, assigned] = await Promise.all([
      base44.entities.Match.filter({ status: 'scheduled' }, 'date', 300),
      base44.entities.MatchApplication.list('-created_date', 500),
      base44.entities.Match.filter({ assigned_agent_id: agent.id }, 'date', 100),
    ]);
    const myApps = allApps.filter(a => a.agent_id === agent.id);
    const myApprovedIds = myApps.filter(a => a.status === 'approved').map(a => a.match_id);
    const approvedByOthers = allApps
      .filter(a => a.status === 'approved' && a.agent_id !== agent.id)
      .map(a => a.match_id);
    const filtered = scheduledMatches.filter(m => {
      if (m.is_test_match) return false;
      if (myApprovedIds.includes(m.id)) return true;
      if (approvedByOthers.includes(m.id)) return false;
      return true;
    });
    setMatches(filtered);
    setApplications(myApps);
    const today = new Date().toISOString().split('T')[0];
    setTodayMatches(assigned.filter(m => m.date === today));
    setLoading(false);
  };

  useEffect(() => {
    if (!agent) return;
    loadData();
    const unsub = base44.entities.MatchApplication.subscribe(() => loadData());
    return unsub;
  }, [agent?.id]);

  const handleApply = async (match) => {
    const exists = applications.find(a => a.match_id === match.id);
    if (exists) { toast.error('Ke aplikuar tashmë'); return; }
    await base44.entities.MatchApplication.create({
      match_id: match.id,
      agent_id: agent.id,
      agent_name: `${agent.first_name} ${agent.last_name}`,
      match_label: `${match.home_team_name} vs ${match.away_team_name}`,
      match_date: match.date,
      match_time: match.time || '',
      competition_name: match.competition_name || '',
      status: 'pending',
    });
    toast.success('Aplikimi u dërgua!');
    loadData();
  };

  const handleCancel = async (appId) => {
    await base44.entities.MatchApplication.delete(appId);
    toast.success('Aplikimi u anulua');
    loadData();
  };

  const handleUploadProof = async (app, file) => {
    if (!file) return;
    setUploadingPhoto(app.match_id);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.MatchApplication.update(app.id, { proof_photo: file_url });
    toast.success('Foto u ngarkua me sukses!');
    setUploadingPhoto(null);
    loadData();
  };

  const logout = () => {
    sessionStorage.removeItem('ks_agent_session');
    setAgent(null);
  };

  const handleDeleteAccount = async () => {
    // Delete all applications for this agent then delete the agent record
    const apps = await base44.entities.MatchApplication.filter({ agent_id: agent.id });
    await Promise.all(apps.map(a => base44.entities.MatchApplication.delete(a.id)));
    await base44.entities.Agent.delete(agent.id);
    sessionStorage.removeItem('ks_agent_session');
    setAgent(null);
    setShowDeleteConfirm(false);
    toast.success('Llogaria u fshi me sukses');
  };

  if (showStats) {
    return <AgentStats agent={agent} onBack={() => setShowStats(false)} />;
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary to-slate-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute -top-24 -left-20 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
        <div className="relative w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 mb-3 shadow-lg">
              <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/0a1b2ee68_FINALNEWLOGO.png" alt="KosovoScores" className="h-10 object-contain" />
            </div>
            <p className="text-[11px] text-white/60 font-bold uppercase tracking-[0.3em]">Portal Agjentëve</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 space-y-4 shadow-2xl">
            <div>
              <Label className="text-white/80">Username</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30" />
            </div>
            <div>
              <Label className="text-white/80">Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30" />
            </div>
            {loginError && <p className="text-xs text-red-200 bg-red-500/20 px-3 py-2 rounded-lg">{loginError}</p>}
            <Button onClick={handleLogin} className="w-full h-11 text-sm font-bold shadow-lg" disabled={loginLoading}>
              {loginLoading ? 'Duke u kyçur...' : 'Kyçu'}
            </Button>
          </div>
          <p className="text-center text-[10px] text-white/40 mt-4">KosovoScores · Portal i Agjentëve</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* App Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-primary text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              title="Kthehu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center font-black text-sm shrink-0">
              {agent.first_name?.[0]}{agent.last_name?.[0]}
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{agent.first_name} {agent.last_name}</p>
              <p className="text-[10px] text-white/60">Portal Agjentëve</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowStats(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Statistikat">
              <BarChart2 className="w-5 h-5 text-white/80" />
            </button>
            <button onClick={logout} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-xs font-semibold text-white/80" title="Dil">
              Dil
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <AgentInstallBanner />

        {/* Ndeshjet e tua sot — konfirmuar, futje direkte në match control */}
        {todayMatches.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">Ndeshjet e tua sot</p>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{todayMatches.length}</span>
            </div>
            {todayMatches.map(match => (
              <button key={match.id} onClick={() => enterMatchControl(match)}
                className="w-full flex items-center gap-3 bg-white rounded-2xl border-2 border-primary/40 p-4 shadow-sm hover:shadow-md hover:border-primary transition-all text-left active:scale-[0.99]">
                {match.home_team_logo && <img src={match.home_team_logo} alt="" className="w-8 h-8 object-contain shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{match.home_team_name} vs {match.away_team_name}</p>
                  <p className="text-[10px] text-muted-foreground">{match.time || '--:--'}{match.competition_name ? ` • ${match.competition_name}` : ''}</p>
                </div>
                {match.away_team_logo && <img src={match.away_team_logo} alt="" className="w-8 h-8 object-contain shrink-0" />}
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg shrink-0">Futu ▶</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">Ndeshjet e planifikuara</p>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{matches.length}</span>
            </div>
            {matches.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-border">
                <p className="text-muted-foreground font-medium">Nuk ka ndeshje të planifikuara</p>
                <p className="text-xs text-muted-foreground mt-1">Kthehu më vonë ose kontakto administratorin</p>
              </div>
            )}
            {matches.map(match => {
              const app = applications.find(a => a.match_id === match.id);
              return (
                <div key={match.id} className={cn('bg-white rounded-2xl border p-4 shadow-sm', app?.status === 'approved' ? 'border-green-500/40 bg-green-500/5' : 'border-border')}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {match.home_team_logo && <img src={match.home_team_logo} alt="" className="w-7 h-7 object-contain" />}
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{match.home_team_name} vs {match.away_team_name}</p>
                        <p className="text-[10px] text-muted-foreground">{match.date}{match.time ? ` • ${match.time}` : ''}{match.competition_name ? ` • ${match.competition_name}` : ''}</p>
                      </div>
                    </div>
                    {match.away_team_logo && <img src={match.away_team_logo} alt="" className="w-7 h-7 object-contain flex-shrink-0" />}
                  </div>
                  <div className="mt-3">
                    {app?.status === 'approved' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-green-600 bg-green-500/10 px-3 py-1 rounded-full">✓ E KONFIRMUAR</span>
                          {match.match_code && (
                            <button
                              onClick={() => copyCode(match.match_code, match.id)}
                              className="flex items-center gap-1 font-mono text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-lg hover:bg-primary/20 transition-all active:scale-95"
                            >
                              {match.match_code}
                              {copiedCode === match.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        {/* Proof photo upload */}
                        {app.proof_photo ? (
                          <div className="flex items-center gap-2">
                            <img src={app.proof_photo} alt="Dëshmi" className="w-12 h-12 rounded-lg object-cover border border-green-300" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-green-600 font-semibold">📸 Foto dëshmi e ngarkuar</p>
                              <label className="text-[10px] text-primary underline cursor-pointer">
                                Ndrysho foton
                                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUploadProof(app, e.target.files[0])} />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <label className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50 transition-colors',
                            uploadingPhoto === match.id && 'opacity-60 pointer-events-none'
                          )}>
                            {uploadingPhoto === match.id
                              ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              : <Camera className="w-4 h-4 text-muted-foreground" />}
                            <span className="text-xs text-muted-foreground font-medium">
                              {uploadingPhoto === match.id ? 'Duke ngarkuar...' : 'Ngarko foto dëshmi të ndeshjes'}
                            </span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUploadProof(app, e.target.files[0])} />
                          </label>
                        )}
                      </div>
                    ) : app?.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-yellow-600 bg-yellow-500/10 px-3 py-1 rounded-full">⏳ Në pritje të aprovimit</span>
                        <Button size="sm" variant="outline" onClick={() => handleCancel(app.id)} className="text-xs h-7">Anulo</Button>
                      </div>
                    ) : app?.status === 'rejected' ? (
                      <span className="text-xs text-destructive bg-destructive/10 px-3 py-1 rounded-full">✗ Refuzuar</span>
                    ) : (
                      <Button size="sm" onClick={() => handleApply(match)} className="text-xs">
                        Apliko
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Delete Account */}
            <div className="mt-8 pt-6 border-t border-border">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-xs text-destructive/70 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Fshi Llogarinë
                </button>
              ) : (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-destructive">A jeni i sigurt?</p>
                  <p className="text-xs text-muted-foreground">Ky veprim do të fshijë llogarinë tuaj dhe të gjitha aplikimet përgjithmonë. Ky veprim nuk mund të kthehet.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={handleDeleteAccount} className="text-xs">
                      Po, fshi llogarinë
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)} className="text-xs">
                      Anulo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}