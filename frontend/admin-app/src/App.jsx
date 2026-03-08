import { useState } from "react";
import OfficerLogin     from "./OfficerLogin";
import OfficerDashboard from "./OfficerDashboard";

export default function App() {
  const [officer, setOfficer] = useState(null);

  if (!officer) return <OfficerLogin onAuth={setOfficer}/>;

  return (
    <OfficerDashboard
      user={officer}
      onLogout={()=>setOfficer(null)}
    />
  );
}