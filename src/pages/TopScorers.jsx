import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Star } from 'lucide-react';
import { useSeo } from '@/lib/seo';

export default function TopScorers() {
  const [scorers, setScorers] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [clubLogos, setClubLogos] = useState({});
  const [playerPhotos, setPlayerPhotos] = useState({});
  const [selectedSeason, setSelectedSeason] = useState('active');
  const [selectedComp, setSelectedComp] = useState(null);
  const [loading, setLoading] = useState(true);

  useSeo({
    title: 'Top Golashënuesit – Golashënuesit e Futbollit të Kosovës | KosovoScores',
    description: 'Golashënuesit më të mirë të Superligës dhe kompeticioneve të futbollit në Kosovë në KosovoScores. Shiko numrin e golave, klubet dhe lojtarët.',
    canonicalPath: '/top-scorers',
  });

  useEffect(() => {
    const load = async () => {
      const [allScorers, allComps, allClubs, allPlayers] = await Promise.all([
        base44.entities.TopScorer.list('-goals', 300),
        base44.entities.Competition.list('tier', 100),
        base44.entities.Club.list('-created_date', 200),
        base44.entities.Player.list(null, 200),
      ]);
      setScorers(allScorers);
      setCompetitions(allComps);
      const logoMap = {};
      allClubs.forEach(c => { if (c.name) logoMap[c.name.toLowerCase()] = c.logo; });
      setClubLogos(logoMap);
      const photoMap = {};
      allPlayers.forEach(p => {
        if (p.photo) {
          photoMap[p.id] = p.photo;
          if (p.player_id) photoMap[p.player_id] = p.photo;
        }
      });
      setPlayerPhotos(photoMap);
      const visible = allComps.filter(c => !c.hidden);
      const active = visible.filter(c => !c.archived);
      const tier1 = active.find(c => c.tier === 1) || active[0];
      if (tier1) setSelectedComp(tier1.id);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const visible = competitions.filter(c => !c.hidden);
  const active = visible.filter(c => !c.archived);
  const archivedSeasons = [...new Set(visible.filter(c => c.archived).map(c => c.season).filter(Boolean))].sort().reverse();

  const compsForView = selectedSeason === 'active' ? active : visible.filter(c => c.season === selectedSeason && c.archived);
  const validComp = compsForView.find(c => c.id === selectedComp) ? selectedComp : (compsForView.find(c => c.tier === 1) || compsForView[0])?.id || null;

  const filtered = scorers.filter(s => (!validComp || s.competition_id === validComp) && (s.goals || 0) > 0).slice(0, 50);
  const viewingArchive = selectedSeason !== 'active';

  const onSeasonChange = (v) => {
    setSelectedSeason(v);
    const c = v === 'active' ? active : visible.filter(x => x.season === v && x.archived);
    const t = c.find(x => x.tier === 1) || c[0];
    setSelectedComp(t?.id || null);
  };

  return (
    <div className="py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          {viewingArchive && <History className="w-5 h-5 text-muted-foreground" />}
          {viewingArchive ? `Top Golashënuesit ${selectedSeason}` : 'Top Golashënuesit'}
          <span className="sr-only">| KosovoScores</span>
        </h1>
        <Link to="/yjet-e-javes" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400/90 hover:bg-yellow-400 text-black text-xs font-black uppercase tracking-wide transition-colors shadow-sm shrink-0">
          <Star className="w-3.5 h-3.5 fill-black" />
          Yjet e Javës
        </Link>
        <div className="flex gap-2 flex-wrap">
          {archivedSeasons.length > 0 && (
            <Select value={selectedSeason} onValueChange={onSeasonChange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Sezoni aktual</SelectItem>
                {archivedSeasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {compsForView.length > 0 && (
            <Select value={validComp || ''} onValueChange={setSelectedComp}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Zgjedh ligën" /></SelectTrigger>
              <SelectContent>
                {compsForView.map(comp => <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {viewingArchive && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
          <History className="w-3.5 h-3.5" />
          <span>Po shikon golashënuesit e arkivuar të sezonit {selectedSeason}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16"><p className="text-muted-foreground">Nuk ka golashënues {viewingArchive ? `për sezonin ${selectedSeason}` : 'për këtë sezon'}</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((scorer, i) => {
            const Card = (
              <>
                <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-black', i === 0 ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground')}>{i + 1}</span>
                <ScorerPhoto src={scorer.photo || playerPhotos[scorer.player_id]} name={scorer.player_name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{scorer.player_name}</p>
                  <div className="flex items-center gap-1">
                    {(clubLogos[(scorer.club_name || '').toLowerCase()] || scorer.club_logo) && <img src={clubLogos[(scorer.club_name || '').toLowerCase()] || scorer.club_logo} alt="" loading="lazy" decoding="async" className="w-4 h-4 object-contain shrink-0" />}
                    <p className="text-[10px] text-muted-foreground truncate">{scorer.club_name}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-1 justify-end">
                  {i === 0 && <img src="https://media.base44.com/images/public/69c340685dca7075d7622e15/7bf324149_GOLDENB.png" alt="golden boot" className="w-6 h-6 object-contain" />}
                  <div><span className="text-lg font-black text-primary">{scorer.goals}</span><p className="text-[9px] text-muted-foreground">gola</p></div>
                </div>
              </>
            );
            return scorer.player_id ? (
              <Link key={scorer.id} to={`/player/${scorer.player_id}`} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                {Card}
              </Link>
            ) : (
              <div key={scorer.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                {Card}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScorerPhoto({ src, name }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center shrink-0"><span className="text-sm font-bold">{name?.[0]}</span></div>;
  }
  return <img src={src} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-full object-contain bg-white border border-border shrink-0" onError={() => setErr(true)} />;
}