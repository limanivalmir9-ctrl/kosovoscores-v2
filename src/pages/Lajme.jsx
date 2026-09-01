import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { History } from 'lucide-react';
import { useSeo, schema } from '@/lib/seo';

export default function Lajme() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null); // null = sezoni aktual

  useSeo({
    title: selectedNews ? `${selectedNews.title} | KosovoScores` : 'Lajme | KosovoScores',
    description: selectedNews
      ? (selectedNews.content || '').slice(0, 155)
      : 'Lajmet më të reja nga futbolli i Kosovës në KosovoScores – Superliga, Liga e Parë, transfertat, intervistat dhe analizat.',
    canonicalPath: '/lajme',
    image: selectedNews?.image,
    jsonLd: selectedNews ? schema.article({ news: selectedNews, url: `${window.location.origin}/lajme` }) : null,
  });

  useEffect(() => {
    const load = async () => {
      const allNews = await base44.entities.News.filter({ published: true }, '-created_date', 200);
      setNews(allNews);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedNews) {
    return (
      <div className="py-4">
        <button onClick={() => setSelectedNews(null)} className="text-sm text-primary mb-4 hover:underline">
          ← Kthehu tek lajmet
        </button>
        {selectedNews.image && (
          <img src={selectedNews.image} alt={selectedNews.title} className="w-full h-48 object-cover rounded-xl mb-4" />
        )}
        <h1 className="text-lg font-bold mb-2">{selectedNews.title}<span className="sr-only"> | KosovoScores</span></h1>
        <p className="text-xs text-muted-foreground mb-4">{moment(selectedNews.created_date).format('DD MMM YYYY, HH:mm')}</p>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedNews.content}</div>
      </div>
    );
  }

  const active = news.filter(n => !n.archived);
  const archivedSeasons = [...new Set(news.filter(n => n.archived && n.season).map(n => n.season))].sort().reverse();
  const viewingArchive = !!selectedSeason;
  const shown = viewingArchive ? news.filter(n => n.archived && n.season === selectedSeason) : active;
  const dropdownValue = viewingArchive ? selectedSeason : 'active';

  return (
    <div className="py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          {viewingArchive && <History className="w-5 h-5 text-muted-foreground" />}
          {viewingArchive ? `Lajme ${selectedSeason}` : 'Lajme'}
          <span className="sr-only">| KosovoScores</span>
        </h1>
        {archivedSeasons.length > 0 && (
          <div className="w-full sm:w-56">
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
          <span>Po shikon lajmet e arkivuara të sezonit {selectedSeason}</span>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            {viewingArchive ? `Nuk ka lajme për sezonin ${selectedSeason}` : 'Nuk ka lajme ende'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setSelectedNews(item)}
              className="w-full text-left bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-all"
            >
              {item.image ? (
                <div className={`flex gap-0 ${idx % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                  <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="w-28 h-28 object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold line-clamp-2">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {moment(item.created_date).format('DD MMM YYYY')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <h3 className="text-sm font-semibold line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {moment(item.created_date).format('DD MMM YYYY')}
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}