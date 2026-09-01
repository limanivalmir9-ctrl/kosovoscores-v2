import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const WEATHER_OPTIONS = [
  { value: 'sun', label: '☀️ Diell' },
  { value: 'cloudy', label: '⛅ Vranësirë' },
  { value: 'rain', label: '🌧️ Shi' },
  { value: 'snow', label: '❄️ Borë' },
  { value: 'wind', label: '💨 Erë' },
  { value: 'fog', label: '🌫️ Mjegull' },
];

const DEFAULT_HOME_COLOR = '#3b82f6';
const DEFAULT_AWAY_COLOR = '#ef4444';

export default function PreMatchDetailsDialog({ match, open, onClose, onSaved }) {
  const [homeColor, setHomeColor] = useState(match.sd_home_color || DEFAULT_HOME_COLOR);
  const [awayColor, setAwayColor] = useState(match.sd_away_color || DEFAULT_AWAY_COLOR);
  const [weather, setWeather] = useState(match.sd_weather || '');
  const [temp, setTemp] = useState(match.sd_temp != null ? String(match.sd_temp) : '');
  const [homeSide, setHomeSide] = useState(match.sd_home_side || 'left');
  const [kickOffTeam, setKickOffTeam] = useState(match.sd_kick_off_team || 'home');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Match.update(match.id, {
      sd_home_color: homeColor,
      sd_away_color: awayColor,
      sd_weather: weather || null,
      sd_temp: temp !== '' ? Number(temp) : null,
      sd_home_side: homeSide,
      sd_kick_off_team: kickOffTeam,
      // Set initial possession to kick-off team
      sd_possession: kickOffTeam,
      sd_pre_match_set: true,
    });
    toast.success('Pre-match detajet u ruajtën!');
    setSaving(false);
    if (onSaved) onSaved(); else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📋 Pre-Match Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* Colors */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">🎨 NGJYRAT E EKIPEVE</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">{match.home_team_name}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={homeColor} onChange={e => setHomeColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border" />
                  <span className="text-xs font-mono text-muted-foreground">{homeColor}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">{match.away_team_name}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={awayColor} onChange={e => setAwayColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border" />
                  <span className="text-xs font-mono text-muted-foreground">{awayColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Home side */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">⚽ ANA SULMUESE – {match.home_team_name} (Pjesa I)</p>
            <div className="flex gap-2">
              <button
                onClick={() => setHomeSide('left')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${homeSide === 'left' ? 'bg-green-500 text-white border-green-500' : 'bg-muted border-border text-muted-foreground'}`}
              >← MAJTAS</button>
              <button
                onClick={() => setHomeSide('right')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${homeSide === 'right' ? 'bg-green-500 text-white border-green-500' : 'bg-muted border-border text-muted-foreground'}`}
              >DJATHTAS →</button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Në pjesën e dytë kahu ndryshohet automatikisht</p>
          </div>

          {/* Kick-off team */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">⚽ CILI EKIP NIS I PARI (KICK-OFF)</p>
            <div className="flex gap-2">
              <button
                onClick={() => setKickOffTeam('home')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${kickOffTeam === 'home' ? 'text-white border-transparent' : 'bg-muted border-border text-muted-foreground'}`}
                style={kickOffTeam === 'home' ? { background: homeColor } : {}}
              >{match.home_team_name}</button>
              <button
                onClick={() => setKickOffTeam('away')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${kickOffTeam === 'away' ? 'text-white border-transparent' : 'bg-muted border-border text-muted-foreground'}`}
                style={kickOffTeam === 'away' ? { background: awayColor } : {}}
              >{match.away_team_name}</button>
            </div>
          </div>

          {/* Weather */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">🌤️ MOTI</p>
            <div className="grid grid-cols-3 gap-2">
              {WEATHER_OPTIONS.map(w => (
                <button
                  key={w.value}
                  onClick={() => setWeather(weather === w.value ? '' : w.value)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${weather === w.value ? 'bg-primary text-white border-primary' : 'bg-muted border-border text-foreground'}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">🌡️ TEMPERATURA (°C)</p>
            <input
              type="number"
              value={temp}
              onChange={e => setTemp(e.target.value)}
              placeholder="p.sh. 18"
              className="w-full h-10 px-3 rounded-lg border border-input bg-transparent text-sm"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Anulo</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Duke ruajtur...' : '✓ Ruaj'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}