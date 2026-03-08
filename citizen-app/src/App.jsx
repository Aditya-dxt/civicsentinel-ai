import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import CitizenLogin   from "./CitizenLogin";
import CitizenHome    from "./CitizenHome";
import CitizenReport  from "./CitizenReport";
import CitizenProfile from "./CitizenProfile";

export default function App() {
  const [user, setUser]                 = useState(undefined); // undefined = loading
  const [showReport, setShowReport]     = useState(false);
  const [initCategory, setInitCategory] = useState(null);
  const [page, setPage]                 = useState("home");
  const [lang, setLang]                 = useState("en");

  // Firebase persistent session — fires on every app load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const userLang = localStorage.getItem(`cs_lang_${fbUser.uid}`) || "en";
        setLang(userLang);
        setUser({
          uid:      fbUser.uid,
          name:     fbUser.displayName || fbUser.email.split("@")[0],
          email:    fbUser.email,
          lang:     userLang,
          role:     "citizen",
          provider: fbUser.providerData[0]?.providerId || "email",
          guest:    false,
          avatar:   (fbUser.displayName || fbUser.email).slice(0,2).toUpperCase(),
          joinedAt: fbUser.metadata.creationTime,
        });
      } else {
        setUser(null);
      }
    });
    return () => unsub();
  }, []);

  const handleAuth = (userData) => {
    // Guest doesn't go through Firebase
    setUser(userData);
    setPage("home");
  };

  const logout = async () => {
    if (!user?.guest) await signOut(auth);
    setUser(null);
    setPage("home");
  };

  const updateUser = (updated) => {
    setUser(updated);
    // Save language preference per user
    if (updated.uid) {
      localStorage.setItem(`cs_lang_${updated.uid}`, updated.lang);
    }
  };

  const openReport  = (cat = null) => { setInitCategory(cat); setShowReport(true); };
  const closeReport = ()           => { setShowReport(false); setInitCategory(null); };

  // Loading splash
  if (user === undefined) return (
    <div style={{ minHeight:"100vh", background:"#020609", display:"flex",
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:36 }}>🛡️</div>
      <div style={{ width:32, height:32, border:"3px solid rgba(34,197,94,.2)",
        borderTopColor:"#22c55e", borderRadius:"50%",
        animation:"spin .7s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ color:"rgba(34,197,94,.5)", fontSize:12, fontFamily:"'Inter',sans-serif" }}>
        Loading CivicSentinel...
      </div>
    </div>
  );

  if (!user) return <CitizenLogin onAuth={handleAuth}/>;

  return (
    <>
      {page === "home" && (
        <CitizenHome
          user={user}
          onReport={openReport}
          onLogout={logout}
          onProfile={() => setPage("profile")}
          onLangChange={setLang}
        />
      )}
      {page === "profile" && (
        <CitizenProfile
          user={user}
          onBack={() => setPage("home")}
          onLogout={logout}
          onUpdateUser={updateUser}
        />
      )}
      {showReport && (
        <CitizenReport
          user={user}
          lang={lang}
          initialCategory={initCategory}
          onClose={closeReport}
        />
      )}
    </>
  );
}