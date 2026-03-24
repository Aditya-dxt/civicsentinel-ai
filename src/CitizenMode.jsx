import { useState, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// CIVICSENTINEL — ACCESSIBLE CITIZEN MODE  v2
// Regional language selector: English / हिन्दी / தமிழ் / తెలుగు / বাংলা / मराठी
// Large tap targets · emoji-first · minimal text required to use
// ══════════════════════════════════════════════════════════════════════════════

const API = "https://civicsentinel-ai-1.onrender.com";

// ── Language registry ─────────────────────────────────────────────────────────
const LANGS = [
  { code:"en", native:"English",  flag:"🇬🇧", script:"latin" },
  { code:"hi", native:"हिन्दी",   flag:"🇮🇳", script:"devanagari" },
  { code:"ta", native:"தமிழ்",    flag:"🇮🇳", script:"tamil" },
  { code:"te", native:"తెలుగు",   flag:"🇮🇳", script:"telugu" },
  { code:"bn", native:"বাংলা",    flag:"🇮🇳", script:"bengali" },
  { code:"mr", native:"मराठी",    flag:"🇮🇳", script:"devanagari" },
];

// ── All UI strings by language ────────────────────────────────────────────────
const T = {
  en: {
    appName:"CivicSentinel",
    greeting:{ morning:"Good Morning", afternoon:"Good Afternoon", evening:"Good Evening" },
    tapToStart:"Tap anything to get started",
    riskTitle:"City Risk Today", safe:"SAFE", warning:"WARNING", danger:"DANGER",
    reportBtn:"Report a Problem", reportSub:"Photo · GPS · Instant",
    quickReport:"Quick Report",
    issues:{ water:"Water", road:"Road", light:"Power", garbage:"Garbage", safety:"Safety", health:"Health" },
    alerts:"Alerts", myReports:"My Reports", home:"Home", help:"Help",
    noAlerts:"No alerts right now 😊",
    liveUpdates:"Live Updates", connecting:"Connecting…",
    submitted:"Submitted", resolved:"Resolved ✓",
    emergency:"Emergency · 112",
    switchPro:"⚡ Expert Mode",
    selectLang:"Select Language",
    changeLang:"Change Language",
  },
  hi: {
    appName:"सिविकसेंटिनल",
    greeting:{ morning:"सुप्रभात", afternoon:"नमस्कार", evening:"शुभ संध्या" },
    tapToStart:"शुरू करने के लिए कुछ भी दबाएं",
    riskTitle:"आज शहर की स्थिति", safe:"सुरक्षित", warning:"सावधानी", danger:"खतरा",
    reportBtn:"समस्या रिपोर्ट करें", reportSub:"फोटो · GPS · तुरंत",
    quickReport:"त्वरित रिपोर्ट",
    issues:{ water:"पानी", road:"सड़क", light:"बिजली", garbage:"कचरा", safety:"सुरक्षा", health:"स्वास्थ्य" },
    alerts:"अलर्ट", myReports:"मेरी रिपोर्ट", home:"होम", help:"मदद",
    noAlerts:"अभी कोई अलर्ट नहीं 😊",
    liveUpdates:"लाइव अपडेट", connecting:"कनेक्ट हो रहा है…",
    submitted:"भेजी गई", resolved:"हल हुई ✓",
    emergency:"आपात · 112",
    switchPro:"⚡ विशेषज्ञ मोड",
    selectLang:"भाषा चुनें",
    changeLang:"भाषा बदलें",
  },
  ta: {
    appName:"சிவிக்செண்டினல்",
    greeting:{ morning:"காலை வணக்கம்", afternoon:"மதிய வணக்கம்", evening:"மாலை வணக்கம்" },
    tapToStart:"தொடங்க எதையும் தட்டவும்",
    riskTitle:"இன்று நகர நிலை", safe:"பாதுகாப்பு", warning:"எச்சரிக்கை", danger:"ஆபத்து",
    reportBtn:"பிரச்சினை புகார்", reportSub:"படம் · GPS · உடனடி",
    quickReport:"விரைவு புகார்",
    issues:{ water:"தண்ணீர்", road:"சாலை", light:"மின்சாரம்", garbage:"குப்பை", safety:"பாதுகாப்பு", health:"சுகாதாரம்" },
    alerts:"எச்சரிக்கைகள்", myReports:"என் புகார்கள்", home:"முகப்பு", help:"உதவி",
    noAlerts:"இப்போது எச்சரிக்கை இல்லை 😊",
    liveUpdates:"நேரடி புதுப்பிப்புகள்", connecting:"இணைக்கிறது…",
    submitted:"சமர்ப்பிக்கப்பட்டது", resolved:"தீர்க்கப்பட்டது ✓",
    emergency:"அவசரம் · 112",
    switchPro:"⚡ நிபுணர் பயன்முறை",
    selectLang:"மொழியை தேர்ந்தெடுக்கவும்",
    changeLang:"மொழி மாற்று",
  },
  te: {
    appName:"సివిక్‌సెంటినల్",
    greeting:{ morning:"శుభోదయం", afternoon:"నమస్కారం", evening:"శుభ సాయంత్రం" },
    tapToStart:"ప్రారంభించడానికి ఏదైనా నొక్కండి",
    riskTitle:"నేడు నగర ప్రమాదం", safe:"సురక్షితం", warning:"హెచ్చరిక", danger:"ప్రమాదం",
    reportBtn:"సమస్య నివేదించండి", reportSub:"ఫోటో · GPS · తక్షణం",
    quickReport:"త్వరిత నివేదిక",
    issues:{ water:"నీరు", road:"రోడ్డు", light:"విద్యుత్", garbage:"చెత్త", safety:"భద్రత", health:"ఆరోగ్యం" },
    alerts:"హెచ్చరికలు", myReports:"నా నివేదికలు", home:"హోమ్", help:"సహాయం",
    noAlerts:"ఇప్పుడు హెచ్చరికలు లేవు 😊",
    liveUpdates:"లైవ్ అప్‌డేట్‌లు", connecting:"కనెక్ట్ అవుతోంది…",
    submitted:"సమర్పించబడింది", resolved:"పరిష్కరించబడింది ✓",
    emergency:"అత్యవసరం · 112",
    switchPro:"⚡ నిపుణుల మోడ్",
    selectLang:"భాషను ఎంచుకోండి",
    changeLang:"భాష మార్చు",
  },
  bn: {
    appName:"সিভিকসেন্টিনেল",
    greeting:{ morning:"শুভ সকাল", afternoon:"শুভ অপরাহ্ণ", evening:"শুভ সন্ধ্যা" },
    tapToStart:"শুরু করতে যেকোনো জায়গায় ট্যাপ করুন",
    riskTitle:"আজ শহরের পরিস্থিতি", safe:"নিরাপদ", warning:"সতর্কতা", danger:"বিপদ",
    reportBtn:"সমস্যা রিপোর্ট করুন", reportSub:"ফটো · GPS · তাৎক্ষণিক",
    quickReport:"দ্রুত রিপোর্ট",
    issues:{ water:"জল", road:"রাস্তা", light:"বিদ্যুৎ", garbage:"আবর্জনা", safety:"নিরাপত্তা", health:"স্বাস্থ্য" },
    alerts:"সতর্কতা", myReports:"আমার রিপোর্ট", home:"হোম", help:"সাহায্য",
    noAlerts:"এখন কোনো সতর্কতা নেই 😊",
    liveUpdates:"লাইভ আপডেট", connecting:"সংযুক্ত হচ্ছে…",
    submitted:"জমা দেওয়া হয়েছে", resolved:"সমাধান হয়েছে ✓",
    emergency:"জরুরি · 112",
    switchPro:"⚡ বিশেষজ্ঞ মোড",
    selectLang:"ভাষা নির্বাচন করুন",
    changeLang:"ভাষা পরিবর্তন",
  },
  mr: {
    appName:"सिविकसेंटिनल",
    greeting:{ morning:"सुप्रभात", afternoon:"नमस्कार", evening:"शुभ संध्या" },
    tapToStart:"सुरू करण्यासाठी काहीही दाबा",
    riskTitle:"आज शहराची स्थिती", safe:"सुरक्षित", warning:"सावधान", danger:"धोका",
    reportBtn:"समस्या नोंदवा", reportSub:"फोटो · GPS · त्वरित",
    quickReport:"त्वरित तक्रार",
    issues:{ water:"पाणी", road:"रस्ता", light:"वीज", garbage:"कचरा", safety:"सुरक्षा", health:"आरोग्य" },
    alerts:"सूचना", myReports:"माझ्या तक्रारी", home:"मुख्यपृष्ठ", help:"मदत",
    noAlerts:"आत्ता कोणतीही सूचना नाही 😊",
    liveUpdates:"थेट अपडेट", connecting:"कनेक्ट होत आहे…",
    submitted:"सादर केले", resolved:"निराकरण झाले ✓",
    emergency:"आणीबाणी · 112",
    switchPro:"⚡ तज्ज्ञ मोड",
    selectLang:"भाषा निवडा",
    changeLang:"भाषा बदला",
  },
};

// ── Language selector modal ───────────────────────────────────────────────────
function LangModal({ current, onSelect, onClose, t }) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(2,6,9,.88)",backdropFilter:"blur(10px)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:420,background:"rgba(4,10,22,.98)",border:"1px solid rgba(0,200,255,.18)",borderRadius:"20px 20px 16px 16px",overflow:"hidden",boxShadow:"0 -20px 60px rgba(0,0,0,.6)",animation:"slideUp .3s ease"}}>
        <div style={{padding:"18px 20px 12px",borderBottom:"1px solid rgba(0,200,255,.1)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:16,fontWeight:800,color:"#00ccff"}}>🌐 {t.selectLang}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,width:30,height:30,color:"rgba(200,220,255,.55)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {LANGS.map(l=>(
            <button key={l.code} onClick={()=>onSelect(l.code)}
              style={{padding:"14px 12px",background:current===l.code?"rgba(0,200,255,.18)":"rgba(255,255,255,.04)",border:`2px solid ${current===l.code?"#00ccff":"rgba(255,255,255,.09)"}`,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .18s",boxShadow:current===l.code?"0 0 14px rgba(0,200,255,.25)":"none"}}>
              <span style={{fontSize:24,flexShrink:0}}>{l.flag}</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:15,fontWeight:700,color:current===l.code?"#00ccff":"#cce8ff",fontFamily:"'Inter',sans-serif"}}>{l.native}</div>
                {current===l.code && <div style={{fontSize:10,color:"#00ccff",marginTop:1}}>✓ selected</div>}
              </div>
            </button>
          ))}
        </div>
        <div style={{padding:"8px 12px 16px"}}>
          <button onClick={onClose} style={{width:"100%",padding:"13px",background:"rgba(0,200,255,.1)",border:"1px solid rgba(0,200,255,.28)",borderRadius:10,color:"#00ccff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Risk meter ────────────────────────────────────────────────────────────────
function RiskMeter({ score, t }) {
  const col  = score>=70?"#ff3060":score>=40?"#ffb800":"#00c97a";
  const emoji = score>=70?"🔴":score>=40?"🟡":"🟢";
  const label = score>=70?t.danger:score>=40?t.warning:t.safe;
  return (
    <div style={{background:`${col}14`,border:`2px solid ${col}44`,borderRadius:18,padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
      <div style={{fontSize:48}}>{emoji}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:12,color:"rgba(255,255,255,.5)",fontFamily:"'Inter',sans-serif",marginBottom:3}}>{t.riskTitle}</div>
        <div style={{fontSize:30,fontWeight:900,color:col,fontFamily:"'DM Mono',monospace",lineHeight:1}}>{score}<span style={{fontSize:14,opacity:.5,fontWeight:400}}>/100</span></div>
        <div style={{marginTop:5,display:"inline-block",background:`${col}28`,border:`1px solid ${col}55`,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700,color:col,letterSpacing:"0.04em"}}>{label}</div>
      </div>
      {/* Arc gauge */}
      <svg width="62" height="62" style={{flexShrink:0}}>
        <circle cx="31" cy="31" r="25" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="6"/>
        <circle cx="31" cy="31" r="25" fill="none" stroke={col} strokeWidth="6"
          strokeDasharray={`${(score/100)*157.1} ${157.1-(score/100)*157.1}`}
          strokeDashoffset="39.27" strokeLinecap="round"/>
        <text x="31" y="36" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="'DM Mono',monospace">{score}</text>
      </svg>
    </div>
  );
}

// ── Big tap-target card ───────────────────────────────────────────────────────
function BigCard({ icon, label, color, onClick }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onPointerDown={()=>setPressed(true)}
      onPointerUp={()=>setPressed(false)}
      onPointerLeave={()=>setPressed(false)}
      onClick={onClick}
      style={{background:pressed?`${color}22`:`${color}0e`,border:`2.5px solid ${color}${pressed?"88":"40"}`,borderRadius:18,padding:"18px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7,transform:pressed?"scale(.93)":"scale(1)",transition:"all .12s ease",boxShadow:pressed?`0 0 20px ${color}44`:"0 3px 12px rgba(0,0,0,.3)",minHeight:100}}>
      <div style={{fontSize:34}}>{icon}</div>
      <div style={{fontSize:12,fontWeight:700,color:"#f0f8ff",textAlign:"center",lineHeight:1.3,fontFamily:"'Inter',sans-serif"}}>{label}</div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function CitizenMode({ user, lang: initLang="en", onSwitchPro, onReport }) {
  const [lang, setLang]           = useState(initLang);
  const [showLangModal, setShowLangModal] = useState(false);
  const [activeView, setActiveView] = useState("home");
  const [cityRisk, setCityRisk]   = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [connected, setConnected] = useState(false);
  const [myReports]               = useState([
    { id:"CS1A2B3C", status:"resolved", issue:"💧 Water", date:"2 days ago" },
    { id:"CS4D5E6F", status:"submitted", issue:"🚧 Road",  date:"Today" },
  ]);

  const t = T[lang] || T.en;
  const langInfo = LANGS.find(l=>l.code===lang) || LANGS[0];

  const fetchData = useCallback(async () => {
    try {
      const [riskR, alertsR] = await Promise.allSettled([
        fetch(`${API}/risk-summary`).then(r=>r.json()),
        fetch(`${API}/alerts`).then(r=>r.json()),
      ]);
      if(riskR.status==="fulfilled"){
        const d = riskR.value?.risk_summary||riskR.value||{};
        const vals = Object.values(d).filter(v=>typeof v==="number");
        if(vals.length) setCityRisk(Math.round(vals.reduce((s,v)=>s+v,0)/vals.length));
      }
      if(alertsR.status==="fulfilled") setAlerts(alertsR.value?.alerts||alertsR.value||[]);
      setConnected(true);
    } catch { setConnected(false); }
  }, []);

  useEffect(()=>{ fetchData(); const id=setInterval(fetchData,10000); return()=>clearInterval(id); },[fetchData]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if(h<12) return t.greeting.morning;
    if(h<17) return t.greeting.afternoon;
    return t.greeting.evening;
  };

  const handleLangChange = (code) => { setLang(code); setShowLangModal(false); };

  const ISSUE_DEFS = [
    { key:"water",  icon:"💧", color:"#3b9fff" },
    { key:"road",   icon:"🚧", color:"#ff8c00" },
    { key:"light",  icon:"⚡", color:"#ffee00" },
    { key:"garbage",icon:"🗑️", color:"#00c97a" },
    { key:"safety", icon:"🚨", color:"#ff3060" },
    { key:"health", icon:"🏥", color:"#c084fc" },
  ];

  const alertList = Array.isArray(alerts) ? alerts : [];

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#020e1f 0%,#050d1a 100%)",fontFamily:"'Inter',sans-serif",paddingBottom:90}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#020e1f;-webkit-font-smoothing:antialiased;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{background:"rgba(2,6,9,.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,200,255,.11)",padding:"0 16px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:22}}>🏛</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:"#00ccff",letterSpacing:"0.03em"}}>{t.appName}</div>
            <div style={{fontSize:10,color:"rgba(150,200,255,.38)",display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:connected?"#00ff9d":"#ff3060",display:"inline-block",animation:"pulse 2s infinite"}}/>
              {connected ? t.liveUpdates : t.connecting}
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {/* ── Language selector button (prominent) ── */}
          <button onClick={()=>setShowLangModal(true)}
            style={{display:"flex",alignItems:"center",gap:7,background:"rgba(0,200,255,.1)",border:"1.5px solid rgba(0,200,255,.3)",borderRadius:10,padding:"7px 12px",cursor:"pointer",transition:"all .18s",boxShadow:"0 2px 12px rgba(0,200,255,.12)"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,200,255,.18)";e.currentTarget.style.borderColor="rgba(0,200,255,.55)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,200,255,.1)";e.currentTarget.style.borderColor="rgba(0,200,255,.3)";}}>
            <span style={{fontSize:18,lineHeight:1}}>{langInfo.flag}</span>
            <span style={{fontSize:13,fontWeight:700,color:"#00ccff",fontFamily:"'Inter',sans-serif"}}>{langInfo.native}</span>
            <svg width="8" height="5" viewBox="0 0 8 5" style={{flexShrink:0}}>
              <path d="M1 1l3 3 3-3" stroke="#00ccff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".6"/>
            </svg>
          </button>

          {/* Expert mode */}
          <button onClick={onSwitchPro}
            style={{background:"rgba(255,184,0,.1)",border:"1px solid rgba(255,184,0,.28)",borderRadius:9,padding:"7px 11px",color:"#ffb800",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>
            {t.switchPro}
          </button>
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <div style={{padding:"16px 16px 0"}}>

        {/* ── HOME VIEW ── */}
        {activeView==="home" && (
          <div style={{display:"flex",flexDirection:"column",gap:13,animation:"fadeUp .35s ease"}}>
            {/* Greeting */}
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"rgba(200,220,255,.88)"}}>
                {getGreeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
              </div>
              <div style={{fontSize:12,color:"rgba(150,200,255,.38)",marginTop:2}}>{t.tapToStart}</div>
            </div>

            {/* Risk meter */}
            <RiskMeter score={cityRisk ?? 54} t={t}/>

            {/* ── BIG REPORT BUTTON ── */}
            <button onClick={()=>onReport?.()}
              style={{background:"linear-gradient(135deg,rgba(0,200,255,.2),rgba(0,255,157,.12))",border:"2px solid rgba(0,200,255,.42)",borderRadius:20,padding:"20px 22px",cursor:"pointer",display:"flex",alignItems:"center",gap:15,boxShadow:"0 0 28px rgba(0,200,255,.15)",transition:"transform .12s",width:"100%"}}
              onPointerDown={e=>e.currentTarget.style.transform="scale(.97)"}
              onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}
              onPointerLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              <div style={{fontSize:44,flexShrink:0}}>📸</div>
              <div style={{textAlign:"left",flex:1}}>
                <div style={{fontSize:18,fontWeight:800,color:"#00ccff",lineHeight:1.2}}>{t.reportBtn}</div>
                <div style={{fontSize:12,color:"rgba(0,200,255,.55)",marginTop:4}}>{t.reportSub}</div>
              </div>
              <div style={{fontSize:22,color:"rgba(0,200,255,.45)",flexShrink:0}}>›</div>
            </button>

            {/* Quick issue grid */}
            <div>
              <div style={{fontSize:11.5,color:"rgba(150,200,255,.42)",marginBottom:9,fontWeight:600,letterSpacing:"0.05em"}}>{t.quickReport}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
                {ISSUE_DEFS.map(def=>(
                  <BigCard
                    key={def.key}
                    icon={def.icon}
                    label={t.issues[def.key]}
                    color={def.color}
                    onClick={()=>onReport?.(def.key)}
                  />
                ))}
              </div>
            </div>

            {/* Recent alerts strip */}
            <div>
              <div style={{fontSize:11.5,color:"rgba(150,200,255,.42)",marginBottom:9,fontWeight:600,letterSpacing:"0.05em"}}>🔔 {t.alerts}</div>
              {alertList.length===0
                ? <div style={{textAlign:"center",padding:"16px",color:"rgba(150,200,255,.38)",fontSize:13}}>{t.noAlerts}</div>
                : alertList.slice(0,3).map((a,i)=>{
                    const txt = typeof a==="string"?a:(a.message||a.alert||JSON.stringify(a));
                    const high = /high|critical/i.test(txt);
                    return (
                      <div key={i} style={{marginBottom:8,padding:"11px 13px",background:high?"rgba(255,48,96,.08)":"rgba(255,184,0,.07)",border:`1px solid ${high?"rgba(255,48,96,.25)":"rgba(255,184,0,.2)"}`,borderLeft:`3px solid ${high?"#ff3060":"#ffb800"}`,borderRadius:10}}>
                        <div style={{fontSize:12.5,color:"rgba(220,235,255,.8)",lineHeight:1.5}}>{txt.slice(0,110)}{txt.length>110?"…":""}</div>
                      </div>
                    );
                  })
              }
            </div>

            {/* Emergency call strip */}
            <a href="tel:112" style={{textDecoration:"none"}}>
              <div style={{background:"rgba(255,48,96,.1)",border:"2px solid rgba(255,48,96,.36)",borderRadius:14,padding:"13px 16px",display:"flex",alignItems:"center",gap:13,boxShadow:"0 4px 18px rgba(255,48,96,.12)"}}>
                <div style={{fontSize:28,flexShrink:0}}>🚨</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:"#ff3060",fontFamily:"'Inter',sans-serif"}}>{t.emergency}</div>
                  <div style={{fontSize:11,color:"rgba(255,96,96,.5)",marginTop:2}}>Tap to call immediately</div>
                </div>
                <div style={{fontSize:22,color:"rgba(255,48,96,.5)"}}>›</div>
              </div>
            </a>
          </div>
        )}

        {/* ── ALERTS VIEW ── */}
        {activeView==="alerts" && (
          <div style={{animation:"fadeUp .35s ease"}}>
            <div style={{fontSize:17,fontWeight:800,color:"#cce8ff",marginBottom:16}}>🔔 {t.alerts}</div>
            {alertList.length===0
              ? <div style={{textAlign:"center",padding:"36px",color:"rgba(150,200,255,.38)",fontSize:15}}>{t.noAlerts}</div>
              : alertList.map((a,i)=>{
                  const txt = typeof a==="string"?a:(a.message||a.alert||JSON.stringify(a));
                  const high = /high|critical/i.test(txt);
                  return (
                    <div key={i} style={{marginBottom:11,padding:"14px 16px",background:high?"rgba(255,48,96,.07)":"rgba(255,184,0,.07)",border:`1px solid ${high?"rgba(255,48,96,.28)":"rgba(255,184,0,.22)"}`,borderLeft:`4px solid ${high?"#ff3060":"#ffb800"}`,borderRadius:12}}>
                      <div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
                        <span style={{fontSize:16}}>{high?"🔴":"🟡"}</span>
                        <span style={{fontSize:10,fontWeight:700,color:high?"#ff3060":"#ffb800",letterSpacing:"0.06em"}}>{high?"HIGH RISK":"WARNING"}</span>
                      </div>
                      <div style={{fontSize:13.5,color:"rgba(220,235,255,.78)",lineHeight:1.6}}>{txt}</div>
                    </div>
                  );
                })
            }
          </div>
        )}

        {/* ── MY REPORTS VIEW ── */}
        {activeView==="myreports" && (
          <div style={{animation:"fadeUp .35s ease"}}>
            <div style={{fontSize:17,fontWeight:800,color:"#cce8ff",marginBottom:16}}>📋 {t.myReports}</div>
            {myReports.map((r,i)=>(
              <div key={i} style={{marginBottom:12,padding:"15px",background:"rgba(0,200,255,.05)",border:"1px solid rgba(0,200,255,.16)",borderRadius:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:15,fontWeight:700,color:"#cce8ff"}}>{r.issue}</span>
                  <span style={{fontSize:11,fontWeight:700,
                    color:r.status==="resolved"?"#00ff9d":"#ffb800",
                    background:r.status==="resolved"?"rgba(0,255,157,.1)":"rgba(255,184,0,.1)",
                    border:`1px solid ${r.status==="resolved"?"rgba(0,255,157,.28)":"rgba(255,184,0,.28)"}`,
                    borderRadius:20,padding:"3px 11px"}}>
                    {r.status==="resolved" ? t.resolved : t.submitted}
                  </span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:10.5,color:"rgba(150,200,255,.38)",fontFamily:"'DM Mono',monospace"}}>{r.id}</span>
                  <span style={{fontSize:11,color:"rgba(150,200,255,.3)"}}>{r.date}</span>
                </div>
                <div style={{height:4,background:"rgba(255,255,255,.05)",borderRadius:2}}>
                  <div style={{height:"100%",width:r.status==="resolved"?"100%":"45%",background:r.status==="resolved"?"#00ff9d":"#ffb800",borderRadius:2,transition:"width 1s ease"}}/>
                </div>
              </div>
            ))}
            <button onClick={()=>onReport?.()} style={{width:"100%",marginTop:6,padding:"14px",background:"rgba(0,200,255,.1)",border:"1px solid rgba(0,200,255,.28)",borderRadius:12,color:"#00ccff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
              + {t.reportBtn}
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(2,6,9,.96)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(0,200,255,.1)",display:"flex",zIndex:50,height:64}}>
        {[
          { id:"home",      icon:"🏠", label:t.home },
          { id:"alerts",    icon:"🔔", label:t.alerts, badge:alertList.length },
          { id:"report",    icon:"📸", label:t.reportBtn.split(" ")[0], action:true },
          { id:"myreports", icon:"📋", label:t.myReports.split(" ").slice(-1)[0] },
          { id:"lang",      icon:langInfo.flag, label:t.changeLang.split(" ")[0] },
        ].map(item=>(
          <button key={item.id}
            onClick={()=>{
              if(item.id==="report") onReport?.();
              else if(item.id==="lang") setShowLangModal(true);
              else if(item.id==="help") alert("For emergencies call 112. Tap 📸 to report issues. Reports reach officers in minutes.");
              else setActiveView(item.id);
            }}
            style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:item.action?"6px 4px":"10px 4px 8px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,position:"relative"}}>
            {item.action ? (
              <div style={{width:50,height:50,borderRadius:"50%",background:"linear-gradient(135deg,#00ccff,#00ff9d)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 0 20px rgba(0,200,255,.5)",transform:"translateY(-12px)",border:"3px solid rgba(2,6,9,.9)",flexShrink:0}}>
                {item.icon}
              </div>
            ) : (
              <>
                <div style={{fontSize:20,position:"relative",lineHeight:1}}>
                  {item.icon}
                  {item.badge > 0 && <div style={{position:"absolute",top:-4,right:-6,background:"#ff3060",borderRadius:"50%",width:15,height:15,fontSize:8,fontWeight:800,color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>{item.badge>9?"9+":item.badge}</div>}
                </div>
                <div style={{fontSize:9.5,color:activeView===item.id?"#00ccff":"rgba(150,200,255,.38)",fontWeight:activeView===item.id?700:400,fontFamily:"'Inter',sans-serif",lineHeight:1}}>{item.label}</div>
                {activeView===item.id && <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:20,height:2,background:"#00ccff",borderRadius:2}}/>}
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── LANGUAGE MODAL ── */}
      {showLangModal && <LangModal current={lang} onSelect={handleLangChange} onClose={()=>setShowLangModal(false)} t={t}/>}
    </div>
  );
}