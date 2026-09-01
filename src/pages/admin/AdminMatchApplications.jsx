import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_LABEL = { pending: 'Në pritje', approved: 'Aprovuar', rejected: 'Refuzuar' };
const STATUS_COLOR = {
  pending: 'bg-yellow-500/10 text-yellow-700',
  approved: 'bg-green-500/10 text-green-700',
  rejected: 'bg-red-500/10 text-red-600',
};

export default function AdminMatchApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const all = await base44.entities.MatchApplication.list('-created_date', 200);
    setApps(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (app) => {
    await base44.entities.MatchApplication.update(app.id, { status: 'approved' });
    // Assign agent id to the match
    if (app.match_id && app.agent_id) {
      await base44.entities.Match.update(app.match_id, { assigned_agent_id: app.agent_id });
    }
    toast.success('Aplikimi u aprovua');
    load();
  };

  const reject = async (app) => {
    await base44.entities.MatchApplication.update(app.id, { status: 'rejected' });
    toast.success('Aplikimi u refuzua');
    load();
  };

  const remove = async (id) => {
    await base44.entities.MatchApplication.delete(id);
    toast.success('U fshi');
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const pending = apps.filter(a => a.status === 'pending');
  const others = apps.filter(a => a.status !== 'pending');

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Aplikime për Ndeshje</h2>

      {pending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-yellow-600 mb-3">⏳ Në pritje ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(app => (
              <div key={app.id} className="bg-card rounded-xl border border-yellow-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{app.agent_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{app.match_label}</p>
                    <p className="text-[10px] text-muted-foreground">{app.match_date} {app.match_time && `• ${app.match_time}`} {app.competition_name && `• ${app.competition_name}`}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" onClick={() => approve(app)} className="bg-green-500 hover:bg-green-600 text-white h-8 px-3">
                      <Check className="w-3.5 h-3.5 mr-1" /> Aprovo
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reject(app)} className="h-8 px-3">
                      <X className="w-3.5 h-3.5 mr-1" /> Refuzo
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground mb-3">Historiku</h3>
          <div className="space-y-2">
            {others.map(app => (
              <div key={app.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{app.agent_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.match_label} • {app.match_date}</p>
                  {app.status === 'approved' && <p className="text-[10px] text-green-600 font-medium">✅ Agjent: {app.agent_name}</p>}
                </div>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_COLOR[app.status])}>
                  {STATUS_LABEL[app.status]}
                </span>
                <Button variant="ghost" size="icon" onClick={() => remove(app.id)} className="h-7 w-7">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {apps.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">Nuk ka aplikime ende</p>
      )}
    </div>
  );
}