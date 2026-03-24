import { useState, useEffect } from "react";
import { LANGS, tl } from "./translations";

const API = "https://civicsentinel-ai-1.onrender.com";

const STATUS_COLOR = {
  submitted:   { bg:"rgba(59,130,246,0.15)", border:"rgba(59,130,246,0.5)", text:"#93c5fd", dot:"#3b82f6" },
  in_progress: { bg:"rgba(245,158,11,0.15)", border:"rgba(245,158,11,0.5)", text:"#fcd34d", dot:"#f59e0b" },
  resolved:    { bg:"rgba(34,197,94,0.15)",  border:"rgba(34,197,94,0.5)",  text:"#86efac", dot:"#22c55e" },
  rejected:    { bg:"rgba(239,68,68,0.15)",  border:"rgba(239,68,68,0.5)",  text:"#fca5a5", dot:"#ef4444" },
};

export default function CitizenProfile({ user, onBack, onLogout, onUpdateUser }) {
  const lang  = user.lang || "en";
  const GREEN = "#22c55e";

  const [editing, setEditing]               = useState(false);
  const [editName, setEditName]             = useState(user.name || "");
  const [editLang, setEditLang]             = useState(lang);
  const [saved, setSaved]                   = useState(false);
  const [reports, setReports]               = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    if (user.guest) return;
    setReportsLoading(true);
    fetch(`${API}/events`)
      .then(r => r.json())
      .then(d => {
        const all = Array.isArray(d) ? d : (d.events || []);
        setReports(all.slice(0, 15));
      })
      .catch(() => setReports([]))
      .finally(() => setReportsLoading(false));
  }, [user.uid, user.guest]);

  const avatarLetters = (user.name || "G").slice(0, 2).toUpperCase();

  const handleSave = () => {
    const updated = {
      ...user,
      name:   editName.trim() || user.name,
      lang:   editLang,
      avatar: (editName.trim() || user.name).slice(0, 2).toUpperCase(),
    };
    onUpdateUser(updated);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#020609",
      fontFamily:"'Inter',sans-serif", color:"#e2e8f0",
      display:"flex", flexDirection:"column",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"16px 20px", borderBottom:"1px solid rgba(34,197,94,0.15)",
        background:"rgba(0,0,0,0.4)", backdropFilter:"blur(12px)",
        position:"sticky", top:0, zIndex:100,
      }}>
        <button onClick={onBack} style={{
          background:"none", border:"1px solid rgba(34,197,94,0.3)",
          color:GREEN, borderRadius:8, padding:"7px 14px",
          fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6,
        }}>
          ← {tl(lang,"back")}
        </button>
        <span style={{ fontSize:16, fontWeight:700, color:"#fff" }}>
          {tl(lang,"profile")}
        </span>
        {!editing ? (
          <button onClick={() => setEditing(true)} style={{
            background:"none", border:"1px solid rgba(34,197,94,0.3)",
            color:GREEN, borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer",
          }}>
            ✏️ {tl(lang,"editProfile")}
          </button>
        ) : (
          <button onClick={() => setEditing(false)} style={{
            background:"none", border:"1px solid rgba(239,68,68,0.3)",
            color:"#f87171", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer",
          }}>
            {tl(lang,"cancel")}
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 40px", maxWidth:480, margin:"0 auto", width:"100%" }}>

        {/* Avatar + Info */}
        <div style={{
          background:"rgba(255,255,255,0.04)", border:"1px solid rgba(34,197,94,0.2)",
          borderRadius:16, padding:"28px 20px", textAlign:"center", marginBottom:20, position:"relative",
        }}>
          <div style={{
            width:80, height:80, borderRadius:"50%",
            background:`linear-gradient(135deg,${GREEN}33,${GREEN}88)`,
            border:`3px solid ${GREEN}`, display:"flex", alignItems:"center",
            justifyContent:"center", margin:"0 auto 14px",
            fontSize:28, fontWeight:800, color:"#fff", boxShadow:`0 0 24px ${GREEN}44`,
          }}>
            {avatarLetters}
          </div>

          {user.guest ? (
            <div style={{ fontSize:11, color:"#94a3b8", marginBottom:8 }}>👤 {tl(lang,"guestUser")}</div>
          ) : (
            <div style={{ fontSize:11, color:GREEN, marginBottom:4 }}>
              {user.provider === "google" ? tl(lang,"accountType_google") : tl(lang,"accountType_email")}
            </div>
          )}

          {editing ? (
            <input value={editName} onChange={e => setEditName(e.target.value)}
              placeholder={tl(lang,"fullName")}
              style={{
                background:"rgba(255,255,255,0.07)", border:`1.5px solid ${GREEN}55`,
                borderRadius:9, padding:"10px 14px", color:"#fff", fontSize:16,
                fontWeight:700, textAlign:"center", outline:"none", width:"100%",
                fontFamily:"'Inter',sans-serif", marginBottom:8,
              }}
            />
          ) : (
            <div style={{ fontSize:22, fontWeight:800, color:"#fff", marginBottom:4 }}>{user.name}</div>
          )}

          <div style={{ fontSize:13, color:"#94a3b8" }}>
            {user.guest ? tl(lang,"guestNote") : user.email}
          </div>

          {user.joinedAt && !user.guest && (
            <div style={{ fontSize:11, color:"#64748b", marginTop:8 }}>
              {tl(lang,"memberSince")}: {new Date(user.joinedAt).toLocaleDateString("en-IN",{year:"numeric",month:"long",day:"numeric"})}
            </div>
          )}

          {saved && (
            <div style={{
              position:"absolute", top:12, right:12,
              background:"rgba(34,197,94,0.2)", border:"1px solid #22c55e",
              borderRadius:8, padding:"4px 10px", fontSize:12, color:GREEN,
            }}>
              ✓ {tl(lang,"savedSuccess")}
            </div>
          )}
        </div>

        {/* Language */}
        <div style={{
          background:"rgba(255,255,255,0.04)", border:"1px solid rgba(34,197,94,0.15)",
          borderRadius:14, padding:"16px 18px", marginBottom:20,
        }}>
          <div style={{ fontSize:12, color:"#64748b", marginBottom:10, letterSpacing:1, textTransform:"uppercase" }}>
            {tl(lang,"language")}
          </div>
          {editing ? (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => setEditLang(l.code)} style={{
                  padding:"8px 14px", borderRadius:8, fontSize:13, cursor:"pointer",
                  border:`1.5px solid ${editLang===l.code ? GREEN : "rgba(255,255,255,0.1)"}`,
                  background: editLang===l.code ? `${GREEN}22` : "transparent",
                  color: editLang===l.code ? GREEN : "#94a3b8",
                  fontWeight: editLang===l.code ? 700 : 400,
                }}>
                  {l.flag} {l.native}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:22 }}>{LANGS.find(l => l.code===(user.lang||"en"))?.flag}</span>
              <span style={{ fontSize:15, fontWeight:600, color:"#e2e8f0" }}>{LANGS.find(l => l.code===(user.lang||"en"))?.native}</span>
            </div>
          )}
        </div>

        {/* Save button */}
        {editing && (
          <button onClick={handleSave} style={{
            width:"100%", padding:"14px", borderRadius:12, fontSize:15, fontWeight:700,
            background:`linear-gradient(135deg,${GREEN},#16a34a)`,
            color:"#fff", border:"none", cursor:"pointer", marginBottom:20,
            boxShadow:`0 4px 20px ${GREEN}44`,
          }}>
            ✓ {tl(lang,"save")} Changes
          </button>
        )}

        {/* My Reports */}
        <div style={{
          background:"rgba(255,255,255,0.04)", border:"1px solid rgba(34,197,94,0.15)",
          borderRadius:14, padding:"16px 18px", marginBottom:20,
        }}>
          <div style={{ fontSize:12, color:"#64748b", marginBottom:14, letterSpacing:1, textTransform:"uppercase" }}>
            {tl(lang,"myComplaints")} ({reports.length})
          </div>

          {reportsLoading ? (
            <div style={{ textAlign:"center", padding:"24px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <div style={{ width:24, height:24, border:"2px solid rgba(34,197,94,.2)", borderTopColor:GREEN, borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
              <span style={{ fontSize:13, color:"rgba(134,239,172,.4)" }}>Loading...</span>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign:"center", color:"#475569", fontSize:14, padding:"20px 0" }}>
              {tl(lang,"noComplaints")}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {reports.map((r, i) => {
                const status = r.status || "submitted";
                const sc     = STATUS_COLOR[status] || STATUS_COLOR.submitted;
                const issue  = r.issue || r.text || "Civic Issue";
                const loc    = r.location || r.city || "—";
                const date   = r.created_at
                  ? new Date(r.created_at).toLocaleDateString("en-IN")
                  : r.date || "Recent";
                const rid    = r.id || r._id || r.report_id || `CS${i}`;
                return (
                  <div key={rid} style={{
                    background:sc.bg, border:`1px solid ${sc.border}`,
                    borderRadius:10, padding:"12px 14px",
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0", flex:1, marginRight:8 }}>
                        {issue}
                      </div>
                      <div style={{
                        display:"flex", alignItems:"center", gap:5,
                        background:sc.bg, border:`1px solid ${sc.border}`,
                        borderRadius:20, padding:"2px 8px", whiteSpace:"nowrap",
                      }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:sc.dot }}/>
                        <span style={{ fontSize:11, color:sc.text, fontWeight:600 }}>
                          {tl(lang,"status_"+status)}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:"#64748b", display:"flex", gap:12 }}>
                      <span>📍 {loc}</span>
                      <span>🗓 {date}</span>
                    </div>
                    <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>
                      #{rid} · {r.ward || loc}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats */}
        {!user.guest && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
            {[
              { label:tl(lang,"total"),    value:reports.length,                                     color:"#60a5fa" },
              { label:tl(lang,"resolved"), value:reports.filter(r=>r.status==="resolved").length,    color:GREEN },
              { label:tl(lang,"pending"),  value:reports.filter(r=>r.status!=="resolved").length,    color:"#fbbf24" },
            ].map(s => (
              <div key={s.label} style={{
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:12, padding:"14px", textAlign:"center",
              }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Logout */}
        <button onClick={onLogout} style={{
          width:"100%", padding:"14px", borderRadius:12, fontSize:15, fontWeight:700,
          background:"rgba(239,68,68,0.1)", color:"#f87171",
          border:"1px solid rgba(239,68,68,0.3)", cursor:"pointer", transition:"all .2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background="rgba(239,68,68,0.1)"; }}
        >
          🚪 {tl(lang,"logout")}
        </button>

      </div>
    </div>
  );
}