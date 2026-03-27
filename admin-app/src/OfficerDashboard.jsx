import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Cell
} from "recharts";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════
const API = "https://civicsentinel-ai-1-z7io.onrender.com";
const POLL_MS = 8000;

// ══════════════════════════════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════════════════════════════
const Ctx = createContext({});
const useT = () => useContext(Ctx);

const DARK = {
  id:"dark", bg:"#020609",
  bgGrad:"radial-gradient(ellipse 100% 55% at 50% -8%, rgba(0,90,200,0.18) 0%, transparent 65%)",
  nav:"rgba(2,6,9,0.92)", panel:"rgba(4,10,22,0.8)", panelHov:"rgba(6,16,34,0.92)",
  border:"rgba(0,190,255,0.13)", borderHov:"rgba(0,190,255,0.38)",
  accent:"#00ccff", green:"#00ff9d", amber:"#ffb800", red:"#ff3060",
  txt:"#cce8ff", txtSub:"rgba(180,220,255,0.5)", txtMute:"rgba(150,200,255,0.22)",
  grid:"rgba(0,190,255,0.05)", tick:"rgba(180,220,255,0.3)",
  inputBg:"rgba(0,0,0,0.5)", inputBorder:"rgba(0,200,255,0.22)", inputFocus:"rgba(0,200,255,0.55)", inputTxt:"#b8e0ff",
};
const LIGHT = {
  id:"light", bg:"#f0f4fa",
  bgGrad:"radial-gradient(ellipse 100% 55% at 50% -8%, rgba(0,60,160,0.06) 0%, transparent 65%)",
  nav:"rgba(255,255,255,0.94)", panel:"rgba(255,255,255,0.9)", panelHov:"rgba(255,255,255,0.98)",
  border:"rgba(0,60,140,0.12)", borderHov:"rgba(0,60,140,0.32)",
  accent:"#0050cc", green:"#007840", amber:"#8a5000", red:"#b80020",
  txt:"#0c1828", txtSub:"rgba(12,24,40,0.58)", txtMute:"rgba(12,24,40,0.32)",
  grid:"rgba(0,40,120,0.06)", tick:"rgba(12,24,40,0.38)",
  inputBg:"rgba(238,244,252,0.98)", inputBorder:"rgba(0,60,140,0.18)", inputFocus:"rgba(0,60,140,0.48)", inputTxt:"#0c1828",
};

const riskCol = (score, isDark) => {
  if (score >= 70) return isDark ? "#ff3060" : "#b80020";
  if (score >= 40) return isDark ? "#ffb800" : "#8a5000";
  return isDark ? "#00ff9d" : "#007840";
};
const riskLabel = s => s >= 70 ? "CRITICAL" : s >= 40 ? "HIGH" : "STABLE";

const severityFromText = (text, t) => {
  const l = (text||"").toLowerCase();
  if (l.includes("high risk") || l.includes("critical") || l.includes("severe")) return { col: t.red, label: "CRITICAL" };
  if (l.includes("warning") || l.includes("moderate")) return { col: t.amber, label: "WARNING" };
  return { col: t.green, label: "NOTICE" };
};

// ══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL FETCH HOOK
// ══════════════════════════════════════════════════════════════════════════════
function useApi(endpoint, pollMs = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${API}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetch_();
    if (pollMs > 0) {
      const id = setInterval(fetch_, pollMs);
      return () => clearInterval(id);
    }
  }, [fetch_, pollMs]);

  return { data, loading, error, refetch: fetch_ };
}

// ══════════════════════════════════════════════════════════════════════════════
// MASTER DASHBOARD HOOK
// ══════════════════════════════════════════════════════════════════════════════
function useDashboard() {
  const [state, setState] = useState({
    events: [], riskSummary: {}, issueTrends: {}, alerts: [],
    predictions: [], aiInsight: null, knowledgeGraph: null,
    health: null, dashboard: null, riskMap: null,
    wsEvents: [],
    loading: true, error: null, lastSync: null, connected: false, wsConnected: false,
  });

  const fetchAll = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetch(`${API}/events`).then(r => r.json()),
        fetch(`${API}/risk-summary`).then(r => r.json()),
        fetch(`${API}/issue-trends`).then(r => r.json()),
        fetch(`${API}/alerts`).then(r => r.json()),
        fetch(`${API}/predictions`).then(r => r.json()),
        fetch(`${API}/ai-insight`).then(r => r.json()),
        fetch(`${API}/knowledge-graph`).then(r => r.json()),
        fetch(`${API}/health`).then(r => r.json()),
        fetch(`${API}/dashboard`).then(r => r.json()),
        fetch(`${API}/risk-map`).then(r => r.json()),
      ]);

      const [eventsR, riskR, trendsR, alertsR, predsR, aiR, kgR, healthR, dashR, riskMapR] = results;

      setState(prev => ({
        ...prev,
        events:         eventsR.status  === "fulfilled" ? (eventsR.value?.events   || eventsR.value  || []) : prev.events,
        riskSummary:    riskR.status    === "fulfilled" ? (riskR.value?.risk_summary  || riskR.value   || {}) : prev.riskSummary,
        issueTrends:    trendsR.status  === "fulfilled" ? (trendsR.value?.issue_trends || trendsR.value || {}) : prev.issueTrends,
        alerts:         alertsR.status  === "fulfilled" ? (alertsR.value?.alerts    || alertsR.value || []) : prev.alerts,
        predictions:    predsR.status   === "fulfilled" ? (predsR.value?.predictions || predsR.value  || []) : prev.predictions,
        aiInsight:      aiR.status      === "fulfilled" ? aiR.value      : prev.aiInsight,
        knowledgeGraph: kgR.status      === "fulfilled" ? kgR.value      : prev.knowledgeGraph,
        health:         healthR.status  === "fulfilled" ? healthR.value  : prev.health,
        dashboard:      dashR.status    === "fulfilled" ? dashR.value    : prev.dashboard,
        riskMap:        riskMapR.status === "fulfilled" ? riskMapR.value : prev.riskMap,
        loading: false, error: null, lastSync: new Date(), connected: true,
      }));
    } catch (e) {
      setState(prev => ({ ...prev, loading: false, error: e.message, connected: false }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  useEffect(() => {
    let ws; let retryTimer; let dead = false;
    const connect = () => {
      try {
        ws = new WebSocket(`wss://civicsentinel-ai-1-z7io.onrender.com/ws/events`);
        ws.onopen  = () => setState(prev => ({ ...prev, wsConnected: true }));
        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            setState(prev => ({
              ...prev,
              wsEvents: [data, ...prev.wsEvents].slice(0, 50),
              events:   [data, ...prev.events].slice(0, 200),
            }));
          } catch (_) {}
        };
        ws.onerror = () => setState(prev => ({ ...prev, wsConnected: false }));
        ws.onclose = () => {
          setState(prev => ({ ...prev, wsConnected: false }));
          if (!dead) retryTimer = setTimeout(connect, 5000);
        };
      } catch (_) {
        if (!dead) retryTimer = setTimeout(connect, 5000);
      }
    };
    connect();
    return () => { dead = true; clearTimeout(retryTimer); if (ws) ws.close(); };
  }, []);

  return { ...state, refetch: fetchAll };
}

// ══════════════════════════════════════════════════════════════════════════════
// PARTICLE CANVAS
// ══════════════════════════════════════════════════════════════════════════════
function Particles({ isDark }) {
  const ref = useRef(null); const dRef = useRef(isDark);
  useEffect(() => { dRef.current = isDark; }, [isDark]);
  useEffect(() => {
    const c = ref.current; const ctx = c.getContext("2d"); let id;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({ length: 65 }, () => ({ x:Math.random()*window.innerWidth, y:Math.random()*window.innerHeight, vx:(Math.random()-.5)*.22, vy:(Math.random()-.5)*.22, r:Math.random()*1.1+.4 }));
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      const pa = dRef.current ? "rgba(0,200,255,0.28)" : "rgba(0,50,150,0.1)";
      const pb = dRef.current ? "rgba(0,200,255," : "rgba(0,50,150,";
      pts.forEach(p => { p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>c.width)p.vx*=-1; if(p.y<0||p.y>c.height)p.vy*=-1; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=pa; ctx.fill(); });
      pts.forEach((a,i) => pts.slice(i+1).forEach(b => { const d=Math.hypot(a.x-b.x,a.y-b.y); if(d<115){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.strokeStyle=`${pb}${.1*(1-d/115)})`; ctx.lineWidth=.5; ctx.stroke(); }}));
      id = requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(id); window.removeEventListener("resize",resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none" }}/>;
}

// ══════════════════════════════════════════════════════════════════════════════
// CITY GEO DATA — all 44 cities
// ══════════════════════════════════════════════════════════════════════════════
const CITY_GEO = {
  Mumbai:             { lat:19.0760, lng:72.8777, zoom:12 },
  Delhi:              { lat:28.6139, lng:77.2090, zoom:11 },
  Bangalore:          { lat:12.9716, lng:77.5946, zoom:12 },
  Chennai:            { lat:13.0827, lng:80.2707, zoom:12 },
  Kolkata:            { lat:22.5726, lng:88.3639, zoom:12 },
  Hyderabad:          { lat:17.3850, lng:78.4867, zoom:12 },
  Pune:               { lat:18.5204, lng:73.8567, zoom:12 },
  Ahmedabad:          { lat:23.0225, lng:72.5714, zoom:12 },
  Jaipur:             { lat:26.9124, lng:75.7873, zoom:12 },
  Surat:              { lat:21.1702, lng:72.8311, zoom:12 },
  Kanpur:             { lat:26.4499, lng:80.3319, zoom:12 },
  Nagpur:             { lat:21.1458, lng:79.0882, zoom:12 },
  Lucknow:            { lat:26.8467, lng:80.9462, zoom:12 },
  Bhopal:             { lat:23.2599, lng:77.4126, zoom:12 },
  Indore:             { lat:22.7196, lng:75.8577, zoom:12 },
  Patna:              { lat:25.5941, lng:85.1376, zoom:12 },
  Vadodara:           { lat:22.3072, lng:73.1812, zoom:12 },
  Coimbatore:         { lat:11.0168, lng:76.9558, zoom:12 },
  Agra:               { lat:27.1767, lng:78.0081, zoom:12 },
  Nashik:             { lat:19.9975, lng:73.7898, zoom:12 },
  Rajkot:             { lat:22.3039, lng:70.8022, zoom:12 },
  Meerut:             { lat:28.9845, lng:77.7064, zoom:12 },
  Varanasi:           { lat:25.3176, lng:82.9739, zoom:12 },
  Amritsar:           { lat:31.6340, lng:74.8723, zoom:12 },
  Visakhapatnam:      { lat:17.6868, lng:83.2185, zoom:12 },
  Thane:              { lat:19.2183, lng:72.9781, zoom:12 },
  "Navi Mumbai":      { lat:19.0330, lng:73.0297, zoom:12 },
  Faridabad:          { lat:28.4089, lng:77.3178, zoom:12 },
  Ghaziabad:          { lat:28.6692, lng:77.4538, zoom:12 },
  Noida:              { lat:28.5355, lng:77.3910, zoom:12 },
  Kochi:              { lat:9.9312,  lng:76.2673, zoom:12 },
  Chandigarh:         { lat:30.7333, lng:76.7794, zoom:12 },
  Guwahati:           { lat:26.1445, lng:91.7362, zoom:12 },
  Bhubaneswar:        { lat:20.2961, lng:85.8245, zoom:12 },
  Ranchi:             { lat:23.3441, lng:85.3096, zoom:12 },
  Raipur:             { lat:21.2514, lng:81.6296, zoom:12 },
  Jodhpur:            { lat:26.2389, lng:73.0243, zoom:12 },
  Madurai:            { lat:9.9252,  lng:78.1198, zoom:12 },
  Mysuru:             { lat:12.2958, lng:76.6394, zoom:12 },
  Mangaluru:          { lat:12.9141, lng:74.8560, zoom:12 },
  Thiruvananthapuram: { lat:8.5241,  lng:76.9366, zoom:12 },
  Kozhikode:          { lat:11.2588, lng:75.7804, zoom:12 },
  Vijayawada:         { lat:16.5062, lng:80.6480, zoom:12 },
  Warangal:           { lat:17.9689, lng:79.5941, zoom:12 },
};

// ══════════════════════════════════════════════════════════════════════════════
// FIX: ALL_CITIES — sorted list of every city in CITY_GEO for the dropdown.
//      Previously only cities with risk data were shown.
// ══════════════════════════════════════════════════════════════════════════════
const ALL_CITIES = Object.keys(CITY_GEO).sort((a, b) => a.localeCompare(b));

// Ward GeoJSON
const WARD_GEOJSON = {
  Mumbai: { type:"FeatureCollection", features:[
    { type:"Feature", properties:{ name:"Colaba",   offset:-15 }, geometry:{ type:"Polygon", coordinates:[[[72.808,18.894],[72.836,18.894],[72.836,18.920],[72.808,18.920],[72.808,18.894]]] }},
    { type:"Feature", properties:{ name:"Fort",     offset:-5  }, geometry:{ type:"Polygon", coordinates:[[[72.825,18.920],[72.855,18.920],[72.855,18.948],[72.825,18.948],[72.825,18.920]]] }},
    { type:"Feature", properties:{ name:"Dadar",    offset:10  }, geometry:{ type:"Polygon", coordinates:[[[72.833,19.013],[72.860,19.013],[72.860,19.042],[72.833,19.042],[72.833,19.013]]] }},
    { type:"Feature", properties:{ name:"Bandra",   offset:25  }, geometry:{ type:"Polygon", coordinates:[[[72.820,19.042],[72.856,19.042],[72.856,19.072],[72.820,19.072],[72.820,19.042]]] }},
    { type:"Feature", properties:{ name:"Andheri",  offset:5   }, geometry:{ type:"Polygon", coordinates:[[[72.835,19.106],[72.880,19.106],[72.880,19.140],[72.835,19.140],[72.835,19.106]]] }},
    { type:"Feature", properties:{ name:"Borivali", offset:-10 }, geometry:{ type:"Polygon", coordinates:[[[72.840,19.218],[72.888,19.218],[72.888,19.258],[72.840,19.258],[72.840,19.218]]] }},
    { type:"Feature", properties:{ name:"Dharavi",  offset:35  }, geometry:{ type:"Polygon", coordinates:[[[72.847,19.037],[72.873,19.037],[72.873,19.060],[72.847,19.060],[72.847,19.037]]] }},
    { type:"Feature", properties:{ name:"Kurla",    offset:20  }, geometry:{ type:"Polygon", coordinates:[[[72.869,19.065],[72.896,19.065],[72.896,19.090],[72.869,19.090],[72.869,19.065]]] }},
  ]},
  Delhi: { type:"FeatureCollection", features:[
    { type:"Feature", properties:{ name:"New Delhi",  offset:-20 }, geometry:{ type:"Polygon", coordinates:[[[77.185,28.610],[77.240,28.610],[77.240,28.645],[77.185,28.645],[77.185,28.610]]] }},
    { type:"Feature", properties:{ name:"Old Delhi",  offset:15  }, geometry:{ type:"Polygon", coordinates:[[[77.214,28.645],[77.255,28.645],[77.255,28.680],[77.214,28.680],[77.214,28.645]]] }},
    { type:"Feature", properties:{ name:"Dwarka",     offset:5   }, geometry:{ type:"Polygon", coordinates:[[[77.030,28.556],[77.080,28.556],[77.080,28.595],[77.030,28.595],[77.030,28.556]]] }},
    { type:"Feature", properties:{ name:"Rohini",     offset:-5  }, geometry:{ type:"Polygon", coordinates:[[[77.080,28.720],[77.135,28.720],[77.135,28.760],[77.080,28.760],[77.080,28.720]]] }},
    { type:"Feature", properties:{ name:"Saket",      offset:0   }, geometry:{ type:"Polygon", coordinates:[[[77.200,28.515],[77.250,28.515],[77.250,28.550],[77.200,28.550],[77.200,28.515]]] }},
    { type:"Feature", properties:{ name:"Shahdara",   offset:30  }, geometry:{ type:"Polygon", coordinates:[[[77.282,28.665],[77.330,28.665],[77.330,28.700],[77.282,28.700],[77.282,28.665]]] }},
    { type:"Feature", properties:{ name:"Najafgarh",  offset:-15 }, geometry:{ type:"Polygon", coordinates:[[[76.970,28.595],[77.025,28.595],[77.025,28.635],[76.970,28.635],[76.970,28.595]]] }},
    { type:"Feature", properties:{ name:"Vasant Kunj",offset:8   }, geometry:{ type:"Polygon", coordinates:[[[77.145,28.518],[77.195,28.518],[77.195,28.553],[77.145,28.553],[77.145,28.518]]] }},
  ]},
  Bangalore: { type:"FeatureCollection", features:[
    { type:"Feature", properties:{ name:"MG Road",       offset:-10 }, geometry:{ type:"Polygon", coordinates:[[[77.593,12.968],[77.625,12.968],[77.625,12.990],[77.593,12.990],[77.593,12.968]]] }},
    { type:"Feature", properties:{ name:"Whitefield",    offset:15  }, geometry:{ type:"Polygon", coordinates:[[[77.740,12.960],[77.790,12.960],[77.790,13.000],[77.740,13.000],[77.740,12.960]]] }},
    { type:"Feature", properties:{ name:"Electronic City",offset:5  }, geometry:{ type:"Polygon", coordinates:[[[77.660,12.836],[77.710,12.836],[77.710,12.876],[77.660,12.876],[77.660,12.836]]] }},
    { type:"Feature", properties:{ name:"Koramangala",   offset:20  }, geometry:{ type:"Polygon", coordinates:[[[77.613,12.927],[77.648,12.927],[77.648,12.960],[77.613,12.960],[77.613,12.927]]] }},
    { type:"Feature", properties:{ name:"Jayanagar",     offset:-5  }, geometry:{ type:"Polygon", coordinates:[[[77.574,12.918],[77.610,12.918],[77.610,12.950],[77.574,12.950],[77.574,12.918]]] }},
    { type:"Feature", properties:{ name:"Yeshwanthpur",  offset:10  }, geometry:{ type:"Polygon", coordinates:[[[77.535,13.012],[77.573,13.012],[77.573,13.046],[77.535,13.046],[77.535,13.012]]] }},
    { type:"Feature", properties:{ name:"Yelahanka",     offset:-20 }, geometry:{ type:"Polygon", coordinates:[[[77.585,13.094],[77.630,13.094],[77.630,13.130],[77.585,13.130],[77.585,13.094]]] }},
    { type:"Feature", properties:{ name:"BTM Layout",    offset:30  }, geometry:{ type:"Polygon", coordinates:[[[77.608,12.908],[77.644,12.908],[77.644,12.930],[77.608,12.930],[77.608,12.908]]] }},
  ]},
  Chennai: { type:"FeatureCollection", features:[
    { type:"Feature", properties:{ name:"Egmore",          offset:0   }, geometry:{ type:"Polygon", coordinates:[[[80.255,13.073],[80.285,13.073],[80.285,13.098],[80.255,13.098],[80.255,13.073]]] }},
    { type:"Feature", properties:{ name:"T. Nagar",        offset:10  }, geometry:{ type:"Polygon", coordinates:[[[80.218,13.030],[80.248,13.030],[80.248,13.058],[80.218,13.058],[80.218,13.030]]] }},
    { type:"Feature", properties:{ name:"Adyar",           offset:-10 }, geometry:{ type:"Polygon", coordinates:[[[80.245,12.990],[80.278,12.990],[80.278,13.020],[80.245,13.020],[80.245,12.990]]] }},
    { type:"Feature", properties:{ name:"Anna Nagar",      offset:5   }, geometry:{ type:"Polygon", coordinates:[[[80.200,13.080],[80.235,13.080],[80.235,13.110],[80.200,13.110],[80.200,13.080]]] }},
    { type:"Feature", properties:{ name:"Velachery",       offset:25  }, geometry:{ type:"Polygon", coordinates:[[[80.215,12.967],[80.248,12.967],[80.248,12.998],[80.215,12.998],[80.215,12.967]]] }},
    { type:"Feature", properties:{ name:"Tambaram",        offset:-15 }, geometry:{ type:"Polygon", coordinates:[[[80.112,12.922],[80.150,12.922],[80.150,12.958],[80.112,12.958],[80.112,12.922]]] }},
    { type:"Feature", properties:{ name:"Perambur",        offset:20  }, geometry:{ type:"Polygon", coordinates:[[[80.236,13.103],[80.264,13.103],[80.264,13.130],[80.236,13.130],[80.236,13.103]]] }},
    { type:"Feature", properties:{ name:"Sholinganallur",  offset:15  }, geometry:{ type:"Polygon", coordinates:[[[80.222,12.899],[80.258,12.899],[80.258,12.932],[80.222,12.932],[80.222,12.899]]] }},
  ]},
};

// ══════════════════════════════════════════════════════════════════════════════
// LEAFLET HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function useLeafletCSS() {
  useEffect(() => {
    if (document.getElementById("leaflet-css")) return;
    const link = document.createElement("link");
    link.id = "leaflet-css"; link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }, []);
}

function useLeaflet() {
  const [L, setL] = useState(null);
  useEffect(() => {
    if (window.L) { setL(window.L); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setL(window.L);
    document.head.appendChild(script);
  }, []);
  return L;
}

// ══════════════════════════════════════════════════════════════════════════════
// INDIA OVERVIEW MAP
// FIX 1 — All 44 cities from CITY_GEO are shown as green pins by default.
// FIX 2 — If a city has a risk score from riskSummary the color updates
//          (green <40 / amber 40-69 / red ≥70). Cities with no reports
//          stay green (score = 0 → STABLE).
// ══════════════════════════════════════════════════════════════════════════════
function IndiaMap({ riskSummary, isDark, onCitySelect, drillCity }) {
  const t = useT();
  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markersRef      = useRef([]);
  const L = useLeaflet();
  useLeafletCSS();

  // Build map instance once
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629], zoom: 5,
      zoomControl: true, attributionControl: false,
    });
    L.tileLayer(
      isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { subdomains:"abcd", maxZoom:19 }
    ).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [L, isDark]);

  // ── FIX: Render ALL cities, default score = 0 (green) ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Remove existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Iterate every city in CITY_GEO — not just riskSummary keys
    Object.entries(CITY_GEO).forEach(([city, geo]) => {
      // Use real risk score if available, otherwise 0 (renders green)
      const score      = riskSummary?.[city] ?? 0;
      const col        = riskCol(score, isDark);
      const hasRisk    = score > 0;
      const hasWards   = !!WARD_GEOJSON[city];
      const isDrilling = drillCity === city;

      // Size: cities with risk data are slightly larger
      const baseSize = hasRisk ? 18 + (score / 100) * 14 : 14;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${baseSize}px;
          height:${baseSize}px;
          background:${col}35;
          border:2.5px solid ${col};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          cursor:${hasWards ? "pointer" : "default"};
          box-shadow:0 0 ${score >= 70 ? "14px" : "7px"} ${col}80;
          position:relative;
          ${isDrilling ? `outline:3px solid ${col};outline-offset:3px;` : ""}
        ">
          <span style="font-size:9px;font-weight:700;color:${col};font-family:DM Mono,monospace;">
            ${hasRisk ? score : ""}
          </span>
          ${score >= 70 ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:1.5px solid ${col};opacity:0.4;animation:rippleRing 2s infinite;"></div>` : ""}
        </div>`,
        iconSize: [baseSize + 4, baseSize + 4],
        iconAnchor: [(baseSize + 4) / 2, (baseSize + 4) / 2],
      });

      const marker = L.marker([geo.lat, geo.lng], { icon });

      // Tooltip: show score only if real data exists
      marker.bindTooltip(
        `<div style="font-family:Inter,sans-serif;font-size:12px;font-weight:600">${city}</div>
         <div style="font-size:11px;color:${col}">
           ${hasRisk ? `Risk: ${score}/100 · ${riskLabel(score)}` : "No reports yet · STABLE"}
         </div>
         ${hasWards ? "<div style='font-size:10px;opacity:0.7;margin-top:2px'>Click to view wards</div>" : ""}`,
        { className:"civic-tooltip", permanent:false, direction:"top", offset:[0,-10] }
      );

      if (hasWards) marker.on("click", () => onCitySelect(city));
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [L, riskSummary, isDark, drillCity, onCitySelect]);

  return (
    <div style={{ position:"relative" }}>
      <style>{`
        .civic-tooltip { background:rgba(4,10,22,0.92) !important; border:1px solid rgba(0,190,255,0.3) !important; color:#cce8ff !important; border-radius:6px !important; padding:7px 11px !important; box-shadow:0 4px 20px rgba(0,0,0,0.4) !important; }
        .civic-tooltip::before { display:none !important; }
        @keyframes rippleRing { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.5);opacity:0} }
      `}</style>
      <div ref={mapRef} style={{ height:380, borderRadius:8, overflow:"hidden", border:`1px solid ${t.border}` }}/>
      {/* Legend */}
      <div style={{ position:"absolute", bottom:24, left:10, zIndex:1000,
        background: t.id==="dark" ? "rgba(4,10,22,0.88)" : "rgba(255,255,255,0.92)",
        border:`1px solid ${t.border}`, borderRadius:6, padding:"8px 12px",
        display:"flex", flexDirection:"column", gap:5, backdropFilter:"blur(12px)" }}>
        {[
          ["≥70 Critical", isDark?"#ff3060":"#b80020"],
          ["40–69 High",   isDark?"#ffb800":"#8a5000"],
          ["<40 Stable",   isDark?"#00ff9d":"#007840"],
        ].map(([l,c]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:10,height:10,borderRadius:"50%",background:c,boxShadow:isDark?`0 0 6px ${c}`:"none" }}/>
            <span style={{ fontSize:11,color:t.txt,fontFamily:"'Inter',sans-serif" }}>{l}</span>
          </div>
        ))}
        <div style={{ fontSize:10,color:t.txtMute,marginTop:2 }}>Click city → view wards</div>
      </div>
    </div>
  );
}

// ── CITY WARD MAP ──
function CityWardMap({ cityKey, cityRisk, isDark }) {
  const t = useT();
  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const [hovWard, setHovWard] = useState(null);
  const L = useLeaflet();
  useLeafletCSS();

  const geo    = CITY_GEO[cityKey];
  const geojson = WARD_GEOJSON[cityKey];

  const wardRisk = useCallback((offset) => {
    if (!cityRisk || cityRisk === 0) return 0;
    return Math.min(99, Math.max(5, cityRisk + offset));
  }, [cityRisk]);

  useEffect(() => {
    if (!L || !mapRef.current || !geo || !geojson) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

    const map = L.map(mapRef.current, {
      center: [geo.lat, geo.lng], zoom: geo.zoom,
      zoomControl: true, attributionControl: false,
    });
    L.tileLayer(
      isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { subdomains:"abcd", maxZoom:19 }
    ).addTo(map);

    L.geoJSON(geojson, {
      style: (feature) => {
        const risk = wardRisk(feature.properties.offset);
        if (risk === 0) return { fillColor:"transparent", fillOpacity:0, color:"rgba(100,120,140,0.3)", weight:1, opacity:0.4, dashArray:"4" };
        const col = riskCol(risk, isDark);
        return { fillColor:col, fillOpacity:0.28, color:col, weight:2, opacity:0.85 };
      },
      onEachFeature: (feature, layer) => {
        const risk = wardRisk(feature.properties.offset);
        const col  = risk === 0 ? "rgba(150,180,200,0.5)" : riskCol(risk, isDark);
        const label = risk === 0 ? "No data yet" : riskLabel(risk);
        layer.bindTooltip(
          `<div style="font-family:Inter,sans-serif">
            <div style="font-weight:700;font-size:13px;color:${col}">${feature.properties.name}</div>
            <div style="font-size:12px;margin-top:3px">Risk Score: <strong style="color:${col}">${risk === 0 ? "—" : risk + "/100"}</strong></div>
            <div style="font-size:11px;color:${col}">${label}</div>
          </div>`,
          { className:"civic-tooltip", sticky:true, direction:"top" }
        );
        layer.on("mouseover", function() { this.setStyle({ fillOpacity:risk===0?0:0.55, weight:3 }); setHovWard(feature.properties.name); });
        layer.on("mouseout",  function() { this.setStyle({ fillOpacity:risk===0?0:0.28, weight:2 }); setHovWard(null); });
      },
    }).addTo(map);

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [L, cityKey, cityRisk, isDark, geo, geojson, wardRisk]);

  if (!geo || !geojson) return (
    <div style={{ height:320,display:"flex",alignItems:"center",justifyContent:"center",color:t.txtMute,fontSize:13,fontFamily:"'Inter',sans-serif" }}>
      Ward data not available for {cityKey}.
    </div>
  );

  return (
    <div style={{ position:"relative" }}>
      <div ref={mapRef} style={{ height:340, borderRadius:8, overflow:"hidden", border:`1px solid ${t.border}` }}/>
      <div style={{ position:"absolute", bottom:24, left:10, zIndex:1000,
        background: t.id==="dark"?"rgba(4,10,22,0.88)":"rgba(255,255,255,0.92)",
        border:`1px solid ${t.border}`, borderRadius:6, padding:"8px 12px", backdropFilter:"blur(12px)" }}>
        {[["≥70 Critical",isDark?"#ff3060":"#b80020"],["40–69 High",isDark?"#ffb800":"#8a5000"],["<40 Stable",isDark?"#00ff9d":"#007840"]].map(([l,c])=>(
          <div key={l} style={{ display:"flex",alignItems:"center",gap:7,marginBottom:4 }}>
            <div style={{ width:12,height:8,borderRadius:2,background:c,opacity:.7 }}/>
            <span style={{ fontSize:11,color:t.txt,fontFamily:"'Inter',sans-serif" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE GRAPH — Static force-directed network visualization
//
// DROP-IN REPLACEMENT for the existing KnowledgeGraph function in
// OfficerDashboard.jsx. Find "function KnowledgeGraph({ data, isDark })"
// and replace the ENTIRE function with this code.
//
// v2 fixes:
//   • Physics runs for 300 steps OFFLINE then STOPS — fully static result
//   • Nodes spread across the full canvas with stronger repulsion
//   • Minimum distance enforced so nodes never overlap
//   • Only pulse dots animate — nodes themselves never move after settling
//   • Canvas uses full width/height so graph doesn't cluster center
// ══════════════════════════════════════════════════════════════════════════════

function KnowledgeGraph({ data, isDark }) {
  const t = useT();
  const canvasRef    = useRef(null);
  const animRef      = useRef(null);
  const placedRef    = useRef([]);   // settled static positions
  const edgesRef     = useRef([]);
  const hoveredRef   = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [stats, setStats]             = useState(null);

  // ── Parse API data ────────────────────────────────────────────────────
  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const nodeMap = {};
    const ns = [];
    const es = [];

    const addNode = (label, type, weight = 1) => {
      const key = String(label).toLowerCase().trim();
      if (key in nodeMap) { nodeMap[key].weight += weight; return nodeMap[key]; }
      const node = { id: ns.length, label: String(label).slice(0, 16), type, weight };
      nodeMap[key] = node;
      ns.push(node);
      return node;
    };

    (data.relations || []).forEach(rel => {
      const cityLabel  = rel.city  || rel.source || rel.from;
      const issueLabel = rel.issue || rel.target || rel.to;
      if (!cityLabel || !issueLabel) return;
      const cn = addNode(cityLabel,  "city",  1);
      const in_ = addNode(issueLabel, "issue", 1);
      const exists = es.some(e =>
        (e.from === cn.id && e.to === in_.id) ||
        (e.from === in_.id && e.to === cn.id)
      );
      if (!exists) es.push({ from: cn.id, to: in_.id, pulse: Math.random() });
    });

    // Fallback for plain object
    if (ns.length === 0 && typeof data === "object" && !Array.isArray(data)) {
      Object.keys(data)
        .filter(k => !["nodes","edges","relations"].includes(k))
        .slice(0, 12)
        .forEach(k => addNode(k, "city", typeof data[k] === "number" ? data[k] : 1));
    }

    return { nodes: ns, edges: es };
  }, [data]);

  // ── Compute stats ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!nodes.length) return;
    const cityEdge = {}, issueEdge = {};
    edges.forEach(e => {
      const a = nodes[e.from], b = nodes[e.to];
      if (a?.type === "city")  cityEdge[a.label]  = (cityEdge[a.label]  || 0) + 1;
      if (b?.type === "city")  cityEdge[b.label]  = (cityEdge[b.label]  || 0) + 1;
      if (a?.type === "issue") issueEdge[a.label] = (issueEdge[a.label] || 0) + 1;
      if (b?.type === "issue") issueEdge[b.label] = (issueEdge[b.label] || 0) + 1;
    });
    const topCity  = Object.entries(cityEdge).sort((a,b)=>b[1]-a[1])[0];
    const topIssue = Object.entries(issueEdge).sort((a,b)=>b[1]-a[1])[0];
    setStats({
      totalNodes: nodes.length, totalEdges: edges.length,
      cities: nodes.filter(n=>n.type==="city").length,
      issues: nodes.filter(n=>n.type==="issue").length,
      topCity:  topCity  ? topCity[0]  : "—",
      topIssue: topIssue ? topIssue[0] : "—",
    });
  }, [nodes, edges]);

  // ── Run physics OFFLINE → settle → render static positions ───────────
  useEffect(() => {
    if (!nodes.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const W = canvas.width;
    const H = canvas.height;

    // ── Step 1: initialise positions spread across 80% of canvas ──────
    // Use a grid-jitter layout so nodes start far apart
    const cols    = Math.ceil(Math.sqrt(nodes.length * (W / H)));
    const rows    = Math.ceil(nodes.length / cols);
    const cellW   = (W * 0.82) / cols;
    const cellH   = (H * 0.78) / rows;
    const offsetX = W * 0.09;
    const offsetY = H * 0.11;

    let placed = nodes.map((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...n,
        x:  offsetX + col * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.55,
        y:  offsetY + row * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.55,
        vx: 0,
        vy: 0,
      };
    });

    // ── Step 2: run 320 physics iterations SYNCHRONOUSLY ──────────────
    // Strong repulsion + weak edge attraction → spreads evenly then stops
    const REPEL   = 7000;
    const ATTRACT = 0.018;
    const DAMPING = 0.78;
    const PADDING = 60;    // min distance from canvas edge
    const MIN_DIST = 75;   // minimum node-to-node distance

    for (let step = 0; step < 320; step++) {
      const cooling = 1 - step / 320; // cool down over time → less movement

      for (let i = 0; i < placed.length; i++) {
        let fx = 0, fy = 0;

        // Repulsion
        for (let j = 0; j < placed.length; j++) {
          if (i === j) continue;
          const dx   = placed[i].x - placed[j].x;
          const dy   = placed[i].y - placed[j].y;
          const dist = Math.max(Math.hypot(dx, dy), MIN_DIST * 0.5);
          const force = REPEL / (dist * dist);
          fx += (dx / dist) * force * cooling;
          fy += (dy / dist) * force * cooling;
        }

        // Attraction along edges
        edges.forEach(e => {
          const other = e.from === i ? placed[e.to] : e.to === i ? placed[e.from] : null;
          if (!other) return;
          const dx = other.x - placed[i].x;
          const dy = other.y - placed[i].y;
          fx += dx * ATTRACT;
          fy += dy * ATTRACT;
        });

        // Gentle center gravity
        fx += (W / 2 - placed[i].x) * 0.003;
        fy += (H / 2 - placed[i].y) * 0.003;

        placed[i].vx = (placed[i].vx + fx) * DAMPING;
        placed[i].vy = (placed[i].vy + fy) * DAMPING;

        // Clamp velocity — reduces sharply as simulation cools
        const maxV = 6 * cooling + 0.5;
        placed[i].vx = Math.max(-maxV, Math.min(maxV, placed[i].vx));
        placed[i].vy = Math.max(-maxV, Math.min(maxV, placed[i].vy));

        placed[i].x = Math.max(PADDING, Math.min(W - PADDING, placed[i].x + placed[i].vx));
        placed[i].y = Math.max(PADDING, Math.min(H - PADDING, placed[i].y + placed[i].vy));
      }
    }

    // ── Step 3: zero out all velocities — positions are now FROZEN ─────
    placed = placed.map(n => ({ ...n, vx: 0, vy: 0 }));
    placedRef.current = placed;
    edgesRef.current  = edges;

    // ── Step 4: pure render loop — only pulse dots animate ────────────
    const ctx = canvas.getContext("2d");

    const CITY_FILL    = isDark ? "rgba(0,200,255,0.15)"  : "rgba(0,80,200,0.10)";
    const CITY_STROKE  = isDark ? "#00ccff"               : "#0050cc";
    const CITY_TEXT    = isDark ? "#7fe8ff"               : "#003899";
    const ISSUE_FILL   = isDark ? "rgba(255,184,0,0.15)"  : "rgba(160,100,0,0.10)";
    const ISSUE_STROKE = isDark ? "#ffb800"               : "#8a5000";
    const ISSUE_TEXT   = isDark ? "#ffd066"               : "#6b3d00";
    const EDGE_COL     = isDark ? "rgba(0,200,255,0.14)"  : "rgba(0,60,140,0.10)";
    const PULSE_COL    = isDark ? "rgba(0,255,157,0.70)"  : "rgba(0,120,80,0.55)";
    const GRID_COL     = isDark ? "rgba(0,200,255,0.035)" : "rgba(0,60,140,0.04)";
    const HOV_COL      = isDark ? "rgba(0,200,255,0.28)"  : "rgba(0,60,200,0.20)";

    const nodeR = (n) => (n.type === "city" ? 22 : 16) + Math.min(n.weight * 1.5, 10);

    let frame = 0;

    const drawGrid = () => {
      ctx.strokeStyle = GRID_COL;
      ctx.lineWidth   = 0.5;
      for (let x = 0; x < W; x += 44) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 44) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, W, H);
      drawGrid();

      const ns = placedRef.current;

      // Edges + pulse dots (only animation)
      edgesRef.current.forEach(e => {
        const a = ns[e.from]; const b = ns[e.to];
        if (!a || !b) return;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = EDGE_COL;
        ctx.lineWidth   = 1.4;
        ctx.stroke();

        // Pulse dot
        const t_  = (frame * 0.006 + e.pulse) % 1;
        const px  = a.x + (b.x - a.x) * t_;
        const py  = a.y + (b.y - a.y) * t_;
        ctx.beginPath();
        ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = PULSE_COL;
        ctx.fill();
      });

      // Static nodes
      ns.forEach((n, i) => {
        const r      = nodeR(n);
        const isCity = n.type === "city";
        const isHov  = hoveredRef.current === i;
        const fill   = isCity ? CITY_FILL   : ISSUE_FILL;
        const stroke = isCity ? CITY_STROKE : ISSUE_STROKE;
        const txt    = isCity ? CITY_TEXT   : ISSUE_TEXT;

        // Hover glow
        if (isHov) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 10, 0, Math.PI * 2);
          ctx.fillStyle = HOV_COL;
          ctx.fill();
        }

        // City outer ring (static, no pulse)
        if (isCity) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
          ctx.fillStyle = `${CITY_STROKE}18`;
          ctx.fill();
        }

        if (isCity) {
          // Circle
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.fillStyle   = fill;
          ctx.fill();
          ctx.strokeStyle = stroke;
          ctx.lineWidth   = isHov ? 2.5 : 1.8;
          ctx.stroke();
        } else {
          // Diamond
          const d = r * 1.1;
          ctx.beginPath();
          ctx.moveTo(n.x,     n.y - d);
          ctx.lineTo(n.x + d, n.y);
          ctx.lineTo(n.x,     n.y + d);
          ctx.lineTo(n.x - d, n.y);
          ctx.closePath();
          ctx.fillStyle   = fill;
          ctx.fill();
          ctx.strokeStyle = stroke;
          ctx.lineWidth   = isHov ? 2.5 : 1.8;
          ctx.stroke();
        }

        // Icon
        ctx.font         = `${Math.round(r * 0.68)}px sans-serif`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle    = stroke;
        ctx.fillText(isCity ? "🏙" : "⚠", n.x, n.y);

        // Label — below node, with a subtle backing rect for legibility
        const labelY = n.y + r + 14;
        ctx.font         = `600 11px 'Inter',sans-serif`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        const textW = ctx.measureText(n.label).width;
        ctx.fillStyle = isDark ? "rgba(2,6,12,0.55)" : "rgba(240,246,255,0.65)";
        ctx.fillRect(n.x - textW / 2 - 4, labelY - 7, textW + 8, 14);
        ctx.fillStyle    = txt;
        ctx.fillText(n.label, n.x, labelY);

        // Weight badge (if > 1)
        if (n.weight > 1) {
          const bx = n.x + r * 0.68; const by = n.y - r * 0.68;
          ctx.beginPath();
          ctx.arc(bx, by, 9, 0, Math.PI * 2);
          ctx.fillStyle = stroke;
          ctx.fill();
          ctx.fillStyle    = isDark ? "#020609" : "#ffffff";
          ctx.font         = "bold 9px 'Inter',sans-serif";
          ctx.textAlign    = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(n.weight > 9 ? "9+" : String(n.weight), bx, by);
        }
      });

      frame++;
      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [nodes, edges, isDark]);

  // ── Mouse hover ───────────────────────────────────────────────────────
  const handleMouseMove = useCallback((ev) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (ev.clientX - rect.left) * scaleX;
    const my = (ev.clientY - rect.top)  * scaleY;

    const ns = placedRef.current;
    let found = null;
    for (let i = 0; i < ns.length; i++) {
      const r = (ns[i].type === "city" ? 22 : 16) + Math.min(ns[i].weight * 1.5, 10) + 10;
      if (Math.hypot(ns[i].x - mx, ns[i].y - my) < r) { found = i; break; }
    }
    hoveredRef.current = found;
    setHoveredNode(found !== null ? ns[found] : null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    setHoveredNode(null);
  }, []);

  // ── Empty / loading states ────────────────────────────────────────────
  if (!data) return (
    <div style={{height:360,display:"flex",alignItems:"center",justifyContent:"center",
      color:t.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace"}}>
      ⏳ Loading knowledge graph...
    </div>
  );
  if (nodes.length === 0) return (
    <div style={{height:360,display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",gap:12,color:t.txtMute,fontSize:13,
      fontFamily:"'DM Mono',monospace"}}>
      <div style={{fontSize:36}}>🕸</div>
      <div>No graph data yet — submit complaints to build the network</div>
      <div style={{fontSize:11,opacity:.5,maxWidth:340,textAlign:"center",lineHeight:1.6}}>
        {JSON.stringify(data).slice(0,100)}…
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>

      {/* Stats bar */}
      {stats && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
          {[
            ["Nodes",     stats.totalNodes, t.accent],
            ["Edges",     stats.totalEdges, t.accent],
            ["Cities",    stats.cities,     isDark?"#00ccff":"#0050cc"],
            ["Issues",    stats.issues,     isDark?"#ffb800":"#8a5000"],
            ["Top city",  stats.topCity,    isDark?"#00ccff":"#0050cc"],
            ["Top issue", stats.topIssue,   isDark?"#ffb800":"#8a5000"],
          ].map(([label, val, col]) => (
            <div key={label} style={{
              padding:"8px 10px", textAlign:"center",
              background: isDark?"rgba(0,0,0,.25)":"rgba(0,40,120,.04)",
              border:`1px solid ${col}28`, borderRadius:6,
            }}>
              <div style={{fontSize:10,color:t.txtMute,fontFamily:"'Inter',sans-serif",
                letterSpacing:"0.05em",marginBottom:4}}>
                {label.toUpperCase()}
              </div>
              <div style={{fontSize:13,fontWeight:700,color:col,
                fontFamily:"'DM Mono',monospace",overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div style={{position:"relative"}}>
        <canvas
          ref={canvasRef}
          width={1100}
          height={420}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            width:"100%", height:420,
            borderRadius:8, cursor:"crosshair",
            border:`1px solid ${t.border}`,
            background: isDark?"rgba(2,6,12,0.65)":"rgba(238,245,255,0.65)",
          }}
        />

        {/* Hover tooltip */}
        {hoveredNode && (
          <div style={{
            position:"absolute", top:14, left:14, zIndex:10,
            background: isDark?"rgba(4,10,22,0.96)":"rgba(255,255,255,0.96)",
            border:`1px solid ${hoveredNode.type==="city"
              ? (isDark?"#00ccff50":"#0050cc50")
              : (isDark?"#ffb80050":"#8a500050")}`,
            borderRadius:9, padding:"11px 15px",
            backdropFilter:"blur(14px)",
            pointerEvents:"none", minWidth:170,
          }}>
            <div style={{
              fontSize:12,fontWeight:700,marginBottom:8,
              color: hoveredNode.type==="city"
                ? (isDark?"#00ccff":"#0050cc")
                : (isDark?"#ffb800":"#8a5000"),
              fontFamily:"'Inter',sans-serif",
              display:"flex",alignItems:"center",gap:6,
            }}>
              {hoveredNode.type==="city" ? "🏙" : "⚠"} {hoveredNode.label}
            </div>
            {[
              ["Type",        hoveredNode.type==="city" ? "City node" : "Issue node"],
              ["Reports",     hoveredNode.weight],
              ["Connections", edgesRef.current.filter(
                e => e.from===hoveredNode.id || e.to===hoveredNode.id
              ).length],
            ].map(([k,v]) => (
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                gap:18,fontSize:11,marginBottom:3}}>
                <span style={{color:t.txtMute,fontFamily:"'Inter',sans-serif"}}>{k}</span>
                <span style={{color:t.txt,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div style={{
          position:"absolute", bottom:14, right:14,
          background: isDark?"rgba(4,10,22,0.88)":"rgba(255,255,255,0.92)",
          border:`1px solid ${t.border}`, borderRadius:7,
          padding:"9px 13px", backdropFilter:"blur(10px)",
          display:"flex", flexDirection:"column", gap:7,
        }}>
          {[
            [true,  "circle",  isDark?"#00ccff":"#0050cc", "City"],
            [false, "diamond", isDark?"#ffb800":"#8a5000",  "Issue"],
            [null,  "dot",     isDark?"#00ff9d":"#007840",  "Data flow"],
          ].map(([isCity, shape, col, label]) => (
            <div key={label} style={{display:"flex",alignItems:"center",gap:8}}>
              {shape === "circle" && (
                <div style={{width:13,height:13,borderRadius:"50%",flexShrink:0,
                  background:`${col}20`,border:`1.5px solid ${col}`}}/>
              )}
              {shape === "diamond" && (
                <div style={{width:11,height:11,flexShrink:0,
                  background:`${col}20`,border:`1.5px solid ${col}`,
                  transform:"rotate(45deg)"}}/>
              )}
              {shape === "dot" && (
                <div style={{width:8,height:8,borderRadius:"50%",
                  flexShrink:0,background:col}}/>
              )}
              <span style={{fontSize:11,color:t.txt,fontFamily:"'Inter',sans-serif"}}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INSIGHT PANEL
// ══════════════════════════════════════════════════════════════════════════════
function AIInsightPanel({ insight, loading, error }) {
  const t = useT();
  const [query, setQuery]           = useState("");
  const [localResult, setLocalResult] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  const fetchInsight = useCallback(async (q) => {
    setLocalLoading(true);
    try {
      const url = q ? `${API}/ai-insight?query=${encodeURIComponent(q)}` : `${API}/ai-insight`;
      const res = await fetch(url);
      const d   = await res.json();
      setLocalResult(d);
    } catch(e) { setLocalResult({ error: e.message }); }
    setLocalLoading(false);
  }, []);

  const display = localResult || insight;

  const renderInsight = (d) => {
    if (!d) return null;
    if (typeof d === "string") return <div style={{fontSize:14,lineHeight:1.9,color:t.id==="dark"?"#b8daff":t.txt,fontFamily:"'DM Mono',monospace"}}>{d}</div>;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {d.ai_analysis && <div style={{fontSize:14,lineHeight:1.85,color:t.id==="dark"?"#b8daff":t.txt,fontFamily:"'DM Mono',monospace",padding:"10px 12px",background:`${t.accent}07`,border:`1px solid ${t.accent}20`,borderRadius:6}}>{d.ai_analysis}</div>}
        {d.insight && <div style={{fontSize:14,lineHeight:1.85,color:t.id==="dark"?"#b8daff":t.txt,fontFamily:"'DM Mono',monospace"}}>{d.insight}</div>}
        {d.recommendation && <div style={{padding:"10px 12px",background:`${t.green}08`,border:`1px solid ${t.green}22`,borderRadius:6}}><div style={{fontSize:13,color:t.green,fontFamily:"'Inter',sans-serif",marginBottom:5}}>► RECOMMENDATION</div><div style={{fontSize:13,color:t.txtSub,lineHeight:1.6}}>{d.recommendation}</div></div>}
        {d.city && <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{[["CITY",d.city,t.accent],["ISSUE",d.issue||"—",t.amber],["RISK",d.risk_score||"—",riskCol(d.risk_score||0,t.id==="dark")]].map(([l,v,c])=><div key={l}><div style={{fontSize:13,color:t.txtMute}}>{l}</div><div style={{fontSize:14,color:c,fontFamily:"'Inter',sans-serif",fontWeight:700,marginTop:2}}>{v}</div></div>)}</div>}
        {d.error && <div style={{fontSize:13,color:t.red,fontFamily:"'DM Mono',monospace"}}>⚠ {d.error}</div>}
        {!d.ai_analysis && !d.insight && !d.city && !d.error && <pre style={{fontSize:13,color:t.txtSub,fontFamily:"'DM Mono',monospace",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{JSON.stringify(d,null,2).slice(0,600)}</pre>}
      </div>
    );
  };

  const QUICK = ["water crisis","electricity outage","health emergency","corruption report"];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${t.border}`}}>
        <div style={{width:34,height:34,borderRadius:10,background:`${t.green}14`,border:`1px solid ${t.green}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🧠</div>
        <div>
          <div style={{fontSize:13,fontFamily:"'Inter',sans-serif",color:t.green,letterSpacing:"0.02em",fontWeight:700}}>AI CIVIC COPILOT</div>
          <div style={{fontSize:13,color:t.txtMute,marginTop:2}}>REAL API · /ai-insight · RAG + LLM</div>
        </div>
        <div style={{marginLeft:"auto",fontSize:13,color:error?t.red:t.green,display:"flex",alignItems:"center",gap:5}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:error?t.red:t.green,display:"inline-block",animation:"pulseDot 2s infinite"}}/>
          {error?"OFFLINE":"LIVE"}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",marginBottom:14,maxHeight:280}}>
        {(loading||localLoading)&&!display&&(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:14,color:t.accent,fontFamily:"'DM Mono',monospace",animation:"blink .8s infinite"}}>► QUERYING AI ENGINE... (may take ~30s on first load)</div>
            {[80,60,90,50].map((w,i)=><div key={i} style={{height:10,borderRadius:4,background:`${t.border}`,width:`${w}%`,animation:`pulse 1.5s ease ${i*.2}s infinite`}}/>)}
          </div>
        )}
        {display&&!localLoading&&renderInsight(display)}
        {error&&!display&&<div style={{fontSize:13,color:t.red,fontFamily:"'DM Mono',monospace",padding:"10px 0"}}>⚠ {error} — Backend may be waking up. Retrying...</div>}
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:9}}>
        {QUICK.map(q=>(
          <button key={q} onClick={()=>fetchInsight(q)} style={{background:`${t.accent}08`,border:`1px solid ${t.accent}22`,color:t.accent,borderRadius:4,padding:"4px 10px",fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em"}}>{q.toUpperCase()}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:7}}>
        <div style={{position:"relative",flex:1}}>
          <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13,color:t.accent,pointerEvents:"none"}}>►</span>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchInsight(query)}
            placeholder="Query the AI insight engine..."
            style={{width:"100%",background:t.inputBg,border:`1px solid ${t.inputBorder}`,borderRadius:6,padding:"10px 12px 10px 28px",color:t.inputTxt,fontSize:14,fontFamily:"'DM Mono',monospace",outline:"none",caretColor:t.accent,transition:"border-color .2s"}}
            onFocus={e=>e.target.style.borderColor=t.inputFocus}
            onBlur={e=>e.target.style.borderColor=t.inputBorder}/>
        </div>
        <button onClick={()=>fetchInsight(query)} disabled={localLoading} style={{background:`linear-gradient(135deg,${t.accent}22,${t.green}16)`,border:`1px solid ${t.accent}40`,borderRadius:6,color:t.accent,padding:"10px 15px",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif",opacity:localLoading?.5:1}}>ASK</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function Panel({ title, subtitle, children, acc, tag, style={} }) {
  const t=useT(); const a=acc||t.accent; const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:"relative",background:hov?t.panelHov:t.panel,backdropFilter:"blur(24px)",border:`1px solid ${hov?a+"40":t.border}`,borderRadius:6,overflow:"hidden",transition:"all .22s ease",boxShadow:hov&&t.id==="dark"?`0 0 28px ${a}10,inset 0 0 28px rgba(0,0,0,.25)`:t.id==="light"?"0 2px 4px rgba(0,0,0,.05),0 8px 24px rgba(0,0,0,.04)":"inset 0 0 24px rgba(0,0,0,.3)",...style}}>
      {["tl","tr","bl","br"].map(c=>{const vv=c[0]==="t"?"top":"bottom";const hh=c[1]==="l"?"left":"right";return <div key={c} style={{position:"absolute",[vv]:0,[hh]:0,width:12,height:12,borderTop:vv==="top"?`2px solid ${a}`:"none",borderBottom:vv==="bottom"?`2px solid ${a}`:"none",borderLeft:hh==="left"?`2px solid ${a}`:"none",borderRight:hh==="right"?`2px solid ${a}`:"none"}}/>;  })}
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${a}55,transparent)`}}/>
      <div style={{padding:"18px 22px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:14,fontFamily:"'Inter',sans-serif",color:a,letterSpacing:"0.04em",fontWeight:700}}>{title}</div>
            {subtitle&&<div style={{fontSize:13,color:t.txtMute,marginTop:2}}>{subtitle}</div>}
          </div>
          {tag&&(typeof tag==="string"
            ?<div style={{fontSize:13,color:a,fontFamily:"'DM Mono',monospace",background:`${a}12`,border:`1px solid ${a}28`,borderRadius:3,padding:"2px 8px"}}>{tag}</div>
            :<div>{tag}</div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function CyberTip({ active, payload, label }) {
  const t=useT();
  if(!active||!payload?.length)return null;
  return (
    <div style={{background:t.panel,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",fontFamily:"'DM Mono',monospace",backdropFilter:"blur(20px)"}}>
      <div style={{color:t.accent,fontSize:14,marginBottom:6}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{fontSize:13,color:p.color||t.txt}}>{p.name}: <strong>{p.value}</strong></div>)}
    </div>
  );
}

function Toggle({ isDark, onToggle }) {
  return (
    <button onClick={onToggle} style={{position:"relative",width:64,height:30,borderRadius:15,cursor:"pointer",padding:0,overflow:"hidden",background:isDark?"linear-gradient(135deg,#020609,#001828)":"linear-gradient(135deg,#dce8ff,#eff6ff)",border:`1.5px solid ${isDark?"rgba(0,204,255,0.42)":"rgba(0,60,140,0.26)"}`,boxShadow:isDark?"0 0 12px rgba(0,204,255,0.16)":"0 2px 8px rgba(0,60,140,0.09)",transition:"all .4s cubic-bezier(0.34,1.56,0.64,1)"}}>
      <span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",fontSize:14,opacity:isDark?.88:.28,transition:"opacity .3s"}}>🌙</span>
      <span style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",fontSize:14,opacity:isDark?.28:.92,transition:"opacity .3s"}}>☀️</span>
      <div style={{position:"absolute",top:3,left:isDark?3:37,width:22,height:22,borderRadius:"50%",background:isDark?"linear-gradient(135deg,#00ccff,#0055bb)":"linear-gradient(135deg,#fbbf24,#f59e0b)",boxShadow:isDark?"0 0 10px rgba(0,204,255,0.65)":"0 2px 6px rgba(251,191,36,0.55)",transition:"all .4s cubic-bezier(0.34,1.56,0.64,1)"}}/>
    </button>
  );
}

function Glitch({ text, size=14 }) {
  const t=useT(); const [g,setG]=useState(false);
  useEffect(()=>{
    if(t.id!=="dark")return;
    const id=setInterval(()=>{setG(true);setTimeout(()=>setG(false),120);},5000+Math.random()*3000);
    return()=>clearInterval(id);
  },[t.id]);
  return (
    <span style={{position:"relative",fontSize:size,fontWeight:900,color:t.accent,fontFamily:"'Inter',sans-serif",letterSpacing:"0.02em",display:"inline-block"}}>
      {g&&<><span style={{position:"absolute",left:2,top:0,color:t.red,clipPath:"polygon(0 15%,100% 15%,100% 38%,0 38%)",opacity:.9}}>{text}</span><span style={{position:"absolute",left:-2,top:0,color:t.green,clipPath:"polygon(0 62%,100% 62%,100% 82%,0 82%)",opacity:.9}}>{text}</span></>}
      {text}
    </span>
  );
}

function Skeleton({ h=16, w="100%", mb=8 }) {
  const t=useT();
  return <div style={{height:h,width:w,background:`${t.border}`,borderRadius:4,marginBottom:mb,animation:"skeletonPulse 1.4s ease infinite"}}/>;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI CIVIC COPILOT PANEL
// ══════════════════════════════════════════════════════════════════════════════
function AICivicCopilotPanel({ theme, isDark, riskSummary={}, events=[], alerts=[], predictions=[] }) {
  const localAnswer = (query) => {
    const q = query.toLowerCase();
    const riskEntries = Object.entries(riskSummary).sort((a,b)=>b[1]-a[1]);
    const high = riskEntries.filter(([,s])=>s>=70);
    if (q.includes("high risk")||q.includes("risk cit")) {
      if (riskEntries.length===0) return "No risk data available yet. Submit complaints to generate risk scores.";
      return "Top risk cities: "+riskEntries.slice(0,5).map(([c,s])=>c+" ("+s+")").join(", ")+"\n\nCritical (≥70): "+(high.length>0?high.map(([c,s])=>c+" - "+s).join(", "):"None currently")+"\n\nTotal monitored: "+riskEntries.length+" cities.";
    }
    if (q.includes("alert")) { if(alerts.length===0) return "No active alerts right now."; return "Active alerts ("+alerts.length+" total):\n\n"+alerts.slice(0,5).map((a,i)=>(i+1)+". "+(typeof a==="string"?a:JSON.stringify(a))).join("\n"); }
    if (q.includes("predict")||q.includes("forecast")) { if(predictions.length===0) return "No predictions available yet."; return "AI Crisis Predictions ("+predictions.length+"):\n\n"+predictions.slice(0,5).map((p,i)=>(i+1)+". "+(typeof p==="string"?p:p.prediction||p.issue||JSON.stringify(p))).join("\n"); }
    if (q.includes("complaint")||q.includes("report")||q.includes("event")) { if(events.length===0) return "No complaint events yet."; const cities=[...new Set(events.map(e=>e.city||e.location).filter(Boolean))].slice(0,6); return "Total complaints: "+events.length+"\n\nCities: "+cities.join(", ")+"\n\nLatest: "+(events[0]?(events[0].city||events[0].location||"Unknown")+" - "+(events[0].issue||events[0].text||""):"N/A"); }
    const cityMatch = riskEntries.find(([c])=>q.includes(c.toLowerCase()));
    if (cityMatch) { const [name,score]=cityMatch; const cityEvents=events.filter(e=>(e.city||e.location||"").toLowerCase()===name.toLowerCase()); return name+" Risk Report:\n\nScore: "+score+"/100 - "+riskLabel(score)+"\nComplaints: "+cityEvents.length+" recorded\n"+(score>=70?"Immediate intervention recommended.":"Status within manageable range."); }
    return null;
  };

  const [messages, setMessages] = useState([{ role:"system", text:"AI Civic Copilot ready. Ask me anything about civic issues, risk levels, or specific cities.", ts:new Date().toLocaleTimeString() }]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const SUGGESTIONS = ["What are the high risk cities right now?","Water crisis in Mumbai","Predict upcoming issues in Delhi","Which ward has the most complaints?"];

  useEffect(()=>{ if(bottomRef.current) bottomRef.current.scrollIntoView({behavior:"smooth"}); },[messages]);

  const send = async (q) => {
    const query=(q||input).trim(); if(!query) return;
    setInput(""); setMessages(prev=>[...prev,{role:"user",text:query,ts:new Date().toLocaleTimeString()}]); setLoading(true);
    const extractText=(data)=>{ if(!data)return null; if(typeof data==="string")return data; if(data.status==="no_data"||data.status==="empty")return null; return data.response||data.answer||data.ai_analysis||data.insight||data.message||data.result||null; };
    let reply=null;
    try { const res=await fetch(`${API}/ai-civic-copilot?query=${encodeURIComponent(query)}`); const data=await res.json(); reply=extractText(data); } catch(_) {}
    if(!reply) { try { const res=await fetch(`${API}/ai-insight?query=${encodeURIComponent(query)}`); const data=await res.json(); reply=extractText(data); if(reply)reply="💡 [via /ai-insight]\n\n"+reply; } catch(e){reply=null;} }
    if(!reply) { const local=localAnswer(query); reply=local?"[Live Data] "+local:"Backend AI returned no data. Try: high risk cities, active alerts, predictions, or a city name."; }
    setMessages(prev=>[...prev,{role:"assistant",text:reply,ts:new Date().toLocaleTimeString()}]); setLoading(false);
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:14,height:"calc(100vh - 160px)",minHeight:500}}>
      <Panel title="AI CIVIC COPILOT" subtitle="/ai-civic-copilot · chatbot-style civic intelligence" acc={theme.green} tag="AI-LIVE" style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,paddingRight:4,marginBottom:12}}>
          {messages.map((m,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",animation:"fadeUp .25s ease"}}>
              <div style={{maxWidth:"85%",padding:"11px 14px",borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.role==="user"?`${theme.accent}18`:m.role==="error"?`${theme.red}10`:m.role==="system"?`${theme.amber}08`:`${theme.green}08`,border:`1px solid ${m.role==="user"?theme.accent:m.role==="error"?theme.red:m.role==="system"?theme.amber:theme.green}25`}}>
                <div style={{fontSize:13,color:m.role==="user"?theme.accent:m.role==="error"?theme.red:m.role==="system"?"rgba(255,184,0,.75)":isDark?"#b8daff":theme.txt,lineHeight:1.7,fontFamily:"'DM Mono',monospace",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{m.text}</div>
                <div style={{fontSize:9.5,color:theme.txtMute,marginTop:4,fontFamily:"'DM Mono',monospace"}}>{m.ts}</div>
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:`${theme.green}06`,border:`1px solid ${theme.green}18`,borderRadius:10,maxWidth:"60%"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:theme.green,animation:`pulse 1.2s ease ${i*.2}s infinite`}}/>)}<span style={{fontSize:12,color:theme.green,fontFamily:"'DM Mono',monospace"}}>AI thinking…</span></div>}
          <div ref={bottomRef}/>
        </div>
        <div style={{display:"flex",gap:8,borderTop:`1px solid ${theme.border}`,paddingTop:12}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&send()} placeholder="Ask about any civic issue, city, or risk…" style={{flex:1,background:theme.inputBg,border:`1.5px solid ${theme.inputBorder}`,borderRadius:9,padding:"11px 14px",fontSize:13,color:theme.inputTxt,outline:"none",fontFamily:"'Inter',sans-serif",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderColor=theme.inputFocus} onBlur={e=>e.target.style.borderColor=theme.inputBorder}/>
          <button onClick={()=>!loading&&send()} disabled={loading||!input.trim()} style={{padding:"11px 18px",background:loading||!input.trim()?`${theme.green}08`:`${theme.green}18`,border:`1px solid ${theme.green}${loading||!input.trim()?"20":"45"}`,borderRadius:9,color:loading||!input.trim()?`${theme.green}40`:theme.green,fontSize:13,fontWeight:700,cursor:loading||!input.trim()?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",transition:"all .18s"}}>{loading?"…":"Send"}</button>
        </div>
      </Panel>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Panel title="QUICK QUERIES" subtitle="Click to ask instantly" acc={theme.amber}>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {SUGGESTIONS.map((s,i)=>(
              <button key={i} onClick={()=>!loading&&send(s)} style={{padding:"10px 12px",background:`${theme.amber}08`,border:`1px solid ${theme.amber}20`,borderRadius:8,color:theme.amber,fontSize:12.5,cursor:loading?"not-allowed":"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",lineHeight:1.4,transition:"all .18s",opacity:loading?.55:1}} onMouseEnter={e=>!loading&&(e.currentTarget.style.background=`${theme.amber}14`)} onMouseLeave={e=>(e.currentTarget.style.background=`${theme.amber}08`)}>💬 {s}</button>
            ))}
          </div>
        </Panel>
        <Panel title="ENDPOINT" subtitle="Direct API access" acc={theme.accent}>
          <div style={{fontSize:11,color:theme.txtMute,fontFamily:"'DM Mono',monospace",lineHeight:1.8,wordBreak:"break-all"}}>
            <div style={{color:theme.accent,marginBottom:4}}>GET /ai-civic-copilot</div>
            <div>?query=your+question</div>
            <div style={{marginTop:8,color:theme.txtMute,opacity:.6}}>{API}/ai-civic-copilot</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function OfficerDashboard({ user, onReport, onLogout }) {
  const [isDark, setIsDark]     = useState(true);
  const theme                   = isDark ? DARK : LIGHT;
  const [time, setTime]         = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCity, setSelectedCity] = useState(null);
  const [drillCity, setDrillCity]       = useState(null);
  const [myReports, setMyReports]       = useState([]);
  const [myReportsLoading, setMyReportsLoading] = useState(false);

  const {
    events, riskSummary, issueTrends, alerts, predictions,
    aiInsight, knowledgeGraph, loading, error, lastSync, connected,
    wsEvents, wsConnected, dashboard, riskMap,
  } = useDashboard();

  useEffect(() => { const id=setInterval(()=>setTime(new Date()),1000); return()=>clearInterval(id); }, []);

  useEffect(() => {
    if (activeTab !== "myreports") return;
    setMyReportsLoading(true);
    fetch(`${API}/events`).then(r=>r.json()).then(d=>{ const all=Array.isArray(d)?d:(d.events||[]); setMyReports(all.slice(0,20)); }).catch(()=>setMyReports([])).finally(()=>setMyReportsLoading(false));
  }, [activeTab]);

  const riskEntries  = useMemo(()=>Object.entries(riskSummary||{}).map(([city,score])=>({city,score})).sort((a,b)=>b.score-a.score),[riskSummary]);
  const trendEntries = useMemo(()=>Object.entries(issueTrends||{}).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value),[issueTrends]);
  const avgRisk      = useMemo(()=>riskEntries.length?Math.round(riskEntries.reduce((s,c)=>s+c.score,0)/riskEntries.length):0,[riskEntries]);
  const criticalCount= useMemo(()=>riskEntries.filter(c=>c.score>=70).length,[riskEntries]);
  const eventList    = Array.isArray(events)?events:[];
  const alertList    = Array.isArray(alerts)?alerts:[];
  const predList     = Array.isArray(predictions)?predictions:[];
  const wsEventList  = Array.isArray(wsEvents)?wsEvents:[];

  const dashKPIs = useMemo(()=>{
    const base=(dashboard&&typeof dashboard==="object")?dashboard:{};
    return {
      total_complaints:  (base.total_complaints >0?base.total_complaints :null)??eventList.length,
      high_risk_cities:  (base.high_risk_cities  >0?base.high_risk_cities :null)??criticalCount,
      active_alerts:     (base.active_alerts     >0?base.active_alerts    :null)??alertList.length,
      predictions_count: (base.predictions_count >0?base.predictions_count:null)??predList.length,
    };
  },[dashboard,eventList,criticalCount,alertList,predList]);

  const radarData = useMemo(()=>riskEntries.slice(0,6).map(c=>({city:c.city.slice(0,3).toUpperCase(),score:c.score})),[riskEntries]);

  const NAV_ITEMS = [
    { id:"overview",     icon:"⬡",  label:"Overview",         sub:"Live dashboard" },
    { id:"intelligence", icon:"🧠",  label:"Intelligence",     sub:"AI copilot · alerts" },
    { id:"copilot",      icon:"💬",  label:"AI Civic Copilot", sub:"/ai-civic-copilot" },
    { id:"livestream",   icon:"⚡",  label:"Live Stream",      sub:"WebSocket events" },
    { id:"analytics",    icon:"📊",  label:"Analytics",        sub:"Risk · events · trends" },
    { id:"graph",        icon:"🕸",  label:"Knowledge Graph",  sub:"Entity connections" },
  ];

  const userInitial = user?.provider==="google"?"G":user?.name?user.name[0].toUpperCase():"👤";

  return (
    <Ctx.Provider value={theme}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${theme.bg};margin:0;transition:background .5s;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
        input,button,select,textarea{font-family:'Inter',sans-serif;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${theme.accent}35;border-radius:4px;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.6)}}
        @keyframes glow{0%,100%{box-shadow:0 0 4px ${theme.accent}20}50%{box-shadow:0 0 18px ${theme.accent}40}}
        @keyframes skeletonPulse{0%,100%{opacity:.4}50%{opacity:.9}}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        input::placeholder{color:${theme.txtMute};}
      `}</style>

      <Particles isDark={isDark}/>
      {isDark&&<div style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.02) 2px,rgba(0,0,0,0.02) 4px)"}}/>}

      <div style={{position:"relative",zIndex:2,display:"flex",minHeight:"100vh",background:theme.bgGrad,transition:"background .5s"}}>

        {/* ════════ SIDEBAR ════════ */}
        <aside style={{width:220,flexShrink:0,height:"100vh",position:"sticky",top:0,background:isDark?"rgba(2,5,14,0.97)":"rgba(248,252,255,0.98)",borderRight:`1px solid ${theme.border}`,backdropFilter:"blur(28px)",display:"flex",flexDirection:"column",zIndex:110,transition:"background .4s",boxShadow:isDark?"2px 0 32px rgba(0,0,0,.5)":"2px 0 20px rgba(0,0,0,.06)"}}>
          <div style={{padding:"20px 18px 16px",borderBottom:`1px solid ${theme.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:36,height:36,borderRadius:9,background:`${theme.accent}14`,border:`1px solid ${theme.accent}38`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,animation:"glow 4s infinite"}}>🏛</div>
                <div style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:connected?theme.green:theme.red,animation:"pulseDot 2s infinite",boxShadow:`0 0 6px ${connected?theme.green:theme.red}`}}/>
              </div>
              <div><Glitch text="CIVICSENTINEL" size={13}/><div style={{fontSize:9,color:theme.txtMute,letterSpacing:"0.08em",marginTop:1}}>DIGITAL DEMOCRACY</div></div>
            </div>
            <div style={{fontSize:18,fontFamily:"'DM Mono',monospace",fontWeight:900,color:theme.accent,letterSpacing:"0.02em",marginTop:6,lineHeight:1}}>{time.toLocaleTimeString("en-US",{hour12:false})}</div>
            <div style={{fontSize:10,color:theme.txtMute,marginTop:2}}>{lastSync?`SYNCED ${lastSync.toLocaleTimeString()}`:"CONNECTING…"}</div>
          </div>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${theme.border}`,display:"flex",flexDirection:"column",gap:6}}>
            {[{l:"AVG RISK",v:loading?"…":avgRisk||"—",c:riskCol(avgRisk,isDark)},{l:"CRITICAL",v:loading?"…":`${criticalCount} CITIES`,c:theme.red},{l:"ALERTS",v:loading?"…":`${alertList.length} ACTIVE`,c:theme.amber}].map(({l,v,c})=>(
              <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",background:`${c}09`,border:`1px solid ${c}22`,borderRadius:6}}>
                <span style={{fontSize:10,color:theme.txtMute,letterSpacing:"0.05em"}}>{l}</span>
                <span style={{fontSize:11,fontWeight:700,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</span>
              </div>
            ))}
          </div>
          <nav style={{flex:1,padding:"10px 10px",display:"flex",flexDirection:"column",gap:3,overflowY:"auto"}}>
            {NAV_ITEMS.map(item=>{
              const isActive=activeTab===item.id;
              return (
                <button key={item.id} onClick={()=>setActiveTab(item.id)}
                  style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"none",background:isActive?`${theme.accent}14`:"transparent",borderLeft:isActive?`3px solid ${theme.accent}`:"3px solid transparent",cursor:"pointer",textAlign:"left",transition:"all .18s",display:"flex",alignItems:"center",gap:11,boxShadow:isActive?`inset 0 0 20px ${theme.accent}08`:"none"}}
                  onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background=`${theme.accent}09`; }}
                  onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background="transparent"; }}>
                  <span style={{fontSize:16,flexShrink:0,width:24,textAlign:"center"}}>{item.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:isActive?700:500,color:isActive?theme.accent:theme.txt,lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
                    <div style={{fontSize:10,color:theme.txtMute,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.sub}</div>
                  </div>
                  {isActive&&<div style={{width:5,height:5,borderRadius:"50%",background:theme.accent,flexShrink:0}}/>}
                </button>
              );
            })}
          </nav>
          <div style={{padding:"12px 14px",borderTop:`1px solid ${theme.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:`${theme.accent}18`,border:`1px solid ${theme.accent}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{userInitial}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:theme.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name||"Citizen"}</div>
                <div style={{fontSize:10,color:theme.txtMute,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email||"Guest"}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <Toggle isDark={isDark} onToggle={()=>setIsDark(d=>!d)}/>
              <div style={{flex:1}}/>
              {onLogout&&<button onClick={onLogout} style={{background:"rgba(255,60,60,.08)",border:"1px solid rgba(255,60,60,.2)",borderRadius:6,padding:"5px 10px",color:"rgba(255,100,100,.7)",fontSize:10,fontWeight:600,cursor:"pointer",letterSpacing:"0.04em",transition:"all .18s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,60,60,.16)";e.currentTarget.style.color="#ff6060";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,60,60,.08)";e.currentTarget.style.color="rgba(255,100,100,.7)";}}>LOGOUT</button>}
            </div>
          </div>
        </aside>

        {/* ════════ MAIN ════════ */}
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
          <header style={{height:52,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",borderBottom:`1px solid ${theme.border}`,background:isDark?"rgba(2,6,9,0.72)":"rgba(248,252,255,0.72)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:90,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,color:theme.txtMute,letterSpacing:"0.06em"}}>CIVICSENTINEL</span>
              <span style={{color:theme.txtMute,fontSize:10}}>/</span>
              <span style={{fontSize:12,fontWeight:700,color:theme.accent,letterSpacing:"0.04em"}}>{NAV_ITEMS.find(n=>n.id===activeTab)?.label?.toUpperCase()||"OVERVIEW"}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:connected?theme.green:theme.red,fontFamily:"'DM Mono',monospace"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:connected?theme.green:theme.red,animation:"pulseDot 2s infinite",display:"inline-block"}}/>
                {connected?"REST LIVE":"REST OFFLINE"}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:wsConnected?theme.accent:"rgba(150,150,150,.5)",fontFamily:"'DM Mono',monospace"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:wsConnected?theme.accent:"rgba(150,150,150,.4)",animation:wsConnected?"pulseDot 1.5s infinite":"none",display:"inline-block"}}/>
                {wsConnected?"WS LIVE":"WS CONNECTING"}
              </div>
              {wsEventList.length>0&&<div style={{fontSize:10,background:`${theme.accent}14`,border:`1px solid ${theme.accent}30`,borderRadius:20,padding:"2px 9px",color:theme.accent,fontFamily:"'DM Mono',monospace"}}>⚡ {wsEventList.length} LIVE</div>}
            </div>
          </header>

          {loading&&!connected&&<div style={{margin:"10px 24px 0",padding:"9px 16px",background:`${theme.amber}10`,border:`1px solid ${theme.amber}28`,borderRadius:6,display:"flex",alignItems:"center",gap:10,fontSize:13,color:theme.amber,fontFamily:"'DM Mono',monospace",animation:"fadeUp .3s ease"}}><span style={{animation:"blink 1s infinite"}}>⏳</span><span>Waking up backend — first request may take <strong>~30s</strong>…</span><span style={{marginLeft:"auto",fontSize:12,opacity:.5}}>{API}</span></div>}
          {error&&connected===false&&lastSync&&<div style={{margin:"10px 24px 0",padding:"9px 16px",background:`${theme.red}10`,border:`1px solid ${theme.red}28`,borderRadius:6,fontSize:13,color:theme.red,fontFamily:"'DM Mono',monospace"}}>⚠ {error} — Retrying every {POLL_MS/1000}s</div>}

          <div style={{padding:"20px 28px 36px",animation:"fadeUp .5s ease",flex:1}}>

            {/* ════════ OVERVIEW ════════ */}
            {activeTab==="overview" && (<>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
                {[
                  {l:"TOTAL COMPLAINTS", v:loading?null:(dashKPIs.total_complaints||eventList.length), sub:"From /dashboard",             col:theme.accent},
                  {l:"AVG RISK INDEX",   v:loading?null:avgRisk,                                       sub:"Across monitored cities",      col:riskCol(avgRisk,isDark)},
                  {l:"HIGH RISK CITIES", v:loading?null:(dashKPIs.high_risk_cities||criticalCount),    sub:"Score ≥ 70 · critical",        col:theme.red},
                  {l:"ACTIVE ALERTS",    v:loading?null:(dashKPIs.active_alerts||alertList.length),    sub:`${alertList.filter(a=>(a||"").toLowerCase().includes("high")).length} HIGH RISK`,col:theme.amber},
                  {l:"AI PREDICTIONS",   v:loading?null:(dashKPIs.predictions_count||predList.length), sub:"Crisis forecasts · /predictions",col:theme.green},
                ].map((k,i)=>(
                  <Panel key={k.l} acc={k.col} tag={`N-${i+1}`} style={{animation:`fadeUp .4s ease ${i*.07}s both`}}>
                    <div style={{fontSize:14,fontFamily:"'Inter',sans-serif",color:theme.txtMute,letterSpacing:"0.05em",marginBottom:8}}>{k.l}</div>
                    {k.v===null?<><Skeleton h={36} mb={8}/><Skeleton h={10} w="60%"/></>:<><div style={{fontSize:36,fontWeight:900,color:k.col,fontFamily:"'Inter',sans-serif",lineHeight:1}}>{k.v}</div><div style={{fontSize:14,color:theme.txtMute,marginTop:6}}>{k.sub}</div></>}
                    <div style={{display:"flex",gap:1.5,alignItems:"flex-end",height:18,marginTop:10}}>{Array.from({length:20},(_,j)=>(<div key={j} style={{flex:1,height:`${20+Math.abs(Math.sin(j*.65))*(k.v||30)}%`,maxHeight:"100%",background:`${k.col}45`,borderRadius:"1px 1px 0 0"}}/>))}</div>
                  </Panel>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1.1fr .95fr 290px",gap:12,marginBottom:12}}>
                {/* ── HEATMAP PANEL ── */}
                <Panel
                  title={drillCity ? `${drillCity.toUpperCase()} — WARD RISK MAP` : "INDIA RISK HEATMAP"}
                  subtitle={drillCity ? "8 wards · risk derived from live data · hover for details" : "LIVE · /risk-summary · click a city to drill into wards"}
                  acc={theme.accent}
                  tag={
                    // ── FIX: Dropdown now shows ALL 44 cities (sorted A-Z),
                    //         not just cities with risk data ──
                    <select
                      value={drillCity || ""}
                      onChange={e => setDrillCity(e.target.value || null)}
                      style={{
                        background: theme.panel,
                        border: `1px solid ${theme.accent}40`,
                        borderRadius: 4,
                        color: theme.accent,
                        fontSize: 11,
                        fontFamily: "'Inter',sans-serif",
                        fontWeight: 600,
                        padding: "3px 8px",
                        cursor: "pointer",
                        outline: "none",
                        maxWidth: 220,
                      }}
                    >
                      <option value="">🗺 India Overview</option>
                      {ALL_CITIES.map(city => {
                        const score = riskSummary?.[city];
                        const hasData = score !== undefined;
                        // Show risk score inline if available, otherwise show city name only
                        const label = hasData
                          ? `${WARD_GEOJSON[city] ? "📍" : "🏙"} ${city} — Risk: ${score}`
                          : `🏙 ${city}`;
                        return (
                          <option key={city} value={city}>{label}</option>
                        );
                      })}
                    </select>
                  }
                >
                  {loading && !riskEntries.length ? (
                    <div style={{height:320}}><Skeleton h={320}/></div>
                  ) : drillCity ? (
                    <div style={{animation:"fadeUp .3s ease"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                        <button onClick={()=>setDrillCity(null)} style={{background:`${theme.accent}12`,border:`1px solid ${theme.accent}30`,color:theme.accent,borderRadius:5,padding:"5px 12px",cursor:"pointer",fontSize:12,fontFamily:"'Inter',sans-serif",fontWeight:600,display:"flex",alignItems:"center",gap:6}}>← Back to India</button>
                        {riskSummary[drillCity]!==undefined&&(
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:12,color:theme.txtMute,fontFamily:"'Inter',sans-serif"}}>City Risk:</span>
                            <span style={{fontSize:15,fontWeight:700,color:riskCol(riskSummary[drillCity],isDark),fontFamily:"'DM Mono',monospace"}}>{riskSummary[drillCity]}/100</span>
                            <span style={{fontSize:11,color:riskCol(riskSummary[drillCity],isDark),background:`${riskCol(riskSummary[drillCity],isDark)}15`,border:`1px solid ${riskCol(riskSummary[drillCity],isDark)}30`,borderRadius:4,padding:"2px 8px",fontFamily:"'Inter',sans-serif",fontWeight:600}}>{riskLabel(riskSummary[drillCity])}</span>
                          </div>
                        )}
                      </div>
                      {WARD_GEOJSON[drillCity] ? (
                        <>
                          <CityWardMap cityKey={drillCity} cityRisk={riskSummary[drillCity]||0} isDark={isDark}/>
                          <div style={{marginTop:12,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                            {WARD_GEOJSON[drillCity].features.map(f=>{
                              const cityScore=riskSummary[drillCity]||0;
                              const risk=cityScore>0?Math.min(99,Math.max(5,cityScore+f.properties.offset)):0;
                              const col=risk>0?riskCol(risk,isDark):"rgba(150,180,200,0.35)";
                              return (
                                <div key={f.properties.name} style={{padding:"7px 10px",background:risk>0?`${col}10`:"rgba(255,255,255,.03)",border:`1px solid ${risk>0?col+"28":"rgba(255,255,255,.06)"}`,borderRadius:5,textAlign:"center"}}>
                                  <div style={{fontSize:11,color:theme.txtMute,fontFamily:"'Inter',sans-serif",marginBottom:3}}>{f.properties.name}</div>
                                  <div style={{fontSize:14,fontWeight:700,color:col,fontFamily:"'DM Mono',monospace"}}>{risk>0?risk:"—"}</div>
                                  <div style={{width:"100%",height:3,borderRadius:2,background:"rgba(255,255,255,.06)",marginTop:5}}><div style={{height:"100%",width:`${risk}%`,background:col,borderRadius:2}}/></div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        // City selected from dropdown but no ward data — show message
                        <div style={{height:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,color:theme.txtMute,fontSize:13,fontFamily:"'Inter',sans-serif"}}>
                          <div style={{fontSize:32}}>🏙</div>
                          <div>{drillCity} is on the monitoring list.</div>
                          <div style={{fontSize:12,opacity:.6}}>Ward-level data not yet available for this city.</div>
                          {riskSummary[drillCity]!==undefined&&<div style={{fontSize:13,color:riskCol(riskSummary[drillCity],isDark),fontWeight:700}}>City Risk Score: {riskSummary[drillCity]}/100 · {riskLabel(riskSummary[drillCity])}</div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <IndiaMap riskSummary={riskSummary} isDark={isDark} onCitySelect={city=>setDrillCity(city)} drillCity={drillCity}/>
                  )}
                </Panel>

                {/* Charts column */}
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <Panel title="ISSUE TRENDS" subtitle="/issue-trends · civic category counts" acc={theme.amber} tag="BAR">
                    {loading&&!trendEntries.length?<Skeleton h={148}/>:trendEntries.length
                      ?<ResponsiveContainer width="100%" height={148}><BarChart data={trendEntries} margin={{top:4,right:4,bottom:0,left:-26}}><CartesianGrid strokeDasharray="2 4" stroke={theme.grid} vertical={false}/><XAxis dataKey="name" tick={{fill:theme.tick,fontSize:13,fontFamily:"'DM Mono',monospace"}} axisLine={false} tickLine={false}/><YAxis tick={{fill:theme.tick,fontSize:11}} axisLine={false} tickLine={false}/><Tooltip content={<CyberTip/>}/><Bar dataKey="value" name="COUNT" radius={[4,4,0,0]}>{trendEntries.map((_,i)=><Cell key={i} fill={[theme.accent,theme.amber,theme.red,theme.green,theme.accent][i%5]}/>)}</Bar></BarChart></ResponsiveContainer>
                      :<div style={{height:148,display:"flex",alignItems:"center",justifyContent:"center",color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace"}}>⏳ Waiting for data…</div>}
                  </Panel>
                  <Panel title="CITY RISK RADAR" subtitle="/risk-summary · multi-axis view" acc={theme.accent}>
                    {loading&&!radarData.length?<Skeleton h={148}/>:radarData.length
                      ?<ResponsiveContainer width="100%" height={148}><RadarChart data={radarData} margin={{top:0,right:20,bottom:0,left:20}}><PolarGrid stroke={isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"}/><PolarAngleAxis dataKey="city" tick={{fill:theme.tick,fontSize:13,fontFamily:"'Inter',sans-serif"}}/><Radar name="Risk" dataKey="score" stroke={theme.accent} fill={theme.accent} fillOpacity={.12} strokeWidth={1.5}/><Tooltip content={<CyberTip/>}/></RadarChart></ResponsiveContainer>
                      :<div style={{height:148,display:"flex",alignItems:"center",justifyContent:"center",color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace"}}>⏳ Loading…</div>}
                  </Panel>
                </div>

                {/* Alert panel */}
                <Panel title="AI ALERT FEED" subtitle={`/alerts · ${alertList.length} active`} acc={theme.red} tag="LIVE">
                  <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:490,overflowY:"auto"}}>
                    {loading&&!alertList.length?Array.from({length:4},(_,i)=><Skeleton key={i} h={60} mb={0}/>):alertList.length
                      ?alertList.map((a,i)=>{const txt=typeof a==="string"?a:(a.message||a.alert||JSON.stringify(a));const {col,label}=severityFromText(txt,theme);return(<div key={i} style={{padding:"9px 11px",background:`${col}08`,border:`1px solid ${col}20`,borderLeft:`3px solid ${col}`,borderRadius:3,animation:`fadeUp .3s ease ${i*.05}s both`}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>{col===theme.red&&<span style={{width:5,height:5,borderRadius:"50%",background:theme.red,display:"inline-block",animation:"pulseDot 1s infinite"}}/>}<span style={{fontSize:13,fontFamily:"'Inter',sans-serif",color:col,letterSpacing:"0.01em"}}>{label}</span></div><div style={{fontSize:13,color:theme.txtSub,lineHeight:1.5}}>{txt}</div></div>);})
                      :<div style={{color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace",padding:"20px 0",textAlign:"center"}}>⏳ No alerts yet…</div>}
                  </div>
                </Panel>
              </div>

              {/* Bottom row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Panel title="AI CIVIC COPILOT" subtitle="REAL RAG+LLM · /ai-insight endpoint" acc={theme.green} tag="AI-LIVE" style={{minHeight:420}}>
                  <AIInsightPanel insight={aiInsight} loading={loading} error={error}/>
                </Panel>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <Panel title="CRISIS PREDICTIONS" subtitle={`/predictions · ${predList.length} forecasts`} acc={theme.amber}>
                    <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:200,overflowY:"auto"}}>
                      {loading&&!predList.length?Array.from({length:3},(_,i)=><Skeleton key={i} h={48} mb={0}/>):predList.length?predList.map((p,i)=>{const txt=typeof p==="string"?p:(p.prediction||p.message||JSON.stringify(p));return(<div key={i} style={{padding:"9px 12px",background:`${theme.amber}08`,border:`1px solid ${theme.amber}22`,borderRadius:5,display:"flex",gap:9,animation:`fadeUp .3s ease ${i*.07}s both`}}><span style={{fontSize:14,flexShrink:0}}>🔮</span><div><div style={{fontSize:13,color:theme.amber,fontFamily:"'Inter',sans-serif",marginBottom:3}}>AI FORECAST</div><div style={{fontSize:13,color:theme.txtSub,lineHeight:1.55}}>{txt}</div></div></div>);}):(<div style={{color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace",padding:"16px 0",textAlign:"center"}}>⏳ Loading predictions…</div>)}
                    </div>
                  </Panel>
                  <Panel title="RECENT EVENTS" subtitle={`/events · latest ${Math.min(eventList.length,5)} of ${eventList.length}`} acc={theme.accent}>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {loading&&!eventList.length?Array.from({length:3},(_,i)=><Skeleton key={i} h={42} mb={0}/>):eventList.slice(0,5).map((e,i)=>{const loc=e.location||e.city||"—";const issue=e.issue||"—";const risk=e.risk_score??e.risk??0;const sent=e.sentiment??0;return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${theme.border}22`,animation:`fadeUp .3s ease ${i*.05}s both`}}><div style={{width:6,height:6,borderRadius:"50%",background:riskCol(risk,isDark),flexShrink:0,boxShadow:isDark?`0 0 5px ${riskCol(risk,isDark)}`:"none"}}/><div style={{flex:1}}><div style={{fontSize:13,color:theme.accent,fontFamily:"'Inter',sans-serif",fontWeight:700}}>{loc}<span style={{color:theme.txtMute,fontWeight:400,fontSize:11}}> — {issue}</span></div>{e.text&&<div style={{fontSize:14,color:theme.txtMute,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:280}}>{e.text}</div>}</div><div style={{fontSize:13,color:riskCol(risk,isDark),fontFamily:"'Inter',sans-serif",fontWeight:700,flexShrink:0}}>{risk}</div><div style={{fontSize:14,color:sent<0?theme.red:theme.green,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{typeof sent==="number"?sent.toFixed(2):"—"}</div></div>);})}
                    </div>
                  </Panel>
                </div>
              </div>
            </>)}

            {/* ════════ INTELLIGENCE ════════ */}
            {activeTab==="intelligence"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,animation:"slideIn .4s ease"}}><Panel title="AI CIVIC COPILOT" subtitle="FULL INTERFACE · /ai-insight · RAG+LLM powered" acc={theme.green} tag="AI-LIVE" style={{minHeight:580}}><AIInsightPanel insight={aiInsight} loading={loading} error={error}/></Panel><div style={{display:"flex",flexDirection:"column",gap:12}}><Panel title="CRISIS PREDICTIONS" subtitle={`/predictions · ${predList.length} active`} acc={theme.amber}><div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:260,overflowY:"auto"}}>{predList.map((p,i)=>{const txt=typeof p==="string"?p:(p.prediction||p.message||JSON.stringify(p));return(<div key={i} style={{padding:"9px 12px",background:`${theme.amber}08`,border:`1px solid ${theme.amber}22`,borderRadius:5,display:"flex",gap:9}}><span style={{fontSize:14}}>🔮</span><div><div style={{fontSize:13,color:theme.amber,fontFamily:"'Inter',sans-serif",marginBottom:3}}>AI FORECAST</div><div style={{fontSize:13,color:theme.txtSub,lineHeight:1.55}}>{txt}</div></div></div>);})} {!predList.length&&<div style={{color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace",padding:"16px 0",textAlign:"center"}}>⏳ Loading…</div>}</div></Panel><Panel title="AI ALERT FEED" subtitle="/alerts · real-time classification" acc={theme.red}><div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:260,overflowY:"auto"}}>{alertList.map((a,i)=>{const txt=typeof a==="string"?a:(a.message||a.alert||JSON.stringify(a));const {col,label}=severityFromText(txt,theme);return(<div key={i} style={{padding:"8px 11px",background:`${col}08`,borderLeft:`3px solid ${col}`,borderRadius:3,marginBottom:4}}><div style={{fontSize:13,color:col,fontFamily:"'Inter',sans-serif",marginBottom:3}}>{label}</div><div style={{fontSize:13,color:theme.txtSub,lineHeight:1.5}}>{txt}</div></div>);})}{!alertList.length&&<div style={{color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace",padding:"16px 0",textAlign:"center"}}>⏳ Loading…</div>}</div></Panel></div></div>)}

            {/* ════════ ANALYTICS ════════ */}
            {activeTab==="analytics"&&(<div style={{animation:"slideIn .4s ease"}}><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>{(loading&&!riskEntries.length?Array.from({length:8},(_,i)=>({city:`CITY-${i+1}`,score:0,_loading:true})):riskEntries).map((c,i)=>(<Panel key={c.city} acc={c._loading?theme.accent:riskCol(c.score,isDark)} style={{animation:`fadeUp .4s ease ${i*.05}s both`,cursor:c._loading?"default":"pointer"}}><div style={{textAlign:"center"}} onClick={()=>!c._loading&&setSelectedCity(c.city)}><div style={{fontSize:13,color:theme.txtMute,fontFamily:"'Inter',sans-serif",marginBottom:10}}>{c.city.toUpperCase()}</div>{c._loading?<Skeleton h={80} w="80px" mb={0} style={{margin:"0 auto"}}/>:(<svg width="80" height="80" style={{display:"block",margin:"0 auto"}}><circle cx="40" cy="40" r="30" fill="none" stroke={isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.07)"} strokeWidth="5"/><circle cx="40" cy="40" r="30" fill="none" stroke={riskCol(c.score,isDark)} strokeWidth="5" strokeDasharray={`${(c.score/100)*188.5} ${188.5-(c.score/100)*188.5}`} strokeDashoffset="47.1" strokeLinecap="round" style={{transition:"stroke-dasharray 1.2s ease"}}/><text x="40" y="45" textAnchor="middle" fill={riskCol(c.score,isDark)} fontSize="18" fontFamily="DM Mono,monospace" fontWeight="500">{c.score}</text></svg>)}<div style={{fontSize:13,color:c._loading?theme.txtMute:riskCol(c.score,isDark),fontFamily:"'Inter',sans-serif",marginTop:8}}>{c._loading?"LOADING…":riskLabel(c.score)}</div></div></Panel>))}</div><Panel title="LIVE CIVIC EVENT FEED" subtitle={`/events · ${eventList.length} incidents · polling every ${POLL_MS/1000}s`} acc={theme.accent} tag={`${eventList.length} EVENTS`}><div style={{display:"grid",gridTemplateColumns:"85px 110px 1fr 100px 70px 70px"}}>{["TIME","LOCATION","DESCRIPTION","ISSUE","SENTIMENT","RISK SCORE"].map(h=>(<div key={h} style={{fontSize:13,color:theme.txtMute,fontFamily:"'Inter',sans-serif",letterSpacing:"0.07em",padding:"5px 8px",borderBottom:`1px solid ${theme.border}`}}>{h}</div>))}</div><div style={{maxHeight:360,overflowY:"auto"}}>{loading&&!eventList.length?Array.from({length:6},(_,i)=><div key={i} style={{padding:"8px",borderBottom:`1px solid ${theme.border}22`}}><Skeleton h={14} mb={0}/></div>):eventList.length?eventList.map((e,i)=>{const ts=e.timestamp?new Date(e.timestamp).toLocaleTimeString():"—";const risk=e.risk_score??e.risk??0;const sent=e.sentiment??0;return(<div key={i} style={{display:"grid",gridTemplateColumns:"85px 110px 1fr 100px 70px 70px",alignItems:"center",borderBottom:`1px solid ${theme.border}20`,animation:`fadeUp .3s ease ${Math.min(i,.2)*i*.02}s both`,transition:"background .15s"}} onMouseEnter={e2=>e2.currentTarget.style.background=`${theme.accent}06`} onMouseLeave={e2=>e2.currentTarget.style.background="transparent"}><div style={{fontSize:14,color:theme.txtMute,fontFamily:"'DM Mono',monospace",padding:"6px 8px"}}>{ts}</div><div style={{fontSize:14,color:theme.accent,fontFamily:"'Inter',sans-serif",fontWeight:700,padding:"6px 8px"}}>{e.location||e.city||"—"}</div><div style={{fontSize:14,color:theme.txtSub,fontFamily:"'DM Mono',monospace",padding:"6px 8px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.text||e.description||"—"}</div><div style={{fontSize:14,color:theme.txtMute,fontFamily:"'DM Mono',monospace",padding:"6px 8px"}}>{e.issue||"—"}</div><div style={{fontSize:14,color:sent<0?theme.red:theme.green,fontFamily:"'DM Mono',monospace",padding:"6px 8px"}}>{typeof sent==="number"?sent.toFixed(2):"—"}</div><div style={{padding:"6px 8px",display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:4,borderRadius:2,background:`${riskCol(risk,isDark)}25`}}><div style={{height:"100%",width:`${risk}%`,background:riskCol(risk,isDark),borderRadius:2,transition:"width 1s ease"}}/></div><span style={{fontSize:14,color:riskCol(risk,isDark),fontFamily:"'Inter',sans-serif",fontWeight:700}}>{risk}</span></div></div>);}):(<div style={{padding:"30px",textAlign:"center",color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace"}}>⏳ Waiting for events…</div>)}</div></Panel></div>)}

            {/* ════════ KNOWLEDGE GRAPH ════════ */}
            {activeTab==="graph"&&(<div style={{animation:"slideIn .4s ease"}}><Panel title="CIVIC KNOWLEDGE GRAPH" subtitle="/knowledge-graph · entity relationships · AI-mapped connections" acc={theme.green} tag="NETWORK">{loading&&!knowledgeGraph?<div style={{height:300,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}><div style={{fontSize:13,color:theme.txtMute,fontFamily:"'DM Mono',monospace",animation:"blink .8s infinite"}}>► LOADING KNOWLEDGE GRAPH FROM BACKEND…</div><Skeleton h={200}/></div>:<KnowledgeGraph data={knowledgeGraph} isDark={isDark}/>}</Panel>{knowledgeGraph&&(<div style={{marginTop:12}}><Panel title="RAW GRAPH DATA" subtitle="/knowledge-graph · API response" acc={theme.accent}><pre style={{fontSize:13,color:theme.txtSub,fontFamily:"'DM Mono',monospace",whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:300,overflowY:"auto",lineHeight:1.7}}>{JSON.stringify(knowledgeGraph,null,2).slice(0,2000)}{JSON.stringify(knowledgeGraph).length>2000?"…":""}</pre></Panel></div>)}</div>)}

            {/* ════════ MY REPORTS ════════ */}
            {activeTab==="myreports"&&(<div style={{animation:"slideIn .4s ease"}}><div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:17,fontWeight:800,color:theme.txt}}>My Reports</div><div style={{fontSize:12,color:theme.txtMute,marginTop:2}}>Issues you've submitted · auto-dispatched to ward offices</div></div><button onClick={()=>onReport?.()} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 18px",background:"linear-gradient(135deg,rgba(0,255,157,.14),rgba(0,200,255,.1))",border:`1px solid ${theme.green}50`,borderRadius:8,color:theme.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>📸 New Report</button></div><div style={{display:"flex",gap:12,marginBottom:16}}>{[["resolved","#00ff9d","✓ Resolved"],["in_progress","#ffb800","⏳ In Progress"],["submitted","rgba(0,200,255,.8)","📤 Submitted"]].map(([s,c,l])=>(<div key={s} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:theme.txtMute}}><div style={{width:8,height:8,borderRadius:"50%",background:c}}/>{l}</div>))}</div>{myReportsLoading?(<div style={{padding:"40px 0",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}><div style={{width:28,height:28,border:`2px solid ${theme.accent}22`,borderTopColor:theme.accent,borderRadius:"50%",animation:"spin .7s linear infinite"}}/><span style={{fontSize:13,color:theme.txtMute,fontFamily:"'DM Mono',monospace"}}>Loading reports from backend...</span></div>):myReports.length===0?(<div style={{padding:"40px 0",textAlign:"center",color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace"}}><div style={{fontSize:32,marginBottom:12}}>📭</div>No reports yet. Submit complaints from the Citizen App.</div>):(<div style={{display:"flex",flexDirection:"column",gap:10}}>{myReports.map((r,i)=>{const status=r.status||"submitted";const statusColor=status==="resolved"?"#00ff9d":status==="in_progress"?theme.amber:theme.accent;const statusLabel=status==="resolved"?"✓ Resolved":status==="in_progress"?"⏳ In Progress":"📤 Submitted";const progress=status==="resolved"?100:status==="in_progress"?55:20;const issue=r.issue||r.text||"Civic Issue";const ward=r.ward||r.city||r.location||"—";const date=r.created_at?new Date(r.created_at).toLocaleDateString("en-IN"):r.date||"Recent";const risk=r.risk_score||r.risk||0;const rid=r.id||r._id||r.report_id||("CS"+i);return(<div key={rid} style={{background:theme.panel,border:`1px solid ${theme.border}`,borderLeft:`3px solid ${statusColor}`,borderRadius:10,padding:"14px 18px",display:"grid",gridTemplateColumns:"1fr auto",gap:12,animation:`fadeUp .3s ease ${i*.06}s both`,transition:"border-color .2s,box-shadow .2s",cursor:"default"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=statusColor+"60";e.currentTarget.style.boxShadow=`0 4px 20px ${statusColor}14`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=theme.border;e.currentTarget.style.boxShadow="none";}}><div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><span style={{fontSize:14,fontWeight:700,color:theme.txt,flex:1}}>{issue}</span><span style={{fontSize:10,background:`${statusColor}18`,border:`1px solid ${statusColor}40`,borderRadius:20,padding:"2px 10px",color:statusColor,fontWeight:700,whiteSpace:"nowrap"}}>{statusLabel}</span></div><div style={{display:"flex",gap:16,marginBottom:8,flexWrap:"wrap"}}>{[["🏘️",ward],["🕐",date],["⚡",`Risk: ${risk}/100`]].map(([icon,val])=>(<div key={icon} style={{fontSize:11,color:theme.txtMute}}>{icon} {val}</div>))}</div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:4,background:`${statusColor}15`,borderRadius:2}}><div style={{height:"100%",width:`${progress}%`,background:statusColor,borderRadius:2,transition:"width 1s ease"}}/></div><span style={{fontSize:10,color:statusColor,fontFamily:"'DM Mono',monospace",minWidth:32}}>{progress}%</span></div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",justifyContent:"space-between"}}><span style={{fontSize:10,color:theme.txtMute,fontFamily:"'DM Mono',monospace"}}>{rid}</span><div style={{width:42,height:42,position:"relative"}}><svg width="42" height="42"><circle cx="21" cy="21" r="17" fill="none" stroke={`${statusColor}20`} strokeWidth="4"/><circle cx="21" cy="21" r="17" fill="none" stroke={statusColor} strokeWidth="4" strokeDasharray={`${(progress/100)*106.8} ${106.8-(progress/100)*106.8}`} strokeDashoffset="26.7" strokeLinecap="round"/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:statusColor,fontFamily:"'DM Mono',monospace"}}>{progress}</div></div></div></div>);})}</div>)}</div>)}

            {/* ════════ AI CIVIC COPILOT ════════ */}
            {activeTab==="copilot"&&(<div style={{animation:"slideIn .4s ease"}}><AICivicCopilotPanel theme={theme} isDark={isDark} riskSummary={riskSummary} events={eventList} alerts={alertList} predictions={predList}/></div>)}

            {/* ════════ LIVE WEBSOCKET STREAM ════════ */}
            {activeTab==="livestream"&&(<div style={{animation:"slideIn .4s ease"}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{width:9,height:9,borderRadius:"50%",background:wsConnected?theme.accent:"rgba(150,150,150,.4)",display:"inline-block",animation:wsConnected?"pulseDot 1.5s infinite":"none"}}/><span style={{fontSize:14,fontWeight:700,color:wsConnected?theme.accent:theme.txtMute}}>{wsConnected?"WebSocket Connected":"Connecting to WebSocket…"}</span></div><span style={{fontSize:11,color:theme.txtMute,fontFamily:"'DM Mono',monospace"}}>wss://civicsentinel-ai-1-z7io.onrender.com/ws/events</span>{wsEventList.length>0&&<span style={{fontSize:11,background:`${theme.accent}14`,border:`1px solid ${theme.accent}30`,borderRadius:20,padding:"2px 10px",color:theme.accent,fontFamily:"'DM Mono',monospace",marginLeft:"auto"}}>{wsEventList.length} EVENTS RECEIVED</span>}</div><Panel title="LIVE EVENT STREAM" subtitle="WebSocket · wss://.../ws/events · real-time push" acc={theme.accent} tag="WS-LIVE">{wsEventList.length===0?(<div style={{padding:"40px 0",textAlign:"center",color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace",display:"flex",flexDirection:"column",gap:12,alignItems:"center"}}><div style={{fontSize:32}}>{wsConnected?"📡":"⏳"}</div><div>{wsConnected?"Waiting for live events from backend…":"Establishing WebSocket connection…"}</div><div style={{fontSize:11,color:theme.txtMute,opacity:.6}}>Events will appear here in real-time as complaints are processed</div></div>):(<div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:520,overflowY:"auto"}}>{wsEventList.map((e,i)=>{const risk = e.city_risk_score ?? e.risk_score ?? e.risk ?? 0;;const col=riskCol(risk,isDark);const ts=e.timestamp?new Date(e.timestamp).toLocaleTimeString():"LIVE";return(<div key={i} style={{padding:"10px 13px",background:`${col}07`,border:`1px solid ${col}20`,borderLeft:`3px solid ${col}`,borderRadius:5,display:"flex",gap:12,alignItems:"flex-start",animation:"fadeUp .25s ease"}}><div style={{flexShrink:0,marginTop:2}}><span style={{width:7,height:7,borderRadius:"50%",background:col,display:"inline-block",boxShadow:`0 0 6px ${col}`}}/></div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",gap:10,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}><span style={{fontSize:12,fontWeight:700,color:col,fontFamily:"'Inter',sans-serif"}}>{e.location||e.city||"Unknown"}</span>{e.issue&&<span style={{fontSize:11,color:theme.txtMute}}>— {e.issue}</span>}<span style={{fontSize:10,color:theme.txtMute,fontFamily:"'DM Mono',monospace",marginLeft:"auto"}}>{ts}</span></div>{e.text&&<div style={{fontSize:12.5,color:theme.txtSub,lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.text}</div>}</div><div style={{fontSize:13,fontWeight:700,color:col,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{risk}</div></div>);})}</div>)}</Panel>{eventList.length>0&&(<div style={{marginTop:12}}><Panel title="REST EVENT FEED" subtitle={"/events · "+eventList.length+" total · polled every "+POLL_MS/1000+"s"} acc={theme.amber} tag="REST"><div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:300,overflowY:"auto"}}>{eventList.slice(0,20).map((e,i)=>{const risk = e.city_risk_score ?? e.risk_score ?? e.risk ?? 0;;const col=riskCol(risk,isDark);return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${theme.border}22`}}><span style={{width:5,height:5,borderRadius:"50%",background:col,flexShrink:0}}/><span style={{fontSize:13,color:theme.accent,fontWeight:600,minWidth:80}}>{e.location||e.city||"—"}</span><span style={{fontSize:12,color:theme.txtMute,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.text||e.description||e.issue||"—"}</span><span style={{fontSize:12,color:col,fontFamily:"'DM Mono',monospace",fontWeight:700,flexShrink:0}}>{risk}</span></div>);})}</div></Panel></div>)}</div>)}

          </div>

          <footer style={{padding:"10px 28px 16px",borderTop:`1px solid ${theme.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{fontSize:11,color:theme.txtMute,fontFamily:"'Inter',sans-serif",letterSpacing:"0.02em"}}>CIVICSENTINEL AI · OFFICER PORTAL · {API}</div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{fontSize:11,color:theme.txtMute,fontFamily:"'DM Mono',monospace"}}>POLL: {POLL_MS/1000}s · 10 ENDPOINTS · WS LIVE</div>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:connected?theme.green:theme.red}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:connected?theme.green:theme.red,animation:"pulseDot 2s infinite"}}/>
                {connected?"ALL SYSTEMS LIVE":"BACKEND OFFLINE — RETRYING"}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </Ctx.Provider>
  );
}
