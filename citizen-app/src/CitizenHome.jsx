import { useState, useEffect, useCallback } from "react";
import { LANGS, tl } from "./translations";

// ═══════════════════════════════════════════════════════════
// CITIZEN HOME — Report button + My Reports + Language picker
// FIX: Removed MOCK_REPORTS. My Reports now fetches from
//      /my-reports?user_id=<firebase_uid> — user-scoped only.
// ═══════════════════════════════════════════════════════════

const API = "https://civicsentinel-ai-1-z7io.onrender.com";

const STATUS_COLOR = {
  submitted:   "#3b82f6",
  in_review:   "#8b5cf6",
  in_progress: "#f97316",
  resolved:    "#22c55e",
  rejected:    "#ef4444",
};

const ISSUE_ICONS = {
  water:         "💧",
  road:          "🚧",
  electricity:   "⚡",
  garbage:       "🗑️",
  encroachment:  "🏗️",
  crime:         "🚨",
  health:        "🏥",
  other:         "📌",
};

// ─── Language modal ────────────────────────────────────────
function LangModal({ current, onChange, onClose, lang = "en" }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:500,background:"rgba(2,8,4,.9)",backdropFilter:"blur(10px)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:16 }}>
      <div style={{ width:"100%",maxWidth:420,background:"rgba(4,20,10,.98)",border:"1px solid rgba(34,197,94,.18)",borderRadius:"20px 20px 14px 14px",overflow:"hidden",boxShadow:"0 -20px 60px rgba(0,0,0,.6)" }}>
        <div style={{ padding:"16px 20px 10px",borderBottom:"1px solid rgba(34,197,94,.1)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ fontSize:15,fontWeight:800,color:"#22c55e" }}>🌐 {tl(lang,"selectLang")}</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,width:28,height:28,color:"rgba(187,247,208,.55)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => onChange(l.code)}
              style={{ padding:"13px 12px",background:current===l.code?"rgba(34,197,94,.18)":"rgba(255,255,255,.04)",border:`2px solid ${current===l.code?"#22c55e":"rgba(255,255,255,.08)"}`,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .18s" }}>
              <span style={{ fontSize:22 }}>{l.flag}</span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:14,fontWeight:700,color:current===l.code?"#22c55e":"#d1fae5",fontFamily:"'Inter',sans-serif" }}>{l.native}</div>
                {current === l.code && <div style={{ fontSize:9,color:"#22c55e",marginTop:1 }}>✓ selected</div>}
              </div>
            </button>
          ))}
        </div>
        <div style={{ padding:"6px 12px 14px" }}>
          <button onClick={onClose} style={{ width:"100%",padding:"12px",background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.28)",borderRadius:10,color:"#22c55e",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif" }}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────
export default function CitizenHome({ user, onReport, onLogout, onProfile, onLangChange }) {
  const [lang, setLang]               = useState(user.lang || "en");
  const [showLangModal, setShowLangModal] = useState(false);
  const [tab, setTab]                 = useState("report");
  const [alerts, setAlerts]           = useState([]);
  const [connected, setConnected]     = useState(false);

  // ── My Reports state (replaces MOCK_REPORTS) ──
  const [myReports, setMyReports]         = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError]   = useState(false);

  const GREEN = "#22c55e";
  const li    = LANGS.find(l => l.code === lang) || LANGS[0];

  const changeLang = (code) => {
    setLang(code);
    if (onLangChange) onLangChange(code);
  };

  // ── Fetch alerts on mount ──
  useEffect(() => {
    fetch(API + "/alerts")
      .then(r => r.json())
      .then(d => { setAlerts(d.alerts || d || []); setConnected(true); })
      .catch(() => setConnected(false));
  }, []);

  // ── Fetch MY reports whenever the tab becomes active ──
  //    Only fires when user is authenticated (uid exists).
  //    Re-fires every time user switches back to myreports tab
  //    so new submissions show up immediately.
  useEffect(() => {
    if (tab !== "myreports") return;
    if (!user?.uid || user?.guest) {
      setMyReports([]);
      return;
    }

    setReportsLoading(true);
    setReportsError(false);

    fetch(`${API}/my-reports?user_id=${encodeURIComponent(user.uid)}`)
      .then(r => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then(d => {
        setMyReports(d.reports || []);
      })
      .catch(() => {
        setReportsError(true);
        setMyReports([]);
      })
      .finally(() => setReportsLoading(false));
  }, [tab, user?.uid]);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12
      ? tl(lang, "greeting_morning")
      : h < 17
      ? tl(lang, "greeting_afternoon")
      : tl(lang, "greeting_evening");
  };

  const progressPct = (s) => {
    if (s === "resolved") return 100;
    if (s === "in_progress") return 70;
    if (s === "in_review") return 40;
    if (s === "submitted") return 15;
    return 0; // rejected or unknown
  };

  // Helper: format ISO timestamp → human date
  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      const d   = new Date(iso);
      const now = new Date();
      const diffMs  = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr  = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr  / 24);
      if (diffMin < 2)  return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr  < 24) return `${diffHr}h ago`;
      if (diffDay === 1) return "Yesterday";
      if (diffDay < 7)  return `${diffDay} days ago`;
      return d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
    } catch { return iso.slice(0, 10); }
  };

  return (
    <div style={{ minHeight:"100vh",background:"#020c06",fontFamily:"'Inter',sans-serif",paddingBottom:80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#020c06;-webkit-font-smoothing:antialiased;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ background:"rgba(2,8,4,.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(34,197,94,.1)",padding:"0 16px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ fontSize:22 }}>🏛</div>
          <div>
            <div style={{ fontSize:14,fontWeight:800,color:GREEN,letterSpacing:"0.03em" }}>CivicSentinel</div>
            <div style={{ fontSize:10,color:"rgba(134,239,172,.35)",display:"flex",alignItems:"center",gap:4 }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:connected?GREEN:"#ef4444",display:"inline-block",animation:"pulse 2s infinite" }}/>
              {connected ? "Live" : "Connecting…"}
            </div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          {/* Language */}
          <button onClick={() => setShowLangModal(true)}
            style={{ display:"flex",alignItems:"center",gap:7,background:"rgba(34,197,94,.1)",border:"1.5px solid rgba(34,197,94,.28)",borderRadius:9,padding:"6px 11px",cursor:"pointer",transition:"all .18s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,.1)"}>
            <span style={{ fontSize:17 }}>{li.flag}</span>
            <span style={{ fontSize:12,fontWeight:700,color:GREEN,fontFamily:"'Inter',sans-serif" }}>{li.native}</span>
          </button>
          {/* Profile */}
          <button onClick={onProfile}
            style={{ background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.25)",borderRadius:8,padding:"6px 11px",color:"#86efac",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'Inter',sans-serif",transition:"all .18s",display:"flex",alignItems:"center",gap:5 }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,.16)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,.08)"}>
            <span style={{ width:22,height:22,borderRadius:"50%",background:"rgba(34,197,94,.3)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#22c55e" }}>
              {(user.name || "G").slice(0, 1).toUpperCase()}
            </span>
            {user.name ? user.name.split(" ")[0] : "Profile"}
          </button>
          {/* Logout */}
          <button onClick={onLogout}
            style={{ background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"6px 11px",color:"rgba(252,165,165,.65)",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'Inter',sans-serif",transition:"all .18s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.16)"; e.currentTarget.style.color = "#fca5a5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,.08)"; e.currentTarget.style.color = "rgba(252,165,165,.65)"; }}>
            {tl(lang, "logout")}
          </button>
        </div>
      </div>

      <div style={{ padding:"18px 16px 0",maxWidth:500,margin:"0 auto" }}>

        {/* ── GUEST BANNER ── */}
        {user.guest && (
          <div style={{ background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.22)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12.5,color:"rgba(253,230,138,.75)",display:"flex",gap:8,alignItems:"center" }}>
            <span style={{ fontSize:16 }}>⚠️</span>{tl(lang, "guestBanner")}
          </div>
        )}

        {/* ── ALERTS BANNER ── */}
        {alerts.length > 0 && (
          <div style={{ background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.22)",borderLeft:"3px solid #ef4444",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12.5,color:"rgba(252,165,165,.8)",display:"flex",gap:8,alignItems:"center" }}>
            <span>{tl(lang, "alertsBanner")} ({alerts.length})</span>
          </div>
        )}

        {/* ── GREETING ── */}
        <div style={{ marginBottom:20,animation:"fadeUp .35s ease" }}>
          <div style={{ fontSize:18,fontWeight:700,color:"rgba(187,247,208,.88)" }}>
            {greeting()}{user.name && !user.guest ? `, ${user.name.split(" ")[0]}` : ""}! 👋
          </div>
          <div style={{ fontSize:12,color:"rgba(134,239,172,.4)",marginTop:3 }}>{tl(lang, "tagline")}</div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:"flex",background:"rgba(0,0,0,.3)",borderRadius:10,padding:4,marginBottom:20 }}>
          {[["report","📣 " + tl(lang,"reportBtn")], ["myreports","📋 " + tl(lang,"myReports")]].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1,padding:"10px",borderRadius:7,border:"none",background:tab===id?"rgba(34,197,94,.18)":"transparent",color:tab===id?GREEN:"rgba(134,239,172,.38)",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all .2s" }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ══ TAB: REPORT ══ */}
        {tab === "report" && (
          <div style={{ animation:"fadeUp .3s ease",display:"flex",flexDirection:"column",gap:14 }}>
            {/* Big report button */}
            <button onClick={() => !user.guest && onReport()}
              disabled={!!user.guest}
              style={{ padding:"24px 22px",background:user.guest?"rgba(34,197,94,.04)":"linear-gradient(135deg,rgba(34,197,94,.2),rgba(34,197,94,.12))",border:`2px solid ${user.guest?"rgba(34,197,94,.12)":"rgba(34,197,94,.42)"}`,borderRadius:20,cursor:user.guest?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:16,width:"100%",transition:"all .12s",boxShadow:user.guest?"none":"0 0 28px rgba(34,197,94,.12)",opacity:user.guest?.55:1 }}
              onPointerDown={e => !user.guest && (e.currentTarget.style.transform = "scale(.97)")}
              onPointerUp={e   => e.currentTarget.style.transform = "scale(1)"}
              onPointerLeave={e => e.currentTarget.style.transform = "scale(1)"}>
              <div style={{ fontSize:46,flexShrink:0 }}>📸</div>
              <div style={{ textAlign:"left",flex:1 }}>
                <div style={{ fontSize:18,fontWeight:800,color:GREEN,lineHeight:1.2 }}>{tl(lang,"reportBtn")}</div>
                <div style={{ fontSize:12,color:"rgba(34,197,94,.55)",marginTop:5,lineHeight:1.5 }}>{tl(lang,"reportSub")}</div>
              </div>
              {!user.guest && <div style={{ fontSize:24,color:"rgba(34,197,94,.4)" }}>›</div>}
            </button>

            {/* Quick issue shortcuts */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
              {[["💧","water","#3b82f6"],["🚧","road","#f97316"],["⚡","electricity","#eab308"],["🗑️","garbage","#22c55e"],["🚨","crime","#ef4444"],["🏥","health","#a855f7"]].map(([icon,cat,col]) => (
                <button key={cat} onClick={() => !user.guest && onReport(cat)} disabled={!!user.guest}
                  style={{ padding:"14px 8px",background:`${col}0d`,border:`1.5px solid ${col}28`,borderRadius:14,cursor:user.guest?"not-allowed":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:user.guest?.5:1,transition:"all .15s" }}
                  onPointerDown={e => !user.guest && (e.currentTarget.style.transform = "scale(.93)")}
                  onPointerUp={e   => e.currentTarget.style.transform = "scale(1)"}
                  onPointerLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                  <span style={{ fontSize:28 }}>{icon}</span>
                  <span style={{ fontSize:10.5,color:`${col}`,fontWeight:600,fontFamily:"'Inter',sans-serif",textTransform:"capitalize" }}>{cat}</span>
                </button>
              ))}
            </div>

            {/* Emergency strip */}
            <a href="tel:112" style={{ textDecoration:"none" }}>
              <div style={{ background:"rgba(239,68,68,.1)",border:"2px solid rgba(239,68,68,.32)",borderRadius:14,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,marginTop:4 }}>
                <span style={{ fontSize:26 }}>🚨</span>
                <div style={{ fontSize:14,fontWeight:800,color:"#ef4444" }}>{tl(lang,"emergency")}</div>
                <div style={{ marginLeft:"auto",fontSize:22,color:"rgba(239,68,68,.4)" }}>›</div>
              </div>
            </a>
          </div>
        )}

        {/* ══ TAB: MY REPORTS ══ */}
        {tab === "myreports" && (
          <div style={{ animation:"fadeUp .3s ease" }}>

            {/* Header row */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div style={{ fontSize:11,color:"rgba(134,239,172,.35)" }}>
                {!reportsLoading && !reportsError && myReports.length > 0
                  ? `${myReports.length} report${myReports.length > 1 ? "s" : ""} found`
                  : ""}
              </div>
              <button onClick={() => !user.guest && onReport()} disabled={!!user.guest}
                style={{ padding:"9px 16px",background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.3)",borderRadius:9,color:GREEN,fontSize:13,fontWeight:700,cursor:user.guest?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",opacity:user.guest?.5:1 }}>
                {tl(lang,"newReport")}
              </button>
            </div>

            {/* Guest can't have reports */}
            {user.guest && (
              <div style={{ textAlign:"center",padding:"48px 20px",color:"rgba(134,239,172,.38)",fontSize:14,lineHeight:1.7 }}>
                <div style={{ fontSize:36,marginBottom:12 }}>🔒</div>
                <div>Sign in to track your reports</div>
              </div>
            )}

            {/* Loading skeleton */}
            {!user.guest && reportsLoading && (
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height:110,borderRadius:14,background:"rgba(34,197,94,.04)",border:"1px solid rgba(34,197,94,.08)",overflow:"hidden",position:"relative" }}>
                    <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(34,197,94,.06),transparent)",backgroundSize:"400px 100%",animation:"shimmer 1.4s infinite" }}/>
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {!user.guest && !reportsLoading && reportsError && (
              <div style={{ textAlign:"center",padding:"40px 20px",color:"rgba(239,68,68,.6)",fontSize:13,lineHeight:1.7 }}>
                <div style={{ fontSize:32,marginBottom:10 }}>⚠️</div>
                <div>Could not load your reports.</div>
                <button
                  onClick={() => setTab("report") || setTimeout(() => setTab("myreports"), 50)}
                  style={{ marginTop:12,padding:"8px 18px",background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.25)",borderRadius:8,color:GREEN,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif" }}>
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!user.guest && !reportsLoading && !reportsError && myReports.length === 0 && (
              <div style={{ textAlign:"center",padding:"60px 20px",color:"rgba(134,239,172,.38)",fontSize:14,lineHeight:1.7,animation:"fadeUp .5s ease" }}>
                <div style={{ fontSize:60,marginBottom:20,filter:"drop-shadow(0 0 10px rgba(34,197,94,0.2))" }}>📭</div>
                <div style={{ fontSize:16,fontWeight:700,color:"#d1fae5",marginBottom:4 }}>Everything's clear!</div>
                <div style={{ fontSize:13 }}>You haven't submitted any reports yet.</div>
                <button onClick={() => setTab("report")}
                  style={{ marginTop:24,padding:"12px 28px",background:"rgba(34,197,94,.12)",border:"2px solid rgba(34,197,94,.3)",borderRadius:12,color:GREEN,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'Inter',sans-serif",boxShadow:"0 4px 15px rgba(0,0,0,.3)" }}>
                  Submit Your First Report →
                </button>
              </div>
            )}

            {/* Report cards */}
            {!user.guest && !reportsLoading && !reportsError && myReports.length > 0 && (
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {myReports.map((r, i) => {
                  const id = r.report_id || r.id || i;
                  return (
                    <div key={id}
                      style={{
                        background:"rgba(4,24,12,.95)",
                        border:"1px solid rgba(34,197,94,.12)",
                        borderLeft:`4px solid ${sc}`,
                        borderRadius:16,
                        padding:"18px",
                        position:"relative",
                        overflow:"hidden",
                        transition:"all .25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        animation:`fadeUp .4s ease ${i * .07}s both`,
                        cursor:"pointer"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.borderColor = `${sc}50`;
                        e.currentTarget.style.boxShadow = `0 12px 30px rgba(0,0,0,0.5), 0 0 15px ${sc}15`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = "rgba(34,197,94,.12)";
                        e.currentTarget.style.boxShadow = "none";
                      }}>

                      {/* Status Badge + Icon */}
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <div style={{ width:36,height:36,borderRadius:10,background:`${sc}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:`1px solid ${sc}30` }}>
                            {ISSUE_ICONS[r.issue] || "📌"}
                          </div>
                          <div>
                            <div style={{ fontSize:14,fontWeight:800,color:"#fff",textTransform:"uppercase",letterSpacing:"0.03em" }}>{r.issue || "CIVIC ISSUE"}</div>
                            <div style={{ fontSize:10,color:"rgba(134,239,172,.35)",fontFamily:"'DM Mono',monospace" }}>#{id}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:11,fontWeight:900,color:sc,background:`${sc}12`,padding:"4px 12px",borderRadius:20,border:`1px solid ${sc}40`,textTransform:"uppercase" }}>
                            {tl(lang, "status_" + r.status) || r.status.replace("_"," ")}
                          </div>
                        </div>
                      </div>

                      {/* Description Text */}
                      <div style={{ fontSize:13,color:"rgba(187,247,208,.75)",marginBottom:14,lineHeight:1.55,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
                        {r.text || r.desc || "No detailed description provided."}
                      </div>

                      {/* Location & Time Info */}
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,background:"rgba(0,0,0,0.25)",padding:10,borderRadius:10,marginBottom:14 }}>
                        <div>
                          <div style={{ fontSize:9,color:"rgba(34,197,94,.4)",fontWeight:700,letterSpacing:"0.05em" }}>LOCATION</div>
                          <div style={{ fontSize:11,color:"#d1fae5",fontWeight:600,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{r.ward || r.location || "City Ward"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:9,color:"rgba(34,197,94,.4)",fontWeight:700,letterSpacing:"0.05em" }}>LAST UPDATE</div>
                          <div style={{ fontSize:11,color:"#d1fae5",fontWeight:600,marginTop:2 }}>{formatDate(r.timestamp || r.date)}</div>
                        </div>
                      </div>

                      {/* Premium Progress Bar */}
                      <div style={{ position:"relative",height:6,background:"rgba(255,255,255,.05)",borderRadius:3,overflow:"hidden" }}>
                        <div style={{
                          height:"100%",
                          width:`${pct}%`,
                          background: r.status === "rejected" ? "#ef4444" : `linear-gradient(90deg, ${sc}dd, ${sc})`,
                          borderRadius:3,
                          transition:"width 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                          boxShadow:`0 0 10px ${sc}40`
                        }}/>
                        {/* Shimmer effect on progress bar */}
                        {r.status !== "resolved" && r.status !== "rejected" && (
                          <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)",backgroundSize:"100px 100%",animation:"shimmer 2s infinite" }}/>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lang modal */}
      {showLangModal && (
        <LangModal
          current={lang}
          onChange={c => { changeLang(c); setShowLangModal(false); }}
          onClose={() => setShowLangModal(false)}
          lang={lang}
        />
      )}
    </div>
  );
}
