import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shirt } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_HOME = '#3b82f6';
const DEFAULT_AWAY = '#ef4444';

export default function JerseyColorButton({ match, updateMatch, readOnly }) {
  const [open, setOpen] = useState(false);
  const [homeColor, setHomeColor] = useState(match.sd_home_color || DEFAULT_HOME);
  const [awayColor, setAwayColor] = useState(match.sd_away_color || DEFAULT_AWAY);
  const [saving, setSaving] = useState(false);

  const openDialog = () => {
    setHomeColor(match.sd_home_color || DEFAULT_HOME);
    setAwayColor(match.sd_away_color || DEFAULT_AWAY);
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateMatch({ sd_home_color: homeColor, sd_away_color: awayColor, sd_pre_match_set: true });
    setSaving(false);
    setOpen(false);
    toast.success('Ngjyrat e fanellave u ruajtën');
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => !readOnly && openDialog()}
        disabled={readOnly}
        className="w-full py-3 text-sm font-bold justify-center"
      >
        <Shirt className="w-4 h-4 mr-2" />
        Ngjyrat e Fanellave
        <span className="ml-2 flex gap-1">
          <span className="w-3 h-3 rounded-full border border-border" style={{ background: match.sd_home_color || DEFAULT_HOME }} />
          <span className="w-3 h-3 rounded-full border border-border" style={{ background: match.sd_away_color || DEFAULT_AWAY }} />
        </span>
      </Button>

      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>🎨 Ngjyrat e Fanellave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Cakto ngjyrat e fanellave për të dy ekipet — përdoren te rrethet e ngjarjeve në timeline.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1 truncate">{match.home_team_name}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={homeColor} onChange={e => setHomeColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border" />
                  <span className="text-xs font-mono text-muted-foreground">{homeColor}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1 truncate">{match.away_team_name}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={awayColor} onChange={e => setAwayColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border" />
                  <span className="text-xs font-mono text-muted-foreground">{awayColor}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Anulo</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Duke ruajtur...' : '✓ Ruaj'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}