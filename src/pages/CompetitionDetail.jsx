// CompetitionDetail.jsx - VERSION FIX PER VITE / REACT ROUTER (FINAL)
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

async function loadJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return data;
  } catch (e) {
    console.error(`Gabim duke ngarkuar ${path}:`, e);
    return [];
  }
}

export default function CompetitionDetail() {
  // VITE FIX: perdor useParams, jo props.params
  const { id } = useParams();
  const competitionId = id;

  const [competition, setCompetition] = useState(null);
  const [standings, setStandings] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        console.log("Duke kerkuar competitionId:", competitionId);
        setLoading(true);
        
        // Provo disa path-e te mundshme per data
        let compData = await loadJSON("/data/Competition.json");
        if (!Array.isArray(compData) || compData.length === 0) {
          compData = await loadJSON("/public/data/Competition.json");
        }
        if (!Array.isArray(compData) || compData.length === 0) {
          compData = await loadJSON("./data/Competition.json");
        }
        // Nese ende bosh, provo nga /src/data via import? per momentin log
        console.log("Competition data loaded:", compData?.length, "records");

        let standingData = await loadJSON("/data/Standing.json");
        let clubData = await loadJSON("/data/Club.json");
        let matchData = await loadJSON("/data/Match.json");

        // fallback paths
        if (standingData.length === 0) standingData = await loadJSON("/public/data/Standing.json");
        if (clubData.length === 0) clubData = await loadJSON("/public/data/Club.json");
        if (matchData.length === 0) matchData = await loadJSON("/public/data/Match.json");

        console.log(`Loaded: Comp ${compData.length}, Standing ${standingData.length}, Clubs ${clubData.length}, Matches ${matchData.length}`);

        let comp = null;
        if (Array.isArray(compData) && compData.length > 0) {
          const decodedId = decodeURIComponent(competitionId || "");
          comp = compData.find((c) => 
            c.id === competitionId || 
            c.id?.toString() === competitionId ||
            c.name === decodedId
          );
          if (!comp) {
            const search = decodedId.toLowerCase().replace(/-/g, " ").trim();
            comp = compData.find((c) => {
              const nameLower = (c.name || "").toLowerCase();
              return nameLower === search || nameLower.includes(search) || search.includes(nameLower);
            });
          }
          // Nese ID eshte emer si "albi-mall-superliga", gjej me tier 1
          if (!comp && decodedId.toLowerCase().includes("superliga") && !decodedId.includes("u19") && !decodedId.includes("femra")) {
            comp = compData.find((c) => c.name === "ALBI MALL SUPERLIGA" && c.season === "2026/2027");
          }
        }
        
        if (!comp) {
          const available = compData.map(c => `${c.name} (${c.id})`).join(", ");
          setError(`Kompeticioni nuk u gjet: ${competitionId}. Te disponueshme: ${available.slice(0,200)}...`);
          setLoading(false);
          return;
        }

        setCompetition(comp);

        const safeClubs = Array.isArray(clubData) ? clubData : [];
        const safeStandings = Array.isArray(standingData) ? standingData : [];
        const safeMatches = Array.isArray(matchData) ? matchData : [];

        setClubs(safeClubs);
        
        const filteredStandings = safeStandings.filter((s) => s.competition_id === comp.id);
        filteredStandings.sort((a,b) => (a.position || 0) - (b.position || 0));
        setStandings(filteredStandings);

        const filteredMatches = safeMatches.filter((m) => m.competition_id === comp.id);
        filteredMatches.sort((a,b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setMatches(filteredMatches);

        console.log(`Filtered for ${comp.name}: ${filteredStandings.length} standings, ${filteredMatches.length} matches`);

      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (competitionId) {
      load();
    } else {
      console.warn("competitionId is undefined!", { id });
      setError("ID e kompeticionit mungon ne URL");
      setLoading(false);
    }
  }, [competitionId]);

  if (loading) {
    return (
      <div style={{padding:40, textAlign:"center", background:"#eef2f7", minHeight:"60vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
        <div style={{fontSize:18, marginBottom:10}}>Duke ngarkuar tabelen...</div>
        <div style={{fontSize:12, color:"#666"}}>ID: {competitionId || "mungon"}</div>
        <div style={{marginTop:20, width:40, height:40, border:"4px solid #ddd", borderTopColor:"#0066cc", borderRadius:"50%", animation:"spin 1s linear infinite"}}></div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{padding:40, background:"#fff", minHeight:"60vh"}}>
        <h2 style={{color:"red", fontSize:18}}>{error}</h2>
        <p style={{marginTop:10}}>URL ID: <code>{competitionId}</code></p>
        <p>Kontrollo console (F12) per detaje.</p>
        <Link to="/ligat" style={{display:"inline-block", marginTop:16, padding:"8px 16px", background:"#0066cc", color:"white", borderRadius:6, textDecoration:"none"}}>Kthehu te Ligat</Link>
      </div>
    );
  }

  if (!competition) {
    return (
      <div style={{padding:40}}>
        Kompeticioni nuk u gjet. ID: {competitionId}
        <br/>
        <Link to="/ligat">Kthehu</Link>
      </div>
    );
  }

  return (
    <div style={{maxWidth:1100, margin:"0 auto", padding:20, background:"#eef2f7", minHeight:"100vh"}}>
      <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:24, background:"white", padding:16, borderRadius:12, boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>
        {competition.logo && (
          <img 
            src={competition.logo} 
            alt={competition.name}
            style={{width:64, height:64, objectFit:"contain"}}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <div>
          <h1 style={{margin:0, fontSize:24}}>{competition.name}</h1>
          <p style={{margin:"4px 0", color:"#666", fontSize:14}}>Sezoni: {competition.season || "2026/2027"} • {standings.length} skuadra • {matches.length} ndeshje</p>
        </div>
      </div>

      <div style={{background:"white", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.1)", marginBottom:24}}>
        <div style={{padding:"12px 16px", fontWeight:"bold", borderBottom:"1px solid #eee", background:"#fafafa", display:"flex", justifyContent:"space-between"}}>
          <span>Tabela - {competition.name}</span>
          <span style={{fontSize:12, fontWeight:"normal", color:"#666"}}>{standings.length} ekipe</span>
        </div>
        
        {standings.length === 0 ? (
          <div style={{padding:30, textAlign:"center", color:"#666"}}>
            <div style={{fontSize:16, marginBottom:8}}>Nuk ka te dhena per tabelen</div>
            <div style={{fontSize:12}}>Competition ID: {competition.id}<br/>Standing records: {standings.length} <br/> Klubi i pare ne Standing ka competition_id: {standings[0]?.competition_id || "n/a"}</div>
          </div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", fontSize:14}}>
              <thead>
                <tr style={{background:"#f8f9fa", textAlign:"left"}}>
                  <th style={{padding:"10px 12px"}}>#</th>
                  <th style={{padding:"10px 12px"}}>Skuadra</th>
                  <th style={{padding:"10px 12px", textAlign:"center"}}>ND</th>
                  <th style={{padding:"10px 12px", textAlign:"center"}}>F</th>
                  <th style={{padding:"10px 12px", textAlign:"center"}}>B</th>
                  <th style={{padding:"10px 12px", textAlign:"center"}}>H</th>
                  <th style={{padding:"10px 12px", textAlign:"center"}}>G</th>
                  <th style={{padding:"10px 12px", textAlign:"center"}}>P</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, idx) => {
                  let clubName = s.club_name || "Skuadra";
                  let clubLogo = s.club_logo || "";
                  
                  if (Array.isArray(clubs) && clubs.length > 0) {
                    const club = clubs.find((c) => c.id === s.club_id);
                    if (club) {
                      clubName = club.name || clubName;
                      clubLogo = club.logo || clubLogo;
                    }
                  }

                  return (
                    <tr key={s.id || idx} style={{borderTop:"1px solid #f0f0f0", background: idx < 3 ? "#f0fdf4" : "white"}}>
                      <td style={{padding:"10px 12px", fontWeight:"bold"}}>{s.position || idx+1}</td>
                      <td style={{padding:"10px 12px", display:"flex", alignItems:"center", gap:8}}>
                        {clubLogo && (
                          <img 
                            src={clubLogo} 
                            alt={clubName}
                            style={{width:22, height:22, objectFit:"contain"}}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                        <span style={{fontWeight: idx < 4 ? "600" : "400"}}>{clubName}</span>
                      </td>
                      <td style={{padding:"10px 12px", textAlign:"center"}}>{s.played || 0}</td>
                      <td style={{padding:"10px 12px", textAlign:"center"}}>{s.won || 0}</td>
                      <td style={{padding:"10px 12px", textAlign:"center"}}>{s.drawn || 0}</td>
                      <td style={{padding:"10px 12px", textAlign:"center"}}>{s.lost || 0}</td>
                      <td style={{padding:"10px 12px", textAlign:"center"}}>{(s.goals_for || 0)}:{(s.goals_against || 0)}</td>
                      <td style={{padding:"10px 12px", textAlign:"center", fontWeight:"bold"}}>{s.points || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{background:"white", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>
        <div style={{padding:"12px 16px", fontWeight:"bold", borderBottom:"1px solid #eee", background:"#fafafa"}}>
          Ndeshjet e fundit ({matches.length})
        </div>
        {matches.slice(0,15).map((m) => (
          <div key={m.id} style={{padding:"12px 16px", borderTop:"1px solid #f0f0f0", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div style={{display:"flex", alignItems:"center", gap:8, fontSize:13, flex:1}}>
              <span style={{flex:1, textAlign:"right"}}>{m.home_team_name}</span>
              <span style={{fontWeight:"bold", background:"#f0f0f0", padding:"4px 8px", borderRadius:6, minWidth:50, textAlign:"center"}}>
                {m.home_score ?? "-"} : {m.away_score ?? "-"}
              </span>
              <span style={{flex:1}}>{m.away_team_name}</span>
            </div>
            <div style={{fontSize:11, color:"#999", marginLeft:12}}>{m.date || ""}</div>
          </div>
        ))}
        {matches.length === 0 && <div style={{padding:20, textAlign:"center", color:"#666"}}>Nuk ka ndeshje per kete kompeticion. ID: {competition.id}</div>}
      </div>

      <div style={{marginTop:20, padding:12, background:"#d1e7dd", borderRadius:8, fontSize:12, border:"1px solid #a3cfbb"}}>
        <strong>✅ FIX VITE:</strong> Competition ID: {competition.id} | Clubs: {clubs.length} | Standings: {standings.length} | Matches: {matches.length} | URL param: {competitionId}
      </div>
    </div>
  );
}
