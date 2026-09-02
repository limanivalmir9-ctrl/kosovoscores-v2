// COMPETITION_DETAIL_FIX.jsx - VERSION PER .jsx (pa TypeScript)
"use client";
import { useEffect, useState } from "react";

// Helper: ngarko JSON me siguri
async function loadJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && typeof data === 'object') return data;
    return [];
  } catch (e) {
    console.warn(`Gabim duke ngarkuar ${path}:`, e);
    return [];
  }
}

export default function CompetitionDetail({ params }) {
  const competitionId = params?.id;
  const [competition, setCompetition] = useState(null);
  const [standings, setStandings] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [compData, standingData, clubData, matchData] = await Promise.all([
          loadJSON("/data/Competition.json"),
          loadJSON("/data/Standing.json"),
          loadJSON("/data/Club.json"),
          loadJSON("/data/Match.json"),
        ]);

        let comp = null;
        if (Array.isArray(compData)) {
          comp = compData.find((c) => 
            c.id === competitionId || 
            c.name === decodeURIComponent(competitionId) ||
            c.id?.toString() === competitionId
          );
          if (!comp) {
            const decoded = decodeURIComponent(competitionId).toLowerCase().replace(/-/g, " ");
            comp = compData.find((c) => 
              c.name?.toLowerCase().includes(decoded) ||
              decoded.includes(c.name?.toLowerCase())
            );
          }
        }
        
        if (!comp) {
          setError(`Kompeticioni nuk u gjet: ${competitionId}`);
          console.log("Available competitions:", compData.map((c)=> ({id:c.id, name:c.name})));
        } else {
          setCompetition(comp);
        }

        const safeClubs = Array.isArray(clubData) ? clubData : [];
        const safeStandings = Array.isArray(standingData) ? standingData : [];
        const safeMatches = Array.isArray(matchData) ? matchData : [];

        setClubs(safeClubs);
        
        if (comp) {
          const filteredStandings = safeStandings.filter((s) => 
            s.competition_id === comp.id
          );
          filteredStandings.sort((a,b) => (a.position || 0) - (b.position || 0));
          setStandings(filteredStandings);

          const filteredMatches = safeMatches.filter((m) => 
            m.competition_id === comp.id
          );
          filteredMatches.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setMatches(filteredMatches);
        } else {
          setStandings(safeStandings);
          setMatches(safeMatches);
        }

      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (competitionId) load();
  }, [competitionId]);

  if (loading) {
    return <div style={{padding:40, textAlign:"center"}}>Duke ngarkuar tabelen...</div>;
  }

  if (error) {
    return (
      <div style={{padding:40}}>
        <h2 style={{color:"red"}}>{error}</h2>
        <p>ID i kerkuar: {competitionId}</p>
        <a href="/ligat">Kthehu te Ligat</a>
      </div>
    );
  }

  if (!competition) {
    return <div style={{padding:40}}>Kompeticioni nuk u gjet. ID: {competitionId}</div>;
  }

  return (
    <div style={{maxWidth:1100, margin:"0 auto", padding:20}}>
      <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:24, background:"#f8f9fa", padding:16, borderRadius:12}}>
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
          <p style={{margin:"4px 0", color:"#666"}}>Sezoni: {competition.season} • {standings.length} skuadra • {matches.length} ndeshje</p>
        </div>
      </div>

      <div style={{background:"white", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.1)", marginBottom:24}}>
        <div style={{padding:"12px 16px", fontWeight:"bold", borderBottom:"1px solid #eee", background:"#fafafa"}}>
          Tabela - {competition.name}
        </div>
        
        {standings.length === 0 ? (
          <div style={{padding:20, textAlign:"center", color:"#666"}}>Nuk ka te dhena per tabelen e ketij kompeticioni.</div>
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
                    <tr key={s.id || idx} style={{borderTop:"1px solid #f0f0f0"}}>
                      <td style={{padding:"10px 12px", fontWeight:"bold"}}>{s.position || idx+1}</td>
                      <td style={{padding:"10px 12px", display:"flex", alignItems:"center", gap:8}}>
                        {clubLogo && (
                          <img 
                            src={clubLogo} 
                            alt={clubName}
                            style={{width:20, height:20, objectFit:"contain"}}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                        {clubName}
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
          Ndeshjet e fundit
        </div>
        {matches.slice(0,10).map((m) => (
          <div key={m.id} style={{padding:"12px 16px", borderTop:"1px solid #f0f0f0", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <span style={{fontSize:13}}>{m.home_team_name} vs {m.away_team_name}</span>
            <span style={{fontWeight:"bold", background:"#f0f0f0", padding:"4px 8px", borderRadius:6, fontSize:13}}>
              {m.home_score ?? "-"} : {m.away_score ?? "-"}
            </span>
          </div>
        ))}
        {matches.length === 0 && <div style={{padding:20, textAlign:"center", color:"#666"}}>Nuk ka ndeshje per kete kompeticion.</div>}
      </div>

      <div style={{marginTop:20, padding:12, background:"#fff3cd", borderRadius:8, fontSize:12}}>
        <strong>DEBUG:</strong> Competition ID: {competition.id} | Clubs loaded: {clubs.length} (Array: {Array.isArray(clubs) ? "PO" : "JO"}) | Standings: {standings.length} | Matches: {matches.length}
      </div>
    </div>
  );
}
