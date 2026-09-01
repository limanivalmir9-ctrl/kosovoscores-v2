import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

/**
 * Combined number + dropdown player picker.
 * Type a jersey number → auto-selects the player.
 */
const POS_ORDER = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 };
const POS_SHORT = { Goalkeeper: 'GK', Defender: 'MB', Midfielder: 'MF', Forward: 'ST' };

export default function PlayerPicker({ label, players = [], value, onChange, placeholder = 'Zgjedh', emptyLabel = 'Pa emër', allowManual = false }) {
  const [numInput, setNumInput] = useState('');
  const sortedPlayers = [...players].sort((a, b) => (POS_ORDER[a.position] ?? 4) - (POS_ORDER[b.position] ?? 4));
  const knownValue = players.some(p => p.name === value);

  // When number typed, find & auto-select player
  useEffect(() => {
    if (!numInput.trim()) return;
    const found = players.find(p => String(p.number) === numInput.trim());
    if (found) onChange(found.name);
  }, [numInput]);

  // Reset number when value cleared externally
  useEffect(() => {
    if (!value || value === ' ') setNumInput('');
  }, [value]);

  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2 items-center">
        <Input
          type="number"
          placeholder="#"
          value={numInput}
          onChange={e => setNumInput(e.target.value)}
          className="w-16 text-center font-mono font-bold"
          min={0}
        />
        <Select value={value} onValueChange={v => { onChange(v); setNumInput(''); }}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">{emptyLabel}</SelectItem>
            {sortedPlayers.map(p => (
              <SelectItem key={p.id || p.name} value={p.name}>
                {p.position && <span className="text-[10px] font-bold text-muted-foreground mr-1">{POS_SHORT[p.position]}</span>}
                {p.number ? `${p.number}. ` : ''}{p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {allowManual && (
        <Input
          value={knownValue ? '' : value}
          onChange={e => { onChange(e.target.value); setNumInput(''); }}
          placeholder="ose shkruaj emrin manualisht"
          className="text-xs h-8"
        />
      )}
    </div>
  );
}