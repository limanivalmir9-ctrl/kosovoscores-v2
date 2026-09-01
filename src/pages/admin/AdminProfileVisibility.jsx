import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminProfileVisibility() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // competition id being toggled

  const load = async () => {
    try {
      const data = await base44.entities.Competition.list('tier', 200);
      setCompetitions(data);
    } catch (err) {
      toast.error('Ngarkimi dështoi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (comp) => {
    const next = !(comp.show_profiles !== false);
    setUpdating(comp.id);
    // Optimistic update
    setCompetitions(prev => prev.map(c => c.id === comp.id ? { ...c, show_profiles: next } : c));
    try {
      await base44.entities.Competition.update(comp.id, { show_profiles: next });
      toast.success(next ? 'Profilet u aktivizuan' : 'Profilet u çaktivizuan');
    } catch (err) {
      // Revert on failure
      setCompetitions(prev => prev.map(c => c.id === comp.id ? { ...c, show_profiles: !next } : c));
      toast.error('Gabim: ' + (err?.message || 'ruajtja dështoi'));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );

  const active = competitions.filter(c => !c.archived);
  const archived = competitions.filter(c => c.archived);

  const renderRow = (comp) => {
    const visible = comp.show_profiles !== false;
    return (
      <div key={comp.id} className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
        {comp.logo
          ? <img src={comp.logo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold shrink-0">{comp.name?.[0]}</div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{comp.name}</p>
          <p className="text-xs text-muted-foreground">{comp.season} · Tier {comp.tier || 1}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {visible ? (
            <span className="flex items-center gap-1 text-xs font-bold text-green-600"><Eye className="w-3.5 h-3.5" /> Të dukshme</span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-orange-500"><EyeOff className="w-3.5 h-3.5" /> Të fshehura</span>
          )}
          {updating === comp.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <Switch
            checked={visible}
            disabled={updating === comp.id}
            onCheckedChange={() => toggle(comp)}
          />
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-1">
        <h2 className="text-lg font-bold">Dukshmëria e Profileve</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Aktivizo ose çaktivizo profilet e klubeve dhe lojtarëve për secilin kompeticion. Kur janë të fshehura, faqet publike të klubeve dhe lojtarëve nuk shfaqen.
        </p>
      </div>

      <div className="space-y-2 mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mt-4 mb-1">Sezoni aktual</p>
        {active.map(renderRow)}
        {active.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Nuk ka kompeticion</p>}
      </div>

      {archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Sezonet e kaluara (arkivuar)</p>
          {archived.map(renderRow)}
        </div>
      )}
    </div>
  );
}