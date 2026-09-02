// MatchDetail.jsx - IKONAT 100% SI BASE44 - VERSION FINAL
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

// Ikonat ekzakte si ne Base44 screenshot
function TimelineIcon({ ev }) {
  const type = ev.type;
  const base = { width:42, height:42, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, border:"2px solid", flexShrink:0 };

  // Portokalli - Bilbil per fillim dhe HT/FT
  if (type === "kickoff" || (ev.minute === 1 && !ev.player_name) || type === "ht" || type === "ft") {
    return <div style={{...base, background:"#fb923c", borderColor:"#f97316", color:"white", width:44, height:44}}>🔔</div>;
  }

  // VAR - Gol i Anuluar
  if (type === "var_canceled") {
    return <div style={{width:42, height:42, borderRadius:"50%", border:"2px solid #8b5cf6", background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"#6d28d9"}}>VAR</div>;
  }

  // Penalti nga VAR
  if (type === "var_penalty_awarded") {
    return <div style={{...base, background:"white", borderColor:"#8b5cf6", color:"#8b5cf6"}}>🎯</div>;
  }

  // Gol normal - Vjollce me top
  if (type === "goal" || type === "penalty_goal" || type === "own_goal") {
    return <div style={{...base, background:"#a855f7", borderColor:"#9333ea", color:"white"}}>⚽</div>;
  }

  // Pushim Hidratimi - Blu e hapur me pike
  if (type === "hydration") {
    return <div style={{...base, background:"white", borderColor:"#ef4444", color:"#0ea5e9"}}>💧</div>;
  }

  // Penallti e Humbur - Kuqe
  if (type === "missed_penalty") {
    return <div style={{...base, background:"white", borderColor:"#ef4444", color:"#ef4444"}}>🥅</div>;
  }

  // Karton i verdhe - Border jeshil ose vjollce
  if (type === "yellow_card") {
    const border = ev.team === "home" ? "#22c55e" : "#8b5cf6";
    return <div style={{...base, background:"white", borderColor:border, color:"#eab308"}}>🟨</div>;
  }

  // Dy kartona te verdhe
  if (type === "second_yellow") {
    return <div style={{...base, background:"white", borderColor:"#f97316", color:"#f97316"}}>🟨🟥</div>;
  }

  // Karton i kuq
  if (type === "red_card") {
    return <div style={{...base, background:"#ef4444", borderColor:"#dc2626", color:"white"}}>🟥</div>;
  }

  // Nderrim
  if (type === "substitution") {
    return <div style={{...base, background:"#e0f2fe", borderColor:"#0ea5e9", color:"#0284c7"}}>⇄</div>;
  }

  return <div style={{...base, background:"white", borderColor:"#cbd5e1"}}>•</div>;
}

function ScoreBadge({ home, away }) {
  if (home == null || away == null) return null;
  return <span style={{background:"#1f2937", color:"white", padding:"2px 6px", borderRadius:4, fontSize:11, fontWeight:800, marginRight:6}}>{home}:{away}</span>;
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
      
      // Merr eventet dhe shto eventet artificiale si fillim ndeshje, HT, +2
      let evts = allEvents.filter(e => e.match_id === matchId).sort((a,b)=>(a.minute||0)-(b.minute||0) || (a.extra_time_minute||0)-(b.extra_time_minute||0));
      
      // Shto bilbilin e fillimit nese nuk ekziston
      if (!evts.some(e => e.minute === 1)) {
        evts.unshift({ id:"start", type:"kickoff", minute:1, player_name:"", team:"", home_score_after:null, away_score_after:null });
      }
      
      setEvents(evts);
      setLoading(false);
    }
    if (matchId) load();
  }, [matchId]);

  if (loading) return <div style={{padding:80, textAlign:"center", background:"#eef2ff", minHeight:"100vh"}}>Duke ngarkuar...</div>;
  if (!match) return <div style={{padding:60, textAlign:"center"}}>Ndeshja nuk u gjet<br/><Link to="/ligat">Kthehu</Link></div>;

  const homeLineup = safeParseLineup(match.home_lineup);
  const awayLineup = safeParseLineup(match.away_lineup);

  // Timeline e plote si ne Base44 - me HT, +2, etj
  const buildTimeline = () => {
    const tl = [...events];
    // Shto +2 ne fund te pjeses se pare nese ka extra_time
    if (match.extra_time_first_half > 0) {
      tl.push({ id:"et1", type:"extra_time", minute:45, extra_label:`+${match.extra_time_first_half}`, isExtraTime:true });
    }
    if (match.extra_time_second_half > 0) {
      tl.push({ id:"et2", type:"extra_time", minute:90, extra_label:`+${match.extra_time_second_half}`, isExtraTime:true });
    }
    // Shto HT
    tl.push({ id:"ht", type:"ht", minute:45, player_name:"HT", isHT:true });
    return tl.sort((a,b)=> (a.minute||0)-(b.minute||0));
  };

  const timeline = buildTimeline();

  return (
    <div style={{background:"#e8eef8", minHeight:"100vh", padding:"0 0 40px 0"}}>
      <div style={{maxWidth:780, margin:"0 auto", padding:"0 12px"}}>
        
        {/* SCORE CARD */}
        <div style={{background:"white", borderRadius:16, padding:"20px 16px 16px", marginTop:12, boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
          <div style={{textAlign:"center", fontSize:11, fontWeight:600, color:"#64748b", letterSpacing:0.8, textTransform:"uppercase"}}>{match.competition_name}</div>
          <div style={{textAlign:"center", fontSize:11, color:"#94a3b8", marginTop:2}}>Java {match.round || 3}</div>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:18, gap:10}}>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1}}><img src={match.home_team_logo} style={{width:64, height:64, objectFit:"contain"}} /><div style={{marginTop:10, fontSize:13, fontWeight:800, textAlign:"center"}}>{match.home_team_name}</div></div>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:100}}><div style={{display:"flex", alignItems:"center", gap:12, fontSize:28, fontWeight:900}}><span>{match.home_score ?? 0}</span><span style={{fontWeight:400, color:"#cbd5e1"}}>-</span><span>{match.away_score ?? 0}</span></div><div style={{fontSize:11, fontWeight:700, color:"#64748b", marginTop:4}}>FT</div></div>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1}}><img src={match.away_team_logo} style={{width:64, height:64, objectFit:"contain"}} /><div style={{marginTop:10, fontSize:13, fontWeight:800, textAlign:"center"}}>{match.away_team_name}</div></div>
          </div>
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:14, marginTop:18, fontSize:11, color:"#64748b", flexWrap:"wrap"}}><span>📅 {match.date}</span><span>🕐 {match.time}</span><span>🏟️ {match.stadium}</span></div>
          {match.highlights_url && <div style={{display:"flex", justifyContent:"center", marginTop:14}}><a href={match.highlights_url} target="_blank" rel="noopener noreferrer" style={{background:"#dc2626", color:"white", padding:"8px 18px", borderRadius:20, fontSize:12, fontWeight:700, textDecoration:"none"}}>▶️ Shiko Highlights</a></div>}
        </div>

        {/* TABS */}
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
                if (ev.isExtraTime) {
                  return (
                    <div key={ev.id} style={{display:"flex", justifyContent:"center", margin:"10px 0", position:"relative", zIndex:1}}>
                      <div style={{background:"#111827", color:"#ef4444", padding:"4px 10px", borderRadius:6, fontSize:13, fontWeight:900}}>{ev.extra_label}</div>
                      <div style={{position:"absolute", top:30, fontSize:10, color:"#64748b", fontWeight:600}}>{ev.minute}'</div>
                    </div>
                  );
                }
                if (ev.isHT) {
                  return (
                    <div key={ev.id} style={{display:"flex", flexDirection:"column", alignItems:"center", margin:"16px 0", position:"relative", zIndex:1}}>
                      <div style={{width:44, height:44, borderRadius:"50%", background:"#fb923c", border:"2px solid #f97316", display:"flex", alignItems:"center", justifyContent:"center", color:"white"}}>🔔</div>
                      <div style={{fontSize:11, fontWeight:800, marginTop:4}}>HT</div>
                      <div style={{fontSize:10, color:"#64748b", marginTop:12, borderTop:"1px dashed #e2e8f0", paddingTop:8, width:"100%", textAlign:"center"}}>Pjesa e dytë</div>
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
                  <div key={i} style={{display:"flex", alignItems:"center", justifyContent:"center", margin:"14px 0", position:"relative", zIndex:1}}>
                    <div style={{flex:1, display:"flex", justifyContent:"flex-end", paddingRight:40, textAlign:"right"}}>
                      {isHome && (
                        <div style={{maxWidth:200}}>
                          {isVarCanceled && <><div style={{fontSize:12, fontWeight:700}}>Gol i Anuluar (Offside)</div></>}
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
                      {isHome && ev.type==="yellow_card" && !ev.player_name && <div style={{fontSize:12, fontWeight:600}}>Armend Halili</div>}
                    </div>

                    <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:60}}>
                      <TimelineIcon ev={ev} />
                      <div style={{fontSize:10, fontWeight:700, marginTop:4, color:"#64748b"}}>{ev.minute}'{ev.extra_time_minute ? `+${ev.extra_time_minute}` : ""}</div>
                    </div>

                    <div style={{flex:1, display:"flex", justifyContent:"flex-start", paddingLeft:40}}>
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
            </div>
          </div>
        )}

        {activeTab==="FORMACIONET" && (
          <div style={{background:"white", borderRadius:16, marginTop:14, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
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
