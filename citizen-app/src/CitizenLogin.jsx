import { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { LANGS, T, tl } from "./translations";

// ═══════════════════════════════════════════════════════════
// CITIZEN LOGIN — Email + Google + Guest
// 6 regional languages
// ═══════════════════════════════════════════════════════════



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

function StrengthBar({ pw, lang='en' }) {
  if (!pw) return null;
  const s = (pw.length>=8?1:0)+(/[A-Z]/.test(pw)?1:0)+(/[0-9]/.test(pw)?1:0)+(/[^A-Za-z0-9]/.test(pw)?1:0);
  const cols=["","#ef4444","#f97316","#3b82f6","#22c55e"];
  const lbls=["",tl(lang,"passWeak"),tl(lang,"passFair"),tl(lang,"passGood"),tl(lang,"passStrong")];
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
  const [lang, setLang]         = useState("en");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mode, setMode]         = useState("signin");
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [name, setName]         = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [errors, setErrors]     = useState({});
  const [shake, setShake]       = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const GREEN = "#22c55e";

  const validate = () => {
    const e = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = tl(lang,"errEmail");
    if (!pass || pass.length < 8)                 e.pass  = tl(lang,"errPass");
    if (mode === "signup" && !name.trim())         e.name  = tl(lang,"errName");
    setErrors(e);
    return !Object.keys(e).length;
  };

  const bump = () => { setShake(true); setTimeout(() => setShake(false), 420); };

  const buildUser = (fbUser, extraName) => ({
    uid:      fbUser.uid,
    name:     fbUser.displayName || extraName || fbUser.email.split("@")[0],
    email:    fbUser.email,
    lang,
    role:     "citizen",
    provider: fbUser.providerData[0]?.providerId || "email",
    guest:    false,
    avatar:   (fbUser.displayName || extraName || fbUser.email).slice(0,2).toUpperCase(),
    joinedAt: fbUser.metadata.creationTime,
  });

  // ── Email / Password ──────────────────────────────────────
  const handleEmail = async () => {
    if (!validate()) { bump(); return; }
    setLoading(true);
    setErrors({});
    try {
      let cred;
      if (mode === "signup") {
        cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        await updateProfile(cred.user, { displayName: name.trim() });
        cred.user.displayName = name.trim(); // sync locally
      } else {
        cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      }
      onAuth(buildUser(cred.user, name.trim()));
    } catch (err) {
      const msg = {
        "auth/user-not-found":      "No account with this email. Create one first.",
        "auth/wrong-password":      "Wrong password. Try again.",
        "auth/email-already-in-use":"Email already registered. Sign in instead.",
        "auth/weak-password":       "Password must be at least 6 characters.",
        "auth/invalid-email":       tl(lang,"errEmail"),
        "auth/invalid-credential":  "Wrong email or password.",
        "auth/too-many-requests":   "Too many attempts. Try again later.",
      }[err.code] || err.message;
      setErrors({ general: msg });
      bump();
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth ───────────────────────────────────────────
  const handleGoogle = async () => {
    setGLoading(true);
    setErrors({});
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      onAuth(buildUser(cred.user));
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setErrors({ general: "Google sign-in failed. Try again." });
      }
    } finally {
      setGLoading(false);
    }
  };

  // ── Forgot password ───────────────────────────────────────
  const handleForgotPass = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: "Enter your email first to reset password." });
      bump();
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      setErrors({ general: "Could not send reset email. Check the address." });
    }
  };

  // ── Guest ─────────────────────────────────────────────────
  const handleGuest = () =>
    onAuth({ name:"Guest", lang, role:"citizen", guest:true, avatar:"G" });

  const inp = (err) => ({
    width:"100%", padding:"12px 15px", borderRadius:9, fontSize:14, outline:"none",
    fontFamily:"'Inter',sans-serif", color:"#f0fdf4",
    background:"rgba(255,255,255,0.05)",
    border:`1.5px solid ${err ? "rgba(239,68,68,.6)" : "rgba(34,197,94,0.2)"}`,
    transition:"border .2s", boxSizing:"border-box",
  });

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"radial-gradient(ellipse at 50% 0%, rgba(6,30,15,.97) 0%, #020609 70%)",
      padding:"20px 16px", position:"relative", overflow:"hidden",
    }}>
      <Particles/>

      {/* Lang picker */}
      <div style={{ position:"fixed", top:16, right:16, zIndex:200 }}>
        <button onClick={() => setShowLangMenu(m=>!m)}
          style={{ background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.22)",
            borderRadius:8, padding:"7px 12px", color:GREEN, cursor:"pointer",
            fontSize:13, fontWeight:600, fontFamily:"'Inter',sans-serif",
            display:"flex", alignItems:"center", gap:6 }}>
          {LANGS.find(l=>l.code===lang)?.flag} {LANGS.find(l=>l.code===lang)?.native} ▾
        </button>
        {showLangMenu && (
          <div style={{ position:"absolute", right:0, top:40, background:"#0d1f12",
            border:"1px solid rgba(34,197,94,.22)", borderRadius:10, overflow:"hidden",
            boxShadow:"0 8px 32px rgba(0,0,0,.6)", zIndex:300, minWidth:160 }}>
            {LANGS.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code); setShowLangMenu(false); }}
                style={{ display:"flex", alignItems:"center", gap:10, width:"100%",
                  padding:"10px 16px", background: lang===l.code ? "rgba(34,197,94,.12)" : "transparent",
                  border:"none", color: lang===l.code ? GREEN : "#94a3b8",
                  cursor:"pointer", fontSize:13, fontFamily:"'Inter',sans-serif",
                  fontWeight: lang===l.code ? 700 : 400 }}>
                <span style={{fontSize:18}}>{l.flag}</span>{l.native}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card */}
      <div style={{ position:"relative", zIndex:10, width:"100%", maxWidth:400,
        animation: shake ? "shake .4s ease" : "none" }}>

        <style>{`
          @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 60%{transform:translateX(8px)} }
          @keyframes spin  { to{transform:rotate(360deg)} }
          input:-webkit-autofill { -webkit-box-shadow:0 0 0 100px #0d1a0f inset!important; -webkit-text-fill-color:#f0fdf4!important; }
        `}</style>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:36, marginBottom:6 }}>🛡️</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#fff", letterSpacing:".04em" }}>
            CivicSentinel<span style={{color:GREEN}}>AI</span>
          </div>
          <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{tl(lang,"loginSub")}</div>
        </div>

        <div style={{ background:"rgba(255,255,255,.035)", border:"1px solid rgba(34,197,94,.15)",
          borderRadius:16, padding:"28px 24px",
          boxShadow:"0 24px 64px rgba(0,0,0,.5), inset 0 1px 0 rgba(34,197,94,.08)" }}>

          {/* Title */}
          <div style={{ fontSize:17, fontWeight:800, color:"#e2e8f0", marginBottom:20,
            whiteSpace:"pre-line", lineHeight:1.35 }}>{tl(lang,"loginTitle")}</div>

          {/* General error */}
          {errors.general && (
            <div style={{ background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.3)",
              borderRadius:8, padding:"10px 14px", fontSize:13, color:"#fca5a5", marginBottom:14 }}>
              ⚠️ {errors.general}
            </div>
          )}

          {/* Reset sent */}
          {resetSent && (
            <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.3)",
              borderRadius:8, padding:"10px 14px", fontSize:13, color:"#86efac", marginBottom:14 }}>
              ✅ Password reset email sent! Check your inbox.
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

            {/* Name — signup only */}
            {mode === "signup" && (
              <div>
                <input value={name} onChange={e=>setName(e.target.value)}
                  placeholder={tl(lang,"ph_name")} style={inp(errors.name)}
                  onFocus={e=>e.target.style.borderColor=GREEN}
                  onBlur={e=>e.target.style.borderColor=errors.name?"rgba(239,68,68,.6)":"rgba(34,197,94,0.2)"}/>
                {errors.name && <div style={{fontSize:11,color:"#f87171",marginTop:4}}>{errors.name}</div>}
              </div>
            )}

            {/* Email */}
            <div>
              <input value={email} onChange={e=>setEmail(e.target.value)}
                placeholder={tl(lang,"ph_email")} type="email" style={inp(errors.email)}
                onFocus={e=>e.target.style.borderColor=GREEN}
                onBlur={e=>e.target.style.borderColor=errors.email?"rgba(239,68,68,.6)":"rgba(34,197,94,0.2)"}/>
              {errors.email && <div style={{fontSize:11,color:"#f87171",marginTop:4}}>{errors.email}</div>}
            </div>

            {/* Password */}
            <div>
              <div style={{ position:"relative" }}>
                <input value={pass} onChange={e=>setPass(e.target.value)}
                  placeholder={tl(lang,"ph_pass")} type={showPass?"text":"password"}
                  style={{ ...inp(errors.pass), paddingRight:42 }}
                  onFocus={e=>e.target.style.borderColor=GREEN}
                  onBlur={e=>e.target.style.borderColor=errors.pass?"rgba(239,68,68,.6)":"rgba(34,197,94,0.2)"}
                  onKeyDown={e=>e.key==="Enter"&&handleEmail()}/>
                <button onClick={()=>setShowPass(s=>!s)} style={{
                  position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:14 }}>
                  {showPass?"🙈":"👁️"}
                </button>
              </div>
              {errors.pass && <div style={{fontSize:11,color:"#f87171",marginTop:4}}>{errors.pass}</div>}
              {mode==="signup" && <StrengthBar pw={pass} lang={lang}/>}
            </div>

            {/* Forgot password */}
            {mode === "signin" && (
              <div style={{ textAlign:"right", marginTop:-4 }}>
                <button onClick={handleForgotPass} style={{
                  background:"none", border:"none", color:"rgba(34,197,94,.5)",
                  fontSize:11, cursor:"pointer", fontFamily:"'Inter',sans-serif",
                  textDecoration:"underline" }}>
                  {tl(lang,"forgotPassword")}
                </button>
              </div>
            )}

            {/* Submit */}
            <button onClick={handleEmail} disabled={loading}
              style={{ padding:"13px", borderRadius:9, fontSize:14, fontWeight:700,
                background: loading ? "rgba(34,197,94,.3)" : `linear-gradient(135deg,${GREEN},#16a34a)`,
                color:"#fff", border:"none", cursor: loading?"not-allowed":"pointer",
                fontFamily:"'Inter',sans-serif", display:"flex", alignItems:"center",
                justifyContent:"center", gap:8, marginTop:4,
                boxShadow: loading ? "none" : `0 4px 20px ${GREEN}44` }}>
              {loading
                ? <div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",
                    borderTopColor:"white",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                : (mode==="signin" ? tl(lang,"signIn") : tl(lang,"signUp"))}
            </button>

            {/* Divider */}
            <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0" }}>
              <div style={{flex:1,height:1,background:"rgba(34,197,94,.09)"}}/>
              <span style={{fontSize:11,color:"rgba(134,239,172,.28)"}}>{tl(lang,"or")}</span>
              <div style={{flex:1,height:1,background:"rgba(34,197,94,.09)"}}/>
            </div>

            {/* Google */}
            <button onClick={handleGoogle} disabled={gLoading}
              style={{ padding:"12px", background:"rgba(255,255,255,.04)",
                border:"1px solid rgba(255,255,255,.11)", borderRadius:9, color:"#d1fae5",
                fontSize:13, fontWeight:600, cursor: gLoading?"not-allowed":"pointer",
                fontFamily:"'Inter',sans-serif", display:"flex", alignItems:"center",
                justifyContent:"center", gap:11, transition:"background .18s",
                opacity: gLoading ? .6 : 1 }}
              onMouseEnter={e=>!gLoading&&(e.currentTarget.style.background="rgba(255,255,255,.08)")}
              onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,.04)")}>
              {gLoading
                ? <div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.2)",
                    borderTopColor:"white",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                : <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
              }
              {tl(lang,"googleLogin")}
            </button>

            {/* Guest */}
            <button onClick={handleGuest}
              style={{ padding:"11px", background:"transparent",
                border:"1px dashed rgba(34,197,94,.18)", borderRadius:9,
                color:"rgba(34,197,94,.45)", fontSize:12, cursor:"pointer",
                fontFamily:"'Inter',sans-serif", transition:"all .18s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(34,197,94,.4)";e.currentTarget.style.color="#22c55e";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(34,197,94,.18)";e.currentTarget.style.color="rgba(34,197,94,.45)";}}>
              {tl(lang,"guestLogin")}
            </button>

            <p style={{fontSize:10.5,color:"rgba(134,239,172,.22)",textAlign:"center",lineHeight:1.55}}>
              {tl(lang,"terms")}
            </p>

            <div style={{textAlign:"center"}}>
              <button onClick={()=>{ setMode(m=>m==="signin"?"signup":"signin"); setErrors({}); setResetSent(false); }}
                style={{ background:"none", border:"none", color:"rgba(34,197,94,.46)",
                  fontSize:12, cursor:"pointer", fontFamily:"'Inter',sans-serif",
                  textDecoration:"underline", textDecorationColor:"rgba(34,197,94,.2)" }}>
                {mode==="signin" ? tl(lang,"switchToSignUp") : tl(lang,"switchToSignIn")}
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