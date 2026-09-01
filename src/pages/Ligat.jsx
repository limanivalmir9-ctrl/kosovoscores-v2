import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronRight, History, Archive } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useSeo } from '@/lib/seo';
import LegalNotice from '@/components/LegalNotice';

const COLOR_HEX_MAP = {
  'blue-500': '#3b82f6', 'yellow-500': '#eab308', 'green-500': '#22c55e',
  'red-500': '#ef4444', 'purple-500': '#a855f7', 'orange-500': '#f97316',
  'pink-500': '#ec4899', 'cyan-500': '#06b6d4', 'blue-300': '#93c5fd',
};

function CompetitionRow({ comp }) {
  const hex = comp.color ? COLOR_HEX_MAP[comp.color] : null;
  const accent = hex || 'hsl(var(--primary))';
  return (
    <Link
      key={comp.id}
      to={`/ligat/${comp.id}`}
      className="group relative flex items-center gap-3 rounded-2xl p-4 bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: accent }} />
      <div className="relative shrink-0 ml-1">
        {comp.logo ? (
          <img src={comp.logo} alt="" className="w-11 h-11 rounded-xl object-cover ring-1 ring-border/60" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <span className="text-primary font-bold text-sm">{comp.name?.[0]}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{comp.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: accent }} />
          {comp.season || '—'}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

export default function Ligat() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(null); // null = sezoni aktual

  useSeo({
    title: 'Ligat & Kompeticionet e Futbollit në Kosovë | KosovoScores',
    description: 'Shiko te gjitha ligat e futbollit ne Kosove - Superliga, Liga e Pare, Liga e Dyte. Tabela, rezultate dhe kalendar ne KosovoScores',
    canonicalPath: '/ligat',
  });

  useEffect(() => {
    const load = async () => {
      const comps = await base44.entities.Competition.list('tier', 100);
      setCompetitions(comps);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const visible = competitions.filter(c => !c.hidden);
  const active = visible.filter(c => !c.archived);
  const archivedSeasons = [...new Set(visible.filter(c => c.archived).map(c => c.season).filter(Boolean))].sort().reverse();

  const viewingArchive = !!selectedSeason;
  const shown = viewingArchive ? visible.filter(c => c.season === selectedSeason) : active;

  const tiers = {};
  shown.forEach(c => { const t = c.tier || 1; if (!tiers[t]) tiers[t] = []; tiers[t].push(c); });
  const sortedTiers = Object.keys(tiers).sort((a, b) => Number(a) - Number(b));

  const dropdownValue = viewingArchive ? selectedSeason : 'active';

  return (
    <div className="py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          {viewingArchive ? <Archive className="w-5 h-5 text-muted-foreground" /> : null}
          {viewingArchive ? `Sezoni ${selectedSeason}` : 'Ligat & Kompeticionet'}
          <span className="sr-only">| KosovoScores</span>
        </h1>
        {archivedSeasons.length > 0 && (
          <div className="w-full sm:w-64">
            <Select value={dropdownValue} onValueChange={(v) => setSelectedSeason(v === 'active' ? null : v)}>
              <SelectTrigger className="w-full bg-card">
                <SelectValue placeholder="Zgjidh sezonin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Sezoni aktual</SelectItem>
                {archivedSeasons.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {viewingArchive && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
          <History className="w-3.5 h-3.5" />
          <span>Po shikon kampionatet e arkivuara të sezonit {selectedSeason}</span>
        </div>
      )}

      {sortedTiers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            {viewingArchive ? `Nuk ka kompeticione për sezonin ${selectedSeason}` : 'Nuk ka kompeticione aktive për këtë sezon'}
          </p>
          {!viewingArchive && archivedSeasons.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">Shiko sezonet e kaluara nga lista më lart</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTiers.map(tier => (
            <div key={tier} className="space-y-2">
              {tiers[tier].map(comp => <CompetitionRow key={comp.id} comp={comp} />)}
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 pb-4 text-center">
        <LegalNotice />
      </div>
    </div>
  );
}