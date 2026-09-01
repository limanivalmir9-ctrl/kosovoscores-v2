import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import MatchCard from '@/components/MatchCard';
import { CalendarDays } from 'lucide-react';
import { useSeo } from '@/lib/seo';

const DAYS_AL = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'];
const MONTHS_AL = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];

const COLOR_MAP = {
  'blue-500': '#3b82f6', 'yellow-500': '#eab308', 'green-500': '#22c55e',
  'red-500': '#ef4444', 'purple-500': '#a855f7', 'orange-500': '#f97316',
  'pink-500': '#ec4899', 'cyan-500': '#06b6d4', 'blue-300': '#93c5fd',
};

export default function Kalendar() {
  const [matches, setMatches] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState('all');

  useSeo({
    title: 'Kalendari i Ndeshjeve | KosovoScores',
    description: 'Kalendari i ndeshjeve te Superliges se Kosoves 2026 - data, ora dhe stadiumet e ndeshjeve te ardhshme te futbollit kosovar.',
    canonicalPath: '/kalendar',
  });

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const future = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
      const [allComps, allMatches] = await Promise.all([
        base44.entities.Competition.list('tier', 50),
        base44.entities.Match.filter({ date: { $gte: today } }, 'date', 1000),
      ]);
      // Keep today's matches even after they start (live/finished) — they only
      // leave when the calendar date rolls over. Future dates show all too.
      const filtered = allMatches.filter(m =>
        m.date >= today && m.date <= future && !m.is_test_match && m.show_in_live !== false
      );
      setCompetitions(allComps);
      setMatches(filtered);
      setLoading(false);
    };
    load();
  }, []);

  // Filter by competition
  const filteredMatches = selectedComp === 'all'
    ? matches
    : matches.filter(m => m.competition_id === selectedComp);

  // Group by date
  const grouped = {};
  filteredMatches.forEach(m => {
    const d = m.date || 'unknown';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(m);
  });
  // Sort matches within each date by time
  Object.values(grouped).forEach(arr =>
    arr.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  );
  const sortedDates = Object.keys(grouped).sort();

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    const dayName = DAYS_AL[d.getDay()];
    const datePart = `${d.getDate()} ${MONTHS_AL[d.getMonth()]}`;
    if (diff === 0) return { label: 'Sot', sub: datePart };
    if (diff === 1) return { label: 'Nesër', sub: datePart };
    return { label: dayName, sub: `${datePart} ${d.getFullYear()}` };
  };

  // Get competitions that have upcoming matches (for filter)
  const compIdsWithMatches = [...new Set(matches.map(m => m.competition_id))];
  const filteredComps = competitions.filter(c => compIdsWithMatches.includes(c.id));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <h1 className="text-lg font-bold mb-4">📅 Kalendari<span className="sr-only"> | KosovoScores</span></h1>

      {/* Competition filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <button
          onClick={() => setSelectedComp('all')}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
            selectedComp === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-primary/50'
          )}
        >
          Të gjitha
        </button>
        {filteredComps.map(c => {
          const hex = COLOR_MAP[c.color] || '#3b82f6';
          const isActive = selectedComp === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedComp(c.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                isActive ? 'text-white border-transparent' : 'bg-card text-muted-foreground border-border'
              )}
              style={isActive ? { backgroundColor: hex, borderColor: hex } : {}}
            >
              {c.logo && <img src={c.logo} alt="" className="w-4 h-4 rounded object-cover" />}
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Date groups */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl">📅</span>
          <p className="text-muted-foreground mt-3 font-medium">Nuk ka ndeshje të planifikuara</p>
          <p className="text-xs text-muted-foreground mt-1">Për 30 ditët e ardhshme</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedDates.map(date => {
            const { label, sub } = formatDate(date);
            const dayMatches = grouped[date];

            // Group by competition within the day
            const byComp = {};
            dayMatches.forEach(m => {
              const cid = m.competition_id || 'unknown';
              if (!byComp[cid]) byComp[cid] = [];
              byComp[cid].push(m);
            });
            const compGroups = Object.entries(byComp).sort((a, b) => {
              const ca = competitions.find(c => c.id === a[0]);
              const cb = competitions.find(c => c.id === b[0]);
              return (ca?.tier || 99) - (cb?.tier || 99);
            });

            return (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary/85 text-white rounded-full px-3.5 py-1.5 shadow-sm">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-black leading-none">{label}</span>
                    <span className="text-[10px] opacity-60">·</span>
                    <span className="text-[10px] font-semibold opacity-90 leading-none">{sub}</span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground">{dayMatches.length} ndeshje</span>
                </div>

                {/* Competition groups within the day */}
                <div className="space-y-2">
                  {compGroups.map(([cid, compMatches]) => {
                    const comp = competitions.find(c => c.id === cid);
                    const hex = COLOR_MAP[comp?.color] || '#3b82f6';
                    return (
                      <div key={cid} className="rounded-xl overflow-hidden" style={{ borderLeft: `3px solid ${hex}`, backgroundColor: hex + '12' }}>
                        {/* Comp header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5">
                          {comp?.logo && <img src={comp.logo} alt="" className="w-4 h-4 rounded object-cover" />}
                          <span className="text-[11px] font-bold uppercase tracking-wide text-foreground flex-1">
                            {comp?.name || 'Kompeticion'}
                          </span>
                          <span className="text-[9px] text-muted-foreground">{comp?.season || ''}</span>
                        </div>
                        {/* Matches */}
                        <div className="px-2 py-1.5 space-y-1.5">
                          {compMatches.map(m => <MatchCard key={m.id} match={m} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}