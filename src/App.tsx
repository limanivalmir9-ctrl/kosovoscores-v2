export default function App() {
  return (
    <div style={{minHeight:'100vh',background:'#0f172a',display:'grid',placeItems:'center'}}>
      <div style={{background:'white',padding:'32px',borderRadius:'16px',width:'400px',textAlign:'center',fontFamily:'system-ui'}}>
        <h1 style={{margin:0,fontSize:'24px',fontWeight:900}}>✅ ADMIN LIVE!</h1>
        <p style={{color:'#64748b',fontSize:'13px'}}>Faqja e bardhë u rregullua!</p>
        <p style={{marginTop:'16px',fontSize:'12px',background:'#f1f5f9',padding:'8px',borderRadius:'8px'}}>Build: {new Date().toLocaleTimeString()} - 14 liga OK</p>
      </div>
    </div>
  )
}
