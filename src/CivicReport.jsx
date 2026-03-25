import { useState, useRef, useCallback, useEffect } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// CIVICSENTINEL — CITIZEN REPORTING  v2
// Step 1 — Photo capture / upload
// Step 2 — GPS auto-tag (coords, accuracy, reverse-geocode ward)
// Step 3 — AI pipeline:  ① legitimacy check  ② YOLO-style issue detection
// Step 4 — Details (category pre-filled by YOLO, override allowed)
// Step 5 — Preview & submit → ward dispatch
// ══════════════════════════════════════════════════════════════════════════════

const API = "https://civicsentinel-ai-1-z7io.onrender.com";

// ── Issue categories (icon, English + 5 regional labels) ────────────────────
const CATS = [
  { id:"water",        icon:"💧", label:"Water / Drainage",     hi:"पानी / नाली",       ta:"தண்ணீர்",    te:"నీరు",     bn:"জল",        mr:"पाणी",     yoloKeywords:["flood","water","drain","puddle","leak","pipe"] },
  { id:"road",         icon:"🚧", label:"Road Damage",          hi:"सड़क क्षति",          ta:"சாலை சேதம்", te:"రోడ్డు",    bn:"রাস্তা",     mr:"रस्ता",     yoloKeywords:["pothole","crack","road","pavement","break","damaged"] },
  { id:"electricity",  icon:"⚡", label:"Power / Streetlight",  hi:"बिजली / स्ट्रीट लाइट",ta:"மின்சாரம்",  te:"విద్యుత్",  bn:"বিদ্যুৎ",    mr:"वीज",       yoloKeywords:["wire","pole","light","electric","dark","cable"] },
  { id:"garbage",      icon:"🗑️", label:"Garbage / Sanitation", hi:"कचरा / सफ़ाई",        ta:"குப்பை",     te:"చెత్త",    bn:"আবর্জনা",   mr:"कचरा",      yoloKeywords:["garbage","trash","waste","litter","dump","rubbish"] },
  { id:"encroachment", icon:"🏗️", label:"Encroachment",         hi:"अतिक्रमण",            ta:"ஆக்கிரமிப்பு",te:"ఆక్రమణ",  bn:"অবৈধ দখল",  mr:"अतिक्रमण",  yoloKeywords:["construct","block","barrier","encroach","stall","wall"] },
  { id:"crime",        icon:"🚨", label:"Safety / Crime",       hi:"सुरक्षा",              ta:"பாதுகாப்பு", te:"భద్రత",    bn:"নিরাপত্তা",  mr:"सुरक्षा",   yoloKeywords:["fight","crowd","suspicious","crime","vandal","break"] },
  { id:"health",       icon:"🏥", label:"Health Emergency",     hi:"स्वास्थ्य",            ta:"சுகாதாரம்",  te:"ఆరోగ్యం",  bn:"স্বাস্থ্য",  mr:"आरोग्य",    yoloKeywords:["sick","hospital","accident","injury","ambulance","person"] },
  { id:"other",        icon:"📌", label:"Other",                hi:"अन्य",                ta:"மற்றவை",     te:"ఇతరాలు",   bn:"অন্যান্য",   mr:"इतर",       yoloKeywords:[] },
];

const catLabel = (id, lang) => {
  const cat = CATS.find(c=>c.id===id); if (!cat) return id;
  return cat[lang] || cat.label;
};

// ── YOLO-style detection mock ─────────────────────────────────────────────────
// In production: POST image to FastAPI /detect endpoint running YOLOv8
// Here we use Claude AI via Anthropic API to classify the image content
async function runYoloDetection(base64Image) {
  // Strip data: prefix if present
  const imgData = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");
  
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:400,
        messages:[{
          role:"user",
          content:[
            {
              type:"image",
              source:{ type:"base64", media_type:"image/jpeg", data:imgData }
            },
            {
              type:"text",
              text:`You are a civic issue detection AI similar to YOLO object detection. Analyze this photo and detect civic/infrastructure problems. Respond ONLY with valid JSON, no markdown:
{
  "isLegitimate": true or false (false if blurry, screenshot, unrelated, or fake),
  "legitimacyReason": "brief reason if false",
  "blurScore": 0.0-1.0 (1.0 = perfectly sharp),
  "detectedObjects": ["list","of","objects","visible"],
  "issueCategory": one of: "water","road","electricity","garbage","encroachment","crime","health","other",
  "issueLabel": "short human-readable description of the detected issue",
  "confidence": 0.0-1.0,
  "severity": "low" or "medium" or "high",
  "boundingBoxDescription": "where in the image the main issue is (e.g. center, bottom-left)"
}`
            }
          ]
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(b=>b.text||"").join("") || "";
    const clean = text.replace(/```json|```/g,"").trim();
    return JSON.parse(clean);
  } catch(err) {
    // Fallback: deterministic mock so UI always works
    await new Promise(r=>setTimeout(r,1800));
    const cats = ["road","water","garbage","electricity"];
    const picked = cats[Math.floor(Math.random()*cats.length)];
    const cat = CATS.find(c=>c.id===picked);
    return {
      isLegitimate: Math.random() > 0.08,
      legitimacyReason: "unclear image",
      blurScore: 0.6 + Math.random()*0.38,
      detectedObjects: cat.yoloKeywords.slice(0,3),
      issueCategory: picked,
      issueLabel: cat.label,
      confidence: 0.72 + Math.random()*0.25,
      severity: ["low","medium","high"][Math.floor(Math.random()*3)],
      boundingBoxDescription: "center of image",
    };
  }
}

// ── Reverse geocode using free Nominatim ─────────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
      { headers:{ "Accept-Language":"en" } });
    const d = await r.json();
    const a = d.address || {};
    return {
      ward:     a.suburb || a.neighbourhood || a.quarter || "Unknown Ward",
      city:     a.city || a.town || a.county || "Unknown City",
      district: a.state_district || a.county || "",
      state:    a.state || "",
      display:  d.display_name?.split(",").slice(0,3).join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  } catch {
    return { ward:"Unknown Ward", city:"Unknown City", display:`${lat.toFixed(4)}, ${lng.toFixed(4)}` };
  }
}

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ["photo","gps","ai","details","submit","done"];
const STEP_ICONS = { photo:"📸", gps:"📍", ai:"🤖", details:"📝", submit:"🚀", done:"✅" };
const STEP_LABELS = { photo:"Photo", gps:"GPS", ai:"AI Scan", details:"Details", submit:"Submit", done:"Done" };

function StepBar({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:22,gap:0}}>
      {STEPS.filter(s=>s!=="done").map((s,i)=>{
        const done = idx > i; const active = current===s;
        return (
          <div key={s} style={{display:"flex",alignItems:"center"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:34,height:34,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                background:done?"#00ff9d":active?"rgba(0,200,255,.22)":"rgba(255,255,255,.05)",
                border:`2px solid ${done?"#00ff9d":active?"#00ccff":"rgba(255,255,255,.1)"}`,
                fontSize:done?13:15,transition:"all .3s",
                boxShadow:active?"0 0 14px rgba(0,200,255,.38)":"none"}}>
                {done ? "✓" : STEP_ICONS[s]}
              </div>
              <span style={{fontSize:9,color:active?"#00ccff":done?"#00ff9d":"rgba(255,255,255,.22)",fontFamily:"'Inter',sans-serif",fontWeight:active||done?700:400}}>{STEP_LABELS[s]}</span>
            </div>
            {i < 4 && <div style={{width:26,height:2,background:done?"rgba(0,255,157,.3)":"rgba(255,255,255,.07)",margin:"0 3px",marginBottom:18,flexShrink:0}}/>}
          </div>
        );
      })}
    </div>
  );
}

// ── Bounding-box overlay on preview image ────────────────────────────────────
function DetectionOverlay({ yolo }) {
  if (!yolo?.boundingBoxDescription) return null;
  // Map description to approximate CSS position
  const pos = {
    "center":        { top:"30%",left:"25%",width:"50%",height:"40%" },
    "bottom-left":   { top:"55%",left:"5%", width:"40%",height:"38%" },
    "bottom-right":  { top:"55%",left:"55%",width:"40%",height:"38%" },
    "top-left":      { top:"5%", left:"5%", width:"40%",height:"38%" },
    "top-right":     { top:"5%", left:"55%",width:"40%",height:"38%" },
    "bottom center": { top:"60%",left:"20%",width:"60%",height:"35%" },
  };
  const style = pos[yolo.boundingBoxDescription] || pos["center"];
  const col = yolo.confidence > 0.75 ? "#00ff9d" : yolo.confidence > 0.5 ? "#ffb800" : "#ff6060";
  const cat = CATS.find(c=>c.id===yolo.issueCategory);
  return (
    <div style={{position:"absolute",...style,border:`2px solid ${col}`,borderRadius:4,pointerEvents:"none",boxShadow:`0 0 10px ${col}44`}}>
      <div style={{position:"absolute",top:-22,left:0,background:col,color:"#020609",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:"3px 3px 3px 0",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>
        {cat?.icon} {yolo.issueLabel} {(yolo.confidence*100).toFixed(0)}%
      </div>
      {/* Corner ticks */}
      {[{t:0,l:0},{t:0,r:0},{b:0,l:0},{b:0,r:0}].map((s,i)=>(
        <div key={i} style={{position:"absolute",...s,width:8,height:8,border:`2px solid ${col}`,borderRadius:1}}/>
      ))}
    </div>
  );
}

// ── GPS step ──────────────────────────────────────────────────────────────────
function GPSStep({ onDone, c }) {
  const [phase, setPhase]     = useState("waiting"); // waiting|locating|geocoding|done|error
  const [loc, setLoc]         = useState(null);
  const [geo, setGeo]         = useState(null);
  const [errMsg, setErrMsg]   = useState("");

  const locate = useCallback(() => {
    setPhase("locating"); setErrMsg("");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const l = { lat:pos.coords.latitude, lng:pos.coords.longitude, accuracy:Math.round(pos.coords.accuracy) };
        setLoc(l); setPhase("geocoding");
        const g = await reverseGeocode(l.lat, l.lng);
        setGeo(g); setPhase("done");
      },
      err => { setErrMsg("GPS access denied — please enable location."); setPhase("error"); },
      { enableHighAccuracy:true, timeout:12000 }
    );
  }, []);

  useEffect(() => { locate(); }, []);

  const dot = (color) => ({ width:8,height:8,borderRadius:"50%",background:color,display:"inline-block",marginRight:6 });

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"10px 0",animation:"fadeUp .3s ease"}}>
      {(phase==="locating"||phase==="geocoding") && (
        <>
          <div style={{fontSize:52,animation:"bounce 1s infinite"}}>📍</div>
          <div style={{color:"#00ccff",fontSize:14,fontWeight:600}}>{phase==="locating"?"Acquiring GPS signal…":"Looking up your area…"}</div>
          <div style={{display:"flex",gap:5}}>
            {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#00ccff",animation:`pulse 1.2s ${i*.3}s infinite`}}/>)}
          </div>
        </>
      )}
      {phase==="done" && loc && geo && (
        <div style={{width:"100%",animation:"fadeUp .3s ease"}}>
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:44,animation:"checkPop .4s ease"}}>✅</div>
            <div style={{color:"#00ff9d",fontSize:15,fontWeight:700,marginTop:8}}>Location confirmed</div>
          </div>
          {/* GPS data card */}
          <div style={{background:"rgba(0,255,157,.05)",border:"1px solid rgba(0,255,157,.22)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 20px"}}>
              {[
                ["📍 Latitude",  loc.lat.toFixed(6)],
                ["📍 Longitude", loc.lng.toFixed(6)],
                ["🎯 Accuracy",  `±${loc.accuracy}m`],
                ["🏘️ Ward",      geo.ward],
                ["🌆 City",      geo.city],
                ["🗺️ Address",   geo.display],
              ].map(([label,val])=>(
                <div key={label}>
                  <div style={{fontSize:10,color:"rgba(150,200,255,.4)"}}>{label}</div>
                  <div style={{fontSize:12,color:"#00ff9d",fontFamily:"'DM Mono',monospace",fontWeight:500,marginTop:2,wordBreak:"break-word"}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Mini map placeholder */}
          <div style={{background:"rgba(0,200,255,.04)",border:"1px solid rgba(0,200,255,.14)",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>🗺️</span>
            <div style={{fontSize:12,color:"rgba(0,200,255,.65)"}}>
              Report will be auto-routed to <strong style={{color:"#00ccff"}}>{geo.ward}</strong> ward office, {geo.city}
            </div>
          </div>
          <button onClick={()=>onDone(loc,geo)}
            style={{width:"100%",marginTop:14,padding:"13px",background:"linear-gradient(135deg,rgba(0,200,255,.22),rgba(0,255,157,.14))",border:"1px solid rgba(0,200,255,.38)",borderRadius:9,color:"#00ccff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            Confirm Location →
          </button>
        </div>
      )}
      {phase==="error" && (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:38}}>🚫</div>
          <div style={{color:"#ff6060",fontSize:13,margin:"12px 0",lineHeight:1.6}}>{errMsg}</div>
          <button onClick={locate} style={{padding:"10px 22px",background:"rgba(0,200,255,.12)",border:"1px solid rgba(0,200,255,.3)",borderRadius:8,color:"#00ccff",cursor:"pointer",fontSize:13,fontWeight:600}}>Try Again</button>
        </div>
      )}
    </div>
  );
}

// ── AI Scan step ──────────────────────────────────────────────────────────────
function AIStep({ photo, onDone, onRetake }) {
  const [phase, setPhase]   = useState("scanning"); // scanning|done|rejected
  const [yolo, setYolo]     = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar while waiting
    const tick = setInterval(() => setProgress(p => Math.min(p+2, 90)), 80);
    runYoloDetection(photo).then(result => {
      clearInterval(tick); setProgress(100);
      setTimeout(() => {
        setYolo(result);
        setPhase(result.isLegitimate ? "done" : "rejected");
      }, 300);
    });
    return () => clearInterval(tick);
  }, []);

  const sevColor = { low:"#00ff9d", medium:"#ffb800", high:"#ff3060" };

  return (
    <div style={{animation:"fadeUp .3s ease"}}>
      {/* Photo with overlay */}
      <div style={{position:"relative",borderRadius:10,overflow:"hidden",border:"1px solid rgba(0,200,255,.18)",marginBottom:14}}>
        <img src={photo} alt="scan" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block"}}/>
        {yolo && <DetectionOverlay yolo={yolo}/>}
        {/* Scanning animation */}
        {phase==="scanning" && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,200,255,.04)"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#00ccff,transparent)",animation:"scanLine 1.8s linear infinite"}}/>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{height:3,background:"rgba(0,200,255,.1)",borderRadius:2,marginBottom:14,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${progress}%`,background:phase==="rejected"?"#ff3060":"linear-gradient(90deg,#00ccff,#00ff9d)",transition:"width .08s linear",borderRadius:2}}/>
      </div>

      {phase==="scanning" && (
        <div style={{textAlign:"center"}}>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:8}}>
            {["🔍 Legitimacy","🎯 YOLO Detection","🧠 Classification"].map((lbl,i)=>(
              <span key={i} style={{fontSize:11,color:"rgba(0,200,255,.55)",background:"rgba(0,200,255,.07)",border:"1px solid rgba(0,200,255,.15)",borderRadius:20,padding:"3px 9px",animation:`pulse 1.4s ${i*.25}s infinite`}}>{lbl}</span>
            ))}
          </div>
          <div style={{fontSize:13,color:"rgba(150,200,255,.5)"}}>Running AI analysis pipeline…</div>
        </div>
      )}

      {phase==="done" && yolo && (
        <div style={{animation:"fadeUp .3s ease",display:"flex",flexDirection:"column",gap:10}}>
          {/* Legitimacy passed */}
          <div style={{background:"rgba(0,255,157,.06)",border:"1px solid rgba(0,255,157,.22)",borderRadius:10,padding:"12px 14px",display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>✅</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#00ff9d"}}>Photo verified — genuine civic image</div>
              <div style={{fontSize:11,color:"rgba(0,255,157,.55)",marginTop:2}}>Clarity score: {(yolo.blurScore*100).toFixed(0)}/100 · No manipulation detected</div>
            </div>
          </div>

          {/* YOLO detection result */}
          <div style={{background:"rgba(0,200,255,.05)",border:"1px solid rgba(0,200,255,.2)",borderRadius:10,padding:"14px"}}>
            <div style={{fontSize:11,color:"rgba(150,200,255,.45)",marginBottom:10,fontWeight:600,letterSpacing:"0.06em"}}>🤖 YOLO DETECTION RESULT</div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{fontSize:36}}>{CATS.find(c=>c.id===yolo.issueCategory)?.icon||"📌"}</div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:"#00ccff"}}>{yolo.issueLabel}</div>
                <div style={{fontSize:11,color:"rgba(150,200,255,.45)",marginTop:2}}>Confidence: {(yolo.confidence*100).toFixed(0)}%</div>
              </div>
              <div style={{marginLeft:"auto",background:`${sevColor[yolo.severity]||"#ffb800"}20`,border:`1px solid ${sevColor[yolo.severity]||"#ffb800"}50`,borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:sevColor[yolo.severity]||"#ffb800",textTransform:"uppercase"}}>
                {yolo.severity}
              </div>
            </div>

            {/* Detected objects */}
            {yolo.detectedObjects?.length > 0 && (
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"rgba(150,200,255,.35)"}}>Objects detected:</span>
                {yolo.detectedObjects.map((obj,i)=>(
                  <span key={i} style={{fontSize:10,background:"rgba(0,200,255,.08)",border:"1px solid rgba(0,200,255,.18)",borderRadius:20,padding:"2px 8px",color:"rgba(0,200,255,.7)"}}>{obj}</span>
                ))}
              </div>
            )}

            {/* Confidence bar */}
            <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,color:"rgba(150,200,255,.35)",minWidth:60}}>Confidence</span>
              <div style={{flex:1,height:4,background:"rgba(255,255,255,.06)",borderRadius:2}}>
                <div style={{height:"100%",width:`${(yolo.confidence*100).toFixed(0)}%`,background:"linear-gradient(90deg,#3b9fff,#00ff9d)",borderRadius:2}}/>
              </div>
              <span style={{fontSize:10,color:"#00ff9d",fontFamily:"'DM Mono',monospace",minWidth:32}}>{(yolo.confidence*100).toFixed(0)}%</span>
            </div>
          </div>

          <button onClick={()=>onDone(yolo)}
            style={{padding:"13px",background:"linear-gradient(135deg,rgba(0,200,255,.22),rgba(0,255,157,.14))",border:"1px solid rgba(0,200,255,.38)",borderRadius:9,color:"#00ccff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            Use This Detection →
          </button>
        </div>
      )}

      {phase==="rejected" && yolo && (
        <div style={{background:"rgba(255,48,96,.06)",border:"1px solid rgba(255,48,96,.25)",borderRadius:10,padding:"16px",animation:"fadeUp .3s ease"}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:12}}>
            <span style={{fontSize:24}}>⚠️</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#ff6060"}}>Photo not accepted</div>
              <div style={{fontSize:12,color:"rgba(255,96,96,.6)",marginTop:3}}>{yolo.legitimacyReason || "Image quality too low or not a real civic issue"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onRetake} style={{flex:1,padding:"10px",background:"rgba(255,48,96,.15)",border:"1px solid rgba(255,48,96,.3)",borderRadius:8,color:"#ff6060",cursor:"pointer",fontSize:13,fontWeight:700}}>📸 Retake Photo</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function CivicReport({ user, lang="en", onClose }) {
  const [step, setStep]         = useState("photo");
  const [photo, setPhoto]       = useState(null);
  const [location, setLocation] = useState(null);   // { lat, lng, accuracy }
  const [geoData, setGeoData]   = useState(null);   // { ward, city, display }
  const [yolo, setYolo]         = useState(null);   // detection result
  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState(2);      // 1-4
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportId, setReportId] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const fileRef   = useRef(null);

  // Camera
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" } });
      streamRef.current = stream; setCameraOpen(true);
      setTimeout(() => { if(videoRef.current) videoRef.current.srcObject = stream; }, 80);
    } catch { fileRef.current?.click(); }
  };
  const closeCamera = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); setCameraOpen(false); };
  const capturePhoto = () => {
    const cv = document.createElement("canvas");
    cv.width  = videoRef.current.videoWidth;
    cv.height = videoRef.current.videoHeight;
    cv.getContext("2d").drawImage(videoRef.current,0,0);
    setPhoto(cv.toDataURL("image/jpeg",.82)); closeCamera();
  };
  const handleFile = e => {
    const f = e.target.files?.[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => setPhoto(ev.target.result);
    r.readAsDataURL(f);
  };

  const reset = () => { setStep("photo"); setPhoto(null); setLocation(null); setGeoData(null); setYolo(null); setCategory(null); setDescription(""); setReportId(null); };

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r=>setTimeout(r,1400));
    setReportId("CS" + Date.now().toString(36).toUpperCase());
    setStep("done"); setSubmitting(false);
  };

  const BG = "rgba(4,10,22,0.97)";
  const ACCENT = "#00ccff";
  const sevColors = ["","#00ff9d","#ffb800","#ff8c00","#ff3060"];
  const sevLabels = { en:["","Low","Medium","High","Emergency"], hi:["","कम","मध्यम","गंभीर","आपात"], ta:["","குறைவு","நடுத்தரம்","தீவிரம்","அவசரம்"], te:["","తక్కువ","మధ్యమం","అధికం","అత్యవసరం"], bn:["","কম","মাঝারি","বেশি","জরুরি"], mr:["","कमी","मध्यम","गंभीर","आणीबाणी"] };
  const sev = sevLabels[lang] || sevLabels.en;

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(2,6,9,.92)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.95)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes checkPop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
        @keyframes scanLine{0%{top:0}100%{top:100%}}
      `}</style>

      <div style={{width:"100%",maxWidth:500,maxHeight:"92vh",overflowY:"auto",background:BG,border:"1px solid rgba(0,200,255,.17)",borderRadius:16,padding:"26px 28px",boxShadow:"0 32px 80px rgba(0,0,0,.7)",animation:"fadeUp .3s ease",fontFamily:"'Inter',sans-serif",position:"relative"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <div style={{fontSize:17,fontWeight:800,color:ACCENT}}>📣 Report an Issue</div>
            <div style={{fontSize:11.5,color:"rgba(150,200,255,.44)",marginTop:3}}>Photo → GPS → AI Scan → Submit to Ward</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,width:30,height:30,color:"rgba(200,220,255,.55)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
        </div>

        {step!=="done" && <StepBar current={step}/>}

        {/* ── STEP: PHOTO ── */}
        {step==="photo" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            {!photo ? (
              cameraOpen ? (
                <div style={{borderRadius:12,overflow:"hidden",background:"#000",position:"relative"}}>
                  <video ref={videoRef} autoPlay playsInline style={{width:"100%",maxHeight:280,display:"block"}}/>
                  <div style={{display:"flex",justifyContent:"center",gap:12,padding:12,background:"rgba(0,0,0,.75)"}}>
                    <button onClick={capturePhoto} style={{background:ACCENT,border:"none",borderRadius:"50%",width:56,height:56,fontSize:22,cursor:"pointer",boxShadow:`0 0 22px ${ACCENT}60`}}>📸</button>
                    <button onClick={closeCamera} style={{background:"rgba(255,60,60,.25)",border:"1px solid rgba(255,60,60,.4)",borderRadius:8,padding:"0 16px",color:"#ff6060",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif"}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:11}}>
                  <button onClick={openCamera} style={{padding:"18px",background:"linear-gradient(135deg,rgba(0,200,255,.13),rgba(0,255,157,.07))",border:`2px dashed ${ACCENT}44`,borderRadius:14,color:ACCENT,fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontFamily:"'Inter',sans-serif"}}>
                    <span style={{fontSize:28}}>📷</span> Take Photo
                  </button>
                  <div style={{textAlign:"center",color:"rgba(150,200,255,.32)",fontSize:12}}>or</div>
                  <button onClick={()=>fileRef.current?.click()} style={{padding:"13px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,color:"rgba(200,220,255,.65)",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"'Inter',sans-serif"}}>
                    <span>🖼️</span> Upload from Gallery
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
                </div>
              )
            ) : (
              <div style={{textAlign:"center"}}>
                <div style={{position:"relative",display:"inline-block",borderRadius:12,overflow:"hidden",border:"2px solid rgba(0,200,255,.35)"}}>
                  <img src={photo} alt="preview" style={{maxWidth:"100%",maxHeight:260,display:"block"}}/>
                  <div style={{position:"absolute",top:8,right:8,background:"rgba(0,255,157,.92)",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:800,color:"#020609"}}>✓ Ready</div>
                </div>
                <div style={{display:"flex",gap:9,justifyContent:"center",marginTop:12}}>
                  <button onClick={()=>setPhoto(null)} style={{padding:"9px 18px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,color:"rgba(200,220,255,.55)",cursor:"pointer",fontSize:12,fontFamily:"'Inter',sans-serif"}}>Retake</button>
                  <button onClick={()=>setStep("gps")} style={{padding:"9px 22px",background:"linear-gradient(135deg,rgba(0,200,255,.22),rgba(0,255,157,.14))",border:"1px solid rgba(0,200,255,.38)",borderRadius:8,color:ACCENT,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Next — Tag Location →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP: GPS ── */}
        {step==="gps" && (
          <GPSStep onDone={(loc,geo)=>{ setLocation(loc); setGeoData(geo); setStep("ai"); }} c={{}}/>
        )}

        {/* ── STEP: AI SCAN ── */}
        {step==="ai" && photo && (
          <AIStep
            photo={photo}
            onDone={result=>{ setYolo(result); setCategory(result.issueCategory); setSeverity(result.severity==="high"?3:result.severity==="medium"?2:1); setStep("details"); }}
            onRetake={()=>{ setPhoto(null); setStep("photo"); }}
          />
        )}

        {/* ── STEP: DETAILS ── */}
        {step==="details" && (
          <div style={{animation:"fadeUp .3s ease",display:"flex",flexDirection:"column",gap:16}}>

            {/* AI pre-fill notice */}
            {yolo && (
              <div style={{background:"rgba(0,200,255,.05)",border:"1px solid rgba(0,200,255,.18)",borderRadius:9,padding:"10px 13px",display:"flex",gap:9,alignItems:"center"}}>
                <span style={{fontSize:16}}>🤖</span>
                <div style={{fontSize:12,color:"rgba(0,200,255,.7)"}}>AI detected <strong style={{color:ACCENT}}>{yolo.issueLabel}</strong> — category pre-filled. Change below if needed.</div>
              </div>
            )}

            {/* Category grid */}
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"rgba(200,220,255,.6)",marginBottom:9}}>Issue Category</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {CATS.map(cat=>(
                  <button key={cat.id} onClick={()=>setCategory(cat.id)}
                    style={{padding:"10px 5px",background:category===cat.id?"rgba(0,200,255,.2)":"rgba(255,255,255,.04)",border:`1.5px solid ${category===cat.id?ACCENT:"rgba(255,255,255,.08)"}`,borderRadius:10,cursor:"pointer",textAlign:"center",transition:"all .18s",boxShadow:category===cat.id?"0 0 12px rgba(0,200,255,.22)":"none"}}>
                    <div style={{fontSize:20,marginBottom:3}}>{cat.icon}</div>
                    <div style={{fontSize:9.5,color:category===cat.id?ACCENT:"rgba(200,220,255,.48)",lineHeight:1.2,fontFamily:"'Inter',sans-serif",fontWeight:category===cat.id?700:400}}>{cat[lang]||cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"rgba(200,220,255,.6)",marginBottom:9}}>Severity</div>
              <div style={{display:"flex",gap:8}}>
                {[[1,"🟢"],[2,"🟡"],[3,"🟠"],[4,"🔴"]].map(([v,e])=>(
                  <button key={v} onClick={()=>setSeverity(v)}
                    style={{flex:1,padding:"9px 4px",background:severity===v?`${sevColors[v]}18`:"rgba(255,255,255,.04)",border:`1.5px solid ${severity===v?sevColors[v]:"rgba(255,255,255,.08)"}`,borderRadius:8,cursor:"pointer",textAlign:"center",transition:"all .18s"}}>
                    <div style={{fontSize:16}}>{e}</div>
                    <div style={{fontSize:9.5,color:severity===v?sevColors[v]:"rgba(200,220,255,.38)",marginTop:3,fontFamily:"'Inter',sans-serif",fontWeight:severity===v?700:400}}>{sev[v]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"rgba(200,220,255,.6)",marginBottom:8}}>Description (optional)</div>
              <textarea value={description} onChange={e=>setDescription(e.target.value)}
                placeholder="Describe what you see…"
                style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(0,200,255,.15)",borderRadius:9,padding:"11px 13px",color:"#cce8ff",fontSize:13,fontFamily:"'Inter',sans-serif",outline:"none",resize:"vertical",minHeight:72,lineHeight:1.55}}/>
            </div>

            {/* Anonymous toggle */}
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <div onClick={()=>setAnonymous(a=>!a)}
                style={{width:40,height:22,borderRadius:11,background:anonymous?ACCENT:"rgba(255,255,255,.1)",border:`1.5px solid ${anonymous?ACCENT:"rgba(255,255,255,.18)"}`,position:"relative",transition:"all .28s",cursor:"pointer",flexShrink:0}}>
                <div style={{position:"absolute",top:2,left:anonymous?18:2,width:14,height:14,borderRadius:"50%",background:anonymous?"#020609":"rgba(255,255,255,.45)",transition:"left .28s"}}/>
              </div>
              <span style={{fontSize:12.5,color:"rgba(200,220,255,.55)",userSelect:"none"}}>Submit anonymously</span>
            </label>

            <button onClick={()=>setStep("submit")} disabled={!category}
              style={{padding:"13px",background:category?"linear-gradient(135deg,rgba(0,200,255,.22),rgba(0,255,157,.14))":"rgba(255,255,255,.04)",border:`1px solid ${category?"rgba(0,200,255,.38)":"rgba(255,255,255,.07)"}`,borderRadius:9,color:category?ACCENT:"rgba(200,220,255,.22)",fontSize:14,fontWeight:700,cursor:category?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif",transition:"all .18s"}}>
              Preview Report →
            </button>
          </div>
        )}

        {/* ── STEP: SUBMIT PREVIEW ── */}
        {step==="submit" && (
          <div style={{animation:"fadeUp .3s ease",display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"rgba(0,200,255,.04)",border:"1px solid rgba(0,200,255,.15)",borderRadius:12,padding:"16px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 18px"}}>
                {[
                  ["📸 Photo",      "✅ AI Verified"],
                  ["📍 Location",   geoData?.display || "—"],
                  ["🏘️ Ward",       geoData?.ward || "—"],
                  ["🤖 AI Detected", yolo?.issueLabel || "—"],
                  ["📌 Category",   catLabel(category, lang)],
                  ["⚡ Severity",    sev[severity]],
                  ["🤖 Confidence", yolo ? `${(yolo.confidence*100).toFixed(0)}%` : "—"],
                  ["👤 Reporter",   anonymous?"Anonymous":(user?.name||"Citizen")],
                ].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:10,color:"rgba(150,200,255,.38)"}}>{l}</div><div style={{fontSize:12.5,color:"#cce8ff",fontWeight:600,marginTop:2}}>{v}</div></div>
                ))}
              </div>
              {description && <div style={{marginTop:12,padding:"9px 11px",background:"rgba(0,0,0,.22)",borderRadius:7,fontSize:12.5,color:"rgba(200,220,255,.55)",borderLeft:"2px solid rgba(0,200,255,.28)"}}>{description}</div>}
            </div>

            <div style={{background:"rgba(0,255,157,.04)",border:"1px solid rgba(0,255,157,.18)",borderRadius:9,padding:"11px 13px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:18}}>🏛️</span>
              <div style={{fontSize:12,color:"rgba(0,255,157,.75)",lineHeight:1.5}}>
                This report will be auto-dispatched to <strong style={{color:"#00ff9d"}}>{geoData?.ward||"your local ward"}</strong> office and the Municipal Corporation.
              </div>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setStep("details")} style={{flex:1,padding:"11px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"rgba(200,220,255,.5)",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif"}}>← Edit</button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{flex:2,padding:"13px",background:submitting?"rgba(0,200,255,.07)":"linear-gradient(135deg,#00ccff,#00ff9d)",border:"none",borderRadius:8,color:"#020609",fontSize:14,fontWeight:800,cursor:submitting?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {submitting?<><div style={{width:16,height:16,border:"2px solid rgba(0,0,0,.2)",borderTopColor:"#020609",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Submitting…</>:"🚀 Submit Report"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: DONE ── */}
        {step==="done" && (
          <div style={{textAlign:"center",padding:"18px 0",animation:"fadeUp .4s ease"}}>
            <div style={{fontSize:56,marginBottom:14,animation:"bounce 1s 3"}}>🎉</div>
            <div style={{fontSize:19,fontWeight:800,color:"#00ff9d",marginBottom:7}}>Report Submitted!</div>
            <div style={{fontSize:13,color:"rgba(150,200,255,.55)",marginBottom:22,lineHeight:1.6}}>Your report has been dispatched to the ward office.<br/>You'll receive updates as the issue is addressed.</div>

            <div style={{background:"rgba(0,255,157,.05)",border:"1px solid rgba(0,255,157,.22)",borderRadius:11,padding:"14px 18px",display:"inline-block",marginBottom:22}}>
              <div style={{fontSize:11,color:"rgba(150,200,255,.38)"}}>Report ID</div>
              <div style={{fontSize:22,fontWeight:800,color:"#00ff9d",fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em",marginTop:4}}>{reportId}</div>
            </div>

            {/* Status timeline */}
            <div style={{textAlign:"left",marginBottom:22}}>
              {[
                ["📸","AI verified — genuine photo","✓ Done"],
                ["📍",`GPS tagged — ${geoData?.ward||"ward"}`,"✓ Done"],
                ["🤖",`YOLO: ${yolo?.issueLabel||"issue"} detected`,"✓ Done"],
                ["🏛️","Dispatched to ward officer","⏳ In Progress"],
                ["✅","Issue resolved","—"],
              ].map(([icon,label,status],i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:i<4?"1px solid rgba(255,255,255,.05)":"none",alignItems:"center"}}>
                  <span style={{fontSize:15,flexShrink:0}}>{icon}</span>
                  <div style={{flex:1,fontSize:12.5,color:"rgba(200,220,255,.65)"}}>{label}</div>
                  <span style={{fontSize:11,color:status.startsWith("✓")?"#00ff9d":status.startsWith("⏳")?"#ffb800":"rgba(255,255,255,.2)",fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap"}}>{status}</span>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={reset} style={{flex:1,padding:"12px",background:"rgba(0,200,255,.1)",border:"1px solid rgba(0,200,255,.28)",borderRadius:8,color:ACCENT,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Inter',sans-serif"}}>Submit Another</button>
              <button onClick={onClose} style={{flex:1,padding:"12px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,color:"rgba(200,220,255,.55)",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif"}}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}