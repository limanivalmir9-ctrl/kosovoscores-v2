import Flag from './Flag';
import { ArrowRight, Calendar, Trash2 } from 'lucide-react';

// One transfer row: [season] [clubA] → [clubB]
// Season shown as plain text (no frame). Clubs as narrow chips with logo + name + flag.
export default function TransferEntry({ season, fromName, fromCountry, fromLogo, toName, toCountry, toLogo, logoMap, onDelete }) {
  const fromL = fromLogo || (logoMap && fromName ? logoMap[fromName.toLowerCase()] : null);
  const toL = toLogo || (logoMap && toName ? logoMap[toName.toLowerCase()] : null);
  return (
    <div className="flex items-center gap-2.5 bg-muted/25 hover:bg-muted/40 transition-colors rounded-xl px-3 py-2.5">
      <div className="shrink-0 flex flex-col items-center justify-center w-11 text-center">
        <Calendar className="w-3 h-3 text-muted-foreground mb-0.5" />
        <span className="text-[10px] font-semibold text-muted-foreground leading-none tracking-tight">{season || '—'}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {fromName && (
          <>
            <Chip name={fromName} country={fromCountry} logo={fromL} />
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </>
        )}
        <Chip name={toName} country={toCountry} logo={toL} />
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Fshi"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function Chip({ name, country, logo }) {
  return (
    <span className="inline-flex items-center gap-1 bg-card border border-border rounded-full pl-1 pr-1.5 py-1 min-w-0 flex-1 min-h-7 self-stretch">
      {logo ? (
        <img src={logo} alt="" className="w-4 h-4 object-contain shrink-0 self-center" />
      ) : (
        <span className="w-4 h-4 shrink-0 rounded-full bg-muted border border-border self-center" />
      )}
      <span className="text-[11px] font-medium text-foreground/90 flex-1 min-w-0 leading-tight break-words whitespace-normal self-center">{name}</span>
      <Flag value={country} size={14} className="shrink-0 self-center" />
    </span>
  );
}