import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const STATUS_LABELS = {
  scheduled: '📅 Planifikuar',
  first_half: '⚽ Në Lojë (1ë)',
  half_time: '⏸ Pushim',
  second_half: '⚽ Në Lojë (2ë)',
  full_time: '✅ Përfunduar',
  cancelled: '❌ Anuluar',
  interrupted: '⚠ Ndërprerë',
};

export default function MatchesFilter({ matches, onSelectMatch }) {
  const [expandedCompetition, setExpandedCompetition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-asc');

  // Group and filter
  const grouped = useMemo(() => {
    let filtered = matches;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => m.status === filterStatus);
    }

    // Filter by search (team names)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        (m.home_team_name || '').toLowerCase().includes(q) ||
        (m.away_team_name || '').toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...filtered];
    if (sortBy === 'date-asc') {
      sorted.sort((a, b) => {
        const cmp = (a.date || '').localeCompare(b.date || '');
        if (cmp !== 0) return cmp;
        return (a.time || '').localeCompare(b.time || '');
      });
    } else if (sortBy === 'date-desc') {
      sorted.sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.time || '').localeCompare(a.time || '');
      });
    } else if (sortBy === 'competition') {
      sorted.sort((a, b) => (a.competition_name || '').localeCompare(b.competition_name || ''));
    }

    // Group by competition
    const map = {};
    sorted.forEach(m => {
      const comp = m.competition_name || 'E paspecifikuar';
      if (!map[comp]) map[comp] = [];
      map[comp].push(m);
    });
    return map;
  }, [matches, filterStatus, searchQuery, sortBy]);

  const competitionNames = Object.keys(grouped).sort();
  const activeCount = competitionNames.reduce((sum, comp) => sum + grouped[comp].length, 0);

  const renderMatch = (m) => {
    const statusLabel = STATUS_LABELS[m.status] || m.status;
    const isLive = ['first_half', 'half_time', 'second_half'].includes(m.status);
    const isCompleted = ['full_time', 'cancelled'].includes(m.status);

    return (
      <button
        key={m.id}
        onClick={() => onSelectMatch(m)}
        className={cn(
          'w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted active:bg-muted/60',
          isLive ? 'border-live/30 bg-live/5' : isCompleted ? 'border-border opacity-70' : 'border-border'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {m.home_team_logo && (
              <img src={m.home_team_logo} alt="" className="w-6 h-6 object-contain shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">
                {m.home_team_name || 'Vendas'} vs {m.away_team_name || 'Mysafir'}
              </p>
            </div>
            {m.away_team_logo && (
              <img src={m.away_team_logo} alt="" className="w-6 h-6 object-contain shrink-0" />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {m.date}
            {m.time ? ` • ${m.time}` : ''}
          </span>
          <span
            className={cn(
              'font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
              isLive ? 'bg-live/20 text-live' : 'bg-muted text-muted-foreground'
            )}
          >
            {statusLabel}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="w-full max-w-sm space-y-3">
      {/* Search */}
      <Input
        placeholder="Kërko ekipin..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="text-sm"
      />

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Të gjitha statuset</SelectItem>
            <SelectItem value="scheduled">Planifikuar</SelectItem>
            <SelectItem value="first_half">Në Lojë (1ë)</SelectItem>
            <SelectItem value="second_half">Në Lojë (2ë)</SelectItem>
            <SelectItem value="full_time">Përfunduar</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-asc">Data (e vjetra → e reja)</SelectItem>
            <SelectItem value="date-desc">Data (e reja → e vjetra)</SelectItem>
            <SelectItem value="competition">Kampionati</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Matches list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {competitionNames.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nuk ka ndeshje të caktuara
          </div>
        ) : (
          competitionNames.map((comp) => (
            <div key={comp} className="border border-border rounded-lg overflow-hidden">
              {/* Competition header */}
              <button
                onClick={() =>
                  setExpandedCompetition(expandedCompetition === comp ? null : comp)
                }
                className="w-full flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/60 transition-colors font-semibold text-sm text-foreground"
              >
                <span>{comp}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {grouped[comp].length}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform',
                      expandedCompetition === comp && 'rotate-180'
                    )}
                  />
                </span>
              </button>

              {/* Matches */}
              {expandedCompetition === comp && (
                <div className="p-2 space-y-1 bg-background/50">
                  {grouped[comp].map((m) => renderMatch(m))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {activeCount > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {activeCount} ndeshje {searchQuery || filterStatus !== 'all' ? 'e filtruar' : 'e caktuara'}
        </p>
      )}
    </div>
  );
}