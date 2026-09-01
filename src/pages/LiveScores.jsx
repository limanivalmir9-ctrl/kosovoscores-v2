import LiveScoresFanChat from '@/components/fanchat/LiveScoresFanChat';
import { useSeo } from '@/lib/seo';

export default function LiveScores() {
  useSeo({
    title: 'Live Scores | KosovoScores',
    description: 'Rezultate LIVE të futbollit në Kosovë në KosovoScores dhe chat me fansa në kohë reale.',
    canonicalPath: '/live-scores',
  });
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="sr-only">Live Scores – Rezultate LIVE dhe Chat | KosovoScores</h1>
      <LiveScoresFanChat />
    </div>
  );
}