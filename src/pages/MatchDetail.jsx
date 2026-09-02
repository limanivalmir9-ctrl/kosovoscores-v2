// MatchDetail.jsx - VERSION 100% BASE44 EXAKT
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
    if (typeof str === "string") {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    }
    return Array.isArray(str) ? str : [];
  } catch { return []; }
}

function EventIcon({ type, small }) {
  const size = small ? 32 : 40;
  const style = { width: size, height: size, borderRadius: "50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize: small ? 16 : 18, fontWeight:700, border:"2px solid" };
  
  if (type === "goal") return <div style={{...style, background:"#e8f5e9", borderColor:"#4caf50", color:"#2e7d32"}}>⚽</div>;
  if (type === "own_goal") return <div style={{...style, background:"#ffebee", borderColor:"#ef5350", color:"#c62828"}}>⚽</div>;
  if (type === "penalty_missed" || type === "penalti_humbur") return <div style={{...style, background:"#fff", borderColor:"#ef5350", color:"#ef5350"}}>🥅</div>;
  if (type === "yellow_card") return <div style={{...style, background:"#fff9c4", borderColor:"#fbc02d", color:"#f9a825"}}>🟨</div>;
  if (type === "red_card") return <div style={{...style, background:"#ffebee", borderColor:"#ef5350", color:"#ef5350"}}>🟥</div>;
  if (type === "second_yellow") return <div style={{...style, background:"#fff3e0", borderColor:"#ff9800"}}>🟨🟥</div>;
  if (type === "substitution") return <div style={{...style, background:"#e3f2fd", borderColor:"#42a5f5", color:"#1565c0"}}>🔄</div>;
  if (type === "water_break" || type === "hydration") return <div style={{...style, background:"#e1f5fe", borderColor:"#03a9f4"}}>💧</div>;
  if (type === "kickoff" || type === "start") return <div style={{...style, background:"#fff8e1", borderColor:"#ffb300", color:"#ff8f00"}}>📯</div>;
  return <div style={{...style, background:"#f5f5f5", borderColor:"#bdbdbd"}}>•</div>;
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
      const evts = allEvents.filter(e => e.match_id === matchId).sort((a,b)=>(a.minute||0)-(b.minute||0));
      setEvents(evts);
      setLoading(false);
    }
    if (matchId) load();
  }, [matchId]);

  if (loading) return <div style={{padding:80, textAlign:"center", background:"#eef2ff", minHeight:"100vh"}}>Duke ngarkuar...</div>;
  if (!match) return <div style={{padding:60, textAlign:"center"}}>Ndeshja nuk u gjet<br/><Link to="/ligat">Kthehu</Link></div>;

  const homeLineup = safeParseLineup(match.home_lineup);
  const awayLineup = safeParseLineup(match.away_lineup);
  const homeStarters = homeLineup.filter(p => p.starter !== false);
  const awayStarters = awayLineup.filter(p => p.starter !== false);
  const homeSubs = homeLineup.filter(p => p.starter === false);
  const awaySubs = awayLineup.filter(p => p.starter === false);

  // Map events to readable type
  const mappedEvents = events.map(ev => {
    let type = ev.type;
    const desc = (ev.description || "").toLowerCase();
    if (type === "yellow_card" && desc.includes("second")) type = "second_yellow";
    if (ev.is_own_goal) type = "own_goal";
    if (ev.is_penalty && type === "goal") type = "goal"; // penalty goal
    if (type === "goal" && (desc.includes("humbur") || desc.includes("missed"))) type = "penalty_missed";
    if (desc.includes("hidratimi") || desc.includes("water") || desc.includes("pushim")) type = "water_break";
    if ((ev.minute||0) === 0 || (ev.minute===1 && type==="")) type = "kickoff";
    return { ...ev, displayType: type };
  });

  return (
    <div style={{background:"#e8eef8", minHeight:"100vh", padding:"0 0 40px 0"}}>
      <div style={{maxWidth:780, margin:"0 auto", padding:"0 12px"}}>
        
        {/* TOP SCORE CARD - SI BASE44 */}
        <div style={{background:"white", borderRadius:16, padding:"20px 16px 16px", marginTop:12, boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
          <div style={{textAlign:"center", fontSize:11, fontWeight:600, color:"#64748b", letterSpacing:0.8, textTransform:"uppercase"}}>{match.competition_name || "ALBI MALL SUPERLIGA"}</div>
          <div style={{textAlign:"center", fontSize:11, color:"#94a3b8", marginTop:2}}>Java {match.round || 3}</div>
          
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:18, gap:10}}>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1}}>
              <img src={match.home_team_logo} alt={match.home_team_name} style={{width:64, height:64, objectFit:"contain"}} />
              <div style={{marginTop:10, fontSize:13, fontWeight:800, textAlign:"center"}}>{match.home_team_name}</div>
            </div>

            <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:100}}>
              <div style={{display:"flex", alignItems:"center", gap:12, fontSize:28, fontWeight:900}}>
                <span>{match.home_score ?? 0}</span>
                <span style={{fontWeight:400, color:"#cbd5e1"}}>-</span>
                <span>{match.away_score ?? 0}</span>
              </div>
              <div style={{fontSize:11, fontWeight:700, color:"#64748b", marginTop:4, letterSpacing:0.5}}>FT</div>
            </div>

            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1}}>
              <img src={match.away_team_logo} alt={match.away_team_name} style={{width:64, height:64, objectFit:"contain"}} />
              <div style={{marginTop:10, fontSize:13, fontWeight:800, textAlign:"center"}}>{match.away_team_name}</div>
            </div>
          </div>

          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:14, marginTop:18, fontSize:11, color:"#64748b", flexWrap:"wrap"}}>
            <span>📅 {match.date || "2026-08-28"}</span>
            <span>🕐 {match.time || "16:30"}</span>
            <span>🏟️ {match.stadium || "Stadiumi Bajram Aliu - Skënderaj"}</span>
          </div>

          {match.highlights_url && (
            <div style={{display:"flex", justifyContent:"center", marginTop:14}}>
              <a href={match.highlights_url} target="_blank" rel="noopener noreferrer" style={{background:"#dc2626", color:"white", padding:"8px 18px", borderRadius:20, fontSize:12, fontWeight:700, textDecoration:"none", display:"flex", alignItems:"center", gap:6}}>
                ▶️ Shiko Highlights
              </a>
            </div>
          )}
        </div>

        {/* TABS */}
        <div style={{display:"flex", gap:20, marginTop:16, padding:"0 8px", borderBottom:"1px solid #e2e8f0"}}>
          {["NGJARJET","FORMACIONET","GJYQTARËT"].map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"10px 2px", background:"none", border:"none", borderBottom: activeTab===tab ? "2px solid #0f172a" : "2px solid transparent", fontSize:12, fontWeight: activeTab===tab ? 800 : 600, color: activeTab===tab ? "#0f172a" : "#64748b", cursor:"pointer", letterSpacing:0.3}}>{tab}</button>
          ))}
        </div>

        {/* NGJARJET TAB */}
        {activeTab==="NGJARJET" && (
          <div style={{background:"white", borderRadius:16, marginTop:14, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
            <div style={{padding:"14px 16px", fontSize:13, fontWeight:800, display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #f1f5f9"}}>
              <span>⏱️</span> TIMELINE
            </div>

            {mappedEvents.length===0 ? (
              <div style={{padding:30, textAlign:"center", color:"#94a3b8", fontSize:13}}>Nuk ka ngjarje te regjistruara</div>
            ) : (
              <div style={{position:"relative", padding:"10px 0 20px"}}>
                {/* Vertical line */}
                <div style={{position:"absolute", left:"50%", top:0, bottom:0, width:2, background:"#e2e8f0", transform:"translateX(-50%)"}}></div>

                {/* Header teams */}
                <div style={{display:"flex", justifyContent:"space-between", padding:"8px 20px 16px", position:"relative", zIndex:1}}>
                  <span style={{background:"#fee2e2", color:"#dc2626", padding:"4px 10px", borderRadius:12, fontSize:10, fontWeight:800}}>{match.home_team_name}</span>
                  <span style={{background:"#dbeafe", color:"#1d4ed8", padding:"4px 10px", borderRadius:12, fontSize:10, fontWeight:800}}>{match.away_team_name}</span>
                </div>

                {mappedEvents.map((ev, i)=>{
                  const isHome = ev.team === "home";
                  const isSpecial = ev.displayType === "water_break" || ev.displayType === "kickoff";
                  return (
                    <div key={i} style={{display:"flex", alignItems:"center", justifyContent:"center", margin:"14px 0", position:"relative", zIndex:1}}>
                      
                      {/* Left side - Home events */}
                      <div style={{flex:1, display:"flex", justifyContent:"flex-end", paddingRight: isSpecial ? 0 : 40, textAlign:"right"}}>
                        {isHome && !isSpecial && (
                          <div style={{maxWidth:200}}>
                            <div style={{fontSize:12, fontWeight:700}}>{ev.player_name || ev.player_in_name || "Pushim Hidratimi"}</div>
                            {ev.displayType==="penalty_missed" && <div style={{fontSize:11, color:"#94a3b8"}}>(Penalti e Humbur)</div>}
                            {ev.player_out_name && ev.player_in_name && <div style={{fontSize:11, color:"#64748b"}}>{ev.player_out_name} → {ev.player_in_name}</div>}
                            {ev.assist_player_name && <div style={{fontSize:11, color:"#64748b"}}>Assist: {ev.assist_player_name}</div>}
                          </div>
                        )}
                      </div>

                      {/* Center icon */}
                      <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:60}}>
                        <EventIcon type={ev.displayType} />
                        <div style={{fontSize:10, fontWeight:700, marginTop:4, color:"#64748b"}}>{ev.minute}'{ev.extra_time_minute ? `+${ev.extra_time_minute}` : ""}</div>
                      </div>

                      {/* Right side - Away events */}
                      <div style={{flex:1, display:"flex", justifyContent:"flex-start", paddingLeft: isSpecial ? 0 : 40}}>
                        {!isHome && !isSpecial && (
                          <div style={{maxWidth:200}}>
                            <div style={{fontSize:12, fontWeight:700}}>{ev.player_name || ev.player_in_name || ""}</div>
                            {ev.player_out_name && ev.player_in_name && <div style={{fontSize:11, color:"#64748b"}}>{ev.player_out_name} → {ev.player_in_name}</div>}
                            {ev.assist_player_name && <div style={{fontSize:11, color:"#64748b"}}>Assist: {ev.assist_player_name}</div>}
                          </div>
                        )}
                        {isSpecial && (
                          <div style={{position:"absolute", left:"50%", transform:"translateX(-50%)", marginTop:46, whiteSpace:"nowrap", fontSize:11, fontWeight:600, color:"#475569"}}>
                            {ev.displayType==="water_break" ? "Pushim Hidratimi" : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FORMACIONET TAB */}
        {activeTab==="FORMACIONET" && (
          <div style={{background:"white", borderRadius:16, marginTop:14, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
            {homeLineup.length===0 && awayLineup.length===0 ? (
              <div style={{padding:20, textAlign:"center", color:"#94a3b8", fontSize:13}}>Formacionet nuk jane te disponueshme</div>
            ) : (
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                <div>
                  <div style={{fontSize:12, fontWeight:800, marginBottom:10, display:"flex", alignItems:"center", gap:6}}><img src={match.home_team_logo} style={{width:18, height:18}} /> {match.home_team_name}</div>
                  <div style={{fontSize:10, color:"#94a3b8", marginBottom:8}}>TITULLARËT</div>
                  {homeStarters.map((p,idx)=>(
                    <div key={idx} style={{display:"flex", gap:8, padding:"6px 0", borderBottom:"1px solid #f8fafc", fontSize:12}}>
                      <span style={{fontWeight:700, minWidth:20}}>{p.number || ""}</span>
                      <span>{p.name}</span>
                      {p.is_captain && <span style={{fontSize:10}}>©</span>}
                    </div>
                  ))}
                  {homeSubs.length>0 && <><div style={{fontSize:10, color:"#94a3b8", margin:"12px 0 8px"}}>REZERVËT</div>{homeSubs.map((p,idx)=><div key={idx} style={{display:"flex", gap:8, padding:"4px 0", fontSize:11, color:"#64748b"}}><span>{p.number}</span><span>{p.name}</span></div>)}</>}
                </div>
                <div>
                  <div style={{fontSize:12, fontWeight:800, marginBottom:10, display:"flex", alignItems:"center", gap:6}}><img src={match.away_team_logo} style={{width:18, height:18}} /> {match.away_team_name}</div>
                  <div style={{fontSize:10, color:"#94a3b8", marginBottom:8}}>TITULLARËT</div>
                  {awayStarters.map((p,idx)=>(
                    <div key={idx} style={{display:"flex", gap:8, padding:"6px 0", borderBottom:"1px solid #f8fafc", fontSize:12}}>
                      <span style={{fontWeight:700, minWidth:20}}>{p.number || ""}</span>
                      <span>{p.name}</span>
                      {p.is_captain && <span style={{fontSize:10}}>©</span>}
                    </div>
                  ))}
                  {awaySubs.length>0 && <><div style={{fontSize:10, color:"#94a3b8", margin:"12px 0 8px"}}>REZERVËT</div>{awaySubs.map((p,idx)=><div key={idx} style={{display:"flex", gap:8, padding:"4px 0", fontSize:11, color:"#64748b"}}><span>{p.number}</span><span>{p.name}</span></div>)}</>}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab==="GJYQTARËT" && (
          <div style={{background:"white", borderRadius:16, marginTop:14, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:12}}><div style={{padding:"8px 0", display:"flex", justifyContent:"space-between"}}><span style={{color:"#64748b"}}>Gjyqtari kryesor:</span><span style={{fontWeight:600}}>{match.referee_main || "N/A"}</span></div><div style={{padding:"8px 0", display:"flex", justifyContent:"space-between"}}><span style={{color:"#64748b"}}>Asistenti 1:</span><span>{match.referee_assistant1 || "N/A"}</span></div><div style={{padding:"8px 0", display:"flex", justifyContent:"space-between"}}><span style={{color:"#64748b"}}>Asistenti 2:</span><span>{match.referee_assistant2 || "N/A"}</span></div><div style={{padding:"8px 0", display:"flex", justifyContent:"space-between"}}><span style={{color:"#64748b"}}>I katërti:</span><span>{match.referee_forth || "N/A"}</span></div></div>
          </div>
        )}

      </div>
    </div>
  );
}
