// MatchDetail.jsx - VERSION 100% LOKALE me Timeline, Gola, Kartona
// Lexon nga /data/Match.json dhe /data/MatchEvent.json

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

export default function MatchDetail() {
  const { id } = useParams();
  const matchId = id || window.location.pathname.split('/ndeshja/')[1]?.split('/')[0] || "";

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [allMatches, allEvents, allClubs] = await Promise.all([
        loadJSON("/data/Match.json"),
        loadJSON("/data/MatchEvent.json"),
        loadJSON("/data/Club.json"),
      ]);

      const m = allMatches.find(x => x.id === matchId);
      if (!m) { setLoading(false); return; }
      setMatch(m);
      setClubs(allClubs);
      
      const evts = allEvents.filter(e => e.match_id === matchId).sort((a,b)=>(a.minute||0)-(b.minute||0) || (a.extra_time_minute||0)-(b.extra_time_minute||0));
      setEvents(evts);
      setLoading(false);
    }
    if (matchId) load();
  }, [matchId]);

  if (loading) return <div style={{padding:80, textAlign:"center", background:"#eef2ff", minHeight:"100vh"}}>Duke ngarkuar ndeshjen...</div>;
  if (!match) return <div style={{padding:60, textAlign:"center"}}>Ndeshja nuk u gjet: {matchId}<br/><Link to="/ligat">Kthehu</Link></div>;

  const isFinished = (() => {
    const st = (match.status||"").toLowerCase();
    if (st.includes("sched") || st==="ns") return false;
    return true;
  })();

  const getEventIcon = (type) => {
    switch(type) {
      case "goal": return "⚽";
      case "yellow_card": return "🟨";
      case "red_card": return "🟥";
      case "substitution": return "🔄";
      case "own_goal": return "⚽❌";
      default: return "•";
    }
  };

  const homeEvents = events.filter(e => e.team === "home");
  const awayEvents = events.filter(e => e.team === "away");

  return (
    <div style={{background:"#eef2ff", minHeight:"100vh", padding:"0 0 40px 0"}}>
      <div style={{maxWidth:720, margin:"0 auto"}}>
        
        {/* Header */}
        <div style={{background:"white", padding:"12px 16px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #f1f5f9"}}>
          <Link to={`/ligat/${match.competition_id}`} style={{textDecoration:"none", color:"#64748b"}}>← {match.competition_name || "Kthehu"}</Link>
        </div>

        {/* Score Board - si Base44 */}
        <div style={{background:"white", padding:"24px 16px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
          <div style={{fontSize:12, color:"#94a3b8", marginBottom:12}}>{match.competition_name} • Java {match.round} • {match.date} {match.time}</div>
          
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1, gap:10}}>
              <img src={match.home_team_logo} alt={match.home_team_name} style={{width:72, height:72, objectFit:"contain"}} />
              <span style={{fontWeight:800, fontSize:14}}>{match.home_team_name}</span>
            </div>

            <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:120}}>
              {isFinished ? (
                <>
                  <div style={{fontSize:32, fontWeight:900, letterSpacing:2}}>{match.home_score} - {match.away_score}</div>
                  <div style={{fontSize:11, color:"#22c55e", fontWeight:700, background:"#f0fdf4", padding:"3px 8px", borderRadius:6, marginTop:6}}>PERFUNDUAR</div>
                  {match.minute>0 && <div style={{fontSize:11, color:"#64748b", marginTop:4}}>{match.minute}'</div>}
                </>
              ) : (
                <>
                  <div style={{fontSize:20, fontWeight:800}}>{match.time || "16:00"}</div>
                  <div style={{fontSize:11, color:"#64748b"}}>{match.date}</div>
                  <div style={{fontSize:11, color:"#eab308", background:"#fefce8", padding:"3px 8px", borderRadius:6, marginTop:6}}>E PLANIFIKUAR</div>
                </>
              )}
            </div>

            <div style={{display:"flex", flexDirection:"column", alignItems:"center", flex:1, gap:10}}>
              <img src={match.away_team_logo} alt={match.away_team_name} style={{width:72, height:72, objectFit:"contain"}} />
              <span style={{fontWeight:800, fontSize:14}}>{match.away_team_name}</span>
            </div>
          </div>

          {match.stadium && <div style={{fontSize:12, color:"#94a3b8", marginTop:16}}>📍 {match.stadium}</div>}
        </div>

        {/* Timeline */}
        <div style={{margin:"16px 12px", background:"white", borderRadius:18, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
          <h3 style={{margin:"0 0 14px 0", fontSize:14, fontWeight:800}}>TIMELINE</h3>
          
          {events.length===0 ? (
            <div style={{padding:20, textAlign:"center", color:"#94a3b8", fontSize:13}}>
              {isFinished ? "Nuk ka evente te regjistruara" : "Ndeshja nuk ka filluar ende"}
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              {events.map((ev, idx) => (
                <div key={ev.id || idx} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background: ev.team==="home" ? "#f0fdf4" : "#eff6ff", borderRadius:10, borderLeft:`3px solid ${ev.team==="home" ? "#22c55e" : "#3b82f6"}`}}>
                  <div style={{fontSize:12, fontWeight:700, minWidth:36}}>{ev.minute}'{ev.extra_time_minute ? `+${ev.extra_time_minute}` : ""}</div>
                  <div style={{fontSize:16}}>{getEventIcon(ev.type)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12, fontWeight:600}}>{ev.player_name || ev.type.replace("_"," ")}</div>
                    {ev.assist_player_name && <div style={{fontSize:11, color:"#64748b"}}>Assist: {ev.assist_player_name}</div>}
                    {ev.player_in_name && <div style={{fontSize:11, color:"#64748b"}}>↑ {ev.player_in_name} ↓ {ev.player_out_name}</div>}
                  </div>
                  <div style={{fontSize:11, color:"#64748b", textTransform:"uppercase"}}>{ev.team}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        {(match.stats_home_shots || match.stats_possession_home_ms) && (
          <div style={{margin:"16px 12px", background:"white", borderRadius:18, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <h3 style={{margin:"0 0 14px 0", fontSize:14, fontWeight:800}}>STATISTIKA</h3>
            <div style={{display:"flex", flexDirection:"column", gap:12}}>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:12}}><span>{match.stats_home_shots||0}</span><span style={{color:"#94a3b8"}}>Gjuajtje</span><span>{match.stats_away_shots||0}</span></div>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:12}}><span>{match.stats_home_corners||0}</span><span style={{color:"#94a3b8"}}>Kornerat</span><span>{match.stats_away_corners||0}</span></div>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:12}}><span>{match.home_red_cards||0}</span><span style={{color:"#94a3b8"}}>Kartona te kuq</span><span>{match.away_red_cards||0}</span></div>
            </div>
          </div>
        )}

        {/* Lineups */}
        {(match.home_lineup && match.home_lineup !== "[]") && (
          <div style={{margin:"16px 12px", background:"white", borderRadius:18, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <h3 style={{margin:"0 0 14px 0", fontSize:14, fontWeight:800}}>FORMACIONET</h3>
            <div style={{fontSize:12, color:"#64748b"}}>Home: {match.home_lineup}</div>
            <div style={{fontSize:12, color:"#64748b", marginTop:8}}>Away: {match.away_lineup}</div>
          </div>
        )}

      </div>
    </div>
  );
}
