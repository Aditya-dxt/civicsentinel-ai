import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// CIVICSENTINEL — AUTH PAGE  v2
// Email + Password  |  Google OAuth  |  Guest
// Phone OTP removed per spec — only these two auth methods
// ══════════════════════════════════════════════════════════════════════════════

const LANGS = {
  en: { name:"English",  flag:"🇬🇧" },
  hi: { name:"हिन्दी",   flag:"🇮🇳" },
  ta: { name:"தமிழ்",    flag:"🇮🇳" },
  te: { name:"తెలుగు",   flag:"🇮🇳" },
  bn: { name:"বাংলা",    flag:"🇮🇳" },
  mr: { name:"मराठी",    flag:"🇮🇳" },
};

const COPY = {
  en: {
    tagline:"Digital Democracy Platform",
    subtitle:"Empowering citizens · Transforming governance",
    emailLabel:"Email Address",
    passLabel:"Password",
    nameLabel:"Full Name",
    signIn:"Sign In", signUp:"Create Account",
    google:"Continue with Google",
    guest:"Explore as Guest",
    switchToSignup:"New user? Create account",
    switchToSignin:"Already have an account? Sign in",
    or:"or",
    phEmail:"you@example.com",
    phPass:"Minimum 8 characters",
    phName:"Your full name",
    terms:"By continuing you agree to our Terms & Privacy Policy",
    guestNote:"Guest — read-only, reporting disabled",
    forgotPass:"Forgot password?",
    errEmail:"Please enter a valid email address",
    errPassLen:"Password must be at least 8 characters",
    errName:"Please enter your name",
    strengthWeak:"Weak", strengthFair:"Fair", strengthGood:"Good", strengthStrong:"Strong",
  },
  hi: {
    tagline:"डिजिटल लोकतंत्र प्लेटफॉर्म",
    subtitle:"नागरिकों को सशक्त बनाना · शासन बदलना",
    emailLabel:"ईमेल पता", passLabel:"पासवर्ड", nameLabel:"पूरा नाम",
    signIn:"साइन इन", signUp:"खाता बनाएं",
    google:"Google से जारी रखें", guest:"अतिथि के रूप में देखें",
    switchToSignup:"नए उपयोगकर्ता? खाता बनाएं", switchToSignin:"खाता है? साइन इन",
    or:"या", phEmail:"आपका ईमेल", phPass:"कम से कम 8 अक्षर", phName:"आपका पूरा नाम",
    terms:"जारी रखकर आप हमारी नीतियों से सहमत हैं",
    guestNote:"अतिथि मोड — केवल देखने की सुविधा",
    forgotPass:"पासवर्ड भूल गए?",
    errEmail:"सही ईमेल दर्ज करें", errPassLen:"पासवर्ड कम से कम 8 अक्षर", errName:"अपना नाम दर्ज करें",
    strengthWeak:"कमज़ोर", strengthFair:"ठीक", strengthGood:"अच्छा", strengthStrong:"मज़बूत",
  },
  ta: {
    tagline:"டிஜிட்டல் ஜனநாயக தளம்",
    subtitle:"குடிமக்களை மேம்படுத்துதல் · ஆட்சியை மாற்றுதல்",
    emailLabel:"மின்னஞ்சல்", passLabel:"கடவுச்சொல்", nameLabel:"முழு பெயர்",
    signIn:"உள்நுழை", signUp:"கணக்கு உருவாக்கு",
    google:"Google மூலம் தொடரவும்", guest:"விருந்தினராக பார்க்கவும்",
    switchToSignup:"புதிய பயனர்? கணக்கு உருவாக்கு", switchToSignin:"கணக்கு உள்ளதா? உள்நுழை",
    or:"அல்லது", phEmail:"உங்கள் மின்னஞ்சல்", phPass:"குறைந்தது 8 எழுத்துகள்", phName:"உங்கள் முழு பெயர்",
    terms:"தொடர்வதன் மூலம் நீங்கள் ஒப்புக்கொள்கிறீர்கள்",
    guestNote:"விருந்தினர் பயன்முறை — படிக்க மட்டும்",
    forgotPass:"கடவுச்சொல் மறந்துவிட்டதா?",
    errEmail:"சரியான மின்னஞ்சல் உள்ளிடுக", errPassLen:"குறைந்தது 8 எழுத்துகள்", errName:"பெயரை உள்ளிடுக",
    strengthWeak:"பலவீனம்", strengthFair:"சரி", strengthGood:"நல்லது", strengthStrong:"வலிமையானது",
  },
  te: {
    tagline:"డిజిటల్ ప్రజాస్వామ్య వేదిక",
    subtitle:"పౌరులను శక్తివంతం చేయడం · పాలనను మార్చడం",
    emailLabel:"ఇమెయిల్", passLabel:"పాస్‌వర్డ్", nameLabel:"పూర్తి పేరు",
    signIn:"సైన్ ఇన్", signUp:"ఖాతా తెరవండి",
    google:"Google తో కొనసాగండి", guest:"అతిథిగా చూడండి",
    switchToSignup:"కొత్త వినియోగదారు? ఖాతా తెరవండి", switchToSignin:"ఖాతా ఉందా? సైన్ ఇన్",
    or:"లేదా", phEmail:"మీ ఇమెయిల్", phPass:"కనీసం 8 అక్షరాలు", phName:"మీ పూర్తి పేరు",
    terms:"కొనసాగడం ద్వారా మీరు అంగీకరిస్తున్నారు",
    guestNote:"అతిథి మోడ్ — చదవడం మాత్రమే",
    forgotPass:"పాస్‌వర్డ్ మర్చిపోయారా?",
    errEmail:"సరైన ఇమెయిల్ నమోదు చేయండి", errPassLen:"కనీసం 8 అక్షరాలు", errName:"పేరు నమోదు చేయండి",
    strengthWeak:"బలహీనం", strengthFair:"సరి", strengthGood:"మంచిది", strengthStrong:"బలమైనది",
  },
  bn: {
    tagline:"ডিজিটাল গণতন্ত্র প্ল্যাটফর্ম",
    subtitle:"নাগরিকদের ক্ষমতায়ন · শাসন পরিবর্তন",
    emailLabel:"ইমেইল", passLabel:"পাসওয়ার্ড", nameLabel:"পুরো নাম",
    signIn:"সাইন ইন", signUp:"অ্যাকাউন্ট তৈরি করুন",
    google:"Google দিয়ে চালিয়ে যান", guest:"অতিথি হিসেবে দেখুন",
    switchToSignup:"নতুন ব্যবহারকারী? অ্যাকাউন্ট তৈরি করুন", switchToSignin:"অ্যাকাউন্ট আছে? সাইন ইন",
    or:"অথবা", phEmail:"আপনার ইমেইল", phPass:"ন্যূনতম ৮ অক্ষর", phName:"আপনার পুরো নাম",
    terms:"চালিয়ে যাওয়ার মাধ্যমে আপনি সম্মত হচ্ছেন",
    guestNote:"অতিথি মোড — শুধুমাত্র পড়া",
    forgotPass:"পাসওয়ার্ড ভুলে গেছেন?",
    errEmail:"সঠিক ইমেইল দিন", errPassLen:"কমপক্ষে ৮ অক্ষর", errName:"নাম দিন",
    strengthWeak:"দুর্বল", strengthFair:"মোটামুটি", strengthGood:"ভালো", strengthStrong:"শক্তিশালী",
  },
  mr: {
    tagline:"डिजिटल लोकशाही व्यासपीठ",
    subtitle:"नागरिकांना सशक्त करणे · शासन बदलणे",
    emailLabel:"ईमेल", passLabel:"पासवर्ड", nameLabel:"पूर्ण नाव",
    signIn:"साइन इन", signUp:"खाते तयार करा",
    google:"Google सह सुरू ठेवा", guest:"पाहुणे म्हणून पहा",
    switchToSignup:"नवीन वापरकर्ता? खाते तयार करा", switchToSignin:"खाते आहे? साइन इन",
    or:"किंवा", phEmail:"तुमचा ईमेल", phPass:"किमान 8 अक्षरे", phName:"तुमचे पूर्ण नाव",
    terms:"सुरू ठेवल्यास तुम्ही सहमत आहात",
    guestNote:"पाहुणे मोड — फक्त वाचण्यासाठी",
    forgotPass:"पासवर्ड विसरलात?",
    errEmail:"योग्य ईमेल प्रविष्ट करा", errPassLen:"किमान 8 अक्षरे", errName:"नाव प्रविष्ट करा",
    strengthWeak:"कमकुवत", strengthFair:"बरे", strengthGood:"चांगले", strengthStrong:"मजबूत",
  },
};

// ── animated particle canvas ──────────────────────────────────────────────────
function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const ctx = c.getContext("2d"); let raf;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({ length: 52 }, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      vx:(Math.random()-.5)*.18, vy:(Math.random()-.5)*.18, r: Math.random()*.9+.3,
    }));
    const loop = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>c.width)p.vx*=-1; if(p.y<0||p.y>c.height)p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle="rgba(0,200,255,.18)"; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
        if(d<105){ ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(0,200,255,${.055*(1-d/105)})`; ctx.lineWidth=.5; ctx.stroke(); }
      }
      raf=requestAnimationFrame(loop);
    };
    loop();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// ── password strength ─────────────────────────────────────────────────────────
function StrengthBar({ password, c }) {
  if (!password) return null;
  const s = (password.length>=8?1:0) + (/[A-Z]/.test(password)?1:0)
          + (/[0-9]/.test(password)?1:0) + (/[^A-Za-z0-9]/.test(password)?1:0);
  const col = ["","#ff3060","#ffb800","#3b9fff","#00ff9d"][s];
  const lbl = ["",c.strengthWeak,c.strengthFair,c.strengthGood,c.strengthStrong][s];
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
      <div style={{flex:1,height:3,background:"rgba(255,255,255,0.06)",borderRadius:2}}>
        <div style={{height:"100%",width:`${s*25}%`,background:col,borderRadius:2,transition:"all .3s ease"}}/>
      </div>
      <span style={{fontSize:10,color:col,fontFamily:"'Inter',sans-serif",minWidth:44,fontWeight:600}}>{lbl}</span>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function CivicLogin({ onAuth }) {
  const [lang, setLang]             = useState("en");
  const [mode, setMode]             = useState("signin");   // signin | signup
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [fullName, setFullName]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [gLoading, setGLoading]     = useState(false);
  const [errors, setErrors]         = useState({});
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [shake, setShake]           = useState(false);

  const c = COPY[lang];

  const validate = () => {
    const e = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = c.errEmail;
    if (!password || password.length < 8)       e.pass  = c.errPassLen;
    if (mode === "signup" && !fullName.trim())   e.name  = c.errName;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const bumpShake = () => { setShake(true); setTimeout(()=>setShake(false),420); };

  const handleEmail = async () => {
    if (!validate()) { bumpShake(); return; }
    setLoading(true);
    await new Promise(r=>setTimeout(r,900));
    setLoading(false);
    onAuth({ name: fullName || email.split("@")[0], email, lang, mode:"citizen" });
  };

  const handleGoogle = async () => {
    setGLoading(true);
    await new Promise(r=>setTimeout(r,750));
    setGLoading(false);
    // ► Production: replace with Firebase signInWithPopup(provider) or Supabase OAuth
    onAuth({ name:"Google User", email:"user@gmail.com", lang, mode:"citizen", provider:"google" });
  };

  const handleGuest = () => onAuth({ name:"Guest", lang, mode:"guest" });

  const switchMode = () => { setMode(m=>m==="signin"?"signup":"signin"); setErrors({}); };

  // Inline styles
  const inputBase = (hasErr) => ({
    width:"100%", background:"rgba(255,255,255,0.04)",
    border:`1.5px solid ${hasErr?"rgba(255,60,80,0.55)":"rgba(0,200,255,0.17)"}`,
    borderRadius:9, padding:"13px 16px", color:"#cce8ff", fontSize:14,
    fontFamily:"'Inter',sans-serif", outline:"none", transition:"border-color .2s,box-shadow .2s",
  });
  const onFocus = e => { e.target.style.borderColor="rgba(0,200,255,0.55)"; e.target.style.boxShadow="0 0 0 3px rgba(0,200,255,0.08)"; };
  const onBlur  = e => { e.target.style.borderColor="rgba(0,200,255,0.17)"; e.target.style.boxShadow="none"; };

  return (
    <div style={{minHeight:"100vh",background:"#020609",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#020609;-webkit-font-smoothing:antialiased;}
        input::placeholder{color:rgba(150,200,255,0.27);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{text-shadow:0 0 18px rgba(0,200,255,.45)}50%{text-shadow:0 0 36px rgba(0,200,255,.85)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
      `}</style>

      <Particles/>

      {/* ── Language pill top-right ── */}
      <div style={{position:"fixed",top:18,right:18,zIndex:120}}>
        <button onClick={()=>setShowLangMenu(v=>!v)}
          style={{background:"rgba(4,10,22,0.93)",border:"1px solid rgba(0,200,255,0.22)",borderRadius:9,padding:"8px 13px",color:"#cce8ff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:8,backdropFilter:"blur(16px)",fontWeight:500,fontFamily:"'Inter',sans-serif",boxShadow:"0 4px 20px rgba(0,0,0,.4)"}}>
          <span style={{fontSize:16}}>{LANGS[lang].flag}</span>
          <span>{LANGS[lang].name}</span>
          <svg width="9" height="6" viewBox="0 0 9 6"><path d="M1 1l3.5 3.5L8 1" stroke="rgba(0,200,255,.5)" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
        </button>
        {showLangMenu && (
          <div style={{position:"absolute",top:"110%",right:0,background:"rgba(4,10,22,0.98)",border:"1px solid rgba(0,200,255,0.18)",borderRadius:11,overflow:"hidden",backdropFilter:"blur(24px)",minWidth:168,animation:"slideDown .17s ease",zIndex:200,boxShadow:"0 14px 44px rgba(0,0,0,.6)"}}>
            {Object.entries(LANGS).map(([code,l])=>(
              <button key={code} onClick={()=>{setLang(code);setShowLangMenu(false);}}
                style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 15px",background:lang===code?"rgba(0,200,255,0.1)":"none",border:"none",color:lang===code?"#00ccff":"rgba(200,220,255,0.72)",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif",fontWeight:lang===code?600:400,borderLeft:lang===code?"2px solid #00ccff":"2px solid transparent",transition:"background .12s"}}>
                <span style={{fontSize:17}}>{l.flag}</span>
                <span style={{flex:1}}>{l.name}</span>
                {lang===code && <span style={{color:"#00ccff",fontSize:11}}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Card ── */}
      <div style={{position:"relative",zIndex:10,width:"100%",maxWidth:416,margin:"0 20px",animation:"fadeUp .42s ease"}}>

        {/* Logo block */}
        <div style={{textAlign:"center",marginBottom:26}}>
          <div style={{width:54,height:54,borderRadius:15,background:"rgba(0,200,255,0.1)",border:"1px solid rgba(0,200,255,0.26)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:25,margin:"0 auto 12px",boxShadow:"0 0 28px rgba(0,200,255,0.16)"}}>🏛</div>
          <div style={{fontSize:22,fontWeight:800,color:"#00ccff",letterSpacing:"0.09em",animation:"glow 4s infinite"}}>
            CIVIC<span style={{color:"#00ff9d"}}>SENTINEL</span>
          </div>
          <div style={{fontSize:11,color:"rgba(150,200,255,0.42)",marginTop:5,letterSpacing:"0.11em"}}>{c.tagline}</div>
          <div style={{fontSize:12,color:"rgba(150,200,255,0.28)",marginTop:2}}>{c.subtitle}</div>
        </div>

        {/* Glass panel */}
        <div style={{background:"rgba(4,10,22,0.84)",backdropFilter:"blur(28px)",border:"1px solid rgba(0,200,255,0.15)",borderRadius:16,padding:"28px 30px",boxShadow:"0 24px 64px rgba(0,0,0,.55),inset 0 0 40px rgba(0,0,0,.22)",animation:shake?"shake .42s ease":"none"}}>

          {/* Sign In / Sign Up pill toggle */}
          <div style={{display:"flex",background:"rgba(0,0,0,.3)",borderRadius:8,padding:4,marginBottom:22}}>
            {[["signin",c.signIn],["signup",c.signUp]].map(([m,lbl])=>(
              <button key={m} onClick={()=>switchMode()}
                style={{flex:1,padding:"9px",borderRadius:6,border:"none",background:mode===m?"rgba(0,200,255,0.17)":"transparent",color:mode===m?"#00ccff":"rgba(150,200,255,0.38)",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",fontFamily:"'Inter',sans-serif"}}
                onPointerDown={()=>setMode(m)}>
                {lbl}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:13}}>

            {/* Full name — signup only */}
            {mode==="signup" && (
              <div>
                <input value={fullName} onChange={e=>{setFullName(e.target.value);setErrors(er=>({...er,name:null}));}}
                  placeholder={c.phName} style={inputBase(errors.name)}
                  onFocus={onFocus} onBlur={onBlur}/>
                {errors.name && <p style={{margin:"5px 0 0 4px",fontSize:11,color:"#ff6070"}}>{errors.name}</p>}
              </div>
            )}

            {/* Email */}
            <div>
              <input value={email} onChange={e=>{setEmail(e.target.value);setErrors(er=>({...er,email:null}));}}
                type="email" placeholder={c.phEmail} style={inputBase(errors.email)}
                onFocus={onFocus} onBlur={onBlur}/>
              {errors.email && <p style={{margin:"5px 0 0 4px",fontSize:11,color:"#ff6070"}}>{errors.email}</p>}
            </div>

            {/* Password + show/hide */}
            <div>
              <div style={{position:"relative"}}>
                <input value={password} onChange={e=>{setPassword(e.target.value);setErrors(er=>({...er,pass:null}));}}
                  type={showPass?"text":"password"} placeholder={c.phPass}
                  style={{...inputBase(errors.pass),paddingRight:44}}
                  onFocus={onFocus} onBlur={onBlur}/>
                <button onClick={()=>setShowPass(v=>!v)} tabIndex={-1}
                  style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(0,200,255,0.4)",cursor:"pointer",fontSize:15,padding:3,lineHeight:1}}>
                  {showPass?"🙈":"👁️"}
                </button>
              </div>
              {mode==="signup" && <StrengthBar password={password} c={c}/>}
              {errors.pass && <p style={{margin:"5px 0 0 4px",fontSize:11,color:"#ff6070"}}>{errors.pass}</p>}
              {mode==="signin" && (
                <div style={{textAlign:"right",marginTop:5}}>
                  <button style={{background:"none",border:"none",color:"rgba(0,200,255,.42)",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                    {c.forgotPass}
                  </button>
                </div>
              )}
            </div>

            {/* Primary CTA */}
            <button onClick={handleEmail} disabled={loading}
              style={{padding:"13px",background:loading?"rgba(0,200,255,.07)":"linear-gradient(135deg,rgba(0,200,255,.26),rgba(0,255,157,.16))",border:"1px solid rgba(0,200,255,.4)",borderRadius:9,color:loading?"rgba(0,200,255,.38)":"#00ccff",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:9,transition:"all .2s",boxShadow:loading?"none":"0 0 20px rgba(0,200,255,.1)"}}>
              {loading
                ? <div style={{width:18,height:18,border:"2px solid rgba(0,200,255,.25)",borderTopColor:"#00ccff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                : mode==="signup" ? c.signUp : c.signIn}
            </button>

            {/* Divider */}
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1,height:1,background:"rgba(0,200,255,.08)"}}/>
              <span style={{fontSize:11,color:"rgba(150,200,255,.28)"}}>{c.or}</span>
              <div style={{flex:1,height:1,background:"rgba(0,200,255,.08)"}}/>
            </div>

            {/* Google */}
            <button onClick={handleGoogle} disabled={gLoading}
              style={{padding:"12px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.12)",borderRadius:9,color:"#cce8ff",fontSize:13,fontWeight:600,cursor:gLoading?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:11,transition:"background .18s",opacity:gLoading?0.6:1}}
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
              {c.google}
            </button>

            {/* Guest */}
            <button onClick={handleGuest}
              style={{padding:"11px",background:"transparent",border:"1px dashed rgba(0,200,255,.17)",borderRadius:9,color:"rgba(0,200,255,.45)",fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all .18s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(0,200,255,.4)";e.currentTarget.style.color="#00ccff";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(0,200,255,.17)";e.currentTarget.style.color="rgba(0,200,255,.45)";}}>
              {c.guest}
            </button>

            <p style={{fontSize:10.5,color:"rgba(150,200,255,.24)",textAlign:"center",lineHeight:1.55}}>{c.terms}</p>

            <div style={{textAlign:"center"}}>
              <button onClick={switchMode}
                style={{background:"none",border:"none",color:"rgba(0,200,255,.46)",fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif",textDecoration:"underline",textDecorationColor:"rgba(0,200,255,.2)"}}>
                {mode==="signin" ? c.switchToSignup : c.switchToSignin}
              </button>
            </div>
          </div>
        </div>

        <p style={{textAlign:"center",marginTop:16,fontSize:10,color:"rgba(150,200,255,.18)",letterSpacing:"0.1em"}}>
          CIVICSENTINEL AI · DIGITAL DEMOCRACY · INDIA
        </p>
      </div>
    </div>
  );
}