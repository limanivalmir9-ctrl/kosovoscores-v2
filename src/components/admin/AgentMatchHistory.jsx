import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, Trash2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function StarRating({ value, onRate }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} onClick={() => onRate(star)} className="transition-transform hover:scale-110 active:scale-95">
          <Star className={cn('w-5 h-5', (value || 0) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/40')} />
        </button>
      ))}
    </div>
  );
}

export default function AgentMatchHistory({ agent, open, onClose, onUpdate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  const [matchPhotos, setMatchPhotos] = useState({}); // match_id -> { stadium_photo_start, stadium_photo_end }

  const load = async () => {
    if (!agent) return;
    setLoading(true);
    const apps = await base44.entities.MatchApplication.filter({ agent_id: agent.id }, '-created_date', 200);
    setApplications(apps);
    // Fetch stadium photos for every covered match so the admin can review them
    const ids = [...new Set(apps.map(a => a.match_id).filter(Boolean))];
    if (ids.length > 0) {
      const matches = await Promise.all(ids.map(id => base44.entities.Match.get(id).catch(() => null)));
      const map = {};
      matches.forEach(m => { if (m) map[m.id] = { stadium_photo_start: m.stadium_photo_start, stadium_photo_end: m.stadium_photo_end }; });
      setMatchPhotos(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (open && agent) load(); }, [open, agent?.id]);

  const handleRate = async (app, rating) => {
    const wasConfirmed = app.is_confirmed_covered;
    await base44.entities.MatchApplication.update(app.id, { rating, is_confirmed_covered: true });

    const updatedApps = applications.map(a => a.id === app.id ? { ...a, rating, is_confirmed_covered: true } : a);
    const confirmedRated = updatedApps.filter(a => a.is_confirmed_covered && a.rating);
    const avgRating = confirmedRated.length > 0
      ? confirmedRated.reduce((s, a) => s + a.rating, 0) / confirmedRated.length : 0;

    const agentUpdates = { average_rating: Math.round(avgRating * 10) / 10 };

    if (!wasConfirmed) {
      const newCount = (agent.total_matches_covered || 0) + 1;
      agentUpdates.total_matches_covered = newCount;
      agentUpdates.total_earnings = newCount * (agent.price_per_match || 0);
    }

    await base44.entities.Agent.update(agent.id, agentUpdates);
    toast.success('Vlerësimi u ruajt!');
    load();
    onUpdate();
  };

  const handleDelete = async (app) => {
    if (!confirm(`Fshi "${app.match_label || 'Ndeshjen'}"?`)) return;
    await base44.entities.MatchApplication.delete(app.id);

    // Recalculate agent totals
    const remaining = applications.filter(a => a.id !== app.id);
    const confirmedRated = remaining.filter(a => a.is_confirmed_covered && a.rating);
    const avgRating = confirmedRated.length > 0
      ? confirmedRated.reduce((s, a) => s + a.rating, 0) / confirmedRated.length : 0;
    const newCount = confirmedRated.length;
    await base44.entities.Agent.update(agent.id, {
      average_rating: Math.round(avgRating * 10) / 10,
      total_matches_covered: newCount,
      total_earnings: newCount * (agent.price_per_match || 0),
    });

    toast.success('Ndeshja u fshi!');
    load();
    onUpdate();
  };

  const handleArchivePayment = async () => {
    if (!confirm('Arkivo pagesën aktuale dhe reseto totalet?')) return;
    const payment = {
      date: new Date().toISOString().split('T')[0],
      amount: agent.total_earnings || 0,
      matches: agent.total_matches_covered || 0,
    };
    const archived = [...(agent.archived_payments || []), payment];
    await base44.entities.Agent.update(agent.id, {
      total_earnings: 0,
      total_matches_covered: 0,
      archived_payments: archived,
    });
    toast.success('Pagesa u arkivua! Totalet u resetuan.');
    onUpdate();
    onClose();
  };

  const pendingApps = applications.filter(a => a.status === 'approved' && !a.is_confirmed_covered);
  const confirmedApps = applications.filter(a => a.is_confirmed_covered);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ndeshjet – {agent?.first_name} {agent?.last_name}</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
          <div>
            <p className="text-sm font-bold">
              Totali i papaguar: <span className="text-success">{agent?.total_earnings || 0}€</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {agent?.total_matches_covered || 0} ndeshje të konfirmuara
              {agent?.average_rating ? ` • ⭐ ${agent.average_rating}/5` : ''}
            </p>
          </div>
          {(agent?.total_earnings > 0 || agent?.total_matches_covered > 0) && (
            <Button size="sm" variant="outline" onClick={handleArchivePayment} className="text-xs shrink-0">
              💰 Arkivo Pagesën
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {pendingApps.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">⏳ Kërkohet Vlerësim</p>
                <div className="space-y-2">
                  {pendingApps.map(app => (
                    <div key={app.id} className="bg-card rounded-xl border border-yellow-200 p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">{app.match_label || 'Ndeshje'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {app.match_date}{app.match_time ? ` • ${app.match_time}` : ''}{app.competition_name ? ` • ${app.competition_name}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(app)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          title="Fshi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Proof photo */}
                      {app.proof_photo ? (
                        <a href={app.proof_photo} target="_blank" rel="noopener noreferrer" className="block mb-2">
                          <img
                            src={app.proof_photo}
                            alt="Foto dëshmi"
                            className="w-full max-h-40 object-cover rounded-lg border border-yellow-300 hover:opacity-90 transition-opacity cursor-zoom-in"
                          />
                          <p className="text-[10px] text-yellow-600 font-semibold mt-1">📸 Foto dëshmi nga agjenti — kliko për ta parë</p>
                        </a>
                      ) : (
                        <div className="flex items-center gap-1.5 mb-2 text-[10px] text-muted-foreground/60">
                          <ImageIcon className="w-3 h-3" />
                          <span>Agjenti nuk ka ngarkuar foto dëshmi</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Vlerëso:</span>
                        <StarRating value={app.rating} onRate={r => handleRate(app, r)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {confirmedApps.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">✅ Të Konfirmuara ({confirmedApps.length})</p>
                <div className="space-y-2">
                  {confirmedApps.map(app => (
                    <div key={app.id} className="bg-card rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">{app.match_label || 'Ndeshje'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {app.match_date}{app.match_time ? ` • ${app.match_time}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">✓</span>
                          <button
                            onClick={() => handleDelete(app)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            title="Fshi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {app.proof_photo && (
                        <a href={app.proof_photo} target="_blank" rel="noopener noreferrer" className="block mt-1.5 mb-1">
                          <img
                            src={app.proof_photo}
                            alt="Foto dëshmi"
                            className="w-full max-h-32 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity cursor-zoom-in"
                          />
                        </a>
                      )}
                      {(() => {
                        const ph = matchPhotos[app.match_id] || {};
                        const start = ph.stadium_photo_start;
                        const end = ph.stadium_photo_end;
                        if (!start && !end) return null;
                        return (
                          <div className="grid grid-cols-2 gap-2 mt-1.5 mb-1">
                            <div>
                              {start ? (
                                <a href={start} target="_blank" rel="noopener noreferrer">
                                  <img src={start} alt="Stadiumi para" className="w-full h-16 object-cover rounded-lg border border-border" />
                                </a>
                              ) : <div className="w-full h-16 rounded-lg bg-muted/40 border border-dashed border-border" />}
                              <p className="text-[9px] text-muted-foreground text-center mt-0.5">Para fillimit</p>
                            </div>
                            <div>
                              {end ? (
                                <a href={end} target="_blank" rel="noopener noreferrer">
                                  <img src={end} alt="Stadiumi fund" className="w-full h-16 object-cover rounded-lg border border-border" />
                                </a>
                              ) : <div className="w-full h-16 rounded-lg bg-muted/40 border border-dashed border-border" />}
                              <p className="text-[9px] text-muted-foreground text-center mt-0.5">Në fund</p>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-1 mt-1.5">
                        <StarRating value={app.rating} onRate={r => handleRate(app, r)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {applications.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-6">Nuk ka aplikime ende</p>
            )}
          </div>
        )}

        {agent?.archived_payments?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">📦 Pagesat e Arkivuara</p>
            <div className="space-y-1">
              {[...agent.archived_payments].reverse().map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">{p.date}</span>
                  <span>{p.matches} ndeshje</span>
                  <span className="font-bold text-success">{p.amount}€</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}