import { useState } from 'react';
import { uploadOptimizedImage } from '@/lib/imageOptimize';
import { agentBatch } from '@/lib/agentWrite';
import { Camera, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Compact stadium photo button. "P1" = para fillimit, "P2" = në fund.
// Small inline button with a camera icon — intentionally low-profile so it
// doesn't dominate the agent panel. Shows a green check + tiny thumb when done.
export default function StadiumPhotoUpload({ match, matchCode, slot, onAfter }) {
  const field = slot === 'end' ? 'stadium_photo_end' : 'stadium_photo_start';
  const label = slot === 'end' ? 'P2' : 'P1';
  const existing = match?.[field];
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const { file_url } = await uploadOptimizedImage(file, { maxDim: 1280 });
      await agentBatch(matchCode, [{ op: 'updateMatch', data: { [field]: file_url } }]);
      toast.success('Foto u ruaj');
      if (onAfter) onAfter();
    } catch (err) {
      toast.error(err.message || 'Gabim gjatë ngarkimit');
    }
    setLoading(false);
    e.target.value = '';
  };

  return (
    <label
      title={slot === 'end' ? 'Foto e stadiumit (në fund)' : 'Foto e stadiumit (para fillimit)'}
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors select-none',
        existing ? 'border-green-500/40 bg-green-500/10 text-green-700' : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
        loading && 'opacity-60 pointer-events-none'
      )}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : existing ? <Check className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
      <span>{label}</span>
      {existing && <img src={existing} alt="" className="w-4 h-4 rounded object-cover" />}
      <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
    </label>
  );
}