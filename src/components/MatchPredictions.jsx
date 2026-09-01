import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Generate or retrieve a persistent anonymous session ID
function getSessionId() {
  let sid = localStorage.getItem('ks_session_id');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('ks_session_id', sid);
  }
  return sid;
}

export default function MatchPredictions({ matchId, homeName, awayName, matchStatus }) {
  const [predictions, setPredictions] = useState([]);
  const [myVote, setMyVote] = useState(null); // 'home' | 'draw' | 'away' | null
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const sessionId = getSessionId();

  const isFinished = ['full_time', 'cancelled', 'interrupted'].includes(matchStatus) || !!matchStatus?.includes('full_time');
  const isStarted = isFinished || ['first_half','second_half','half_time','awaiting_extra_time','extra_time_first_half','extra_time_half_time','extra_time_second_half','penalties'].includes(matchStatus);
  const isClosed = isStarted;

  const loadPredictions = useCallback(async () => {
    const preds = await base44.entities.MatchPrediction.filter({ match_id: matchId }, '-created_date', 500);
    setPredictions(preds);
    const mine = preds.find(p => p.session_id === sessionId);
    if (mine) setMyVote(mine.vote);
    setLoading(false);
  }, [matchId, sessionId]);

  useEffect(() => {
    loadPredictions();
    const unsub = base44.entities.MatchPrediction.subscribe(() => loadPredictions());
    return () => unsub();
  }, [loadPredictions]);

  const handleVote = async (vote) => {
    if (voting || myVote || isClosed) return;
    setVoting(true);
    setMyVote(vote); // optimistic
    try {
      await base44.entities.MatchPrediction.create({ match_id: matchId, session_id: sessionId, vote });
      await loadPredictions();
    } catch {
      setMyVote(null);
    }
    setVoting(false);
  };

  // Tally votes
  const total = predictions.length || 0;
  const homeCount = predictions.filter(p => p.vote === 'home').length;
  const drawCount = predictions.filter(p => p.vote === 'draw').length;
  const awayCount = predictions.filter(p => p.vote === 'away').length;
  const homePct = total ? Math.round((homeCount / total) * 100) : 0;
  const drawPct = total ? Math.round((drawCount / total) * 100) : 0;
  const awayPct = total ? Math.round((awayCount / total) * 100) : 0;

  const options = [
    { key: 'home', label: homeName || 'Vendas', pct: homePct, count: homeCount, color: 'bg-primary', textColor: 'text-primary' },
    { key: 'draw', label: 'Barazim', pct: drawPct, count: drawCount, color: 'bg-muted-foreground', textColor: 'text-muted-foreground' },
    { key: 'away', label: awayName || 'Mysafir', pct: awayPct, count: awayCount, color: 'bg-orange-500', textColor: 'text-orange-500' },
  ];

  // Hide entirely when match is finished
  if (isFinished) return null;

  // Compact results-only view when match has started
  if (isStarted && !loading) {
    if (total === 0) return null;
    return (
      <div className="mt-4 bg-card rounded-2xl border border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide shrink-0">🔮 Parashikimi</span>
          <div className="flex-1 flex items-center gap-2">
            {options.map(opt => (
              <div key={opt.key} className="flex-1 text-center">
                <div className="text-[10px] font-black">{opt.pct}%</div>
                <div className="h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                  <div className={`h-full rounded-full ${opt.color} opacity-70`} style={{ width: `${opt.pct}%` }} />
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5 truncate">{opt.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">🔮 Parashikimi</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Vote buttons */}
          {!myVote && (
            <div className="flex gap-2 mb-4">
              {options.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleVote(opt.key)}
                  disabled={voting}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold transition-all hover:border-primary hover:text-primary hover:bg-primary/5 active:scale-95 disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Results bars */}
          {(myVote || total > 0) && (
            <div className="space-y-2.5">
              {options.map(opt => (
                <div key={opt.key}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className={`font-bold ${myVote === opt.key ? opt.textColor : 'text-foreground'}`}>
                      {opt.label}
                      {myVote === opt.key && <span className="ml-1 text-[9px]">✓ Vota jote</span>}
                    </span>
                    <span className="font-black">{opt.pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${opt.color} ${myVote === opt.key ? 'opacity-100' : 'opacity-60'}`}
                      style={{ width: `${opt.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {total === 0 && !myVote && (
            <p className="text-center text-[10px] text-muted-foreground mt-1">Bëhu i pari që parashikon!</p>
          )}
        </>
      )}
    </div>
  );
}