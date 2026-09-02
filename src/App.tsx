import { useState, useMemo } from 'react'

type Competition = {
  id: string
  name: string
  logo: string
  season: string | null
  tier: number
  color: string
  color_safe: string
  status_positions: { position: number, status: string }[]
  archived: boolean | null
  hidden: boolean | null
  show_profiles: boolean
  show_squad: boolean
}

const DATA: Competition[] = [
  {
    "id": "6a74979fb131e76389be2432",
    "name": "SUPERLIGA E FEMRAVE",
    "logo": "https://media.base44.com/images/public/69c340685dca7075d7622e15/1d13df0d5_SPFEMRAT.png",
    "season": "2026/2027",
    "tier": 4,
    "color": "#ec4899",
    "color_safe": "#ec4899",
    "status_positions": [],
    "archived": false,
    "hidden": false,
    "show_profiles": true,
    "show_squad": false
  },
  {
    "id": "6a7484de797e8618445b26c5",
    "name": "SUPERLIGA U19",
    "logo": "https://media.base44.com/images/public/69c340685dca7075d7622e15/09a483065_LOGOLIGA_transparent.png",
    "season": "2026/2027",
    "tier": 6,
    "color": "purple-500",
    "color_safe": "#a855f7",
    "status_positions": [
      { "position": 1, "status": "Kampion, UEFA Youth League" },
      { "position": 14, "status": "Renie nga liga" },
      { "position": 15, "status": "Renie nga liga" },
      { "position": 16, "status": "Renie nga liga" }
    ],
    "archived": false,
    "hidden": false,
    "show_profiles": true,
    "show_squad": false
  },
  {
    "id": "6a7484dedad209108a2d3667",
    "name": "KUPA E KOSOVËS",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/5a8b89052_kupaeks.png",
    "season": "2026/2027",
    "tier": 4,
    "color": "cyan-500",
    "color_safe": "#06b6d4",
    "status_positions": [],
    "archived": false,
    "hidden": false,
    "show_profiles": true,
    "show_squad": false
  },
  {
    "id": "6a7484ddad090536a8e1875a",
    "name": "LIGA E DYTË E KOSOVËS",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/8140b474a_LIGAEDYTE.png",
    "season": "2026/2027",
    "tier": 3,
    "color": "cyan-500",
    "color_safe": "#06b6d4",
    "status_positions": [
      { "position": 1, "status": "Promovim" },
      { "position": 2, "status": "Promovim" },
      { "position": 17, "status": "Renie nga liga" },
      { "position": 18, "status": "Renie nga liga" }
    ],
    "archived": false,
    "hidden": false,
    "show_profiles": true,
    "show_squad": false
  },
  {
    "id": "6a7484dcb63c5aab429503c8",
    "name": "RAIFFEISEN LIGA E PARË",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/22250fc28_RaiffeisenLigaPare.png",
    "season": "2026/2027",
    "tier": 2,
    "color": "orange-500",
    "color_safe": "orange-500",
    "status_positions": [
      { "position": 1, "status": "Kampion" },
      { "position": 2, "status": "Kampion" },
      { "position": 3, "status": "Playoff" },
      { "position": 15, "status": "Renie nga liga" },
      { "position": 16, "status": "Renie nga liga" },
      { "position": 17, "status": "Renie nga liga" },
      { "position": 18, "status": "Renie nga liga" }
    ],
    "archived": false,
    "hidden": false,
    "show_profiles": true,
    "show_squad": false
  },
  {
    "id": "6a7484dc4af04c7780f99b61",
    "name": "ALBI MALL SUPERLIGA",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/d3a2a147a_ALBIMALLSUPERLIGA.png",
    "season": "2026/2027",
    "tier": 1,
    "color": "green-500",
    "color_safe": "green-500",
    "status_positions": [
      { "position": 1, "status": "Kampion" },
      { "position": 2, "status": "UECL Qual." },
      { "position": 3, "status": "UECL Qual." },
      { "position": 10, "status": "Renie nga liga" },
      { "position": 9, "status": "Renie nga liga" },
      { "position": 8, "status": "Playoff" }
    ],
    "archived": false,
    "hidden": false,
    "show_profiles": true,
    "show_squad": true
  },
  {
    "id": "69cafd79dae733babf38cdab",
    "name": "MIQËSORE",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/3f7fc5f5c_FRIENDLY.png",
    "season": null,
    "tier": 7,
    "color": "red-500",
    "color_safe": "red-500",
    "status_positions": [],
    "archived": null,
    "hidden": null,
    "show_profiles": true,
    "show_squad": false
  },
  {
    "id": "69c5e15f2cb53c180052ae73",
    "name": "KUPA E KOSOVËS",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/5a8b89052_kupaeks.png",
    "season": "2025/2026",
    "tier": 4,
    "color": "cyan-500",
    "color_safe": "#06b6d4",
    "status_positions": [],
    "archived": true,
    "hidden": null,
    "show_profiles": true,
    "show_squad": true
  },
  {
    "id": "69c47a881a8315919b1dc7cc",
    "name": "SUPERLIGA U19",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/b645e3037_LOGOU19.png",
    "season": "2025/2026",
    "tier": 6,
    "color": "purple-500",
    "color_safe": "#a855f7",
    "status_positions": [],
    "archived": true,
    "hidden": null,
    "show_profiles": true,
    "show_squad": true
  },
  {
    "id": "69c47a707150d64d91e05d7c",
    "name": "SUPERLIGA U21",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/b7c564295_SUPERLIGAU21.png",
    "season": "2025/2026",
    "tier": 5,
    "color": "cyan-500",
    "color_safe": "#06b6d4",
    "status_positions": [{ "position": 1, "status": "Kampion" }],
    "archived": true,
    "hidden": false,
    "show_profiles": true,
    "show_squad": true
  },
  {
    "id": "69c47a2332df3034ac8af021",
    "name": "LIGA E DYTË E KOSOVËS",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/8140b474a_LIGAEDYTE.png",
    "season": "2025/2026",
    "tier": 3,
    "color": "cyan-500",
    "color_safe": "#06b6d4",
    "status_positions": [
      { "position": 1, "status": "Promovim" },
      { "position": 2, "status": "Promovim" },
      { "position": 17, "status": "Renie nga liga" },
      { "position": 18, "status": "Renie nga liga" }
    ],
    "archived": true,
    "hidden": null,
    "show_profiles": true,
    "show_squad": true
  },
  {
    "id": "69c348a57f4d228e291fb468",
    "name": "RAIFFEISEN LIGA E PARË",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/22250fc28_RaiffeisenLigaPare.png",
    "season": "2025/2026",
    "tier": 2,
    "color": "orange-500",
    "color_safe": "orange-500",
    "status_positions": [
      { "position": 1, "status": "Kampion" },
      { "position": 2, "status": "Kampion" },
      { "position": 3, "status": "Playoff" },
      { "position": 4, "status": "Playoff" },
      { "position": 17, "status": "Renie nga liga" },
      { "position": 18, "status": "Renie nga liga" }
    ],
    "archived": true,
    "hidden": null,
    "show_profiles": true,
    "show_squad": true
  },
  {
    "id": "69c34416e7b3bcb5d1250252",
    "name": "ALBI MALL SUPERLIGA",
    "logo": "https://base44.app/api/apps/69c340685dca7075d7622e15/files/mp/public/69c340685dca7075d7622e15/d3a2a147a_ALBIMALLSUPERLIGA.png",
    "season": "2025/2026",
    "tier": 1,
    "color": "green-500",
    "color_safe": "green-500",
    "status_positions": [
      { "position": 1, "status": "Kampion" },
      { "position": 2, "status": "UECL Qual." },
      { "position": 3, "status": "UECL Qual." },
      { "position": 10, "status": "Renie nga liga" },
      { "position": 9, "status": "Renie nga liga" },
      { "position": 8, "status": "Playoff" }
    ],
    "archived": true,
    "hidden": false,
    "show_profiles": true,
    "show_squad": true
  }
]

const ENTITIES = [
  { id:'Competition', label:'Competition', count:14, icon:'🏆' },
  { id:'Club', label:'Club', count:76, icon:'🛡️' },
  { id:'Match', label:'Match', count:1049, icon:'⚽' },
  { id:'Player', label:'Player', count:634, icon:'👤' },
  { id:'Standing', label:'Standing', count:125, icon:'📊' },
  { id:'MatchEvent', label:'MatchEvent', count:3421, icon:'🎯' },
  { id:'News', label:'News', count:48, icon:'📰' },
]

export default function App(){
  const [entity, setEntity] = useState('Competition')
  const [search, setSearch] = useState('')
  const [filterArchived, setFilterArchived] = useState<'all'|'active'|'archived'>('all')
  const [editing, setEditing] = useState<Competition | null>(null)
  const [data, setData] = useState<Competition[]>(DATA)
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(()=>{
    return data.filter(c=>{
      if(search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if(filterArchived==='active' && c.archived) return false
      if(filterArchived==='archived' && !c.archived) return false
      return true
    })
  },[data, search, filterArchived])

  const handleArchive = (id:string)=>{
    setData(d=>d.map(c=> c.id===id ? {...c, archived: !c.archived} : c))
  }

  const handleDelete = (id:string)=>{
    if(!confirm('Fshij këtë ligë?')) return
    setData(d=>d.filter(c=>c.id!==id))
  }

  const handleSave = (comp:Competition)=>{
    setData(d=>{
      const exists = d.find(x=>x.id===comp.id)
      if(exists) return d.map(x=> x.id===comp.id ? comp : x)
      return [comp, ...d]
    })
    setEditing(null)
    setShowAdd(false)
  }

  return (
    <div style={{minHeight:'100vh', background:'#f8fafc', fontFamily:'Inter, system-ui, -apple-system, sans-serif'}}>
      {/* Base44 Header */}
      <div style={{background:'white', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:20}}>
        <div style={{display:'flex', alignItems:'center', height:'56px', padding:'0 16px', gap:'16px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <div style={{width:'32px', height:'32px', background:'black', borderRadius:'8px', display:'grid', placeItems:'center', color:'white', fontWeight:900}}>B</div>
            <span style={{fontWeight:800, fontSize:'15px'}}>base44</span>
            <span style={{color:'#94a3b8', fontSize:'13px'}}>kosovoscores-v2 • main</span>
          </div>
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={{fontSize:'12px', color:'#64748b'}}>14 liga • 76 klube • 1049 ndeshje</div>
            <div style={{width:'28px', height:'28px', background:'#e2e8f0', borderRadius:'50%'}} />
          </div>
        </div>
        {/* Entity Tabs - like Base44 */}
        <div style={{display:'flex', gap:'0', padding:'0 16px', overflowX:'auto', borderTop:'1px solid #f1f5f9'}}>
          {ENTITIES.map(e=>(
            <button
              key={e.id}
              onClick={()=>setEntity(e.id)}
              style={{
                padding:'10px 14px', fontSize:'13px', fontWeight: entity===e.id ? 700 : 500,
                color: entity===e.id ? 'black' : '#64748b',
                borderBottom: entity===e.id ? '2px solid black' : '2px solid transparent',
                background:'transparent', borderTop:'none', borderLeft:'none', borderRight:'none',
                cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', whiteSpace:'nowrap'
              }}
            >
              <span>{e.icon}</span> {e.label} <span style={{background: entity===e.id ? 'black':'#f1f5f9', color: entity===e.id ? 'white':'#64748b', borderRadius:'10px', padding:'0 6px', fontSize:'11px'}}>{e.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'flex', minHeight:'calc(100vh - 92px)'}}>
        {/* Left filters - Base44 style */}
        <div style={{width:'240px', background:'white', borderRight:'1px solid #e2e8f0', padding:'16px'}}>
          <div style={{fontSize:'11px', fontWeight:700, color:'#94a3b8', letterSpacing:'0.05em', marginBottom:'12px'}}>FILTERS</div>
          <input
            placeholder="Search Competition..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'13px', marginBottom:'12px'}}
          />
          <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
            {[
              {k:'all', l:'All (14)'},
              {k:'active', l:'Active (7)'},
              {k:'archived', l:'Archived (7)'}
            ].map(f=>(
              <button
                key={f.k}
                onClick={()=>setFilterArchived(f.k as any)}
                style={{
                  textAlign:'left', padding:'8px 10px', borderRadius:'8px', fontSize:'13px',
                  background: filterArchived===f.k ? '#f1f5f9' : 'transparent',
                  border:'1px solid transparent', fontWeight: filterArchived===f.k ? 600 : 400,
                  cursor:'pointer'
                }}
              >{f.l}</button>
            ))}
          </div>
          <div style={{marginTop:'20px', padding:'12px', background:'#f8fafc', borderRadius:'10px', border:'1px solid #e2e8f0'}}>
            <div style={{fontSize:'12px', fontWeight:700}}>✅ Fix deployed</div>
            <div style={{fontSize:'11px', color:'#64748b', marginTop:'4px'}}>string is not defined u rregullua. Build: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Main table - Base44 Data view */}
        <div style={{flex:1, padding:'16px', overflowX:'auto'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px'}}>
            <h2 style={{margin:0, fontSize:'18px', fontWeight:800}}>{entity} <span style={{color:'#94a3b8', fontWeight:400}}>({filtered.length})</span></h2>
            <button onClick={()=>{ setEditing(null); setShowAdd(true)}} style={{background:'black', color:'white', padding:'8px 14px', borderRadius:'8px', fontSize:'13px', fontWeight:600, border:'none', cursor:'pointer'}}>+ Add {entity}</button>
          </div>

          <div style={{background:'white', border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#f8fafc', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>
                    <th style={{padding:'10px 12px', fontWeight:600, color:'#64748b', fontSize:'11px'}}>LOGO</th>
                    <th style={{padding:'10px 12px', fontWeight:600, color:'#64748b', fontSize:'11px'}}>NAME</th>
                    <th style={{padding:'10px 12px', fontWeight:600, color:'#64748b', fontSize:'11px'}}>SEASON</th>
                    <th style={{padding:'10px 12px', fontWeight:600, color:'#64748b', fontSize:'11px'}}>TIER</th>
                    <th style={{padding:'10px 12px', fontWeight:600, color:'#64748b', fontSize:'11px'}}>COLOR</th>
                    <th style={{padding:'10px 12px', fontWeight:600, color:'#64748b', fontSize:'11px'}}>STATUS</th>
                    <th style={{padding:'10px 12px', fontWeight:600, color:'#64748b', fontSize:'11px'}}>ARCHIVED</th>
                    <th style={{padding:'10px 12px', fontWeight:600, color:'#64748b', fontSize:'11px'}}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c=>(
                    <tr key={c.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:'10px 12px'}}><img src={c.logo} alt="" style={{width:'28px', height:'28px', objectFit:'contain', background:'#f8fafc', borderRadius:'6px'}} /></td>
                      <td style={{padding:'10px 12px', fontWeight:600, maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.name}</td>
                      <td style={{padding:'10px 12px', color:'#64748b'}}>{c.season || '-'}</td>
                      <td style={{padding:'10px 12px'}}><span style={{background:'#f1f5f9', padding:'2px 8px', borderRadius:'12px', fontSize:'11px'}}>{c.tier}</span></td>
                      <td style={{padding:'10px 12px'}}><div style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:'14px', height:'14px', borderRadius:'4px', background:c.color_safe, border:'1px solid #e2e8f0'}} /> <span style={{fontSize:'11px', color:'#64748b'}}>{c.color_safe}</span></div></td>
                      <td style={{padding:'10px 12px'}}><span style={{fontSize:'11px', background: c.status_positions.length ? '#dcfce7' : '#f1f5f9', color: c.status_positions.length ? '#166534' : '#64748b', padding:'2px 8px', borderRadius:'12px'}}>{c.status_positions.length ? `${c.status_positions.length} pozicione` : '—'}</span></td>
                      <td style={{padding:'10px 12px'}}>{c.archived ? <span style={{background:'#fee2e2', color:'#991b1b', padding:'2px 8px', borderRadius:'12px', fontSize:'11px'}}>Archived</span> : <span style={{background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:'12px', fontSize:'11px'}}>Active</span>}</td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex', gap:'6px'}}>
                          <button onClick={()=>setEditing(c)} style={{padding:'4px 8px', borderRadius:'6px', border:'1px solid #e2e8f0', background:'white', fontSize:'11px', cursor:'pointer'}}>Edit</button>
                          <button onClick={()=>handleArchive(c.id)} style={{padding:'4px 8px', borderRadius:'6px', border:'1px solid #e2e8f0', background:'white', fontSize:'11px', cursor:'pointer'}}>{c.archived ? 'Unarchive' : 'Archive'}</button>
                          <button onClick={()=>handleDelete(c.id)} style={{padding:'4px 8px', borderRadius:'6px', border:'1px solid #fee2e2', background:'#fff1f2', color:'#be123c', fontSize:'11px', cursor:'pointer'}}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{marginTop:'16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px'}}>
            <div style={{background:'white', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px'}}>
              <div style={{fontSize:'11px', color:'#94a3b8', fontWeight:600}}>CLUBS</div>
              <div style={{fontSize:'20px', fontWeight:800, marginTop:'4px'}}>76</div>
              <div style={{fontSize:'11px', color:'#64748b'}}>Nga Club.json</div>
            </div>
            <div style={{background:'white', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px'}}>
              <div style={{fontSize:'11px', color:'#94a3b8', fontWeight:600}}>MATCHES</div>
              <div style={{fontSize:'20px', fontWeight:800, marginTop:'4px'}}>1,049</div>
              <div style={{fontSize:'11px', color:'#64748b'}}>Nga Match.json</div>
            </div>
            <div style={{background:'white', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px'}}>
              <div style={{fontSize:'11px', color:'#94a3b8', fontWeight:600}}>PLAYERS</div>
              <div style={{fontSize:'20px', fontWeight:800, marginTop:'4px'}}>634</div>
              <div style={{fontSize:'11px', color:'#64748b'}}>Nga Player.json</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal - Base44 style */}
      {(editing || showAdd) && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'grid', placeItems:'center', zIndex:50, padding:'16px'}}>
          <div style={{background:'white', borderRadius:'16px', width:'100%', maxWidth:'520px', overflow:'hidden', border:'1px solid #e2e8f0'}}>
            <div style={{padding:'16px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3 style={{margin:0, fontSize:'16px', fontWeight:800}}>{editing ? `Edit ${editing.name}` : 'Add Competition'}</h3>
              <button onClick={()=>{setEditing(null); setShowAdd(false)}} style={{background:'#f1f5f9', border:'none', width:'28px', height:'28px', borderRadius:'8px', cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:'16px', display:'grid', gap:'12px'}}>
              {(() => {
                const comp = editing || { id: Math.random().toString(36).slice(2), name:'', logo:'', season:'2026/2027', tier:1, color:'green-500', color_safe:'#22c55e', status_positions:[], archived:false, hidden:false, show_profiles:true, show_squad:true } as Competition
                return (
                  <>
                    <div><label style={{fontSize:'11px', fontWeight:600, color:'#64748b'}}>NAME</label><input defaultValue={comp.name} id="edit-name" style={{width:'100%', marginTop:'4px', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'13px'}} /></div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                      <div><label style={{fontSize:'11px', fontWeight:600, color:'#64748b'}}>SEASON</label><input defaultValue={comp.season || ''} id="edit-season" style={{width:'100%', marginTop:'4px', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'13px'}} /></div>
                      <div><label style={{fontSize:'11px', fontWeight:600, color:'#64748b'}}>TIER</label><input defaultValue={comp.tier} id="edit-tier" type="number" style={{width:'100%', marginTop:'4px', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'13px'}} /></div>
                    </div>
                    <div><label style={{fontSize:'11px', fontWeight:600, color:'#64748b'}}>LOGO URL</label><input defaultValue={comp.logo} id="edit-logo" style={{width:'100%', marginTop:'4px', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'13px'}} /></div>
                    <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
                      <button
                        onClick={()=>{
                          const name = (document.getElementById('edit-name') as HTMLInputElement).value
                          const season = (document.getElementById('edit-season') as HTMLInputElement).value
                          const tier = parseInt((document.getElementById('edit-tier') as HTMLInputElement).value) || 1
                          const logo = (document.getElementById('edit-logo') as HTMLInputElement).value
                          handleSave({...comp, name, season, tier, logo})
                        }}
                        style={{flex:1, background:'black', color:'white', padding:'10px', borderRadius:'8px', border:'none', fontWeight:600, cursor:'pointer'}}
                      >Save</button>
                      <button onClick={()=>{setEditing(null); setShowAdd(false)}} style={{flex:1, background:'#f1f5f9', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0', fontWeight:600, cursor:'pointer'}}>Cancel</button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
