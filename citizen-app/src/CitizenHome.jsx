import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// CITIZEN HOME — Report button + My Reports + Language picker
// No analytics, no dashboards. Just what citizens need.
// ═══════════════════════════════════════════════════════════

const API = "https://civicsentinel-ai-1.onrender.com";

const LANGS = [
  { code:"en", native:"English",  flag:"🇬🇧" },
  { code:"hi", native:"हिन्दी",   flag:"🇮🇳" },
  { code:"ta", native:"தமிழ்",    flag:"🇮🇳" },
  { code:"te", native:"తెలుగు",   flag:"🇮🇳" },
  { code:"bn", native:"বাংলা",    flag:"🇮🇳" },
  { code:"mr", native:"मराठी",    flag:"🇮🇳" },
];

const T = {
  en: {
    greeting:{ morning:"Good Morning", afternoon:"Good Afternoon", evening:"Good Evening" },
    tagline:"Your voice reaches the ward office instantly.",
    reportBtn:"Report an Issue", reportSub:"Photo · GPS · AI verified · Dispatched instantly",
    myReports:"My Reports", noReports:"No reports yet. Tap above to report your first issue!",
    status:{ submitted:"Submitted", in_progress:"In Progress", resolved:"Resolved ✓" },
    newReport:"+ New Report",
    ward:"Ward", city:"City", date:"Date", issue:"Issue", id:"Report ID",
    changeLang:"Language",
    logout:"Logout",
    selectLang:"Select Language",
    emergency:"Emergency · Call 112",
    alertsBanner:"⚠ Active civic alerts in your area",
    guestBanner:"You're browsing as a guest. Sign in to submit reports.",
  },
  hi: {
    greeting:{ morning:"सुप्रभात", afternoon:"नमस्कार", evening:"शुभ संध्या" },
    tagline:"आपकी आवाज़ तुरंत वार्ड कार्यालय तक पहुंचती है।",
    reportBtn:"समस्या रिपोर्ट करें", reportSub:"फोटो · GPS · AI सत्यापित · तुरंत भेजा गया",
    myReports:"मेरी रिपोर्ट", noReports:"अभी तक कोई रिपोर्ट नहीं। ऊपर टैप करें!",
    status:{ submitted:"भेजी गई", in_progress:"प्रगति में", resolved:"हल हुई ✓" },
    newReport:"+ नई रिपोर्ट",
    ward:"वार्ड", city:"शहर", date:"तारीख", issue:"समस्या", id:"रिपोर्ट ID",
    changeLang:"भाषा",
    logout:"लॉगआउट",
    selectLang:"भाषा चुनें",
    emergency:"आपात · 112 पर कॉल करें",
    alertsBanner:"⚠ आपके क्षेत्र में सक्रिय नागरिक अलर्ट",
    guestBanner:"आप अतिथि के रूप में हैं। रिपोर्ट के लिए साइन इन करें।",
  },
  ta: {
    greeting:{ morning:"காலை வணக்கம்", afternoon:"மதிய வணக்கம்", evening:"மாலை வணக்கம்" },
    tagline:"உங்கள் குரல் உடனே வார்டு அலுவலகத்தை அடைகிறது.",
    reportBtn:"பிரச்சினை புகார் செய்யுங்கள்", reportSub:"படம் · GPS · AI சரிபார்க்கப்பட்டது",
    myReports:"என் புகார்கள்", noReports:"இன்னும் புகார் இல்லை. மேலே தட்டவும்!",
    status:{ submitted:"சமர்ப்பிக்கப்பட்டது", in_progress:"செயல்பாட்டில்", resolved:"தீர்க்கப்பட்டது ✓" },
    newReport:"+ புதிய புகார்",
    ward:"வார்டு", city:"நகரம்", date:"தேதி", issue:"பிரச்சினை", id:"புகார் ID",
    changeLang:"மொழி",
    logout:"வெளியேறு",
    selectLang:"மொழியை தேர்ந்தெடுக்கவும்",
    emergency:"அவசரம் · 112 அழைக்கவும்",
    alertsBanner:"⚠ உங்கள் பகுதியில் செயலில் உள்ள எச்சரிக்கைகள்",
    guestBanner:"நீங்கள் விருந்தினராக உள்ளீர்கள். புகார் செய்ய உள்நுழையவும்.",
  },
  te: { greeting:{ morning:"శుభోదయం", afternoon:"నమస్కారం", evening:"శుభ సాయంత్రం" }, tagline:"మీ మాట వెంటనే వార్డ్ కార్యాలయానికి చేరుతుంది.", reportBtn:"సమస్య నివేదించండి", reportSub:"ఫోటో · GPS · AI ధృవీకరించబడింది", myReports:"నా నివేదికలు", noReports:"ఇంకా నివేదికలు లేవు. పైన నొక్కండి!", status:{ submitted:"సమర్పించబడింది", in_progress:"పురోగతిలో", resolved:"పరిష్కరించబడింది ✓" }, newReport:"+ కొత్త నివేదిక", ward:"వార్డ్", city:"నగరం", date:"తేదీ", issue:"సమస్య", id:"నివేదిక ID", changeLang:"భాష", logout:"లాగ్అవుట్", selectLang:"భాషను ఎంచుకోండి", emergency:"అత్యవసరం · 112 కాల్ చేయండి", alertsBanner:"⚠ మీ ప్రాంతంలో క్రియాశీల హెచ్చరికలు", guestBanner:"మీరు అతిథిగా ఉన్నారు. నివేదించడానికి సైన్ ఇన్ చేయండి." },
  bn: { greeting:{ morning:"শুভ সকাল", afternoon:"শুভ অপরাহ্ণ", evening:"শুভ সন্ধ্যা" }, tagline:"আপনার কণ্ঠস্বর সঙ্গে সঙ্গে ওয়ার্ড অফিসে পৌঁছায়।", reportBtn:"সমস্যা রিপোর্ট করুন", reportSub:"ফটো · GPS · AI যাচাই করা হয়েছে", myReports:"আমার রিপোর্ট", noReports:"এখনো কোনো রিপোর্ট নেই। উপরে ট্যাপ করুন!", status:{ submitted:"জমা দেওয়া হয়েছে", in_progress:"চলমান", resolved:"সমাধান হয়েছে ✓" }, newReport:"+ নতুন রিপোর্ট", ward:"ওয়ার্ড", city:"শহর", date:"তারিখ", issue:"সমস্যা", id:"রিপোর্ট ID", changeLang:"ভাষা", logout:"লগআউট", selectLang:"ভাষা নির্বাচন করুন", emergency:"জরুরি · 112 কল করুন", alertsBanner:"⚠ আপনার এলাকায় সক্রিয় সতর্কতা", guestBanner:"আপনি অতিথি হিসেবে আছেন। রিপোর্ট করতে সাইন ইন করুন।" },
  mr: { greeting:{ morning:"सुप्रभात", afternoon:"नमस्कार", evening:"शुभ संध्या" }, tagline:"तुमचा आवाज तत्काळ वार्ड कार्यालयापर्यंत पोहोचतो.", reportBtn:"समस्या नोंदवा", reportSub:"फोटो · GPS · AI सत्यापित · त्वरित पाठवले", myReports:"माझ्या तक्रारी", noReports:"अद्याप तक्रारी नाहीत. वर टॅप करा!", status:{ submitted:"सादर केले", in_progress:"प्रगतीपथावर", resolved:"निराकरण झाले ✓" }, newReport:"+ नवीन तक्रार", ward:"वार्ड", city:"शहर", date:"तारीख", issue:"समस्या", id:"तक्रार ID", changeLang:"भाषा", logout:"लॉगआउट", selectLang:"भाषा निवडा", emergency:"आणीबाणी · 112 वर कॉल करा", alertsBanner:"⚠ तुमच्या परिसरात सक्रिय सूचना", guestBanner:"तुम्ही पाहुणे म्हणून आहात. तक्रार नोंदवण्यासाठी साइन इन करा." },
};

const STATUS_COLOR = { submitted:"#3b82f6", in_progress:"#f97316", resolved:"#22c55e" };
const ISSUE_ICONS  = { water:"💧", road:"🚧", electricity:"⚡", garbage:"🗑️", encroachment:"🏗️", crime:"🚨", health:"🏥", other:"📌" };

// Mock reports — replace with real API fetch by user ID
const MOCK_REPORTS = [
  { id:"CS1A2B3C", issue:"water",       ward:"Bandra",  city:"Mumbai",   date:"2 days ago",  status:"resolved",    desc:"No water supply for 3 days" },
  { id:"CS4D5E6F", issue:"road",        ward:"Andheri", city:"Mumbai",   date:"Today",       status:"submitted",   desc:"Large pothole on main road" },
  { id:"CS7G8H9I", issue:"electricity", ward:"Dharavi", city:"Mumbai",   date:"Yesterday",   status:"in_progress", desc:"Street light not working" },
];

function LangModal({ current, onChange, onClose, t }) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(2,8,4,.9)",backdropFilter:"blur(10px)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:420,background:"rgba(4,20,10,.98)",border:"1px solid rgba(34,197,94,.18)",borderRadius:"20px 20px 14px 14px",overflow:"hidden",boxShadow:"0 -20px 60px rgba(0,0,0,.6)"}}>
        <div style={{padding:"16px 20px 10px",borderBottom:"1px solid rgba(34,197,94,.1)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:15,fontWeight:800,color:"#22c55e"}}>🌐 {t.selectLang}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,width:28,height:28,color:"rgba(187,247,208,.55)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {LANGS.map(l=>(
            <button key={l.code} onClick={()=>onChange(l.code)}
              style={{padding:"13px 12px",background:current===l.code?"rgba(34,197,94,.18)":"rgba(255,255,255,.04)",border:`2px solid ${current===l.code?"#22c55e":"rgba(255,255,255,.08)"}`,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .18s"}}>
              <span style={{fontSize:22}}>{l.flag}</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:14,fontWeight:700,color:current===l.code?"#22c55e":"#d1fae5",fontFamily:"'Inter',sans-serif"}}>{l.native}</div>
                {current===l.code&&<div style={{fontSize:9,color:"#22c55e",marginTop:1}}>✓ selected</div>}
              </div>
            </button>
          ))}
        </div>
        <div style={{padding:"6px 12px 14px"}}>
          <button onClick={onClose} style={{width:"100%",padding:"12px",background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.28)",borderRadius:10,color:"#22c55e",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default function CitizenHome({ user, onReport, onLogout }) {
  const [lang, setLang]           = useState(user.lang || "en");
  const [showLangModal, setShowLangModal] = useState(false);
  const [tab, setTab]             = useState("report");   // report | myreports
  const [alerts, setAlerts]       = useState([]);
  const [connected, setConnected] = useState(false);

  const t    = T[lang] || T.en;
  const li   = LANGS.find(l=>l.code===lang) || LANGS[0];
  const GREEN = "#22c55e";

  // Fetch alerts to show a banner if any exist
  useEffect(() => {
    fetch(API + "/alerts")
      .then(r=>r.json())
      .then(d=>{ setAlerts(d.alerts||d||[]); setConnected(true); })
      .catch(()=>setConnected(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    return h<12 ? t.greeting.morning : h<17 ? t.greeting.afternoon : t.greeting.evening;
  };

  const progressPct = (s) => s==="resolved"?100:s==="in_progress"?55:20;

  return (
    <div style={{minHeight:"100vh",background:"#020c06",fontFamily:"'Inter',sans-serif",paddingBottom:80}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#020c06;-webkit-font-smoothing:antialiased;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{background:"rgba(2,8,4,.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(34,197,94,.1)",padding:"0 16px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:22}}>🏛</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:GREEN,letterSpacing:"0.03em"}}>CivicSentinel</div>
            <div style={{fontSize:10,color:"rgba(134,239,172,.35)",display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:connected?GREEN:"#ef4444",display:"inline-block",animation:"pulse 2s infinite"}}/>
              {connected?"Live":"Connecting…"}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Language button */}
          <button onClick={()=>setShowLangModal(true)}
            style={{display:"flex",alignItems:"center",gap:7,background:"rgba(34,197,94,.1)",border:"1.5px solid rgba(34,197,94,.28)",borderRadius:9,padding:"6px 11px",cursor:"pointer",transition:"all .18s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(34,197,94,.18)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(34,197,94,.1)"}>
            <span style={{fontSize:17}}>{li.flag}</span>
            <span style={{fontSize:12,fontWeight:700,color:GREEN,fontFamily:"'Inter',sans-serif"}}>{li.native}</span>
          </button>
          {/* Logout */}
          <button onClick={onLogout}
            style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"6px 11px",color:"rgba(252,165,165,.65)",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'Inter',sans-serif",transition:"all .18s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.16)";e.currentTarget.style.color="#fca5a5";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(239,68,68,.08)";e.currentTarget.style.color="rgba(252,165,165,.65)";}}>
            {t.logout}
          </button>
        </div>
      </div>

      <div style={{padding:"18px 16px 0",maxWidth:500,margin:"0 auto"}}>

        {/* ── GUEST BANNER ── */}
        {user.guest && (
          <div style={{background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.22)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12.5,color:"rgba(253,230,138,.75)",display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:16}}>⚠️</span>{t.guestBanner}
          </div>
        )}

        {/* ── ALERTS BANNER ── */}
        {alerts.length > 0 && (
          <div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.22)",borderLeft:"3px solid #ef4444",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12.5,color:"rgba(252,165,165,.8)",display:"flex",gap:8,alignItems:"center"}}>
            <span>{t.alertsBanner} ({alerts.length})</span>
          </div>
        )}

        {/* ── GREETING ── */}
        <div style={{marginBottom:20,animation:"fadeUp .35s ease"}}>
          <div style={{fontSize:18,fontWeight:700,color:"rgba(187,247,208,.88)"}}>
            {greeting()}{user.name && !user.guest ? `, ${user.name.split(" ")[0]}` : ""}! 👋
          </div>
          <div style={{fontSize:12,color:"rgba(134,239,172,.4)",marginTop:3}}>{t.tagline}</div>
        </div>

        {/* ── TABS ── */}
        <div style={{display:"flex",background:"rgba(0,0,0,.3)",borderRadius:10,padding:4,marginBottom:20}}>
          {[["report","📣 " + t.reportBtn],["myreports","📋 " + t.myReports]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{flex:1,padding:"10px",borderRadius:7,border:"none",background:tab===id?"rgba(34,197,94,.18)":"transparent",color:tab===id?GREEN:"rgba(134,239,172,.38)",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all .2s"}}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ══ TAB: REPORT ══ */}
        {tab==="report" && (
          <div style={{animation:"fadeUp .3s ease",display:"flex",flexDirection:"column",gap:14}}>
            {/* Big report button */}
            <button onClick={()=>!user.guest && onReport()}
              disabled={!!user.guest}
              style={{padding:"24px 22px",background:user.guest?"rgba(34,197,94,.04)":"linear-gradient(135deg,rgba(34,197,94,.2),rgba(34,197,94,.12))",border:`2px solid ${user.guest?"rgba(34,197,94,.12)":"rgba(34,197,94,.42)"}`,borderRadius:20,cursor:user.guest?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:16,width:"100%",transition:"all .12s",boxShadow:user.guest?"none":"0 0 28px rgba(34,197,94,.12)",opacity:user.guest?0.55:1}}
              onPointerDown={e=>!user.guest&&(e.currentTarget.style.transform="scale(.97)")}
              onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}
              onPointerLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              <div style={{fontSize:46,flexShrink:0}}>📸</div>
              <div style={{textAlign:"left",flex:1}}>
                <div style={{fontSize:18,fontWeight:800,color:GREEN,lineHeight:1.2}}>{t.reportBtn}</div>
                <div style={{fontSize:12,color:"rgba(34,197,94,.55)",marginTop:5,lineHeight:1.5}}>{t.reportSub}</div>
              </div>
              {!user.guest && <div style={{fontSize:24,color:"rgba(34,197,94,.4)"}}>›</div>}
            </button>

            {/* Quick issue shortcuts */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {[["💧","water","#3b82f6"],["🚧","road","#f97316"],["⚡","electricity","#eab308"],["🗑️","garbage","#22c55e"],["🚨","crime","#ef4444"],["🏥","health","#a855f7"]].map(([icon,cat,col])=>(
                <button key={cat} onClick={()=>!user.guest && onReport(cat)} disabled={!!user.guest}
                  style={{padding:"14px 8px",background:`${col}0d`,border:`1.5px solid ${col}28`,borderRadius:14,cursor:user.guest?"not-allowed":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:user.guest?0.5:1,transition:"all .15s"}}
                  onPointerDown={e=>!user.guest&&(e.currentTarget.style.transform="scale(.93)")}
                  onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}
                  onPointerLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                  <span style={{fontSize:28}}>{icon}</span>
                  <span style={{fontSize:10.5,color:`${col}`,fontWeight:600,fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{cat}</span>
                </button>
              ))}
            </div>

            {/* Emergency strip */}
            <a href="tel:112" style={{textDecoration:"none"}}>
              <div style={{background:"rgba(239,68,68,.1)",border:"2px solid rgba(239,68,68,.32)",borderRadius:14,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,marginTop:4}}>
                <span style={{fontSize:26}}>🚨</span>
                <div style={{fontSize:14,fontWeight:800,color:"#ef4444"}}>{t.emergency}</div>
                <div style={{marginLeft:"auto",fontSize:22,color:"rgba(239,68,68,.4)"}}>›</div>
              </div>
            </a>
          </div>
        )}

        {/* ══ TAB: MY REPORTS ══ */}
        {tab==="myreports" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
              <button onClick={()=>!user.guest && onReport()} disabled={!!user.guest}
                style={{padding:"9px 16px",background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.3)",borderRadius:9,color:GREEN,fontSize:13,fontWeight:700,cursor:user.guest?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",opacity:user.guest?0.5:1}}>
                {t.newReport}
              </button>
            </div>

            {MOCK_REPORTS.length === 0 ? (
              <div style={{textAlign:"center",padding:"48px 20px",color:"rgba(134,239,172,.38)",fontSize:14,lineHeight:1.7}}>{t.noReports}</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {MOCK_REPORTS.map((r,i)=>{
                  const sc = STATUS_COLOR[r.status] || GREEN;
                  const pct = progressPct(r.status);
                  return (
                    <div key={r.id} style={{background:"rgba(4,20,10,.9)",border:`1px solid rgba(34,197,94,.1)`,borderLeft:`3px solid ${sc}`,borderRadius:14,padding:"15px 16px",animation:`fadeUp .3s ease ${i*.07}s both`}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=`${sc}40`}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(34,197,94,.1)"}>
                      {/* Header row */}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:9}}>
                          <span style={{fontSize:20}}>{ISSUE_ICONS[r.issue]||"📌"}</span>
                          <span style={{fontSize:14,fontWeight:700,color:"#d1fae5",textTransform:"capitalize"}}>{r.issue}</span>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:sc,background:`${sc}18`,border:`1px solid ${sc}38`,borderRadius:20,padding:"3px 11px"}}>
                          {t.status[r.status]}
                        </span>
                      </div>
                      {/* Description */}
                      <div style={{fontSize:13,color:"rgba(187,247,208,.55)",marginBottom:10,lineHeight:1.5}}>{r.desc}</div>
                      {/* Meta */}
                      <div style={{display:"flex",gap:14,marginBottom:10}}>
                        {[[t.ward,r.ward],[t.city,r.city],[t.date,r.date]].map(([l,v])=>(
                          <div key={l}><div style={{fontSize:9,color:"rgba(134,239,172,.3)"}}>{l}</div><div style={{fontSize:11,color:"rgba(187,247,208,.7)",fontWeight:600}}>{v}</div></div>
                        ))}
                      </div>
                      {/* Progress bar */}
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{flex:1,height:4,background:"rgba(255,255,255,.06)",borderRadius:2}}>
                          <div style={{height:"100%",width:`${pct}%`,background:sc,borderRadius:2,transition:"width 1.2s ease"}}/>
                        </div>
                        <span style={{fontSize:10,color:sc,fontFamily:"'DM Mono',monospace",minWidth:30}}>{pct}%</span>
                      </div>
                      {/* ID */}
                      <div style={{marginTop:7,fontSize:9.5,color:"rgba(134,239,172,.25)",fontFamily:"'DM Mono',monospace"}}>{t.id}: {r.id}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lang modal */}
      {showLangModal && <LangModal current={lang} onChange={c=>{setLang(c);setShowLangModal(false);}} onClose={()=>setShowLangModal(false)} t={t}/>}
    </div>
  );
}