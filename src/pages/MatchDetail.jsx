// MatchDetail.jsx - IKONAT 100% IDENTIKE ME BASE44 - VERSION FINAL ME SVG
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

async function loadJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data || []);
  } catch { return []; }
}

function safeParseLineup(str) {
  if (!str || str === "[]" || str === "") return [];
  try {
    const parsed = typeof str === "string" ? JSON.parse(str) : str;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// Ikonat ekzakte SVG si Base44
function TimelineIcon({ type, team }) {
  const size = 38;
  const common = { width: size, height: size, borderRadius: "50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"2.5px solid" };

  if (type === "kickoff" || type === "ht" || type === "ft") {
    return (
      <div style={{...common, background:"#ff8c00", borderColor:"#f97316", color:"white"}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 3c-4 0-7 2-7 5v3c0 2.5 1.5 4.5 4 5v2H7v2h10v-2h-2v-2c2.5-.5 4-2.5 4-5V8c0-3-3-5-7-5zm-3 10c-1.5 0-2.5-1-2.5-2.5S7.5 8 9 8s2.5 1 2.5 2.5S10.5 13 9 13zm6 0c-1.5 0-2.5-1-2.5-2.5S13.5 8 15 8s2.5 1 2.5 2.5S16.5 13 15 13z"/></svg>
      </div>
    );
  }

  if (type === "var_canceled") {
    return (
      <div style={{...common, background:"white", borderColor:"#8b5cf6", color:"#6d28d9", fontSize:8, fontWeight:900, letterSpacing:0.5}}>VAR</div>
    );
  }

  if (type === "var_penalty_awarded") {
    return (
      <div style={{...common, background:"white", borderColor:"#8b5cf6"}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="#8b5cf6"/></svg>
      </div>
    );
  }

  if (type === "goal" || type === "penalty_goal") {
    return (
      <div style={{...common, background:"#8b5cf6", borderColor:"#7c3aed"}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c1.5 0 2.9.4 4.1 1.1l-2.3 2.3c-.6-.3-1.3-.5-2-.5s-1.4.2-2 .5L7.9 5.1C9.1 4.4 10.5 4 12 4zm-6 6c0-1.5.4-2.9 1.1-4.1l2.3 2.3c-.3.6-.5 1.3-.5 2s.2 1.4.5 2L5.1 14.1C4.4 12.9 4 11.5 4 10zm6 6c-1.5 0-2.9-.4-4.1-1.1l2.3-2.3c.6.3 1.3.5 2 .5s1.4-.2 2-.5l2.3 2.3C14.9 15.6 13.5 16 12 16zm6-6c0 1.5-.4 2.9-1.1 4.1l-2.3-2.3c.3-.6.5-1.3.5-2s-.2-1.4-.5-2l2.3-2.3c.7 1.2 1.1 2.6 1.1 4.1z"/></svg>
      </div>
    );
  }

  if (type === "hydration") {
    return (
      <div style={{...common, background:"white", borderColor:"#ef4444"}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0ea5e9"><path d="M12 2C12 2 5 10 5 15c0 3.87 3.13 7 7 7s7-3.13 7-7c0-5-7-13-7-13zm0 18c-2.76 0-5-2.24-5-5 0-2.5 2.5-5.5 5-8.5 2.5 3 5 6 5 8.5 0 2.76-2.24 5-5 5z"/></svg>
      </div>
    );
  }

  if (type === "missed_penalty") {
    return (
      <div style={{...common, background:"white", borderColor:"#ef4444"}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
      </div>
    );
  }

  if (type === "yellow_card") {
    const borderColor = team === "home" ? "#22c55e" : "#8b5cf6";
    return (
      <div style={{...common, background:"white", borderColor}}>
        <div style={{width:12, height:16, background:"#facc15", borderRadius:2, border:"1px solid #eab308"}}></div>
      </div>
    );
  }

  if (type === "second_yellow") {
    return (
      <div style={{...common, background:"white", borderColor:"#f97316", flexDirection:"column", gap:1}}>
        <div style={{width:10, height:7, background:"#facc15", borderRadius:1}}></div>
        <div style={{width:10, height:7, background:"#ef4444", borderRadius:1}}></div>
      </div>
    );
  }

  if (type === "red_card") {
    return (
      <div style={{...common, background:"#ef4444", borderColor:"#dc2626"}}>
        <div style={{width:12, height:16, background:"#ef4444", borderRadius:2}}></div>
      </div>
    );
  }

  if (type === "substitution") {
    return (
      <div style={{...common, background:"#e0f2fe", borderColor:"#0ea5e9"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2"><path d="M17 3l4 4-4 4"/><path d="M21 7H9"/><path d="M7 21l-4-4 4-4"/><path d="M3 17h12"/></svg>
      </div>
    );
  }

  return <div style={{...common, background:"white", borderColor:"#cbd5e1"}}>•</div>;
}

function ScoreBadge({ home, away }) {
  if (home == null || away == null) return null;
  return <span style={{background:"#111827", color:"white", padding:"2px 6px", borderRadius:4, fontSize:11, fontWeight:800, marginRight:6}}>{home}:{away}</span>;
}

export default function MatchDetail() {
  const { id } = useParams();
  const matchId = id || window.location.pathname.split('/ndeshja/')[1]?.split('/')[0] || "";
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("NGJARJET");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [allMatches, allEvents] = await Promise.all([
        loadJSON("/data/Match.json"),
        loadJSON("/data/MatchEvent.json"),
      ]);
      const m = allMatches.find(x => x.id === matchId);
      if (!m) { setLoading(false); return; }
      setMatch(m);
      let evts = allEvents.filter(e => e.match_id === matchId).sort((a,b)=>(a.minute||0)-(b.minute||0));
      if (!evts.some(e => e.minute <=1)) {
        evts.unshift({ id:"start", type:"kickoff", minute:1, player_name:"", team:"home" });
      }
      setEvents(evts);
      setLoading(false);
    }
    if (matchId) load();
  }, [matchId]);

  if (loading) return <div style={{padding:80, textAlign:"center", background:"#eef2ff", minHeight:"100vh"}}>Duke ngarkuar...</div>;
  if (!match) return <div style={{padding:60, textAlign:"center"}}>Ndeshja nuk u gjet</div>;

  const homeLineup = safeParseLineup(match.home_lineup);
  const awayLineup = safeParseLineup(match.away_lineup);

  const timeline = [...events].sort((a,b)=> (a.minute||0)-(b.minute||0));

  return (
    <div style={{background:"#e8eef8", minHeight:"100vh", padding:"0 0 40px 0"}}>
      <div style={{maxWidth:780, margin:"0 auto", padding:"0 12px"}}>
        
        <div style={{background:"white", borderRadius:16, padding:"20px 16px 16px", marginTop:12, boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
          <div style={{textAlign:"center", fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase"}}>{match.competition_name}</div>
          <div style={{textAlign:"center", fontSize:11, color:"#94a3b8", marginTop:2}}>Java {match.round}</div>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:18, gap:10}}>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1}}><img src={match.home_team_logo} style={{width:64, height:64, objectFit:"contain"}} /><div style={{marginTop:10, fontSize:13, fontWeight:800, textAlign:"center"}}>{match.home_team_name}</div></div>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:100}}><div style={{display:"flex", alignItems:"center", gap:12, fontSize:28, fontWeight:900}}><span>{match.home_score ?? 0}</span><span style={{fontWeight:400, color:"#cbd5e1"}}>-</span><span>{match.away_score ?? 0}</span></div><div style={{fontSize:11, fontWeight:700, color:"#64748b", marginTop:4}}>FT</div></div>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1}}><img src={match.away_team_logo} style={{width:64, height:64, objectFit:"contain"}} /><div style={{marginTop:10, fontSize:13, fontWeight:800, textAlign:"center"}}>{match.away_team_name}</div></div>
          </div>
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:14, marginTop:18, fontSize:11, color:"#64748b", flexWrap:"wrap"}}><span>📅 {match.date}</span><span>🕐 {match.time}</span><span>🏟️ {match.stadium}</span></div>
        </div>

        <div style={{display:"flex", gap:20, marginTop:16, padding:"0 8px", borderBottom:"1px solid #e2e8f0"}}>
          {["NGJARJET","FORMACIONET","GJYQTARËT"].map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"10px 2px", background:"none", border:"none", borderBottom: activeTab===tab ? "2px solid #0f172a" : "2px solid transparent", fontSize:12, fontWeight: activeTab===tab ? 800 : 600, color: activeTab===tab ? "#0f172a" : "#64748b", cursor:"pointer"}}>{tab}</button>
          ))}
        </div>

        {activeTab==="NGJARJET" && (
          <div style={{background:"white", borderRadius:16, marginTop:14, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
            <div style={{padding:"14px 16px", fontSize:13, fontWeight:800, display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #f1f5f9"}}>⏱️ TIMELINE</div>

            <div style={{position:"relative", padding:"10px 0 20px"}}>
              <div style={{position:"absolute", left:"50%", top:0, bottom:0, width:2, background:"#e2e8f0", transform:"translateX(-50%)"}}></div>
              <div style={{display:"flex", justifyContent:"space-between", padding:"8px 20px 16px", position:"relative", zIndex:1}}>
                <span style={{background:"#fee2e2", color:"#dc2626", padding:"4px 10px", borderRadius:12, fontSize:10, fontWeight:800}}>{match.home_team_name?.substring(0,12).toUpperCase()}</span>
                <span style={{background:"#e0e7ff", color:"#4338ca", padding:"4px 10px", borderRadius:12, fontSize:10, fontWeight:800}}>{match.away_team_name?.substring(0,15).toUpperCase()}</span>
              </div>

              {timeline.map((ev, i)=>{
                if (ev.type === "extra_time") {
                  return (
                    <div key={ev.id} style={{display:"flex", justifyContent:"center", margin:"10px 0", position:"relative", zIndex:1}}>
                      <div style={{background:"#111827", color:"#ef4444", padding:"4px 10px", borderRadius:6, fontSize:13, fontWeight:900}}>{ev.extra_label}</div>
                    </div>
                  );
                }
                if (ev.type === "ht") {
                  return (
                    <div key={ev.id} style={{display:"flex", flexDirection:"column", alignItems:"center", margin:"16px 0", position:"relative", zIndex:1}}>
                      <TimelineIcon type="ht" />
                      <div style={{fontSize:11, fontWeight:800, marginTop:4}}>HT</div>
                    </div>
                  );
                }

                const isHome = ev.team === "home";
                const showScore = ev.home_score_after != null && ev.away_score_after != null && (ev.type === "goal" || ev.type === "penalty_goal");
                const isVarCanceled = ev.type === "var_canceled";
                const isVarPenalty = ev.type === "var_penalty_awarded";
                const isHydration = ev.type === "hydration";
                const isMissed = ev.type === "missed_penalty";

                return (
                  <div key={i} style={{display:"flex", alignItems:"center", justifyContent:"center", margin:"18px 0", position:"relative", zIndex:1}}>
                    <div style={{flex:1, display:"flex", justifyContent:"flex-end", paddingRight:36, textAlign:"right"}}>
                      {isHome && (
                        <div style={{maxWidth:200}}>
                          {isVarCanceled && <div style={{fontSize:12, fontWeight:700}}>Gol i Anuluar ({ev.cancellation_reason || "Offside"})</div>}
                          {isVarPenalty && <div style={{fontSize:12, fontWeight:700}}>Penalti nga VAR</div>}
                          {isHydration && <div style={{fontSize:12, fontWeight:600}}>Pushim Hidratimi</div>}
                          {!isVarCanceled && !isVarPenalty && !isHydration && (
                            <>
                              <div style={{fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6}}>
                                {showScore && <ScoreBadge home={ev.home_score_after} away={ev.away_score_after} />}
                                <span>{ev.player_name}</span>
                              </div>
                              {ev.assist_player_name && <div style={{fontSize:11, color:"#64748b"}}>ass. {ev.assist_player_name}</div>}
                              {isMissed && <div style={{fontSize:11, color:"#94a3b8"}}>(Penalti e Humbur)</div>}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:60}}>
                      <TimelineIcon type={ev.type} team={ev.team} />
                      <div style={{fontSize:10, fontWeight:700, marginTop:5, color:"#64748b"}}>{ev.minute}'{ev.extra_time_minute ? `+${ev.extra_time_minute}` : ""}</div>
                    </div>

                    <div style={{flex:1, display:"flex", justifyContent:"flex-start", paddingLeft:36}}>
                      {!isHome && (
                        <div style={{maxWidth:200}}>
                          {isVarCanceled && <div style={{fontSize:12, fontWeight:700}}>Gol i Anuluar ({ev.cancellation_reason || "Offside"})</div>}
                          {isVarPenalty && <div style={{fontSize:12, fontWeight:700}}>Penalti nga VAR</div>}
                          {isHydration && <div style={{fontSize:12, fontWeight:600}}>Pushim Hidratimi</div>}
                          {!isVarCanceled && !isVarPenalty && !isHydration && (
                            <>
                              <div style={{fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:6}}>
                                {showScore && <ScoreBadge home={ev.home_score_after} away={ev.away_score_after} />}
                                <span>{ev.player_name}</span>
                              </div>
                              {ev.assist_player_name && <div style={{fontSize:11, color:"#64748b"}}>ass. {ev.assist_player_name}</div>}
                              {ev.type==="penalty_goal" && <div style={{fontSize:11, color:"#64748b"}}>(Penalti)</div>}
                              {isMissed && <div style={{fontSize:11, color:"#94a3b8"}}>(Penalti e Humbur)</div>}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* +2 dhe HT si ne screenshot */}
              {match.extra_time_first_half > 0 && (
                <div style={{display:"flex", justifyContent:"center", margin:"12px 0", position:"relative", zIndex:1}}>
                  <div style={{background:"#111827", color:"#ef4444", padding:"4px 10px", borderRadius:6, fontSize:13, fontWeight:900}}>+{match.extra_time_first_half}</div>
                </div>
              )}
              <div style={{display:"flex", flexDirection:"column", alignItems:"center", margin:"18px 0", position:"relative", zIndex:1}}>
                <div style={{width:42, height:42, borderRadius:"50%", background:"#ff8c00", border:"2.5px solid #f97316", display:"flex", alignItems:"center", justifyContent:"center"}}>🔔</div>
                <div style={{fontSize:11, fontWeight:800, marginTop:4}}>HT</div>
                <div style={{fontSize:11, color:"#64748b", marginTop:8}}>Pjesa e dytë</div>
              </div>
            </div>
          </div>
        )}

        {activeTab==="FORMACIONET" && (
          <div style={{background:"white", borderRadius:16, marginTop:14, padding:16}}>
            {homeLineup.length===0 ? <div style={{textAlign:"center", color:"#94a3b8", padding:20}}>Formacionet nuk jane te disponueshme</div> : (
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                <div><div style={{fontSize:12, fontWeight:800, marginBottom:10}}>{match.home_team_name}</div>{homeLineup.filter(p=>p.starter!==false).map((p,i)=><div key={i} style={{display:"flex", gap:8, padding:"6px 0", fontSize:12, borderBottom:"1px solid #f8fafc"}}><span style={{fontWeight:700, minWidth:20}}>{p.number}</span><span>{p.name}</span></div>)}</div>
                <div><div style={{fontSize:12, fontWeight:800, marginBottom:10}}>{match.away_team_name}</div>{awayLineup.filter(p=>p.starter!==false).map((p,i)=><div key={i} style={{display:"flex", gap:8, padding:"6px 0", fontSize:12, borderBottom:"1px solid #f8fafc"}}><span style={{fontWeight:700, minWidth:20}}>{p.number}</span><span>{p.name}</span></div>)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
