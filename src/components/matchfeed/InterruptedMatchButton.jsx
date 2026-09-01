import { useState } from 'react';
import { agentBatch } from '@/lib/agentWrite';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const INTERRUPT_REASONS = [
  'Probleme Teknik',
  'Probleme me Shikues',
  'Lëndim i Rëndë',
  'Moti i Keq',
  'Problem me Dritat',
];

// Black button with white text by default. When the match is interrupted it
// becomes red and pulses; clicking it again resumes the match (restoring the
// status saved when the interruption started). No timeline event is created.
export default function InterruptedMatchButton({ match, matchCode, onAfter }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isInterrupted = match?.status === 'interrupted';

  const handleInterrupt = async () => {
    if (!reason) { toast.error('Zgjidh arsyen'); return; }
    setLoading(true);
    try {
      // Save the current status so we can restore it when the match resumes.
      const previous = match?.status && match.status !== 'interrupted' ? match.status : 'second_half';
      await agentBatch(matchCode, [{
        op: 'updateMatch',
        data: { status: 'interrupted', interrupted_reason: reason, pre_interrupt_status: previous },
      }]);
      toast.success('Ndeshja u shënua e ndërprerë');
      setOpen(false);
      setReason('');
      if (onAfter) onAfter();
    } catch (e) {
      toast.error(e.message || 'Gabim');
    }
    setLoading(false);
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      const restore = match?.pre_interrupt_status || 'second_half';
      await agentBatch(matchCode, [{
        op: 'updateMatch',
        data: { status: restore, interrupted_reason: '', pre_interrupt_status: '' },
      }]);
      toast.success('Ndeshja rifilloi');
      if (onAfter) onAfter();
    } catch (e) {
      toast.error(e.message || 'Gabim');
    }
    setLoading(false);
  };

  if (isInterrupted) {
    return (
      <button
        onClick={handleResume}
        disabled={loading}
        className={cn(
          'w-full py-3.5 rounded-2xl font-bold text-sm transition-colors disabled:opacity-50',
          'bg-red-600 hover:bg-red-700 text-white animate-pulse'
        )}
      >
        🔄 RIFILLO NDESHJËN
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        className="w-full py-3.5 rounded-2xl font-bold text-sm bg-black hover:bg-black/90 text-white transition-colors disabled:opacity-50"
      >
        NDESHJA U NDERPRE
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold mb-3 text-center">ARSYEJA?</p>
            <div className="space-y-2">
              {INTERRUPT_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'w-full py-2.5 rounded-xl border text-xs font-bold transition-all text-left px-3',
                    reason === r ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setOpen(false)} className="flex-1 bg-muted text-foreground text-xs font-bold py-2.5 rounded-xl">Anulo</button>
              <button onClick={handleInterrupt} disabled={loading || !reason} className="flex-1 bg-black text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-50">Konfirmo</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}