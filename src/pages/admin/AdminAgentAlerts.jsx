import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Clock, UserX, CheckCircle } from 'lucide-react';
import moment from 'moment';

const LIVE_STATUSES = ['first_half', 'half_time', 'second_half', 'extra_time_first_half', 'extra_time_half_time', 'extra_time_second_half', 'penalties'];
const INACTIVE_THRESHOLD_MS = 5 * 60 * 1000;
const UPCOMING_WINDOW_MS = 30 * 60 * 1000;

const STATUS_LABELS = {
  scheduled: 'Planifikuar', first_half: 'Pjesa 1', half_time: 'Pushim',
  second_half: 'Pjesa 2', full_time: 'Përfundoi',
  extra_time_first_half: 'ET Pjesa 1', extra_time_half_time: 'ET Pushim',
  extra_time_second_half: 'ET Pjesa 2', penalties: 'Penaltitë',
};

function AlertCard({ type, match, extra }) {
  const configs = {
    inactive_during_live: {
      icon: Clock,
      color: 'border-red-300 bg-red-50',
      badge: 'bg-red-100 text-red-700',
      label: '🔴 Joaktiv gjatë live',
      desc: () => `Agjenti nuk ka dërguar përditësime prej ${extra.minutesInactive} minutash`,
    },
    agent_not_online_before_match: {
      icon: AlertTriangle,
      color: 'border-yellow-300 bg-yellow-50',
      badge: 'bg-yellow-100 text-yellow-700',
      label: '🟡 Nuk është kyçur',
      desc: () => extra.lastSeenMinsAgo === null
        ? `Ndeshja fillon pas ${extra.minsUntil} min — agjenti nuk është kyçur asnjëherë`
        : `Ndeshja fillon pas ${extra.minsUntil} min — aktiv ${extra.lastSeenMinsAgo} min më parë`,
    },
    no_agent_assigned: {
      icon: UserX,
      color: 'border-gray-300 bg-gray-50',
      badge: 'bg-gray-100 text-gray-600',
      label: '⚪ Pa agjent',
      desc: () => `Ndeshja fillon pas ${extra.minsUntil} min — nuk ka agjent të caktuar`,
    },
  };

  const cfg = configs[type];
  const Icon = cfg.icon;

  return (
    <div className={cn('rounded-xl border p-4 flex items-start gap-3', cfg.color)}>
      <Icon className="w-5 h-5 mt-0.5 shrink-0 text-current opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', cfg.badge)}>{cfg.label}</span>
          <span className="text-xs font-bold truncate">{match.home_team_name} vs {match.away_team_name}</span>
          {match.competition_name && (
            <span className="text-[10px] text-muted-foreground">{match.competition_name}</span>
          )}
        </div>
        <p className="text-xs text-gray-600">{cfg.desc()}</p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          {match.time && <span>🕐 {match.time}</span>}
          <span>📊 {STATUS_LABELS[match.status] || match.status}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminAgentAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [matches, setMatches] = useState([]);

  const computeAlerts = useCallback((allMatches) => {
    const now = Date.now();
    const issues = [];

    const activeMatches = allMatches.filter(m => LIVE_STATUSES.includes(m.status));
    const scheduledMatches = allMatches.filter(m => {
      if (m.status !== 'scheduled') return false;
      if (!m.date || !m.time) return false;
      const matchTs = new Date(`${m.date}T${m.time}:00`).getTime();
      if (isNaN(matchTs)) return false;
      const diff = matchTs - now;
      return diff >= 0 && diff <= UPCOMING_WINDOW_MS;
    });

    for (const m of activeMatches) {
      if (!m.assigned_agent_id) continue;
      const lastSeen = m.agent_last_seen || 0;
      const inactive = now - lastSeen;
      if (inactive > INACTIVE_THRESHOLD_MS) {
        issues.push({ type: 'inactive_during_live', match: m, extra: { minutesInactive: Math.floor(inactive / 60000) } });
      }
    }

    for (const m of scheduledMatches) {
      const matchTs = new Date(`${m.date}T${m.time}:00`).getTime();
      const minsUntil = Math.floor((matchTs - now) / 60000);
      if (!m.assigned_agent_id) {
        issues.push({ type: 'no_agent_assigned', match: m, extra: { minsUntil } });
        continue;
      }
      const lastSeen = m.agent_last_seen || 0;
      const minsSinceLastSeen = Math.floor((now - lastSeen) / 60000);
      if (lastSeen === 0 || minsSinceLastSeen > 20) {
        issues.push({ type: 'agent_not_online_before_match', match: m, extra: { minsUntil, lastSeenMinsAgo: lastSeen === 0 ? null : minsSinceLastSeen } });
      }
    }

    return issues;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const today = moment().format('YYYY-MM-DD');
    const allMatches = await base44.entities.Match.filter({ date: today }, 'time', 100);
    setMatches(allMatches);
    setAlerts(computeAlerts(allMatches));
    setLastChecked(new Date());
    setLoading(false);
  }, [computeAlerts]);

  useEffect(() => {
    loadData();
    // Auto-refresh every 60s
    const interval = setInterval(() => {
      setAlerts(computeAlerts(matches));
      setLastChecked(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Re-subscribe to live match changes
  useEffect(() => {
    const unsub = base44.entities.Match.subscribe(async () => {
      const today = moment().format('YYYY-MM-DD');
      const allMatches = await base44.entities.Match.filter({ date: today }, 'time', 100);
      setMatches(allMatches);
      setAlerts(computeAlerts(allMatches));
      setLastChecked(new Date());
    });
    return unsub;
  }, [computeAlerts]);

  const inactiveAlerts = alerts.filter(a => a.type === 'inactive_during_live');
  const notOnlineAlerts = alerts.filter(a => a.type === 'agent_not_online_before_match');
  const noAgentAlerts = alerts.filter(a => a.type === 'no_agent_assigned');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Alarmet e Agjentëve</h2>
          {lastChecked && (
            <p className="text-[11px] text-muted-foreground">Kontrolluar: {moment(lastChecked).format('HH:mm:ss')}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
          Rifresko
        </Button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className={cn('rounded-xl border p-3 text-center', inactiveAlerts.length > 0 ? 'border-red-200 bg-red-50' : 'border-border bg-card')}>
          <p className={cn('text-2xl font-black', inactiveAlerts.length > 0 ? 'text-red-600' : 'text-muted-foreground')}>{inactiveAlerts.length}</p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Joaktivë Live</p>
        </div>
        <div className={cn('rounded-xl border p-3 text-center', notOnlineAlerts.length > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-border bg-card')}>
          <p className={cn('text-2xl font-black', notOnlineAlerts.length > 0 ? 'text-yellow-600' : 'text-muted-foreground')}>{notOnlineAlerts.length}</p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Jo Online</p>
        </div>
        <div className={cn('rounded-xl border p-3 text-center', noAgentAlerts.length > 0 ? 'border-gray-300 bg-gray-50' : 'border-border bg-card')}>
          <p className={cn('text-2xl font-black', noAgentAlerts.length > 0 ? 'text-gray-600' : 'text-muted-foreground')}>{noAgentAlerts.length}</p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Pa Agjent</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p className="font-bold text-sm">Të gjithë agjentët janë aktiv</p>
          <p className="text-xs text-muted-foreground mt-1">Nuk ka alarme aktive për ndeshjet e sotme</p>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <div className="space-y-3">
          {inactiveAlerts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">🔴 Joaktivë gjatë ndeshjeve live</h3>
              <div className="space-y-2">
                {inactiveAlerts.map((a, i) => <AlertCard key={i} {...a} />)}
              </div>
            </div>
          )}
          {notOnlineAlerts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">🟡 Nuk janë kyçur para ndeshjeve</h3>
              <div className="space-y-2">
                {notOnlineAlerts.map((a, i) => <AlertCard key={i} {...a} />)}
              </div>
            </div>
          )}
          {noAgentAlerts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">⚪ Ndeshje pa agjent</h3>
              <div className="space-y-2">
                {noAgentAlerts.map((a, i) => <AlertCard key={i} {...a} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}