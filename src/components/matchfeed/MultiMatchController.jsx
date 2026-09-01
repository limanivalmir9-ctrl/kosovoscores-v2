import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import MatchFeedPanel from './MatchFeedPanel';
import BasicCoveragePanel from './BasicCoveragePanel';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

const LIVE_STATUSES = ['first_half', 'half_time', 'second_half', 'awaiting_extra_time',
  'extra_time_first_half', 'extra_time_half_time', 'extra_time_second_half', 'penalties'];

function statusBadge(m) {
  if (LIVE_STATUSES.includes(m.status)) return { label: `${m.home_score ?? 0}-${m.away_score ?? 0}`, cls: 'bg-red-100 text-red-700', live: true };
  if (['full_time', 'official_result'].includes(m.status)) return { label: 'FT', cls: 'bg-muted text-muted-foreground' };
  return { label: 'Plan.', cls: 'bg-muted text-muted-foreground' };
}

export default function MultiMatchController({ agentSession, onExitMulti }) {
  const [matches, setMatches] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
      const assigned = await base44.entities.Match.filter({ assigned_agent_id: agentSession.id }, 'time', 50);
      const relevant = assigned
        .filter(m => LIVE_STATUSES.includes(m.status) || (m.status === 'scheduled' && m.date >= today && m.date <= in48h))
        // Sort by date then time — earliest match first
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
      setMatches(relevant);
      setLoading(false);
    };
    load();
  }, [agentSession.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl">📅</div>
        <p className="text-base font-bold text-center">Nuk ka ndeshje sot</p>
        <p className="text-xs text-muted-foreground text-center">Ndeshjet do shfaqen kur admini t'i caktojë për sot</p>
        <button onClick={onExitMulti} className="mt-2 text-xs text-primary underline">← Kthehu</button>
      </div>
    );
  }

  // Single match → go straight to its panel
  if (matches.length === 1) {
    const m = matches[0];
    return m.basic_coverage
      ? <BasicCoveragePanel match={m} onLogout={onExitMulti} />
      : <MatchFeedPanel match={m} onLogout={onExitMulti} />;
  }

  // List-first selection screen (sorted by date & time)
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-slate-50 pb-10">
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2 sticky top-0 z-10">
          <button onClick={onExitMulti} className="p-1 rounded hover:bg-white/15 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="font-bold text-sm">Ndeshjet e mia ({matches.length})</p>
        </div>
        <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
          <p className="text-[11px] text-muted-foreground text-center mb-1">
            Renditura sipas dates & orës — zgjidh ndeshjen që do ta mbulosh
          </p>
          {matches.map((m, idx) => {
            const badge = statusBadge(m);
            return (
              <button
                key={m.id}
                onClick={() => { setActiveIndex(idx); setView('panel'); }}
                className="w-full bg-card rounded-2xl border border-border p-4 text-left hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {m.home_team_logo
                      ? <img src={m.home_team_logo} alt="" className="w-10 h-10 object-contain shrink-0" />
                      : <div className="w-10 h-10 rounded-full bg-muted shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">
                        {m.home_team_name} <span className="text-muted-foreground font-normal">vs</span> {m.away_team_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-2.5 mt-1">
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{m.date}</span>
                        {m.time && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{m.time}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {m.away_team_logo
                      ? <img src={m.away_team_logo} alt="" className="w-10 h-10 object-contain" />
                      : <div className="w-10 h-10 rounded-full bg-muted" />}
                    <span className={`text-[9px] font-bold rounded px-1.5 py-0.5 ${badge.cls} ${badge.live ? 'animate-pulse' : ''}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
                {m.competition_name && (
                  <p className="text-[9px] text-muted-foreground mt-2 truncate border-t border-border/50 pt-2">{m.competition_name}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Panel view — "Dil" returns to the list
  const activeMatch = matches[activeIndex];
  return activeMatch.basic_coverage
    ? <BasicCoveragePanel match={activeMatch} onLogout={() => setView('list')} />
    : <MatchFeedPanel match={activeMatch} onLogout={() => setView('list')} />;
}