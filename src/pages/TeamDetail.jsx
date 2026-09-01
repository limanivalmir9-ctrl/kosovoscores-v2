import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ArrowLeft, Shield, Users, Calendar, Camera } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import TrophySection from '@/components/TrophySection';
import { useSeo, schema } from '@/lib/seo';
import Breadcrumbs from '@/components/Breadcrumbs';

const POSITION_FLAGS = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
import MatchCard from '../components/MatchCard';
import { countryInfo } from '@/lib/countries';
import Flag from '@/components/Flag';
import InjuredBadge from '@/components/InjuredBadge';
import moment from 'moment';

const POSITION_ORDER = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
const POSITION_LABELS = { Goalkeeper: 'Portierë', Defender: 'Mbrojtës', Midfielder: 'Mesfushë', Forward: 'Sulmues' };

export default function TeamDetail() {
  const navigate = useNavigate();
  const clubId = window.location.pathname.split('/team/')[1];
  const [club, setClub] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standing, setStanding] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    try { return sessionStorage.getItem(`team-tab-${clubId}`) || 'profile'; } catch { return 'profile'; }
  });
  const [stadiumPhoto, setStadiumPhoto] = useState(null);
  const [trophies, setTrophies] = useState([]);

  useSeo({
    title: club ? `${club.name} – Rezultate, Ndeshje dhe Statistika | KosovoScores` : 'Skuadra | KosovoScores',
    description: club
      ? `Profili, skuadra, ndeshjet, rezultatet dhe statistikat e ${club.name}${competition ? ` në ${competition.name}` : ''} në KosovoScores. Shiko pozitën në ligë, golashënuesit dhe formacionet.`
      : 'Profili i skuadrës së futbollit në Kosovë në KosovoScores.',
    canonicalPath: `/team/${clubId}`,
    image: club?.logo,
    jsonLd: club ? schema.sportsTeam({ club, url: `${window.location.origin}/team/${clubId}` }) : null,
  });

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    const load = async () => {
      // Stage 1: club only — render header + profile immediately
      const foundClub = await base44.entities.Club.get(clubId).catch(() => null);
      if (cancelled) return;
      if (!foundClub) { setClub(null); setLoading(false); return; }
      setClub(foundClub);
      setLoading(false);
      // Stage 2: lojtarët ngarkohen veçanërisht dhe shfaqen sa më shpejt — tab-i Skuadra hapet menjëherë
      base44.entities.Player.filter({ club_id: clubId }, 'name', 100).then(allPlayers => {
        if (!cancelled) setPlayers(allPlayers);
      }).catch(() => {});
      const [allComps, homeMatches, awayMatches, allStandings, allTrophies] = await Promise.all([
        base44.entities.Competition.filter({ archived: false }, '-updated_date', 100),
        base44.entities.Match.filter({ home_team_id: clubId }, '-date', 100),
        base44.entities.Match.filter({ away_team_id: clubId }, '-date', 100),
        base44.entities.Standing.filter({ club_id: clubId, competition_id: foundClub.competition_id }),
        base44.entities.Trophy.filter({ club_id: clubId }, '-created_date', 100).catch(() => []),
      ]);
      if (cancelled) return;
      // Season map: only keep matches from the club's current season (excludes previous-season competitions)
      const seasonById = {};
      allComps.forEach(c => { seasonById[c.id] = c.season; });
      const foundComp = foundClub.competition_id ? allComps.find(c => c.id === foundClub.competition_id) : null;
      const currentSeason = foundComp?.season || null;
      const seen = new Set();
      const teamMatches = [...homeMatches, ...awayMatches].filter(m => {
        if (seen.has(m.id)) return false; seen.add(m.id); return true;
      });
      setMatches(currentSeason
        ? teamMatches.filter(m => seasonById[m.competition_id] === currentSeason)
        : teamMatches
      );
      setCompetition(foundComp || null);
      setStanding(allStandings[0] || null);
      setTrophies(allTrophies);
      setSecondaryLoaded(true);
    };
    load();
    return () => { cancelled = true; };
  }, [clubId]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!club) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Skuadra nuk u gjet</p>
      <Link to="/" className="text-primary text-sm mt-2 inline-block">Kthehu</Link>
    </div>
  );

  // If the club's competition has disabled public profiles, hide the whole profile
  if (competition && competition.show_profiles === false) {
    return (
      <div className="py-4">
        <Link to={`/ligat/${competition.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          {competition.name}
        </Link>
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Shield className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-semibold mb-1">Profili i kësaj skuadre nuk është i disponueshëm</p>
          <p className="text-xs text-muted-foreground">Profili i klubit dhe lojtarëve për këtë kompeticion është i fshehur nga administratori.</p>
        </div>
      </div>
    );
  }

  const today = moment().format('YYYY-MM-DD');
  const pastMatches = matches
    .filter(m => m.date < today || m.status === 'full_time')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  const upcomingMatches = matches
    .filter(m => m.date >= today && m.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  // Group players by position (hide inactive from public squad)
  const visiblePlayers = players.filter(p => p.active !== false);
  const byPosition = {};
  visiblePlayers.forEach(p => {
    const pos = p.position || 'Tjetër';
    if (!byPosition[pos]) byPosition[pos] = [];
    byPosition[pos].push(p);
  });
  const sortedPositions = Object.keys(byPosition).sort((a, b) => (POSITION_ORDER[a] ?? 99) - (POSITION_ORDER[b] ?? 99));

  const squadHidden = club?.show_squad === false
    ? true
    : club?.show_squad === true
      ? false
      : (competition && competition.show_squad === false);
  const tabs = [
    { id: 'profile', label: 'Profili', icon: Shield },
    { id: 'squad', label: 'Skuadra', icon: Users },
    { id: 'matches', label: 'Ndeshjet', icon: Calendar },
  ].filter(t => t.id !== 'squad' || !squadHidden);
  const effectiveTab = (activeTab === 'squad' && squadHidden) || activeTab === 'trophies' ? 'profile' : activeTab;

  return (
    <div className="py-4">
      {/* Back */}
      <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate(competition ? `/ligat/${competition.id}` : '/ligat')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        {competition ? competition.name : 'Ligat'}
      </button>

      <Breadcrumbs items={[{ label: 'Ligat', to: '/ligat' }, ...(competition ? [{ label: competition.name, to: `/ligat/${competition.id}` }] : []), { label: club.name }]} />

      {/* Club Header */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-4 flex items-center gap-4 relative overflow-hidden">
        {club.logo && (
          <img src={club.logo} alt="" aria-hidden="true" className="absolute right-0 top-1/2 -translate-y-1/2 h-[130%] w-auto max-w-[55%] object-contain pointer-events-none select-none hidden md:block" style={{ opacity: 0.5 }} />
        )}
        {club.logo ? (
          <img src={club.logo} alt={club.name} className="w-16 h-16 object-contain rounded-xl relative z-10" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center relative z-10">
            <span className="text-primary font-bold text-2xl">{club.name?.[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0 relative z-10">
          <h1 className="text-xl font-black truncate">{club.name}<span className="sr-only"> | KosovoScores</span></h1>
          {competition && (
            <p className="text-xs text-muted-foreground mt-0.5">{competition.name} · {competition.season}</p>
          )}
          {club.stadium && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span>🏟 {club.stadium}</span>
              {club.stadium_image && (
                <button onClick={() => setStadiumPhoto(club.stadium_image)} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted hover:bg-muted/70 transition-colors" title="Shiko foton e stadiumit">
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); try { sessionStorage.setItem(`team-tab-${clubId}`, tab.id); } catch {} }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all',
                effectiveTab === tab.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* PROFILI */}
      {effectiveTab === 'profile' && (
        <div className="space-y-3">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Informacioni i Klubit</h3>
            <InfoRow label="Klubi" value={club.name} />
            {club.stadium && (
              <div className="flex justify-between items-start gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">Stadiumi</span>
                <span className="font-medium text-right flex items-center gap-1.5">
                  {club.stadium}
                  {club.stadium_image && (
                    <button onClick={() => setStadiumPhoto(club.stadium_image)} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted hover:bg-muted/70 transition-colors shrink-0" title="Shiko foton e stadiumit">
                      <Camera className="w-3 h-3" />
                    </button>
                  )}
                </span>
              </div>
            )}
            {club.coach && (
              <div className="flex justify-between items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">Trajneri</span>
                <span className="font-medium text-right flex items-center gap-2">
                  {club.coach_photo && (
                    <img src={club.coach_photo} alt={club.coach} className="w-9 h-9 md:w-12 md:h-12 rounded-full object-cover border border-border shrink-0" />
                  )}
                  {club.coach}
                </span>
              </div>
            )}
            {competition && <InfoRow label="Kompeticion" value={`${competition.name} (${competition.season})`} />}
          </div>

          {(club.kit_home || club.kit_away || club.kit_third || club.home_color || club.away_color) && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Fanellat</h3>
              <div className="flex gap-4 flex-wrap">
                {[
                  { img: club.kit_home, color: club.home_color, label: 'Shtëpi' },
                  { img: club.kit_away, color: club.away_color, label: 'Mysafir' },
                  { img: club.kit_third, color: null, label: 'Alternativë' },
                ].filter(k => k.img || k.color).map((k, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    {k.img ? (
                      <img src={k.img} alt={k.label} className="w-[90px] h-[90px] md:w-[112px] md:h-[112px] rounded-xl object-cover border border-border" />
                    ) : (
                      <div className="w-[90px] h-[90px] md:w-[112px] md:h-[112px] rounded-full border-2 border-border" style={{ backgroundColor: k.color }} />
                    )}
                    <span className="text-xs text-muted-foreground">{k.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Statistikat {competition ? `· ${competition.season}` : ''}
            </h3>
            {standing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <StatCard label="Luajtur" value={standing.played ?? 0} />
                  <StatCard label="Fitore" value={standing.won ?? 0} color="text-green-600" />
                  <StatCard label="Barazim" value={standing.drawn ?? 0} color="text-yellow-600" />
                  <StatCard label="Humbje" value={standing.lost ?? 0} color="text-red-500" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <StatCard label="Golat Shënuar" value={standing.goals_for ?? 0} color="text-green-600" />
                  <StatCard label="Golat Pranuar" value={standing.goals_against ?? 0} color="text-red-500" />
                  <StatCard label="Pikë" value={standing.points ?? 0} color="text-primary" />
                </div>
              </div>
            ) : (
              secondaryLoaded ? <p className="text-xs text-muted-foreground text-center py-2">Nuk ka statistika për këtë edicion</p> : <div className="flex justify-center py-3"><div className="w-5 h-5 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
            )}
          </div>

          {/* TROFETË — seksion i veçuar poshtë statistikave */}
          <TrophySection trophies={trophies} loaded={secondaryLoaded} />
        </div>
      )}

      {/* SKUADRA */}
      {effectiveTab === 'squad' && (
        <div className="space-y-4">
          {players.length === 0 ? (
            secondaryLoaded ? <div className="text-center py-12 text-muted-foreground text-sm">Nuk ka lojtarë të regjistruar</div> : <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : (
            sortedPositions.map(pos => (
              <div key={pos} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {POSITION_LABELS[pos] || pos}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {byPosition[pos].map(player => (
                    <Link key={player.id} to={`/player/${player.id}`} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                      {player.photo ? (
                        <img src={player.photo} alt={player.name} loading="lazy" className="w-[38px] h-[38px] rounded-full object-contain border border-border shrink-0 bg-card" />
                      ) : (
                        <span className="w-[38px] h-[38px] rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                          {player.name?.[0] || '?'}
                        </span>
                      )}
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">{player.number || '–'}</span>
                      <span className="text-sm font-medium flex-1 flex items-center gap-1.5">{player.name}{player.injured && <InjuredBadge size="xs" />}</span>
                      {player.nationality && (() => {
                        const ci = countryInfo(player.nationality);
                        if (!ci) return null;
                        return (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                            <Flag value={player.nationality} size={16} />
                            {ci.name}
                          </span>
                        );
                      })()}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* NDESHJET */}
      {effectiveTab === 'matches' && (
        <div className="space-y-5">
          {upcomingMatches.length > 0 && (
            <div>
              <SectionHeading label="Ndeshjet e Ardhshme" />
              <div className="space-y-2">
                {upcomingMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </div>
          )}
          {pastMatches.length > 0 && (
            <div>
              <SectionHeading label="Ndeshjet e Fundit" />
              <div className="space-y-2">
                {pastMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </div>
          )}
          {upcomingMatches.length === 0 && pastMatches.length === 0 && (
            secondaryLoaded ? <div className="text-center py-12 text-muted-foreground text-sm">Nuk ka ndeshje</div> : <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          )}
        </div>
      )}

      {/* Stadium photo lightbox */}
      <Dialog open={!!stadiumPhoto} onOpenChange={v => !v && setStadiumPhoto(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black/95 border-0">
          {stadiumPhoto && <img src={stadiumPhoto} alt="Stadiumi" className="w-full max-h-[80vh] object-contain" />}
        </DialogContent>
      </Dialog>

    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3 text-center">
      <p className={`text-xl font-black ${color || ''}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function SectionHeading({ label }) {
  return (
    <div className="relative flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
      <div className="flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
        <span className="text-[11px] font-bold text-foreground/70 tracking-wide uppercase">{label}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
      </div>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
    </div>
  );
}