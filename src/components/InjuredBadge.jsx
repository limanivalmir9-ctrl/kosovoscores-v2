import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * InjuredBadge — red medical "plus" badge shown when a player is injured.
 * size: 'sm' (inline badges) | 'xs' (tiny, for match rows)
 */
export default function InjuredBadge({ size = 'sm', className = '' }) {
  const box = size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const icon = size === 'xs' ? 9 : 11;
  return (
    <span
      title="I lënduar"
      aria-label="I lënduar"
      className={cn('inline-flex items-center justify-center rounded-full bg-red-500 text-white shrink-0', box, className)}
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.18)' }}
    >
      <Plus style={{ width: icon, height: icon, strokeWidth: 3, lineHeight: 1 }} />
    </span>
  );
}