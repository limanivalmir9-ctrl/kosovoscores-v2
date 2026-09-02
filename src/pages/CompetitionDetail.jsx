// CompetitionDetail.jsx - FIX PER status_positions.find ERROR
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
  const [activeTab, setActiveTab] = useState("TABELA");
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

      if (!comp) {
        setLoading(false);
        return;
      }

      // FIX KRYESOR: Sigurohu qe status_positions eshte GJITHMONE array!
      if (!Array.isArray(comp.status_positions)) {
        console.warn("status_positions nuk eshte array, e rregulloj:", comp.status_positions);
        comp.status_positions = [];
      }

      setCompetition(comp);

      const safeClubs = Array.isArray(allClubs) ? allClubs : [];
      setClubs(safeClubs);

      const filteredStandings = (Array.isArray(allStandings) ? allStandings : [])
        .filter(s => s.competition_id === comp.id)
        .sort((a,b) => (a.position||0)-(b.position||0));

      const filteredMatches = (Array.isArray(allMatches) ? allMatches : [])
        .filter(m => m.competition_id === comp.id)
        .sort((a,b) => (a.round||0)-(b.round||0));

      setStandings(filteredStandings);
      setMatches(filteredMatches);
      setLoading(false);
    }
    if (competitionId) load();
  }, [competitionId]);

  // FIX SUPER DEFENSIV per getStatusColor
  const getStatusColor = (position) => {
    try {
      if (!competition) return "transparent";
      if (!competition.status_positions) return "transparent";
      if (!Array.isArray(competition.status_positions)) return "transparent";
      if (competition.status_positions.length === 0) return "transparent";
      
      const st = competition.status_positions.find(s => s && s.position === position);
      if (!st || !st.status) return "transparent";
      const txt = String(st.status).toLowerCase();
      if (txt.includes("kampion")) return "#22c55e";
      if (txt.includes("uecl") || txt.includes("uefa") || txt.includes("qual")) return "#3b82f6";
      if (txt.includes("playoff")) return "#eab308";
      if (txt.includes("renie")) return "#ef4444";
      if (txt.includes("promovim")) return "#22c55e";
      return "transparent";
    } catch (e) {
      console.warn("getStatusColor error:", e);
      return "transparent";
    }
  };

  const grouped = matches.reduce((acc, m) => {
    const key = m.round ? `Java ${m.round}` : (m.phase_text || "Ndeshjet");
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const sortedGroupKeys = Object.keys(grouped).sort((a,b) => {
    const numA = parseInt(a.replace(/\D/g,''))||0;
    const numB = parseInt(b.replace(/\D/g,''))||0;
    return numB - numA;
  });

  if (loading) {
    return (
      <div style={{display:"flex", justifyContent:"center", padding:"80px 0", background:"#f1f5f9", minHeight:"60vh"}}>
        <div style={{width:32, height:32, border:"4px solid #e2e8f0", borderTopColor:"#0f172a", borderRadius:"50%"}}></div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div style={{textAlign:"center", padding:"80px 20px", background:"#f1f5f9", minHeight:"60vh"}}>
        <p style={{color:"#64748b"}}>Kompeticion nuk u gjet: {competitionId}</p>
        <Link to="/ligat" style={{color:"#2563eb", fontSize:14, marginTop:12, display:"inline-block"}}>← Kthehu te Ligat</Link>
      </div>
    );
  }

  return (
    <div style={{background:"#f1f5f9", minHeight:"100vh", padding:"12px 12px 40px"}}>
      <div style={{maxWidth:900, margin:"0 auto"}}>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:12, fontSize:12}}>
          <Link to="/ligat" style={{color:"#64748b", textDecoration:"none"}}>Ligat</Link>
          <span style={{color:"#cbd5e1"}}>/</span>
          <span style={{color:"#0f172a", fontWeight:600}}>{competition.name}</span>
        </div>

        <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}>
          <div style={{width:48, height:48, background:"white", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 2px rgba(0,0,0,0.06)", overflow:"hidden"}}>
            {competition.logo ? <img src={competition.logo} alt={competition.name} style={{width:"100%", height:"100%", objectFit:"contain", padding:4}} onError={e=>e.currentTarget.style.display='none'} /> : <span style={{fontWeight:800}}>{competition.name[0]}</span>}
          </div>
          <div>
            <h1 style={{margin:0, fontSize:16, fontWeight:800}}>{competition.name}</h1>
            <p style={{margin:0, fontSize:12, color:"#64748b"}}>{competition.season || "2026/2027"}</p>
          </div>
        </div>

        <div style={{display:"flex", background:"#e2e8f0", borderRadius:12, padding:4, marginBottom:16}}>
          <button onClick={()=>setActiveTab("TABELA")} style={{flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer", background: activeTab==="TABELA" ? "white" : "transparent", fontWeight:800, fontSize:12, letterSpacing:0.8, boxShadow: activeTab==="TABELA" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: activeTab==="TABELA" ? "#0f172a" : "#64748b"}}>TABELA</button>
          <button onClick={()=>setActiveTab("NDESHJET")} style={{flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer", background: activeTab==="NDESHJET" ? "white" : "transparent", fontWeight:800, fontSize:12, letterSpacing:0.8, boxShadow: activeTab==="NDESHJET" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: activeTab==="NDESHJET" ? "#0f172a" : "#64748b"}}>NDESHJET</button>
        </div>

        {activeTab==="TABELA" && (
          <div style={{background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{display:"grid", gridTemplateColumns:"28px 1fr 32px 24px 24px 24px 36px 28px", padding:"12px 12px", fontSize:11, fontWeight:700, color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"}}>
              <div>#</div><div>EKIPI</div><div style={{textAlign:"center"}}>NL</div><div style={{textAlign:"center"}}>F</div><div style={{textAlign:"center"}}>B</div><div style={{textAlign:"center"}}>H</div><div style={{textAlign:"center"}}>GD</div><div style={{textAlign:"center"}}>P</div>
            </div>
            {standings.length===0 ? <div style={{padding:30, textAlign:"center", color:"#94a3b8", fontSize:13}}>Nuk ka te dhena per tabelen</div> : standings.map((s, idx) => {
              const club = clubs.find(c => c.id === s.club_id);
              const name = club?.name || s.club_name || "Skuadra";
              const logo = club?.logo || s.club_logo || "";
              const color = getStatusColor(s.position);
              return (
                <div key={s.id || idx} style={{display:"grid", gridTemplateColumns:"28px 1fr 32px 24px 24px 24px 36px 28px", padding:"10px 12px", alignItems:"center", borderBottom:"1px solid #f8fafc", borderLeft:`3px solid ${color}`, background: idx < 3 ? "#f0fdf4" : "white"}}>
                  <div style={{fontSize:12, fontWeight:700}}>{s.position || idx+1}</div>
                  <div style={{display:"flex", alignItems:"center", gap:8, minWidth:0}}>
                    {logo ? <img src={logo} alt={name} style={{width:20, height:20, objectFit:"contain"}} onError={e=>e.currentTarget.style.display='none'} /> : null}
                    <span style={{fontSize:12, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{name}</span>
                  </div>
                  <div style={{textAlign:"center", fontSize:12}}>{s.played||0}</div>
                  <div style={{textAlign:"center", fontSize:12}}>{s.won||0}</div>
                  <div style={{textAlign:"center", fontSize:12}}>{s.drawn||0}</div>
                  <div style={{textAlign:"center", fontSize:12}}>{s.lost||0}</div>
                  <div style={{textAlign:"center", fontSize:12}}>{s.goal_difference ?? ((s.goals_for||0)-(s.goals_against||0))}</div>
                  <div style={{textAlign:"center", fontSize:12, fontWeight:800}}>{s.points||0}</div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab==="NDESHJET" && (
          <div style={{display:"flex", flexDirection:"column", gap:0}}>
            {sortedGroupKeys.length===0 ? <div style={{background:"white", borderRadius:16, padding:30, textAlign:"center", color:"#94a3b8"}}>Nuk ka ndeshje</div> :
              sortedGroupKeys.map(key => (
                <div key={key} style={{marginBottom:16}}>
                  <div style={{display:"flex", alignItems:"center", gap:12, margin:"14px 0 10px"}}>
                    <div style={{flex:1, height:1, background:"#cbd5e1"}}></div>
                    <div style={{display:"flex", alignItems:"center", gap:6, background:"white", border:"1px solid #e2e8f0", borderRadius:99, padding:"5px 12px"}}>
                      <span style={{width:5, height:5, background:"#3b82f6", borderRadius:99}}></span>
                      <span style={{fontSize:10, fontWeight:800, color:"#334155"}}>{key.toUpperCase()}</span>
                      <span style={{width:5, height:5, background:"#3b82f6", borderRadius:99}}></span>
                    </div>
                    <div style={{flex:1, height:1, background:"#cbd5e1"}}></div>
                  </div>
                  <div style={{display:"flex", flexDirection:"column", gap:8}}>
                    {grouped[key].map(m => (
                      <div key={m.id} style={{background:"white", borderRadius:16, padding:"14px 12px", boxShadow:"0 1px 3px rgba(0,0,0,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                        <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1, gap:6}}>
                          <img src={m.home_team_logo || clubs.find(c=>c.id===m.home_team_id)?.logo || ""} alt={m.home_team_name} style={{width:44, height:44, objectFit:"contain"}} onError={e=>e.currentTarget.style.display='none'} />
                          <span style={{fontSize:11, fontWeight:700, textAlign:"center", maxWidth:90}}>{m.home_team_name}</span>
                        </div>
                        <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:80}}>
                          <div style={{fontSize:14, fontWeight:800, background:"#f1f5f9", padding:"4px 10px", borderRadius:8}}>
                            {m.home_score!=null ? `${m.home_score} : ${m.away_score}` : (m.time || "16:00")}
                          </div>
                          <div style={{fontSize:10, color:"#94a3b8", marginTop:4}}>{m.date ? m.date.slice(0,10) : ""}</div>
                        </div>
                        <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1, gap:6}}>
                          <img src={m.away_team_logo || clubs.find(c=>c.id===m.away_team_id)?.logo || ""} alt={m.away_team_name} style={{width:44, height:44, objectFit:"contain"}} onError={e=>e.currentTarget.style.display='none'} />
                          <span style={{fontSize:11, fontWeight:700, textAlign:"center", maxWidth:90}}>{m.away_team_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
