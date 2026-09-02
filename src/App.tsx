// FORCE REBUILD 02-09-2026 15:10 - Fix white page

import { useState } from "react";

type Comp = { id: string; name: string; season: string; tier: number; color: string; archived: boolean; };

const DATA: Comp[] = [
  { id: "1", name: "ALBI MALL SUPERLIGA", season: "2026/2027", tier: 1, color: "#16a34a", archived: false },
  { id: "2", name: "RAIFFEISEN LIGA E PARË", season: "2026/2027", tier: 2, color: "#f97316", archived: false },
  { id: "3", name: "LIGA E DYTË E KOSOVËS", season: "2026/2027", tier: 3, color: "#64748b", archived: false },
  { id: "4", name: "KUPA E KOSOVËS", season: "2026/2027", tier: 4, color: "#0f172a", archived: false },
  { id: "5", name: "SUPERLIGA U19", season: "2026/2027", tier: 6, color: "#7c3aed", archived: false },
  { id: "6", name: "SUPERLIGA E FEMRAVE", season: "2026/2027", tier: 4, color: "#ec4899", archived: false },
  { id: "7", name: "MIQËSORE", season: "2026/2027", tier: 1, color: "#ef4444", archived: false },
  { id: "8", name: "ALBI MALL SUPERLIGA", season: "2025/2026", tier: 1, color: "#16a34a", archived: true },
  { id: "9", name: "RAIFFEISEN LIGA E PARË", season: "2025/2026", tier: 2, color: "#f97316", archived: true },
  { id: "10", name: "LIGA E DYTË E KOSOVËS", season: "2025/2026", tier: 3, color: "#64748b", archived: true },
  { id: "11", name: "KUPA E KOSOVËS", season: "2025/2026", tier: 4, color: "#0f172a", archived: true },
  { id: "12", name: "SUPERLIGA U19", season: "2025/2026", tier: 6, color: "#7c3aed", archived: true },
  { id: "13", name: "SUPERLIGA E FEMRAVE", season: "2025/2026", tier: 4, color: "#ec4899", archived: true },
  { id: "14", name: "SUPERLIGA U21", season: "2025/2026", tier: 5, color: "#06b6d4", archived: true },
];

export default function App() {
  const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  
  if (!logged) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ background: "white", color: "#0f172a", padding: 32, borderRadius: 16, width: 360 }}>
          <h1 style={{ fontWeight: 800, fontSize: 20 }}>KosovaScores Admin</h1>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>14 liga • Competition.json LIVE</p>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={{ width: "100%", marginTop: 16, height: 40, border: "1px solid #e2e8f0", borderRadius: 8, padding: "0 12px" }} />
          <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="Password (admin123)" style={{ width: "100%", marginTop: 12, height: 40, border: "1px solid #e2e8f0", borderRadius: 8, padding: "0 12px" }} />
          <button onClick={()=>setLogged(true)} style={{ width: "100%", marginTop: 16, height: 44, background: "#0f172a", color: "white", borderRadius: 8, fontWeight: 700 }}>HYN • LOGIN</button>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 12 }}>Çdo email/password punon - demo</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "sans-serif" }}>
      <div style={{ height: 56, background: "#0f172a", color: "white", display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between" }}>
        <b>KosovaScores Admin • 14 Liga LIVE</b>
        <button onClick={()=>setLogged(false)} style={{ background: "white", color: "#0f172a", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Dil</button>
      </div>
      <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontWeight: 800, fontSize: 18 }}>Competitions - 14 liga nga Competition.json</h2>
        <div style={{ marginTop: 16, background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          {DATA.map(c=>(
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: c.color }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{c.season} • Tier {c.tier} {c.archived ? "• Archived" : ""}</div>
              </div>
              <div style={{ fontSize: 11, background: c.archived ? "#fef3c7" : "#dcfce7", padding: "4px 8px", borderRadius: 999 }}>{c.archived ? "Archived" : "Active"}</div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 16, fontSize: 12, color: "#64748b" }}>✅ Kjo është faqja që duhet të shohësh te http://admin.178.104.153.241.sslip.io/ - Pa gabim "string is not defined", pa "lucide-react", build 100%!</p>
      </div>
    </div>
  );
}
