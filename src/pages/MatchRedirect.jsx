import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { buildMatchSlug } from '@/lib/matchSlug';

// Redirects old /match/:id URLs to the new SEO-friendly /ndeshja/:slug URLs.
export default function MatchRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const go = async () => {
      if (!id) { navigate('/', { replace: true }); return; }
      try {
        const m = await base44.entities.Match.filter({ id });
        const match = m[0];
        if (!match) { navigate('/', { replace: true }); return; }
        const slug = match.slug || buildMatchSlug(match.home_team_name, match.away_team_name, match.date);
        navigate(slug ? `/ndeshja/${slug}` : '/', { replace: true });
      } catch {
        navigate('/', { replace: true });
      }
    };
    go();
  }, [id, navigate]);

  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}