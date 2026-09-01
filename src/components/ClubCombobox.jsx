import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Searchable club picker: lists the app's own clubs (with logos) + accepts free text.
// onChange receives { name, logo } — logo is set when an app club is picked, '' for free text.
export default function ClubCombobox({ value, onChange, placeholder = 'Kërko klubin ose shkruaj…' }) {
  const [open, setOpen] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    let done = false;
    base44.entities.Club.list(null, 1000)
      .then(list => { if (!done) { setClubs((list || []).filter(c => c.name).sort((a, b) => a.name.localeCompare(b.name))); setLoaded(true); } })
      .catch(() => setLoaded(true));
    return () => { done = true; };
  }, []);

  useEffect(() => {
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const q = (value || '').trim().toLowerCase();
  const filtered = q
    ? clubs.filter(c => c.name.toLowerCase().includes(q)).slice(0, 30)
    : clubs.slice(0, 30);

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={value || ''}
          onChange={e => { onChange({ name: e.target.value, logo: '' }); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {!loaded && <p className="px-3 py-2 text-xs text-muted-foreground">Duke ngarkuar…</p>}
          {loaded && filtered.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Asnjë klub. Shkruaj emrin manualisht.</p>}
          {filtered.map(c => {
            const active = (c.name || '').toLowerCase() === q;
            return (
              <button
                key={c.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); onChange({ name: c.name, logo: c.logo || '' }); setOpen(false); }}
                className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-accent transition-colors', active && 'bg-accent/60')}
              >
                {c.logo ? (
                  <img src={c.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                ) : (
                  <span className="w-5 h-5 shrink-0 rounded bg-muted border border-border" />
                )}
                <span className="truncate flex-1">{c.name}</span>
                {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}