// CompetitionDetail.jsx - FIX FINAL per 0:0 dhe 16:30
// LOGJIKA: Nese status == full_time/official_result -> shfaq rezultatin EDHE nese eshte 0:0
// Nese status == scheduled -> shfaq oren
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

export default function CompetitionDetail() {
  const { id } = useParams();
  const rawId = id || window.location.pathname.split('/ligat/')[1]?.split('?')[0]?.split('/')[0] || "";
  const competitionId = rawId;

  const [competition, setCompetition] = useState(null);
  const [standings, setStandings] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState("NDESHJET");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [allComps, allMatches, allStandings, allClubs] = await Promise.all([
        loadJSON("/data/Competition.json"),
        loadJSON("/data/Match.json"),
        loadJSON("/data/Standing.json"),
        loadJSON("/data/Club.json"),
      ]);

      let decoded = "";
      try { decoded = decodeURIComponent(competitionId); } catch { decoded = competitionId; }

      let comp = allComps.find(c => c.id === competitionId);
      if (!comp) {
        const search = decoded.toLowerCase().replace(/-/g, " ").trim();
        comp = allComps.find(c => {
          const n = (c.name || "").toLowerCase();
          return n === search || n.includes(search) || search.includes(n);
        });
      }
      if (!comp && decoded.toLowerCase().includes("superliga")) {
        comp = allComps.find(c => c.name === "ALBI MALL SUPERLIGA" && c.season === "2026/2027") || allComps.find(c => c.name.includes("SUPERLIGA") && c.tier === 1);
      }
      if (!comp) { setLoading(false); return; }
      if (!Array.isArray(comp.status_positions)) comp.status_positions = [];
      setCompetition(comp);

      setClubs(Array.isArray(allClubs) ? allClubs : []);
      const filteredStandings = (Array.isArray(allStandings) ? allStandings : []).filter(s => s.competition_id === comp.id).sort((a,b)=>(a.position||0)-(b.position||0));
      const filteredMatches = (Array.isArray(allMatches) ? allMatches : []).filter(m => m.competition_id === comp.id).sort((a,b)=>(a.round||0)-(b.round||0) || new Date(a.date||0)-new Date(b.date||0));

      setStandings(filteredStandings);
      setMatches(filteredMatches);
      setLoading(false);
    }
    if (competitionId) load();
  }, [competitionId]);

  const getStatusColor = (position) => {
    try {
      if (!competition?.status_positions || !Array.isArray(competition.status_positions)) return "transparent";
      const st = competition.status_positions.find(s => s && s.position === position);
      if (!st?.status) return "transparent";
      const txt = String(st.status).toLowerCase();
      if (txt.includes("kampion")) return "#22c55e";
      if (txt.includes("uecl") || txt.includes("uefa") || txt.includes("qual")) return "#3b82f6";
      if (txt.includes("playoff")) return "#eab308";
      if (txt.includes("renie")) return "#ef4444";
      return "transparent";
    } catch { return "transparent"; }
  };

  // FIX KRYESOR - LOGJIKA E SAKTE
  const isMatchFinished = (m) => {
    const st = (m.status || "").toLowerCase().trim();
    // 1. Nese status eshte qarte i perfunduar -> perfunduar
    if (st === "full_time" || st === "fulltime" || st === "ft" || st === "finished" || st === "official_result" || st === "official") return true;
    if (st.includes("full") || st.includes("official")) return true;
    // 2. Nese eshte live
    if (st.includes("live") || st.includes("half") || st.includes("1h") || st.includes("2h") || st.includes("ht")) return true;
    // 3. Nese eshte scheduled/postponed/ns -> nuk eshte perfunduar
    if (st === "scheduled" || st === "ns" || st.includes("sched") || st.includes("post") || st.includes("cancel")) return false;
    // 4. Fallback: nese ka minute >0, eshte live/perfunduar
    if ((m.minute||0) > 0) return true;
    return false;
  };

  const grouped = matches.reduce((acc, m) => {
    const key = m.round ? `JAVA ${m.round}` : (m.phase_text ? m.phase_text.toUpperCase() : "NDESHJET");
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort((a,b) => {
    const na = parseInt(a.replace(/\D/g,''))||0;
    const nb = parseInt(b.replace(/\D/g,''))||0;
    return nb - na;
  });

  if (loading) {
    return <div style={{display:"flex", justifyContent:"center", padding:80, background:"#eef2ff", minHeight:"100vh"}}><div style={{width:28, height:28, border:"3px solid #e2e8f0", borderTopColor:"#0f172a", borderRadius:"50%"}}></div></div>;
  }
  if (!competition) {
    return <div style={{padding:60, textAlign:"center"}}>Kompeticion nuk u gjet<br/><Link to="/ligat">Kthehu</Link></div>;
  }

  return (
    <div style={{background:"#eef2ff", minHeight:"100vh", padding:"0 0 40px 0"}}>
      <div style={{maxWidth:720, margin:"0 auto", padding:"12px 12px"}}>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:18, padding:"8px 4px"}}>
          {competition.logo && <img src={competition.logo} alt={competition.name} style={{width:32, height:32, objectFit:"contain"}} />}
          <div>
            <div style={{fontSize:15, fontWeight:800, textTransform:"uppercase"}}>{competition.name}</div>
            <div style={{fontSize:12, color:"#64748b"}}>{competition.season || "2026/2027"}</div>
          </div>
        </div>

        <div style={{display:"flex", background:"#e2e8f0", borderRadius:14, padding:4, marginBottom:18}}>
          <button onClick={()=>setActiveTab("TABELA")} style={{flex:1, padding:"11px 0", borderRadius:10, border:"none", cursor:"pointer", background: activeTab==="TABELA" ? "white" : "transparent", fontWeight:700, fontSize:13, color: activeTab==="TABELA" ? "#0f172a" : "#64748b", boxShadow: activeTab==="TABELA" ? "0 2px 8px rgba(0,0,0,0.08)" : "none"}}>TABELA</button>
          <button onClick={()=>setActiveTab("NDESHJET")} style={{flex:1, padding:"11px 0", borderRadius:10, border:"none", cursor:"pointer", background: activeTab==="NDESHJET" ? "white" : "transparent", fontWeight:700, fontSize:13, color: activeTab==="NDESHJET" ? "#0f172a" : "#64748b", boxShadow: activeTab==="NDESHJET" ? "0 2px 8px rgba(0,0,0,0.08)" : "none"}}>NDESHJET</button>
        </div>

        {activeTab==="TABELA" && (
          <div style={{background:"white", borderRadius:18, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{display:"grid", gridTemplateColumns:"32px 1fr 36px 28px 28px 28px 40px 36px", padding:"14px 14px", fontSize:11, fontWeight:600, color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"}}>
              <div>#</div><div>EKIPI</div><div style={{textAlign:"center"}}>NL</div><div style={{textAlign:"center"}}>F</div><div style={{textAlign:"center"}}>B</div><div style={{textAlign:"center"}}>H</div><div style={{textAlign:"center"}}>GD</div><div style={{textAlign:"center"}}>P</div>
            </div>
            {standings.map((s,idx)=>{
              const club = clubs.find(c=>c.id===s.club_id);
              const name = club?.name || s.club_name || "";
              const logo = club?.logo || s.club_logo || "";
              const col = getStatusColor(s.position);
              return (
                <div key={s.id||idx} style={{display:"grid", gridTemplateColumns:"32px 1fr 36px 28px 28px 28px 40px 36px", padding:"13px 14px", alignItems:"center", borderBottom:"1px solid #f8fafc", borderLeft:`3px solid ${col}`}}>
                  <div style={{fontSize:13, fontWeight:600}}>{s.position||idx+1}</div>
                  <div style={{display:"flex", alignItems:"center", gap:10}}>{logo && <img src={logo} alt={name} style={{width:22, height:22, objectFit:"contain"}} /> }<span style={{fontSize:12, fontWeight:700}}>{name}</span></div>
                  <div style={{textAlign:"center", fontSize:13}}>{s.played||0}</div>
                  <div style={{textAlign:"center", fontSize:13}}>{s.won||0}</div>
                  <div style={{textAlign:"center", fontSize:13}}>{s.drawn||0}</div>
                  <div style={{textAlign:"center", fontSize:13}}>{s.lost||0}</div>
                  <div style={{textAlign:"center", fontSize:13}}>{s.goal_difference ?? ((s.goals_for||0)-(s.goals_against||0))}</div>
                  <div style={{textAlign:"center", fontSize:13, fontWeight:800}}>{s.points||0}</div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab==="NDESHJET" && (
          <div>
            {sortedKeys.map(key=>(
              <div key={key}>
                <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:12, margin:"18px 0 14px"}}>
                  <div style={{flex:1, height:1, background:"#cbd5e1"}}></div>
                  <div style={{display:"flex", alignItems:"center", gap:8, background:"#e8ecf5", borderRadius:99, padding:"6px 14px", fontSize:11, fontWeight:700, color:"#475569"}}><span style={{width:6, height:6, background:"#60a5fa", borderRadius:"50%"}}></span>{key}<span style={{width:6, height:6, background:"#60a5fa", borderRadius:"50%"}}></span></div>
                  <div style={{flex:1, height:1, background:"#cbd5e1"}}></div>
                </div>
                <div style={{display:"flex", flexDirection:"column", gap:12}}>
                  {grouped[key].map(m=>{
                    const homeLogo = m.home_team_logo || clubs.find(c=>c.id===m.home_team_id)?.logo || "";
                    const awayLogo = m.away_team_logo || clubs.find(c=>c.id===m.away_team_id)?.logo || "";
                    const finished = isMatchFinished(m);
                    const showAsFinished = finished; // Edhe 0:0 nese eshte full_time -> shfaq 0:0
                    return (
                      <Link key={m.id} to={`/ndeshja/${m.id}`} style={{textDecoration:"none", color:"inherit"}}>
                        <div style={{background:"white", borderRadius:18, padding:"18px 16px 14px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", position:"relative", border:"1px solid #f1f5f9"}}>
                          <div style={{position:"absolute", top:12, right:12, opacity:0.35}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>
                          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8}}>
                            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1, gap:8}}><img src={homeLogo} alt={m.home_team_name} style={{width:56, height:56, objectFit:"contain"}} /><span style={{fontSize:12, fontWeight:800, textAlign:"center"}}>{m.home_team_name}</span></div>
                            <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:90, gap:2}}>
                              {showAsFinished ? (
                                <div style={{display:"flex", alignItems:"center", gap:8, background:"#f1f5f9", padding:"6px 14px", borderRadius:10, fontSize:16, fontWeight:800}}>{m.home_score ?? 0} : {m.away_score ?? 0}</div>
                              ) : (
                                <>
                                  <div style={{fontSize:15, fontWeight:800, color:"#0f172a"}}>{m.time || "16:00"}</div>
                                  <div style={{fontSize:11, color:"#94a3b8", marginTop:2}}>{m.date ? new Date(m.date).toLocaleDateString('en-GB') : "08/09/2026"}</div>
                                </>
                              )}
                            </div>
                            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1, gap:8}}><img src={awayLogo} alt={m.away_team_name} style={{width:56, height:56, objectFit:"contain"}} /><span style={{fontSize:12, fontWeight:800, textAlign:"center"}}>{m.away_team_name}</span></div>
                          </div>
                          <div style={{textAlign:"center", marginTop:12, fontSize:11, color:"#94a3b8"}}>{m.round ? `Java ${m.round} • ` : ""}{m.stadium || ""}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
