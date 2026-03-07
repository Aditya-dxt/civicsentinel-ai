import { useState } from "react";
import CivicLogin from "./CivicLogin";
import CivicReport from "./CivicReport";
import CivicSentinelDashboard from "./CivicSentinelUltra";

// ══════════════════════════════════════════════════════════════════════════════
// CIVICSENTINEL — MASTER APP  v3
// Flow: Login → Dashboard (unified, sidebar nav)
//       No more mode-select screen — one app for everyone
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [screen, setScreen]         = useState("login");
  const [user, setUser]             = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportCategory, setReportCategory] = useState(null);

  const handleAuth = (userData) => {
    setUser(userData);
    setScreen("dashboard");
  };

  const handleReport = (category = null) => {
    if (user?.mode === "guest") {
      // guests see a prompt to sign in — handled inside CivicReport gracefully
    }
    setReportCategory(category);
    setShowReport(true);
  };

  const handleLogout = () => {
    setUser(null);
    setScreen("login");
  };

  return (
    <>
      {screen === "login" && (
        <CivicLogin onAuth={handleAuth}/>
      )}

      {screen === "dashboard" && (
        <CivicSentinelDashboard
          user={user}
          onReport={handleReport}
          onLogout={handleLogout}
        />
      )}

      {showReport && (
        <CivicReport
          user={user}
          lang={user?.lang || "en"}
          initialCategory={reportCategory}
          onClose={() => { setShowReport(false); setReportCategory(null); }}
        />
      )}
    </>
  );
}