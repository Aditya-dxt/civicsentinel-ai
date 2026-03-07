import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// CITIZEN LOGIN — Email + Google + Guest
// 6 regional languages
// ═══════════════════════════════════════════════════════════

const LANGS = [
  { code:"en", native:"English",  flag:"🇬🇧" },
  { code:"hi", native:"हिन्दी",   flag:"🇮🇳" },
  { code:"ta", native:"தமிழ்",    flag:"🇮🇳" },
  { code:"te", native:"తెలుగు",   flag:"🇮🇳" },
  { code:"bn", native:"বাংলা",    flag:"🇮🇳" },
  { code:"mr", native:"मराठी",    flag:"🇮🇳" },
];

const T = {
  en: { title:"Report civic issues\nin your area",
        sub:"Photo · GPS · Instant dispatch to ward office",
        email:"Email", pass:"Password", name:"Full Name",
        signIn:"Sign In", signUp:"Create Account", google:"Continue with Google",
        guest:"Continue as Guest", or:"or",
        switchUp:"New here? Create account", switchIn:"Have account? Sign in",
        terms:"By continuing you agree to our Terms & Privacy Policy",
        forgotPass:"Forgot password?", errEmail:"Enter a valid email",
        errPass:"At least 8 characters", errName:"Enter your name",
        ph_email:"you@example.com", ph_pass:"Min 8 characters", ph_name:"Your name",
        sw:"Weak", sf:"Fair", sg:"Good", ss:"Strong" },
  hi: { title:"अपने क्षेत्र में नागरिक\nसमस्याएं रिपोर्ट करें",
        sub:"फोटो · GPS · वार्ड कार्यालय को तुरंत भेजें",
        email:"ईमेल", pass:"पासवर्ड", name:"पूरा नाम",
        signIn:"साइन इन", signUp:"खाता बनाएं", google:"Google से जारी रखें",
        guest:"अतिथि के रूप में जारी रखें", or:"या",
        switchUp:"नए हैं? खाता बनाएं", switchIn:"खाता है? साइन इन",
        terms:"जारी रखकर आप नीतियों से सहमत हैं",
        forgotPass:"पासवर्ड भूल गए?", errEmail:"सही ईमेल दर्ज करें",
        errPass:"कम से कम 8 अक्षर", errName:"अपना नाम दर्ज करें",
        ph_email:"आपका ईमेल", ph_pass:"कम से कम 8 अक्षर", ph_name:"आपका नाम",
        sw:"कमज़ोर", sf:"ठीक", sg:"अच्छा", ss:"मज़बूत" },
  ta: { title:"உங்கள் பகுதியில் பிரச்சினைகளை\nபுகார் செய்யுங்கள்",
        sub:"படம் · GPS · உடனடி அனுப்புதல்",
        email:"மின்னஞ்சல்", pass:"கடவுச்சொல்", name:"முழு பெயர்",
        signIn:"உள்நுழை", signUp:"கணக்கு உருவாக்கு", google:"Google மூலம் தொடர்",
        guest:"விருந்தினராக தொடர்", or:"அல்லது",
        switchUp:"புதியவரா? கணக்கு உருவாக்கு", switchIn:"கணக்கு உள்ளதா? உள்நுழை",
        terms:"தொடர்வதன் மூலம் நீங்கள் ஒப்புக்கொள்கிறீர்கள்",
        forgotPass:"கடவுச்சொல் மறந்துவிட்டதா?", errEmail:"சரியான மின்னஞ்சல்",
        errPass:"குறைந்தது 8 எழுத்துகள்", errName:"உங்கள் பெயரை உள்ளிடுக",
        ph_email:"உங்கள் மின்னஞ்சல்", ph_pass:"குறைந்தது 8 எழுத்துகள்", ph_name:"உங்கள் பெயர்",
        sw:"பலவீனம்", sf:"சரி", sg:"நல்லது", ss:"வலிமை" },
  te: { title:"మీ ప్రాంతంలో సమస్యలను\nనివేదించండి",
        sub:"ఫోటో · GPS · వార్డ్ కార్యాలయానికి తక్షణ పంపుట",
        email:"ఇమెయిల్", pass:"పాస్‌వర్డ్", name:"పూర్తి పేరు",
        signIn:"సైన్ ఇన్", signUp:"ఖాతా తెరవండి", google:"Google తో కొనసాగండి",
        guest:"అతిథిగా కొనసాగండి", or:"లేదా",
        switchUp:"కొత్తవారా? ఖాతా తెరవండి", switchIn:"ఖాతా ఉందా? సైన్ ఇన్",
        terms:"కొనసాగడం ద్వారా మీరు అంగీకరిస్తున్నారు",
        forgotPass:"పాస్‌వర్డ్ మర్చిపోయారా?", errEmail:"సరైన ఇమెయిల్",
        errPass:"కనీసం 8 అక్షరాలు", errName:"మీ పేరు నమోదు చేయండి",
        ph_email:"మీ ఇమెయిల్", ph_pass:"కనీసం 8 అక్షరాలు", ph_name:"మీ పేరు",
        sw:"బలహీనం", sf:"సరి", sg:"మంచిది", ss:"బలమైనది" },
  bn: { title:"আপনার এলাকায় সমস্যা\nরিপোর্ট করুন",
        sub:"ফটো · GPS · ওয়ার্ড অফিসে তাৎক্ষণিক প্রেরণ",
        email:"ইমেইল", pass:"পাসওয়ার্ড", name:"পুরো নাম",
        signIn:"সাইন ইন", signUp:"অ্যাকাউন্ট তৈরি করুন", google:"Google দিয়ে চালিয়ে যান",
        guest:"অতিথি হিসেবে চালিয়ে যান", or:"অথবা",
        switchUp:"নতুন? অ্যাকাউন্ট তৈরি করুন", switchIn:"অ্যাকাউন্ট আছে? সাইন ইন",
        terms:"চালিয়ে যাওয়ার মাধ্যমে আপনি সম্মত হচ্ছেন",
        forgotPass:"পাসওয়ার্ড ভুলে গেছেন?", errEmail:"সঠিক ইমেইল দিন",
        errPass:"কমপক্ষে ৮ অক্ষর", errName:"আপনার নাম দিন",
        ph_email:"আপনার ইমেইল", ph_pass:"কমপক্ষে ৮ অক্ষর", ph_name:"আপনার নাম",
        sw:"দুর্বল", sf:"মোটামুটি", sg:"ভালো", ss:"শক্তিশালী" },
  mr: { title:"तुमच्या परिसरातील समस्या\nनोंदवा",
        sub:"फोटो · GPS · वार्ड कार्यालयाला त्वरित पाठवा",
        email:"ईमेल", pass:"पासवर्ड", name:"पूर्ण नाव",
        signIn:"साइन इन", signUp:"खाते तयार करा", google:"Google सह सुरू ठेवा",
        guest:"पाहुणे म्हणून सुरू ठेवा", or:"किंवा",
        switchUp:"नवीन? खाते तयार करा", switchIn:"खाते आहे? साइन इन",
        terms:"सुरू ठेवल्यास तुम्ही सहमत आहात",
        forgotPass:"पासवर्ड विसरलात?", errEmail:"योग्य ईमेल प्रविष्ट करा",
        errPass:"किमान 8 अक्षरे", errName:"तुमचे नाव प्रविष्ट करा",
        ph_email:"तुमचा ईमेल", ph_pass:"किमान 8 अक्षरे", ph_name:"तुमचे नाव",
        sw:"कमकुवत", sf:"बरे", sg:"चांगले", ss:"मजबूत" },
};

function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const ctx = c.getContext("2d"); let raf;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({ length: 44 }, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      vx:(Math.random()-.5)*.16, vy:(Math.random()-.5)*.16, r:Math.random()*.85+.3,
    }));
    const loop = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>c.width)p.vx*=-1; if(p.y<0||p.y>c.height)p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle="rgba(34,197,94,.16)"; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
        if(d<95){ ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(34,197,94,${.05*(1-d/95)})`; ctx.lineWidth=.5; ctx.stroke(); }
      }
      raf=requestAnimationFrame(loop);
    };
    loop();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

function StrengthBar({ pw, t }) {
  if (!pw) return null;
  const s = (pw.length>=8?1:0)+(/[A-Z]/.test(pw)?1:0)+(/[0-9]/.test(pw)?1:0)+(/[^A-Za-z0-9]/.test(pw)?1:0);
  const cols=["","#ef4444","#f97316","#3b82f6","#22c55e"];
  const lbls=["",t.sw,t.sf,t.sg,t.ss];
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5}}>
      <div style={{flex:1,height:3,background:"rgba(255,255,255,0.07)",borderRadius:2}}>
        <div style={{height:"100%",width:`${s*25}%`,background:cols[s],borderRadius:2,transition:"all .3s"}}/>
      </div>
      <span style={{fontSize:10,color:cols[s],minWidth:44,fontWeight:600}}>{lbls[s]}</span>
    </div>
  );
}

export default function CitizenLogin({ onAuth }) {
  const [lang, setLang]             = useState("en");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mode, setMode]             = useState("signin");
  const [email, setEmail]           = useState("");
  const [pass, setPass]             = useState("");
  const [name, setName]             = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [gLoading, setGLoading]     = useState(false);
  const [errors, setErrors]         = useState({});
  const [shake, setShake]           = useState(false);

  const t = T[lang] || T.en;
  const GREEN = "#22c55e";

  const validate = () => {
    const e = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = t.errEmail;
    if (!pass || pass.length < 8)               e.pass  = t.errPass;
    if (mode === "signup" && !name.trim())       e.name  = t.errName;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const bump = () => { setShake(true); setTimeout(()=>setShake(false),420); };

  const handleEmail = async () => {
    if (!validate()) { bump(); return; }
    setLoading(true);
    await new Promise(r=>setTimeout(r,900));
    setLoading(false);
    onAuth({ name: name || email.split("@")[0], email, lang, role:"citizen" });
  };

  const handleGoogle = async () => {
    setGLoading(true);
    await new Promise(r=>setTimeout(r,700));
    setGLoading(false);
    onAuth({ name:"Google User", email:"user@gmail.com", lang, role:"citizen", provider:"google" });
  };

  const handleGuest = () => onAuth({ name:"Guest", lang, role:"citizen", guest:true });

  const inp = (err) => ({
    width:"100%", padding:"12px 15px", borderRadius:9, fontSize:14, outline:"none",
    fontFamily:"'Inter',sans-serif", color:"#f0fdf4",
    background:"rgba(255,255,255,0.05)",
    border:`1.5px solid ${err?"rgba(239,68,68,.6)":"rgba(34,197,94,0.2)"}`,
    transition:"border-color .2s, box-shadow .2s",
  });
  const onF = e => { e.target.style.borderColor="rgba(34,197,94,0.55)"; e.target.style.boxShadow="0 0 0 3px rgba(34,197,94,0.08)"; };
  const onB = e => { e.target.style.borderColor="rgba(34,197,94,0.2)"; e.target.style.boxShadow="none"; };

  return (
    <div style={{minHeight:"100vh",background:"#020c06",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",fontFamily:"'Inter',sans-serif",padding:20}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#020c06;-webkit-font-smoothing:antialiased;}
        input::placeholder{color:rgba(134,239,172,.25);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
      <Particles/>

      {/* Lang picker */}
      <div style={{position:"fixed",top:18,right:18,zIndex:120}}>
        <button onClick={()=>setShowLangMenu(v=>!v)}
          style={{background:"rgba(4,20,10,.95)",border:"1px solid rgba(34,197,94,.25)",borderRadius:9,padding:"8px 13px",color:"#bbf7d0",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:8,backdropFilter:"blur(16px)",fontWeight:500,fontFamily:"'Inter',sans-serif"}}>
          <span style={{fontSize:16}}>{LANGS.find(l=>l.code===lang).flag}</span>
          <span>{LANGS.find(l=>l.code===lang).native}</span>
          <svg width="9" height="6" viewBox="0 0 9 6"><path d="M1 1l3.5 3.5L8 1" stroke="rgba(34,197,94,.5)" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
        </button>
        {showLangMenu && (
          <div style={{position:"absolute",top:"110%",right:0,background:"rgba(4,20,10,.98)",border:"1px solid rgba(34,197,94,.18)",borderRadius:11,overflow:"hidden",backdropFilter:"blur(24px)",minWidth:168,animation:"slideDown .17s ease",zIndex:200,boxShadow:"0 14px 44px rgba(0,0,0,.6)"}}>
            {LANGS.map(l=>(
              <button key={l.code} onClick={()=>{setLang(l.code);setShowLangMenu(false);}}
                style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 15px",background:lang===l.code?"rgba(34,197,94,.1)":"none",border:"none",color:lang===l.code?"#22c55e":"rgba(187,247,208,.7)",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif",fontWeight:lang===l.code?600:400,borderLeft:lang===l.code?"2px solid #22c55e":"2px solid transparent"}}>
                <span style={{fontSize:17}}>{l.flag}</span>
                <span style={{flex:1}}>{l.native}</span>
                {lang===l.code && <span style={{fontSize:11,color:"#22c55e"}}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card */}
      <div style={{position:"relative",zIndex:10,width:"100%",maxWidth:400,animation:"fadeUp .4s ease"}}>
        {/* Hero text */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,borderRadius:15,background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px",boxShadow:"0 0 24px rgba(34,197,94,.15)"}}>🏛</div>
          <div style={{fontSize:22,fontWeight:800,color:"#22c55e",letterSpacing:"0.06em",marginBottom:4}}>
            CIVIC<span style={{color:"#86efac"}}>SENTINEL</span>
          </div>
          <div style={{fontSize:15,fontWeight:700,color:"rgba(187,247,208,.85)",lineHeight:1.4,whiteSpace:"pre-line"}}>{t.title}</div>
          <div style={{fontSize:11.5,color:"rgba(134,239,172,.45)",marginTop:6}}>{t.sub}</div>
        </div>

        <div style={{background:"rgba(4,20,10,.88)",backdropFilter:"blur(28px)",border:"1px solid rgba(34,197,94,.15)",borderRadius:16,padding:"26px 28px",boxShadow:"0 24px 64px rgba(0,0,0,.55)",animation:shake?"shake .42s ease":"none"}}>
          {/* Sign in / up toggle */}
          <div style={{display:"flex",background:"rgba(0,0,0,.3)",borderRadius:8,padding:4,marginBottom:20}}>
            {[["signin",t.signIn],["signup",t.signUp]].map(([m,lbl])=>(
              <button key={m} onPointerDown={()=>{setMode(m);setErrors({});}}
                style={{flex:1,padding:"9px",borderRadius:6,border:"none",background:mode===m?"rgba(34,197,94,.18)":"transparent",color:mode===m?"#22c55e":"rgba(134,239,172,.38)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all .2s"}}>
                {lbl}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {mode==="signup" && (
              <div>
                <input value={name} onChange={e=>{setName(e.target.value);setErrors(er=>({...er,name:null}));}}
                  placeholder={t.ph_name} style={inp(errors.name)} onFocus={onF} onBlur={onB}/>
                {errors.name && <p style={{margin:"4px 0 0 4px",fontSize:11,color:"#ef4444"}}>{errors.name}</p>}
              </div>
            )}
            <div>
              <input value={email} onChange={e=>{setEmail(e.target.value);setErrors(er=>({...er,email:null}));}}
                type="email" placeholder={t.ph_email} style={inp(errors.email)} onFocus={onF} onBlur={onB}/>
              {errors.email && <p style={{margin:"4px 0 0 4px",fontSize:11,color:"#ef4444"}}>{errors.email}</p>}
            </div>
            <div>
              <div style={{position:"relative"}}>
                <input value={pass} onChange={e=>{setPass(e.target.value);setErrors(er=>({...er,pass:null}));}}
                  type={showPass?"text":"password"} placeholder={t.ph_pass}
                  style={{...inp(errors.pass),paddingRight:44}} onFocus={onF} onBlur={onB}/>
                <button onClick={()=>setShowPass(v=>!v)} tabIndex={-1}
                  style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(34,197,94,.4)",cursor:"pointer",fontSize:14,padding:2}}>
                  {showPass?"🙈":"👁️"}
                </button>
              </div>
              {mode==="signup" && <StrengthBar pw={pass} t={t}/>}
              {errors.pass && <p style={{margin:"4px 0 0 4px",fontSize:11,color:"#ef4444"}}>{errors.pass}</p>}
              {mode==="signin" && (
                <div style={{textAlign:"right",marginTop:5}}>
                  <button style={{background:"none",border:"none",color:"rgba(34,197,94,.42)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>{t.forgotPass}</button>
                </div>
              )}
            </div>

            {/* CTA */}
            <button onClick={handleEmail} disabled={loading}
              style={{padding:"13px",background:loading?"rgba(34,197,94,.07)":"linear-gradient(135deg,rgba(34,197,94,.28),rgba(34,197,94,.18))",border:"1px solid rgba(34,197,94,.42)",borderRadius:9,color:loading?"rgba(34,197,94,.38)":"#22c55e",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:9,transition:"all .2s"}}>
              {loading ? <div style={{width:18,height:18,border:"2px solid rgba(34,197,94,.25)",borderTopColor:"#22c55e",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> : (mode==="signup"?t.signUp:t.signIn)}
            </button>

            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,height:1,background:"rgba(34,197,94,.09)"}}/><span style={{fontSize:11,color:"rgba(134,239,172,.28)"}}>{t.or}</span><div style={{flex:1,height:1,background:"rgba(34,197,94,.09)"}}/>
            </div>

            {/* Google */}
            <button onClick={handleGoogle} disabled={gLoading}
              style={{padding:"12px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.11)",borderRadius:9,color:"#d1fae5",fontSize:13,fontWeight:600,cursor:gLoading?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:11,transition:"background .18s",opacity:gLoading?0.6:1}}
              onMouseEnter={e=>!gLoading&&(e.currentTarget.style.background="rgba(255,255,255,.08)")}
              onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,.04)")}>
              {gLoading
                ? <div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.2)",borderTopColor:"white",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                : <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
              }
              {t.google}
            </button>

            {/* Guest */}
            <button onClick={handleGuest}
              style={{padding:"11px",background:"transparent",border:"1px dashed rgba(34,197,94,.18)",borderRadius:9,color:"rgba(34,197,94,.45)",fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all .18s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(34,197,94,.4)";e.currentTarget.style.color="#22c55e";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(34,197,94,.18)";e.currentTarget.style.color="rgba(34,197,94,.45)";}}>
              {t.guest}
            </button>

            <p style={{fontSize:10.5,color:"rgba(134,239,172,.22)",textAlign:"center",lineHeight:1.55}}>{t.terms}</p>
            <div style={{textAlign:"center"}}>
              <button onClick={()=>{setMode(m=>m==="signin"?"signup":"signin");setErrors({});}}
                style={{background:"none",border:"none",color:"rgba(34,197,94,.46)",fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif",textDecoration:"underline",textDecorationColor:"rgba(34,197,94,.2)"}}>
                {mode==="signin"?t.switchUp:t.switchIn}
              </button>
            </div>
          </div>
        </div>
        <p style={{textAlign:"center",marginTop:16,fontSize:10,color:"rgba(134,239,172,.18)",letterSpacing:"0.1em"}}>
          CIVICSENTINEL · CITIZEN APP · INDIA
        </p>
      </div>
    </div>
  );
}