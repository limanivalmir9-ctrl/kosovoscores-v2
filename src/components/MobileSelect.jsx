/**
 * MobileSelect — renders a native bottom-sheet Drawer on mobile,
 * falls back to the standard shadcn Select on desktop.
 *
 * Props mirror shadcn's <Select>:
 *   value, onValueChange, placeholder, children (SelectItem-like objects)
 *   options: [{ value: string, label: string }]
 *   triggerClassName?: string
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

export default function MobileSelect({
  value,
  onValueChange,
  placeholder = 'Zgjedh...',
  options = [],
  triggerClassName,
  disabled,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  const handleSelect = (val) => {
    onValueChange?.(val);
    setOpen(false);
  };

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setOpen(true)}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
        'focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        triggerClassName
      )}
    >
      <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
        {selected ? selected.label : placeholder}
      </span>
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
    </button>
  );

  if (!isMobile) {
    // Desktop: simple dropdown
    return (
      <div className="relative">
        {trigger}
        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-lg"
              >
                {options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                      opt.value === value && 'font-semibold text-primary'
                    )}
                  >
                    {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
                    {opt.value !== value && <span className="w-3.5 shrink-0" />}
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Mobile: bottom sheet
  return (
    <>
      {trigger}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl border-t border-border shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center mb-2">
                {placeholder}
              </p>
              <div className="max-h-[60vh] overflow-y-auto pb-4">
                {options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'flex w-full items-center gap-3 px-5 py-3.5 text-sm transition-colors active:bg-accent',
                      opt.value === value
                        ? 'font-bold text-primary bg-primary/5'
                        : 'text-foreground hover:bg-accent'
                    )}
                  >
                    {opt.value === value
                      ? <Check className="w-4 h-4 shrink-0 text-primary" />
                      : <span className="w-4 shrink-0" />
                    }
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}