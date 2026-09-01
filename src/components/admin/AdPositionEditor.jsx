import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { X, Move } from 'lucide-react';

// Simulated mobile page background with match groups
function MockPageContent() {
  return (
    <div className="w-full space-y-2 p-2 pointer-events-none select-none">
      {/* Nav bar mock */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-full opacity-60" />
      {/* Competition group 1 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1.5">
        <div className="h-3 bg-blue-200 rounded w-32 opacity-60" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
      </div>
      {/* Competition group 2 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1.5">
        <div className="h-3 bg-yellow-200 rounded w-28 opacity-60" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
      </div>
      {/* Competition group 3 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1.5">
        <div className="h-3 bg-green-200 rounded w-24 opacity-60" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
      </div>
      {/* Competition group 4 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1.5">
        <div className="h-3 bg-red-200 rounded w-20 opacity-60" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
      </div>
      {/* Competition group 5 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1.5">
        <div className="h-3 bg-purple-200 rounded w-36 opacity-60" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-50" />
      </div>
    </div>
  );
}

export default function AdPositionEditor({ ads, onClose, onSaved }) {
  const canvasRef = useRef(null);
  const [positions, setPositions] = useState(() => {
    const init = {};
    ads.forEach(ad => {
      init[ad.id] = {
        x: ad.pos_x ?? 50,
        y: ad.pos_y ?? 10,
      };
    });
    return init;
  });
  const dragging = useRef(null);
  const [saving, setSaving] = useState(false);

  const getRelPos = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const onMouseDown = (e, adId) => {
    e.preventDefault();
    dragging.current = adId;
  };

  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const pos = getRelPos(e.clientX, e.clientY);
    setPositions(prev => ({ ...prev, [dragging.current]: pos }));
  };

  const onMouseUp = () => { dragging.current = null; };

  // Touch support
  const onTouchStart = (e, adId) => {
    dragging.current = adId;
  };

  const onTouchMove = (e) => {
    if (!dragging.current) return;
    const touch = e.touches[0];
    const pos = getRelPos(touch.clientX, touch.clientY);
    setPositions(prev => ({ ...prev, [dragging.current]: pos }));
  };

  const onTouchEnd = () => { dragging.current = null; };

  const handleSave = async () => {
    setSaving(true);
    for (const ad of ads) {
      const pos = positions[ad.id];
      if (pos) {
        await base44.entities.Ad.update(ad.id, {
          placement: 'float',
          pos_x: Math.round(pos.x * 10) / 10,
          pos_y: Math.round(pos.y * 10) / 10,
        });
      }
    }
    setSaving(false);
    toast.success('Pozicionet u ruajtën');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-base">Pozicionimi i Reklamave</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tërhiq reklamat për t'i vendosur ku dëshiron</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-hidden p-4 flex gap-4">
          {/* Phone mock */}
          <div className="flex-1 min-w-0">
            <div className="w-full max-w-xs mx-auto">
              {/* Phone frame */}
              <div className="relative bg-gray-900 rounded-[32px] p-2 shadow-2xl">
                <div className="bg-background rounded-[24px] overflow-hidden"
                  style={{ height: '520px' }}
                >
                  {/* Scrollable mock content + draggable ads */}
                  <div
                    ref={canvasRef}
                    className="relative w-full h-full overflow-y-auto"
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    <MockPageContent />

                    {/* Draggable ad thumbnails */}
                    {ads.map((ad, idx) => {
                      const pos = positions[ad.id] || { x: 50, y: 10 + idx * 12 };
                      return (
                        <div
                          key={ad.id}
                          onMouseDown={(e) => onMouseDown(e, ad.id)}
                          onTouchStart={(e) => onTouchStart(e, ad.id)}
                          style={{
                            position: 'absolute',
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10,
                            cursor: 'grab',
                            userSelect: 'none',
                          }}
                          className="group"
                        >
                          <div className="relative">
                            <img
                              src={ad.image}
                              alt=""
                              draggable={false}
                              className="rounded-md shadow-lg border-2 border-primary object-cover"
                              style={{ width: '80px', height: '28px', objectFit: 'cover' }}
                            />
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                              {idx + 1}
                            </div>
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition-opacity">
                              <Move className="w-3 h-3 text-primary" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-2">Preview i faqes (scroll për të parë gjithë faqen)</p>
            </div>
          </div>

          {/* Legend */}
          <div className="w-48 shrink-0 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Reklamat</p>
            {ads.map((ad, idx) => (
              <div key={ad.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                <span className="bg-primary text-primary-foreground text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <img src={ad.image} alt="" className="w-12 h-7 rounded object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-muted-foreground font-mono">
                    X: {Math.round(positions[ad.id]?.x ?? 50)}%
                  </p>
                  <p className="text-[9px] text-muted-foreground font-mono">
                    Y: {Math.round(positions[ad.id]?.y ?? 10)}%
                  </p>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              💡 Pas ruajtjes, reklamat do shfaqen mbi faqen live me pozicionin e zgjedhur.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">Anulo</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Duke ruajtur...' : 'Ruaj Pozicionet'}
          </Button>
        </div>
      </div>
    </div>
  );
}