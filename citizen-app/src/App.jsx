import { useState } from "react";
import CitizenLogin from "./CitizenLogin";
import CitizenHome  from "./CitizenHome";
import CitizenReport from "./CitizenReport";

// ═══════════════════════════════════════════════════════════
// CIVICSENTINEL — CITIZEN APP
// Completely separate from the admin/officer dashboard.
// Flow: Login → Home (My Reports + Report Button + Language)
//       Report modal overlays from anywhere
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser]               = useState(null);
  const [showReport, setShowReport]   = useState(false);
  const [initCategory, setInitCategory] = useState(null);

  const openReport = (cat = null) => { setInitCategory(cat); setShowReport(true); };
  const closeReport = ()          => { setShowReport(false); setInitCategory(null); };
  const logout = ()               => setUser(null);

  if (!user) return <CitizenLogin onAuth={setUser}/>;

  return (
    <>
      <CitizenHome user={user} onReport={openReport} onLogout={logout}/>
      {showReport && (
        <CitizenReport
          user={user}
          lang={user.lang || "en"}
          initialCategory={initCategory}
          onClose={closeReport}
        />
      )}
    </>
  );
}