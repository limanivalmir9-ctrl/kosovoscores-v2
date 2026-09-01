import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import GoalsPeriodsChart from './GoalsPeriodsChart';
import WeeklyGoalsChart from './WeeklyGoalsChart';
import RefereeLeaderboard from './RefereeLeaderboard';

const FINISHED = ['full_time', 'official_result'];
const GOAL_TYPES = ['goal', 'own_goal', 'penalty_goal'];
const PERIOD_KEYS = ['1-15', '16-30', '31-45', '1H Shtesë', '46-60', '61-75', '76-90', '2H Shtesë'];

export default function SuperligaStats({ competition, matches }) {
  const [tab, setTab] = useState('periods');
  const [refTab, setRefTab] = useState('yellow');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refTick, setRefTick] = useState(0);

  // Live update when a referee's name/photo is edited in admin
  useEffect(() => {
    const unsub = base44.entities.Referee.subscribe(() => setRefTick(t => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const finished = (matches || []).filter(m => FINISHED.includes(m.status));
      if (!finished.length) { if (!cancelled) { setData(null); setLoading(false); } return; }
      const finishedIds = finished.map(m => m.id);
      const [events, referees] = await Promise.all([
        base44.entities.MatchEvent.filter({ match_id: { $in: finishedIds } }, null, 5000).catch(() => []),
        base44.entities.Referee.filter({}, null, 500).catch(() => []),
      ]);
      if (cancelled) return;

      const refMap = {};
      (referees || []).forEach(r => { if (r.name) refMap[r.name.trim().toLowerCase()] = r; });
      const byMatch = {};
      (events || []).forEach(e => { (byMatch[e.match_id] = byMatch[e.match_id] || []).push(e); });

      // Goals by period
      const periods = {};
      PERIOD_KEYS.forEach(k => periods[k] = 0);
      (events || []).forEach(e => {
        if (!GOAL_TYPES.includes(e.type)) return;
        const m = e.minute || 0;
        const et = e.extra_time_minute || 0;
        if (et > 0) { if (m <= 45) periods['1H Shtesë'] += 1; else periods['2H Shtesë'] += 1; }
        else if (m <= 15) periods['1-15'] += 1;
        else if (m <= 30) periods['16-30'] += 1;
        else if (m <= 45) periods['31-45'] += 1;
        else if (m <= 60) periods['46-60'] += 1;
        else if (m <= 75) periods['61-75'] += 1;
        else if (m <= 90) periods['76-90'] += 1;
      });

      // Total goals per week (from final scores)
      const weekly = {};
      finished.forEach(m => {
        const key = `Java ${m.round || 0}`;
        weekly[key] = (weekly[key] || 0) + (m.home_score || 0) + (m.away_score || 0);
      });
      const weeklyArr = Object.entries(weekly)
        .map(([week, total]) => ({ week, total, n: parseInt(week.replace(/\D/g, ''), 10) || 0 }))
        .sort((a, b) => a.n - b.n);

      // Referee stats — main referee (Kryesor) per finished match
      const refStats = {};
      finished.forEach(m => {
        const refName = m.referee_main;
        if (!refName) return;
        const key = refName.trim().toLowerCase();
        if (!refStats[key]) refStats[key] = { name: refName, photo: refMap[key]?.photo || null, yellow: 0, red: 0, penalties: 0, matches: 0 };
        const rec = refStats[key];
        rec.matches += 1;
        (byMatch[m.id] || []).forEach(e => {
          if (e.type === 'yellow_card') rec.yellow += 1;
          if (e.type === 'second_yellow') { rec.yellow += 1; rec.red += 1; }
          if (e.type === 'red_card') rec.red += 1;
          if (e.type === 'penalty_goal' || e.type === 'missed_penalty') rec.penalties += 1;
        });
      });
      const top = (k) => Object.values(refStats).filter(r => r[k] > 0).sort((a, b) => b[k] - a[k]).slice(0, 5);
      const refereeStats = { yellow: top('yellow'), red: top('red'), penalties: top('penalties') };

      if (!cancelled) { setData({ periods, weekly: weeklyArr, refereeStats }); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [competition.id, matches, refTick]);

  if (loading) return <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!data) return null;

  return (
    <>
      <div className="mt-5">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">Statistika të Superligës</h3>
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
          {[
            { key: 'periods', label: 'Goals Periods' },
            { key: 'weekly', label: 'Weekly Goals' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn('flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-wide transition-all', tab === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          {tab === 'periods' ? <GoalsPeriodsChart data={data.periods} /> : <WeeklyGoalsChart data={data.weekly} />}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">Referee Stats</h3>
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
          {[
            { key: 'yellow', label: 'Most Yellow' },
            { key: 'red', label: 'Most Red' },
            { key: 'penalties', label: 'Most Penalties' },
          ].map(t => (
            <button key={t.key} onClick={() => setRefTab(t.key)} className={cn('flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-wide transition-all', refTab === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
              {t.label}
            </button>
          ))}
        </div>
        <RefereeLeaderboard rows={data.refereeStats[refTab]} valueKey={refTab} />
      </div>
    </>
  );
}