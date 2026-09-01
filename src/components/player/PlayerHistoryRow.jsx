import { useState } from 'react';
import { Link } from 'react-router-dom';
import Flag from '@/components/Flag';

// Compact player career row: [Year Start - Year End] [Club logo + name] [Flag]
// Small font sizes. Falls back to `season` (e.g. "2023/24") when year_from/year_to
// are missing (older entries). destination = the club the player moved TO.
function yearsLabel(h) {
  if (h.year_from && h.year_to) return `${h.year_from} - ${h.year_to}`;
  if (h.year_from) return `${h.year_from}`;
  if (h.season) return h.season;
  return '—';
}

export default function PlayerHistoryRow({ entry, logoMap, toLink, onDelete }) {
  const club = entry.club_name || '';
  const [logoErr, setLogoErr] = useState(false);
  const logo = entry.club_logo || (logoMap && club ? logoMap[club.toLowerCase()] : null);
  const row = (
    <div className="flex items-center gap-2 bg-muted/25 hover:bg-muted/40 transition-colors rounded-xl px-3 py-2">
      <span className="shrink-0 w-16 text-[11px] font-bold text-muted-foreground tabular-nums">{yearsLabel(entry)}</span>
      <span className="flex items-center gap-1.5 flex-1 min-w-0">
        {logo && !logoErr ? (
          <img src={logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={() => setLogoErr(true)} />
        ) : (
          <span className="w-4 h-4 shrink-0 rounded-full bg-muted border border-border" />
        )}
        <span className="text-[12px] font-medium truncate">{club || '—'}</span>
      </span>
      <Flag value={entry.country} size={14} className="shrink-0" />
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Fshi"
        >
          <span className="text-[14px] leading-none">×</span>
        </button>
      )}
    </div>
  );
  // Make the row clickable to the destination club when a club_id is available
  if (toLink) return <Link to={toLink} className="block">{row}</Link>;
  return row;
}