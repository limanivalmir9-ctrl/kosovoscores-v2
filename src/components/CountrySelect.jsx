import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { COUNTRIES, countryInfo } from '@/lib/countries';
import Flag from '@/components/Flag';
import { cn } from '@/lib/utils';

export default function CountrySelect({ value, onChange, placeholder = 'Zgjidh shtetin' }) {
  const known = !!countryInfo(value)?.code;
  const [manual, setManual] = useState(!!value && !known);
  const current = countryInfo(value);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 bg-muted rounded-lg p-0.5">
        <button type="button" onClick={() => setManual(false)} className={cn('flex-1 py-1 rounded-md text-[11px] font-bold transition-colors', !manual ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Nga lista</button>
        <button type="button" onClick={() => setManual(true)} className={cn('flex-1 py-1 rounded-md text-[11px] font-bold transition-colors', manual ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Manualisht</button>
      </div>
      {manual ? (
        <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Shkruaj kombësinë" />
      ) : (
        <Select value={value || ''} onValueChange={v => onChange(v === '__none' ? '' : v)}>
          <SelectTrigger>
            {current ? (
              <span className="flex items-center gap-2">
                {current.code && <Flag value={current.code} size={16} />}
                <span className="truncate">{current.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="__none">— Pa kombësi —</SelectItem>
            {COUNTRIES.map(c => (
              <SelectItem key={c.code} value={c.name}>
                <span className="flex items-center gap-2">
                  <Flag value={c.code} size={16} />
                  <span>{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}