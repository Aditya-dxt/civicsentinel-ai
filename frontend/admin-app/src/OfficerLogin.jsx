import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// OFFICER LOGIN — Ward officials & admins only
// Blue/cyan theme to clearly distinguish from citizen app
// Email + Password only — no Google, no guest
// ═══════════════════════════════════════════════════════════

// Mock officer credentials — replace with real auth backend
const OFFICER_CREDENTIALS = [
  { email:"officer@mcgm.gov.in",   password:"Ward@2024", name:"Officer Sharma",   ward:"Bandra",  city:"Mumbai",  role:"Ward Officer" },
  { email:"admin@civicsentinel.in", password:"Admin@2024", name:"Admin Singh",    ward:"All",     city:"All",     role:"Admin" },
  { email:"ward@andheri.gov.in",    password:"Ward@2024",  name:"Officer Patil",  ward:"Andheri", city:"Mumbai",  role:"Ward Officer" },
];

function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const ctx = c.getContext("2d"); let raf;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({ length: 48 }, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      vx:(Math.random()-.5)*.14, vy:(Math.random()-.5)*.14, r:Math.random()*.9+.3,
    }));
    const loop = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>c.width)p.vx*=-1; if(p.y<0||p.y>c.height)p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle="rgba(0,200,255,.14)"; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
        if(d<100){ ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(0,200,255,${.045*(1-d/100)})`; ctx.lineWidth=.5; ctx.stroke(); }
      }
      raf=requestAnimationFrame(loop);
    };
    loop();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

export default function OfficerLogin({ onAuth }) {
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [shake, setShake]       = useState(false);

  const ACCENT = "#00ccff";

  const inp = (err) => ({
    width:"100%", padding:"13px 15px", borderRadius:9, fontSize:14,
    outline:"none", fontFamily:"'Inter',sans-serif", color:"#cce8ff",
    background:"rgba(0,0,0,.45)",
    border:`1.5px solid ${err ? "rgba(255,60,80,.55)" : "rgba(0,200,255,.22)"}`,
    transition:"border-color .2s, box-shadow .2s",
  });
  const onF = e => { e.target.style.borderColor="rgba(0,200,255,.55)"; e.target.style.boxShadow="0 0 0 3px rgba(0,200,255,.08)"; };
  const onBl = e => { e.target.style.borderColor="rgba(0,200,255,.22)"; e.target.style.boxShadow="none"; };

  const bump = () => { setShake(true); setTimeout(()=>setShake(false), 420); };

  const handleLogin = async () => {
    if (!email || !pass) { setError("Please enter your credentials."); bump(); return; }
    setLoading(true); setError("");
    await new Promise(r=>setTimeout(r,900));
    const officer = OFFICER_CREDENTIALS.find(o => o.email===email && o.password===pass);
    setLoading(false);
    if (officer) {
      onAuth({ ...officer, authenticated: true });
    } else {
      setError("Invalid credentials. Please check your email and password.");
      bump();
    }
  };

  return (
    <div style={{minHeight:"100vh",background:"#020609",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",fontFamily:"'Inter',sans-serif",padding:20}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#020609;-webkit-font-smoothing:antialiased;}
        input::placeholder{color:rgba(0,200,255,.18);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(0,200,255,.2)}50%{box-shadow:0 0 24px rgba(0,200,255,.45)}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(400%)}}
      `}</style>
      <Particles/>

      {/* Scanline effect */}
      <div style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",width:"100%",height:2,background:"linear-gradient(90deg,transparent,rgba(0,200,255,.06),transparent)",animation:"scanline 4s linear infinite"}}/>
      </div>

      <div style={{position:"relative",zIndex:10,width:"100%",maxWidth:400,animation:"fadeUp .4s ease"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:58,height:58,borderRadius:16,background:"rgba(0,200,255,.1)",border:"1px solid rgba(0,200,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 14px",animation:"glow 3s infinite"}}>🏛</div>
          <div style={{fontSize:22,fontWeight:800,color:ACCENT,letterSpacing:"0.08em",marginBottom:4}}>
            CIVIC<span style={{color:"rgba(0,200,255,.55)"}}>SENTINEL</span>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:"rgba(180,220,255,.7)",letterSpacing:"0.06em"}}>OFFICER PORTAL</div>
          <div style={{fontSize:11,color:"rgba(0,200,255,.3)",marginTop:5,letterSpacing:"0.04em"}}>Authorised Personnel Only</div>
        </div>

        {/* Card */}
        <div style={{background:"rgba(4,10,22,.92)",backdropFilter:"blur(28px)",border:"1px solid rgba(0,200,255,.15)",borderRadius:16,padding:"28px 28px",boxShadow:"0 28px 70px rgba(0,0,0,.65)",animation:shake?"shake .42s ease":"none"}}>

          {/* Badge strip */}
          <div style={{display:"flex",gap:6,marginBottom:22,flexWrap:"wrap"}}>
            {["🗺️ Risk Maps","🧠 AI Copilot","📊 Analytics","🕸 Knowledge Graph","⚡ Live Data"].map(f=>(
              <span key={f} style={{fontSize:10,background:"rgba(0,200,255,.07)",border:"1px solid rgba(0,200,255,.16)",borderRadius:20,padding:"3px 9px",color:"rgba(0,200,255,.55)",fontFamily:"'Inter',sans-serif"}}>{f}</span>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Email */}
            <div>
              <label style={{fontSize:11,color:"rgba(0,200,255,.45)",letterSpacing:"0.06em",display:"block",marginBottom:6}}>OFFICER EMAIL</label>
              <input value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                type="email" placeholder="officer@ward.gov.in" style={inp(error)} onFocus={onF} onBlur={onBl}/>
            </div>

            {/* Password */}
            <div>
              <label style={{fontSize:11,color:"rgba(0,200,255,.45)",letterSpacing:"0.06em",display:"block",marginBottom:6}}>PASSWORD</label>
              <div style={{position:"relative"}}>
                <input value={pass} onChange={e=>{setPass(e.target.value);setError("");}}
                  type={showPass?"text":"password"} placeholder="Your secure password"
                  style={{...inp(error),paddingRight:46}} onFocus={onF} onBlur={onBl}
                  onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
                <button onClick={()=>setShowPass(v=>!v)} tabIndex={-1}
                  style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(0,200,255,.35)",cursor:"pointer",fontSize:15,padding:2}}>
                  {showPass?"🙈":"👁️"}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{background:"rgba(255,60,80,.08)",border:"1px solid rgba(255,60,80,.28)",borderRadius:8,padding:"9px 12px",fontSize:12.5,color:"rgba(255,120,140,.85)",display:"flex",gap:8,alignItems:"center"}}>
                <span>⚠️</span>{error}
              </div>
            )}

            {/* Login button */}
            <button onClick={handleLogin} disabled={loading}
              style={{padding:"14px",background:loading?"rgba(0,200,255,.05)":"linear-gradient(135deg,rgba(0,200,255,.22),rgba(0,200,255,.12))",border:"1px solid rgba(0,200,255,.4)",borderRadius:9,color:loading?"rgba(0,200,255,.35)":ACCENT,fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10,letterSpacing:"0.03em",transition:"all .2s"}}
              onMouseEnter={e=>!loading&&(e.currentTarget.style.background="linear-gradient(135deg,rgba(0,200,255,.3),rgba(0,200,255,.18))")}
              onMouseLeave={e=>!loading&&(e.currentTarget.style.background="linear-gradient(135deg,rgba(0,200,255,.22),rgba(0,200,255,.12))")}>
              {loading
                ? <><div style={{width:18,height:18,border:"2px solid rgba(0,200,255,.2)",borderTopColor:ACCENT,borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Authenticating…</>
                : "🔐 Access Dashboard"
              }
            </button>
          </div>

          {/* Demo credentials hint */}
          <div style={{marginTop:18,padding:"11px 14px",background:"rgba(0,0,0,.3)",border:"1px solid rgba(0,200,255,.1)",borderRadius:8}}>
            <div style={{fontSize:10,color:"rgba(0,200,255,.35)",letterSpacing:"0.06em",marginBottom:6}}>DEMO CREDENTIALS</div>
            <div style={{fontSize:11.5,color:"rgba(0,200,255,.45)",fontFamily:"'DM Mono',monospace",lineHeight:1.8}}>
              officer@mcgm.gov.in / Ward@2024<br/>
              admin@civicsentinel.in / Admin@2024
            </div>
          </div>
        </div>

        <p style={{textAlign:"center",marginTop:16,fontSize:10,color:"rgba(0,200,255,.15)",letterSpacing:"0.1em"}}>
          CIVICSENTINEL · OFFICER PORTAL · RESTRICTED ACCESS
        </p>
      </div>
    </div>
  );
}