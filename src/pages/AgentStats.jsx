import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { ArrowLeft, Star, TrendingUp, Clock, Award, ChevronDown, ChevronUp } from 'lucide-react';

function StarRating({ value, max = 5 }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn('w-3.5 h-3.5', i < Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30')}
        />
      ))}
    </span>
  );
}

function StatCard({ icon, label, value, sub, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-600',
    yellow: 'bg-yellow-400/10 text-yellow-600',
    purple: 'bg-purple-500/10 text-purple-600',
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1.5">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-1', colorMap[color])}>
        {icon}
      </div>
      <p className="text-2xl font-black text-foreground leading-none">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function AgentStats({ agent, onBack }) {
  const [applications, setApplications] = useState([]);
  const [matchMap, setMatchMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!agent) return;
    const load = async () => {
      setLoading(true);
      const apps = await base44.entities.MatchApplication.filter({ agent_id: agent.id }, '-created_date', 200);
      setApplications(apps);
      // Fetch matches for approved applications to determine finished status & earnings
      const approvedApps = apps.filter(a => a.status === 'approved');
      const matchIds = [...new Set(approvedApps.map(a => a.match_id).filter(Boolean))];
      const matchResults = await Promise.all(matchIds.map(id => base44.entities.Match.filter({ id }).catch(() => [])));
      const mMap = {};
      matchResults.forEach((arr, i) => { if (arr && arr[0]) mMap[matchIds[i]] = arr[0]; });
      setMatchMap(mMap);
      setLoading(false);
    };
    load();
  }, [agent?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalApps = applications.length;
  const approved = applications.filter(a => a.status === 'approved');
  const covered = applications.filter(a => a.is_confirmed_covered);
  const rejected = applications.filter(a => a.status === 'rejected');
  const pending = applications.filter(a => a.status === 'pending');

  const approvalRate = totalApps > 0 ? Math.round((approved.length / totalApps) * 100) : 0;

  const ratedCovered = covered.filter(a => a.rating != null && a.rating > 0);
  const avgRating = ratedCovered.length > 0
    ? (ratedCovered.reduce((s, a) => s + a.rating, 0) / ratedCovered.length).toFixed(1)
    : null;

  // Numërimi i ndeshjeve të përfunduara dhe fitimeve vjen direkt nga entiteti i
  // agjentit (llogaritet automatikisht sapo përfundon një ndeshje — pa pritur
  // vlerësimin e adminit).
  const finishedCount = agent.total_matches_covered || 0;
  const totalEarnings = agent.total_earnings || 0;

  const archivedPayments = agent.archived_payments || [];

  // Rating distribution
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    r,
    count: ratedCovered.filter(a => Math.round(a.rating) === r).length,
  }));
  const maxRatingCount = Math.max(...ratingDist.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="font-bold text-sm">Statistikat e Performancës</p>
          <p className="text-[10px] text-primary-foreground/70">{agent.first_name} {agent.last_name}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Main stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Award className="w-4 h-4" />}
            label="Ndeshje të Përfunduara"
            value={finishedCount}
            color="primary"
          />
          <StatCard
            icon={<Star className="w-4 h-4" />}
            label="Vlerësim Mesatar"
            value={avgRating ? `${avgRating}/5` : '—'}
            sub={ratedCovered.length > 0 ? `nga ${ratedCovered.length} vlerësime` : 'Pa vlerësim ende'}
            color="yellow"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Shkalla e Aprovimit"
            value={`${approvalRate}%`}
            sub={`${approved.length} aprovuar / ${totalApps} aplikime`}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Fitimet Totale"
            value={totalEarnings > 0 ? `€${totalEarnings}` : '—'}
            sub={archivedPayments.length > 0 ? `${archivedPayments.length} pagesa të arkivuara` : undefined}
            color="purple"
          />
        </div>

        {/* Rating distribution */}
        {ratedCovered.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Shpërndarje e Vlerësimeve</p>
            <div className="flex items-center gap-2 mb-3">
              {avgRating && <span className="text-3xl font-black">{avgRating}</span>}
              <div>
                <StarRating value={Number(avgRating)} />
                <p className="text-[10px] text-muted-foreground mt-0.5">{ratedCovered.length} vlerësime gjithsej</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {ratingDist.map(({ r, count }) => (
                <div key={r} className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold w-3 text-right">{r}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxRatingCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Application summary */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Aplikimet e Ndeshjeve</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Gjithsej', value: totalApps, color: 'text-foreground' },
              { label: 'Aprovuar', value: approved.length, color: 'text-green-600' },
              { label: 'Në Pritje', value: pending.length, color: 'text-yellow-600' },
              { label: 'Refuzuar', value: rejected.length, color: 'text-destructive' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-muted/40 rounded-lg py-2.5">
                <p className={cn('text-xl font-black leading-none', color)}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* History of rated matches */}
        {ratedCovered.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Historia e Vlerësimeve ({ratedCovered.length})
              </p>
              {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showHistory && (
              <div className="divide-y divide-border">
                {ratedCovered.map((app) => (
                  <div key={app.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{app.match_label || 'Ndeshje'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {app.match_date}{app.match_time ? ` • ${app.match_time}` : ''}
                        {app.competition_name ? ` • ${app.competition_name}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StarRating value={app.rating} />
                      <p className="text-[10px] font-bold text-yellow-500 mt-0.5">{app.rating}/5</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment history */}
        {archivedPayments.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Historia e Pagesave</p>
            <div className="space-y-2">
              {archivedPayments.slice().reverse().map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-foreground">€{p.amount}</p>
                    <p className="text-[10px] text-muted-foreground">{p.date}{p.matches ? ` • ${p.matches} ndeshje` : ''}</p>
                  </div>
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-semibold">Paguar</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalApps === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold">Pa statistika ende</p>
            <p className="text-xs mt-1">Apliko për ndeshje për të filluar të ndërtosh historikun tënd.</p>
          </div>
        )}
      </div>
    </div>
  );
}