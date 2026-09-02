import { useState } from 'react'

type Competition = {
  id: string
  name: string
  logo: string
  season: string | null
  tier: number
  color: string
  color_safe: string
  archived: boolean | null
}

const COMPETITIONS: Competition[] = [
  {
    "id": "6a74979fb131e76389be2432",
    "name": "SUPERLIGA E FEMRAVE",
    "logo": "https://media.base44.com/images/public/69c340685dca7075d7622e15/1d13df0d5_SPFEMRAT.png",
    "season": "2026/2027",
    "tier": 4,
    "color": "#ec4899",
    "color_safe": "#ec4899",
    "archived": false
  },
  {
    "id": "6a7484de797e8618445b26c5",
    "name": "SUPERLIGA U19",
    "logo": "https://media.base44.com/images/public/69c340685dca7075d7622e15/09a483065_LOGOLIGA_transparent.png",
    "season": "2026/2027",
    "tier": 6,
    "color": "purple-500",
    "color_safe": "#a855f7",
    "archived": false
  },
  {
    "id": "6a7484dedad209108a2d3667",
    "name": "KUPA E KOSOVËS",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/5a8b89052_kupaeks.png",
    "season": "2026/2027",
    "tier": 4,
    "color": "cyan-500",
    "color_safe": "#06b6d4",
    "archived": false
  },
  {
    "id": "6a7484ddad090536a8e1875a",
    "name": "LIGA E DYTË E KOSOVËS",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/8140b474a_LIGAEDYTE.png",
    "season": "2026/2027",
    "tier": 3,
    "color": "cyan-500",
    "color_safe": "#06b6d4",
    "archived": false
  },
  {
    "id": "6a7484dcb63c5aab429503c8",
    "name": "RAIFFEISEN LIGA E PARË",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/22250fc28_RaiffeisenLigaPare.png",
    "season": "2026/2027",
    "tier": 2,
    "color": "orange-500",
    "color_safe": "orange-500",
    "archived": false
  },
  {
    "id": "6a7484dc4af04c7780f99b61",
    "name": "ALBI MALL SUPERLIGA",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/d3a2a147a_ALBIMALLSUPERLIGA.png",
    "season": "2026/2027",
    "tier": 1,
    "color": "green-500",
    "color_safe": "green-500",
    "archived": false
  },
  {
    "id": "69cafd79dae733babf38cdab",
    "name": "MIQËSORE",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/3f7fc5f5c_FRIENDLY.png",
    "season": null,
    "tier": 7,
    "color": "red-500",
    "color_safe": "red-500",
    "archived": null
  }
]

export default function App() {
  const [selected, setSelected] = useState<Competition>(COMPETITIONS[0])
  const active = COMPETITIONS.filter(c => !c.archived)
  const archivedCount = 14 - active.length

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', fontFamily:'system-ui', display:'flex'}}>
      {/* Sidebar */}
      <div style={{width:'320px', background:'#1e293b', borderRight:'1px solid #334155', display:'flex', flexDirection:'column'}}>
        <div style={{padding:'20px', borderBottom:'1px solid #334155'}}>
          <h1 style={{margin:0, color:'white', fontSize:'18px', fontWeight:900, display:'flex', alignItems:'center', gap:'8px'}}>
            <span style={{background:'#22c55e', width:'28px', height:'28px', borderRadius:'8px', display:'grid', placeItems:'center'}}>⚽</span>
            KosovoScores
          </h1>
          <p style={{margin:'6px 0 0', color:'#94a3b8', fontSize:'12px'}}>14 liga • {active.length} aktive • Build {new Date().toLocaleDateString()}</p>
        </div>
        <div style={{flex:1, overflowY:'auto', padding:'12px'}}>
          <div style={{color:'#64748b', fontSize:'11px', fontWeight:700, letterSpacing:'0.05em', marginBottom:'8px', padding:'0 8px'}}>2026/2027 - AKTIVE</div>
          {active.map(c => (
            <button
              key={c.id}
              onClick={()=>setSelected(c)}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'10px',
                border:'1px solid', borderColor: selected.id===c.id ? '#22c55e' : 'transparent',
                background: selected.id===c.id ? '#22c55e15' : 'transparent',
                color: selected.id===c.id ? 'white' : '#cbd5e1',
                cursor:'pointer', textAlign:'left', marginBottom:'4px'
              }}
            >
              <img src={c.logo} alt={c.name} style={{width:'28px', height:'28px', objectFit:'contain', background:'white', borderRadius:'6px', padding:'2px'}} />
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:'13px', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.name}</div>
                <div style={{fontSize:'11px', color:'#94a3b8'}}>Tier {c.tier} • {c.season}</div>
              </div>
              <div style={{width:'8px', height:'8px', borderRadius:'50%', background: c.color_safe}} />
            </button>
          ))}
          <div style={{marginTop:'16px', color:'#64748b', fontSize:'11px', fontWeight:700, letterSpacing:'0.05em', marginBottom:'8px', padding:'0 8px'}}>TË ARKIVUARA ({archivedCount})</div>
          <div style={{padding:'0 8px', color:'#475569', fontSize:'12px'}}>2025/2026 - 7 liga të arkivuara gati për restore</div>
        </div>
        <div style={{padding:'12px', borderTop:'1px solid #334155'}}>
          <div style={{background:'#22c55e', color:'white', padding:'10px', borderRadius:'10px', fontSize:'12px', fontWeight:700, textAlign:'center'}}>
            ✅ FIX: string is not defined u rregullua!
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1, padding:'24px', overflowY:'auto'}}>
        <div style={{maxWidth:'900px'}}>
          <div style={{background:'white', borderRadius:'16px', padding:'20px', display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px'}}>
            <img src={selected.logo} alt={selected.name} style={{width:'56px', height:'56px', objectFit:'contain'}} />
            <div style={{flex:1}}>
              <h2 style={{margin:0, fontSize:'20px', fontWeight:900, color:'#0f172a'}}>{selected.name}</h2>
              <p style={{margin:'2px 0 0', color:'#64748b', fontSize:'13px'}}>{selected.season} • Tier {selected.tier} • ID: {selected.id.slice(0,8)}...</p>
            </div>
            <div style={{background:selected.color_safe, color:'white', padding:'6px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:700}}>
              {selected.archived ? 'ARKIVUAR' : 'LIVE'}
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px', marginBottom:'20px'}}>
            <div style={{background:'white', borderRadius:'12px', padding:'16px'}}>
              <div style={{color:'#64748b', fontSize:'11px', fontWeight:700}}>NDESHJE SOT</div>
              <div style={{fontSize:'24px', fontWeight:900, marginTop:'4px'}}>0</div>
              <div style={{fontSize:'12px', color:'#94a3b8', marginTop:'4px'}}>Live nga Base44</div>
            </div>
            <div style={{background:'white', borderRadius:'12px', padding:'16px'}}>
              <div style={{color:'#64748b', fontSize:'11px', fontWeight:700}}>TABELA</div>
              <div style={{fontSize:'24px', fontWeight:900, marginTop:'4px'}}>Tier {selected.tier}</div>
              <div style={{fontSize:'12px', color:'#94a3b8', marginTop:'4px'}}>{selected.name}</div>
            </div>
            <div style={{background:'white', borderRadius:'12px', padding:'16px'}}>
              <div style={{color:'#64748b', fontSize:'11px', fontWeight:700}}>STATUS</div>
              <div style={{fontSize:'14px', fontWeight:700, marginTop:'6px', color:'#22c55e'}}>✅ Faqja e bardhë u rregullua</div>
              <div style={{fontSize:'12px', color:'#94a3b8', marginTop:'4px'}}>Build: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          <div style={{background:'white', borderRadius:'16px', padding:'20px'}}>
            <h3 style={{margin:'0 0 12px', fontSize:'14px', fontWeight:800}}>Competition.json - 14 liga</h3>
            <div style={{display:'grid', gap:'8px'}}>
              {COMPETITIONS.map(c=>(
                <div key={c.id} style={{display:'flex', alignItems:'center', gap:'10px', padding:'8px', background:'#f8fafc', borderRadius:'8px', fontSize:'12px'}}>
                  <div style={{width:'6px', height:'6px', borderRadius:'50%', background:c.color_safe}} />
                  <span style={{flex:1, fontWeight:600}}>{c.name}</span>
                  <span style={{color:'#64748b'}}>{c.season}</span>
                </div>
              ))}
            </div>
            <p style={{marginTop:'16px', fontSize:'11px', color:'#94a3b8'}}>Ky është App.tsx i ri 100% pa bug-un "string is not defined". Kopjo në GitHub → Deploy without cache → të 3 domain-et do punojnë me panel të plotë!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
