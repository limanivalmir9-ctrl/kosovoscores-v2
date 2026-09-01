import { Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const TYPE_LABEL = { Ligen: 'Kampionati (Ligen)', Kupen: 'Kupa', Superkupen: 'Superkupa' };

export default function TrophySection({ trophies, loaded }) {
  const [typeIcons, setTypeIcons] = useState({ Ligen: '', Kupen: '', Superkupen: '' });

  // Ngarko ikonat e përbashkëta të trofeve (vENDOSUR NJË HERË nga admini për çdo garë)
  useEffect(() => {
    base44.entities.AppSettings.list('-created_date', 5).then(settings => {
      if (settings[0]) {
        setTypeIcons({
          Ligen: settings[0].trophy_icon_ligen || '',
          Kupen: settings[0].trophy_icon_kupen || '',
          Superkupen: settings[0].trophy_icon_superkupen || '',
        });
      }
    }).catch(() => {});
  }, []);

  const visibleTypes = ['Ligen', 'Kupen', 'Superkupen'].filter(type => trophies.some(t => t.competition_type === type));

  return (
    <div className="bg-card rounded-2xl border border-border p-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        Trofetë e Klubit
      </h3>
      {trophies.length === 0 ? (
        loaded ? (
          <div className="text-center py-4 text-muted-foreground text-xs">
            <Trophy className="w-7 h-7 mx-auto mb-1.5 text-muted-foreground/30" />
            Nuk ka trofe të regjistruara
          </div>
        ) : (
          <div className="flex justify-center py-3">
            <div className="w-5 h-5 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )
      ) : (
        <div>
          {visibleTypes.map((type, idx) => {
            const typeTrophies = trophies.filter(t => t.competition_type === type);
            const total = typeTrophies.reduce((sum, t) => sum + (t.count || 1), 0);
            const icon = typeIcons[type];
            return (
              <div key={type}>
                {/* Vija ndarëse e bukur midis garave */}
                {idx > 0 && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent" />
                  </div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABEL[type]}
                  </span>
                  <span className="text-xs font-black text-primary">×{total}</span>
                </div>
                {/* Çdo trofe në kornizë të vogël me sezonin poshtë, qendër (30% më e vogël) */}
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1">
                  {typeTrophies.map((t, i) => {
                    const img = t.trophy_image || icon;
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5 bg-yellow-50/30 border border-yellow-200/50 rounded-lg p-1">
                        {img ? (
                          <img src={img} alt="" className="w-6 h-6 md:w-7 md:h-7 object-contain" />
                        ) : (
                          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                          </div>
                        )}
                        {(t.count || 1) > 1 && (
                          <span className="text-[9px] font-bold text-primary leading-none">×{t.count}</span>
                        )}
                        {t.season ? (
                          <span className="text-[8px] text-muted-foreground text-center leading-tight break-all">{t.season}</span>
                        ) : (
                          <span className="text-[8px] text-muted-foreground/40 leading-none">–</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}