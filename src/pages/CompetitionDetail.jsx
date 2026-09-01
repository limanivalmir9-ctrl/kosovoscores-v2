import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import MatchCard from '../components/MatchCard';
import StandingsTable from '../components/StandingsTable';
import CompetitionStats from '../components/CompetitionStats';
import CompetitionTopStats from '../components/CompetitionTopStats';
import SuperligaStats from '../components/superliga/SuperligaStats';
import { useSeo } from '@/lib/seo';
import Breadcrumbs from '@/components/Breadcrumbs';

// Compute live standings by overlaying active match results on stored standings
function computeLiveStandings(standings, liveMatches) {
  if (!liveMatches.length) return standings;
  const live = standings.map(s => ({ ...s }));
  const LIVE_STATUSES = ['first_half','second_half','half_time','extra_time_first_half','extra_time_second_half','extra_time_half_time','awaiting_extra_time','penalties'];
  for (const m of liveMatches) {
    if (!LIVE_STATUSES.includes(m.status)) continue;
    const home = live.find(s => s.club_id === m.home_team_id);
    const away = live.find(s => s.club_id === m.away_team_id);
    const hs = m.home_score || 0;
    const as2 = m.away_score || 0;
    if (home) {
      home.played = (home.played || 0) + 1;
      home.goals_for = (home.goals_for || 0) + hs;
      home.goals_against = (home.goals_against || 0) + as2;
      home.goal_difference = home.goals_for - home.goals_against;
      if (hs > as2) home.points = (home.points || 0) + 3;
      else if (hs === as2) home.points = (home.points || 0) + 1;
    }
    if (away) {
      away.played = (away.played || 0) + 1;
      away.goals_for = (away.goals_for || 0) + as2;
      away.goals_against = (away.goals_against || 0) + hs;
      away.goal_difference = away.goals_for - away.goals_against;
      if (as2 > hs) away.points = (away.points || 0) + 3;
      else if (hs === as2) away.points = (away.points || 0) + 1;
    }
  }
  return live.sort((a, b) => (b.points || 0) - (a.points || 0) || (b.goal_difference || 0) - (a.goal_difference || 0))
    .map((s, i) => ({ ...s, position: i + 1 }));
}

export default function CompetitionDetail() {
  const compId = window.location.pathname.split('/ligat/')[1];
  const urlTab = new URLSearchParams(window.location.search).get('tab');
  const [competition, setCompetition] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(urlTab || 'standings');
  const inactiveRef = useRef(new Set());

  const seasonLabel = competition?.season ? ` ${competition.season}` : '';
  useSeo({
    title: competition ? `${competition.name}${seasonLabel} – Rezultate, Tabela dhe Ndeshje | KosovoScores` : 'Ligat & Kompeticionet e Kosovës | KosovoScores',
    description: competition
      ? `Shiko rezultatet LIVE, tabelën, ndeshjet, golashënuesit dhe statistikat e ${competition.name}${seasonLabel} në KosovoScores.`
      : 'Rezultate, tabela dhe ndeshje nga kompeticionet e futbollit në Kosovë.',
    canonicalPath: `/ligat/${compId}`,
  });

  const switchTab = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  };

  useEffect(() => {
    const load = async () => {
      if (!compId) return;
      const [comps, allMatches, allStandings, compClubs] = await Promise.all([
        base44.entities.Competition.filter({ id: compId }),
        base44.entities.Match.filter({ competition_id: compId }, 'round', 1000),
        base44.entities.Standing.filter({ competition_id: compId }, 'position', 50),
        base44.entities.Club.filter({ competition_id: compId }, '-created_date', 100),
      ]);
      setCompetition(comps[0] || null);
      inactiveRef.current = new Set(compClubs.filter(c => c.active === false).map(c => c.id));
      const inactive = inactiveRef.current;
      setMatches(allMatches.filter(m => !inactive.has(m.home_team_id) && !inactive.has(m.away_team_id)));
      setStandings(allStandings.filter(s => !inactive.has(s.club_id)));
      const LIVE_S = ['first_half','second_half','half_time','extra_time_first_half','extra_time_second_half','extra_time_half_time','awaiting_extra_time','penalties'];
      setLiveMatches(allMatches.filter(m => LIVE_S.includes(m.status) && !inactive.has(m.home_team_id) && !inactive.has(m.away_team_id)));
      setLoading(false);
    };
    load();
    const unsub = base44.entities.Match.subscribe(async () => {
      const updated = await base44.entities.Match.filter({ competition_id: compId }, 'round', 1000);
      const inactive = inactiveRef.current;
      const filtered = updated.filter(m => !inactive.has(m.home_team_id) && !inactive.has(m.away_team_id));
      setMatches(filtered);
      setLiveMatches(filtered.filter(m => ['first_half','second_half','half_time','extra_time_first_half','extra_time_second_half','extra_time_half_time','awaiting_extra_time','penalties'].includes(m.status)));
    });
    return unsub;
  }, [compId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Kompeticion nuk u gjet</p>
      </div>
    );
  }

  // Group matches by phase_text (cup) or round
  const roundGroups = {};
  matches.forEach(m => {
    const key = m.phase_text ? `ph_${m.phase_text}` : String(m.round || 0);
    if (!roundGroups[key]) roundGroups[key] = { label: m.phase_text || `Java ${m.round || '?'}`, items: [], phase_order: null };
    roundGroups[key].items.push(m);
    // Take the first non-null phase_order found for this group
    if (roundGroups[key].phase_order === null && m.phase_order != null) {
      roundGroups[key].phase_order = m.phase_order;
    }
  });
  // Sort matches within each group by date
  Object.values(roundGroups).forEach(g => {
    g.items.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
  });

  const sortedRounds = Object.keys(roundGroups).sort((a, b) => {
    const aIsPhase = a.startsWith('ph_');
    const bIsPhase = b.startsWith('ph_');
    if (aIsPhase && bIsPhase) {
      const aOrder = roundGroups[a].phase_order;
      const bOrder = roundGroups[b].phase_order;
      if (aOrder != null && bOrder != null) return bOrder - aOrder;
      if (aOrder != null) return -1;
      if (bOrder != null) return 1;
      const TEXT_ORDER = ['gjysëmfinale 2', 'gjysemfinale 2', 'gjysëmfinale 1', 'gjysemfinale 1', 'çerekfinale', 'cerekfinale', '1/8', '1/16'];
      const aLabel = roundGroups[a].label.toLowerCase();
      const bLabel = roundGroups[b].label.toLowerCase();
      const aIdx = TEXT_ORDER.findIndex(p => aLabel.includes(p));
      const bIdx = TEXT_ORDER.findIndex(p => bLabel.includes(p));
      const aRank = aIdx === -1 ? 99 : aIdx;
      const bRank = bIdx === -1 ? 99 : bIdx;
      return aRank - bRank;
    }
    if (aIsPhase) return -1;
    if (bIsPhase) return 1;
    return Number(b) - Number(a);
  });

  return (
    <div className="py-4">
      <Breadcrumbs items={[{ label: 'Ligat', to: '/ligat' }, { label: competition.name }]} />
      <div className="flex items-center gap-3 mb-4">
        {competition.logo ? (
          <img src={competition.logo} alt={`${competition.name} logo`} className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold">{competition.name?.[0]}</span>
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold">{competition.name}<span className="sr-only"> | KosovoScores</span></h1>
          <p className="text-xs text-muted-foreground">{competition.season}</p>
        </div>
      </div>

      {/* Tabs */}
      {(() => {
        const nameLower = competition.name?.toLowerCase() || '';
        const isCup = nameLower.includes('kup');
        const isFriendly = nameLower.includes('miqesore') || nameLower.includes('miqësore') || nameLower.includes('friendly');
        const tabs = (isCup || isFriendly) ? ['matches'] : ['standings', 'matches'];
        if (!tabs.includes(activeTab)) { switchTab(tabs[0]); }
        return (
          <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={cn(
                  'flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all',
                  activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                )}
              >
                {tab === 'standings' ? 'Tabela' : 'Ndeshjet'}
              </button>
            ))}
          </div>
        );
      })()}

      {activeTab === 'standings' && (() => {
        const nameLower2 = competition.name?.toLowerCase() || '';
        const isCup = nameLower2.includes('kup');
        const isFriendly2 = nameLower2.includes('miqesore') || nameLower2.includes('miqësore') || nameLower2.includes('friendly');
        if (isCup || isFriendly2) return <p className="text-sm text-muted-foreground text-center py-8">Tabela nuk është e disponueshme për këtë kompeticion</p>;
        const displayStandings = computeLiveStandings(standings, liveMatches);
        const hasLive = liveMatches.length > 0;
        return (
          <>
            {hasLive && <div className="mb-2 text-[10px] font-bold text-live text-center uppercase tracking-wide">⚡ Tabela Live – Duke u përditësuar në kohë reale</div>}
            <StandingsTable standings={displayStandings} competition={competition} />
            <CompetitionStats competition={competition} matches={matches} standings={displayStandings} />
            {/ALBI MALL SUPERLIGA/i.test(competition.name || '') && (
              <>
                <CompetitionTopStats competition={competition} matches={matches} />
                <SuperligaStats competition={competition} matches={matches} />
              </>
            )}
          </>
        );
      })()}

      {activeTab === 'matches' && (
        <div className="space-y-4">
          {sortedRounds.map(rkey => (
            <div key={rkey}>
              <div className="relative flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
                <div className="flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
                  <span className="text-[11px] font-bold text-foreground/70 tracking-wide uppercase">{roundGroups[rkey].label}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
              </div>
              <div className="space-y-2">
                {roundGroups[rkey].items.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
          {sortedRounds.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Nuk ka ndeshje ende</p>
          )}
        </div>
      )}
    </div>
  );
}