import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSeo } from '@/lib/seo';

export default function WeekStars() {
  const [stars, setStars] = useState([]);
  const [loading, setLoading] = useState(true);

  useSeo({
    title: 'Yjet e Javës | KosovoScores',
    description: 'Yjet e javës nga futbolli i Kosovës në KosovoScores – lojtarët më të mirë të çdo jave të Superligës së Kosovës.',
    canonicalPath: '/yjet-e-javes',
  });

  useEffect(() => {
    const load = async () => {
      const all = await base44.entities.WeekStar.list('-week_number', 200);
      setStars(all);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  // Javet e reja në krye (renditi kundër): java 1 në fund
  const sorted = [...stars].sort((a, b) => (Number(b.week_number) || 0) - (Number(a.week_number) || 0));

  return (
    <div className="py-4">
      <h1 className="text-lg font-bold flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
        Yjet e Javës
        <span className="sr-only">| KosovoScores</span>
      </h1>

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nuk ka yje të javës ende</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(s => {
            const Card = (
              <div className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border">
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-300 to-yellow-500 shrink-0">
                  <span className="text-[9px] font-black text-black/70 uppercase">Java</span>
                  <span className="text-xl font-black text-black leading-none">{s.week_number}</span>
                </div>
                {s.player_photo ? (
                  <img src={s.player_photo} alt={s.player_name} loading="lazy" className="w-14 h-14 rounded-full object-contain border-2 border-yellow-300 bg-muted shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-yellow-300 shrink-0">
                    <span className="text-lg font-black text-muted-foreground">{s.player_name?.[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate flex items-center gap-1">
                    {s.player_name}
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400 shrink-0" />
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                    {s.club_logo && <img src={s.club_logo} alt="" loading="lazy" decoding="async" className="w-3.5 h-3.5 object-contain" />}
                    {s.club_name}
                  </p>
                </div>
              </div>
            );
            return s.player_id ? (
              <Link key={s.id} to={`/player/${s.player_id}`} className="block transition-transform active:scale-[0.98] [&>div]:hover:border-yellow-300/70">{Card}</Link>
            ) : (
              <div key={s.id}>{Card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}