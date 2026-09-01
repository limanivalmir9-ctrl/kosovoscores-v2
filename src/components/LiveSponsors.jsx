import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PER_PAGE = 3;

/**
 * LiveSponsors — mobile-only sponsor display for the live page.
 * - No live matches: sponsor logos shown faded/grayscale at the bottom.
 * - Live matches: sponsors rotate in a modern slide carousel.
 */
export default function LiveSponsors({ sponsors, hasLiveMatches }) {
  const [page, setPage] = useState(0);

  const pages = [];
  for (let i = 0; i < (sponsors?.length || 0); i += PER_PAGE) {
    pages.push(sponsors.slice(i, i + PER_PAGE));
  }
  const totalPages = pages.length;

  useEffect(() => { setPage(0); }, [hasLiveMatches]);

  useEffect(() => {
    if (totalPages <= 1) return;
    const t = setInterval(() => setPage(p => (p + 1) % totalPages), 4000);
    return () => clearInterval(t);
  }, [totalPages]);

  if (!sponsors || sponsors.length === 0) return null;

  if (!hasLiveMatches) {
    return (
      <div className="md:hidden mt-6 border-t border-border/40 pt-4 pb-2">
        <p className="text-[10px] text-muted-foreground/60 text-center font-bold uppercase tracking-widest mb-3">Sponzorët tanë</p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 px-3">
          {sponsors.map(s => (
            <a key={s.id} href={s.link || undefined} target="_blank" rel="noopener noreferrer" className="block">
              <img src={s.image} alt="" className="h-9 object-contain opacity-40 grayscale" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden mt-5">
      <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest mb-2">Sponzorët</p>
      <div className="relative overflow-hidden rounded-xl bg-card border border-border/50 px-3 py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35 }}
            className="flex items-center justify-center gap-3"
          >
            {pages[page].map(s => (
              <a key={s.id} href={s.link || undefined} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center min-w-0">
                <img src={s.image} alt="" className="h-12 object-contain" />
              </a>
            ))}
          </motion.div>
        </AnimatePresence>
        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-1.5 rounded-full transition-all ${i === page ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}