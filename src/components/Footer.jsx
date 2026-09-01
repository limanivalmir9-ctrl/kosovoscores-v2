import { Instagram } from 'lucide-react';
import LegalNotice from '@/components/LegalNotice';

const INSTAGRAM_URL = 'https://instagram.com/kosovoscores';

export default function Footer() {
  return (
    <footer className="mt-6 border-t border-border/50 bg-card">
      <div className="max-w-2xl mx-auto px-4 py-5 flex flex-col items-center gap-2 text-center">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          aria-label="KosovoScores në Instagram"
        >
          <Instagram className="w-5 h-5" />
          <span>@kosovoscores</span>
        </a>
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} KosovoScores — Rezultatet Live te Futbollit Kosovar
        </p>
        <div className="hidden md:block">
          <LegalNotice />
        </div>
      </div>
    </footer>
  );
}