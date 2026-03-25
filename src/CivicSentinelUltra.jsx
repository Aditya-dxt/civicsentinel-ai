import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Cell
} from "recharts";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG — single source of truth for backend URL
// ══════════════════════════════════════════════════════════════════════════════
const API = "https://civicsentinel-ai-1-z7io.onrender.com";
const POLL_MS = 8000; // 8s — Render free tier is slow

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
// MASTER DASHBOARD HOOK — parallel fetch of all endpoints
// ══════════════════════════════════════════════════════════════════════════════
function useDashboard() {
  const [state, setState] = useState({
    events: [], riskSummary: {}, issueTrends: {}, alerts: [],
    predictions: [], aiInsight: null, knowledgeGraph: null,
    health: null, loading: true, error: null, lastSync: null, connected: false,
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
      ]);

      const [eventsR, riskR, trendsR, alertsR, predsR, aiR, kgR, healthR] = results;

      setState(prev => ({
        ...prev,
        events:         eventsR.status === "fulfilled"  ? (eventsR.value?.events  || eventsR.value  || []) : prev.events,
        riskSummary:    riskR.status   === "fulfilled"  ? (riskR.value?.risk_summary || riskR.value || {}) : prev.riskSummary,
        issueTrends:    trendsR.status === "fulfilled"  ? (trendsR.value?.issue_trends || trendsR.value || {}) : prev.issueTrends,
        alerts:         alertsR.status === "fulfilled"  ? (alertsR.value?.alerts  || alertsR.value  || []) : prev.alerts,
        predictions:    predsR.status  === "fulfilled"  ? (predsR.value?.predictions || predsR.value || []) : prev.predictions,
        aiInsight:      aiR.status     === "fulfilled"  ? aiR.value  : prev.aiInsight,
        knowledgeGraph: kgR.status     === "fulfilled"  ? kgR.value  : prev.knowledgeGraph,
        health:         healthR.status === "fulfilled"  ? healthR.value : prev.health,
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
// CITY GEO DATA
// ══════════════════════════════════════════════════════════════════════════════
const CITY_GEO = {
  Mumbai:    { lat:19.0760, lng:72.8777, zoom:12 },
  Delhi:     { lat:28.6139, lng:77.2090, zoom:11 },
  Bangalore: { lat:12.9716, lng:77.5946, zoom:12 },
  Chennai:   { lat:13.0827, lng:80.2707, zoom:12 },
  Kolkata:   { lat:22.5726, lng:88.3639, zoom:12 },
  Hyderabad: { lat:17.3850, lng:78.4867, zoom:12 },
};

// Ward GeoJSON per city — real approximate boundaries as polygons
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
    { type:"Feature", properties:{ name:"MG Road",      offset:-10 }, geometry:{ type:"Polygon", coordinates:[[[77.593,12.968],[77.625,12.968],[77.625,12.990],[77.593,12.990],[77.593,12.968]]] }},
    { type:"Feature", properties:{ name:"Whitefield",   offset:15  }, geometry:{ type:"Polygon", coordinates:[[[77.740,12.960],[77.790,12.960],[77.790,13.000],[77.740,13.000],[77.740,12.960]]] }},
    { type:"Feature", properties:{ name:"Electronic City",offset:5 }, geometry:{ type:"Polygon", coordinates:[[[77.660,12.836],[77.710,12.836],[77.710,12.876],[77.660,12.876],[77.660,12.836]]] }},
    { type:"Feature", properties:{ name:"Koramangala",  offset:20  }, geometry:{ type:"Polygon", coordinates:[[[77.613,12.927],[77.648,12.927],[77.648,12.960],[77.613,12.960],[77.613,12.927]]] }},
    { type:"Feature", properties:{ name:"Jayanagar",    offset:-5  }, geometry:{ type:"Polygon", coordinates:[[[77.574,12.918],[77.610,12.918],[77.610,12.950],[77.574,12.950],[77.574,12.918]]] }},
    { type:"Feature", properties:{ name:"Yeshwanthpur", offset:10  }, geometry:{ type:"Polygon", coordinates:[[[77.535,13.012],[77.573,13.012],[77.573,13.046],[77.535,13.046],[77.535,13.012]]] }},
    { type:"Feature", properties:{ name:"Yelahanka",    offset:-20 }, geometry:{ type:"Polygon", coordinates:[[[77.585,13.094],[77.630,13.094],[77.630,13.130],[77.585,13.130],[77.585,13.094]]] }},
    { type:"Feature", properties:{ name:"BTM Layout",   offset:30  }, geometry:{ type:"Polygon", coordinates:[[[77.608,12.908],[77.644,12.908],[77.644,12.930],[77.608,12.930],[77.608,12.908]]] }},
  ]},
  Chennai: { type:"FeatureCollection", features:[
    { type:"Feature", properties:{ name:"Egmore",         offset:0   }, geometry:{ type:"Polygon", coordinates:[[[80.255,13.073],[80.285,13.073],[80.285,13.098],[80.255,13.098],[80.255,13.073]]] }},
    { type:"Feature", properties:{ name:"T. Nagar",       offset:10  }, geometry:{ type:"Polygon", coordinates:[[[80.218,13.030],[80.248,13.030],[80.248,13.058],[80.218,13.058],[80.218,13.030]]] }},
    { type:"Feature", properties:{ name:"Adyar",          offset:-10 }, geometry:{ type:"Polygon", coordinates:[[[80.245,12.990],[80.278,12.990],[80.278,13.020],[80.245,13.020],[80.245,12.990]]] }},
    { type:"Feature", properties:{ name:"Anna Nagar",     offset:5   }, geometry:{ type:"Polygon", coordinates:[[[80.200,13.080],[80.235,13.080],[80.235,13.110],[80.200,13.110],[80.200,13.080]]] }},
    { type:"Feature", properties:{ name:"Velachery",      offset:25  }, geometry:{ type:"Polygon", coordinates:[[[80.215,12.967],[80.248,12.967],[80.248,12.998],[80.215,12.998],[80.215,12.967]]] }},
    { type:"Feature", properties:{ name:"Tambaram",       offset:-15 }, geometry:{ type:"Polygon", coordinates:[[[80.112,12.922],[80.150,12.922],[80.150,12.958],[80.112,12.958],[80.112,12.922]]] }},
    { type:"Feature", properties:{ name:"Perambur",       offset:20  }, geometry:{ type:"Polygon", coordinates:[[[80.236,13.103],[80.264,13.103],[80.264,13.130],[80.236,13.130],[80.236,13.103]]] }},
    { type:"Feature", properties:{ name:"Sholinganallur", offset:15  }, geometry:{ type:"Polygon", coordinates:[[[80.222,12.899],[80.258,12.899],[80.258,12.932],[80.222,12.932],[80.222,12.899]]] }},
  ]},
};

// ══════════════════════════════════════════════════════════════════════════════
// LEAFLET MAP — India overview + city ward drill-down
// Uses react-leaflet + OpenStreetMap tiles (run: npm install leaflet react-leaflet)
// ══════════════════════════════════════════════════════════════════════════════

// Leaflet CSS injected dynamically
function useLeafletCSS() {
  useEffect(() => {
    if (document.getElementById("leaflet-css")) return;
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }, []);
}

// Lazy-load Leaflet from CDN so we don't need npm install
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

// ── INDIA OVERVIEW MAP ──
function IndiaMap({ riskSummary, isDark, onCitySelect, drillCity }) {
  const t = useT();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const L = useLeaflet();
  useLeafletCSS();

  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
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

  // Update markers when riskSummary changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    // Remove old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    Object.entries(riskSummary || {}).forEach(([city, score]) => {
      const geo = CITY_GEO[city]; if (!geo) return;
      const col = riskCol(score, isDark);
      const hexCol = col;
      const isDrilling = drillCity === city;
      const hasWards = !!WARD_GEOJSON[city];
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${18 + (score/100)*14}px;
          height:${18 + (score/100)*14}px;
          background:${hexCol}35;
          border:2.5px solid ${hexCol};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          cursor:${hasWards?"pointer":"default"};
          box-shadow:0 0 ${score>=70?"14px":"7px"} ${hexCol}80;
          position:relative;
          ${isDrilling?`outline:3px solid ${hexCol};outline-offset:3px;`:""}
        ">
          <span style="font-size:9px;font-weight:700;color:${hexCol};font-family:DM Mono,monospace;">${score}</span>
          ${score>=70?`<div style="position:absolute;inset:-5px;border-radius:50%;border:1.5px solid ${hexCol};opacity:0.4;animation:rippleRing 2s infinite;"></div>`:""}
        </div>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      });
      const marker = L.marker([geo.lat, geo.lng], { icon });
      marker.bindTooltip(`<div style="font-family:Inter,sans-serif;font-size:12px;font-weight:600">${city}</div><div style="font-size:11px;color:${hexCol}">Risk: ${score}/100 · ${riskLabel(score)}</div>${hasWards?"<div style='font-size:10px;opacity:0.7;margin-top:2px'>Click to view wards</div>":""}`,
        { className:"civic-tooltip", permanent:false, direction:"top", offset:[0,-10] });
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
        background: t.id==="dark"?"rgba(4,10,22,0.88)":"rgba(255,255,255,0.92)",
        border:`1px solid ${t.border}`, borderRadius:6, padding:"8px 12px",
        display:"flex", flexDirection:"column", gap:5, backdropFilter:"blur(12px)" }}>
        {[["≥70 Critical",isDark?"#ff3060":"#b80020"],["40–69 High",isDark?"#ffb800":"#8a5000"],["<40 Stable",isDark?"#00ff9d":"#007840"]].map(([l,c])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:c,boxShadow:isDark?`0 0 6px ${c}`:"none"}}/>
            <span style={{fontSize:11,color:t.txt,fontFamily:"'Inter',sans-serif"}}>{l}</span>
          </div>
        ))}
        <div style={{fontSize:10,color:t.txtMute,marginTop:2}}>Click city → view wards</div>
      </div>
    </div>
  );
}

// ── CITY WARD MAP ──
function CityWardMap({ cityKey, cityRisk, isDark }) {
  const t = useT();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [hovWard, setHovWard] = useState(null);
  const L = useLeaflet();
  useLeafletCSS();

  const geo = CITY_GEO[cityKey];
  const geojson = WARD_GEOJSON[cityKey];
  const wardRisk = useCallback((offset) => Math.min(99, Math.max(5, (cityRisk||55) + offset)), [cityRisk]);

  useEffect(() => {
    if (!L || !mapRef.current || !geo || !geojson) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

    const map = L.map(mapRef.current, {
      center: [geo.lat, geo.lng],
      zoom: geo.zoom,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer(
      isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { subdomains:"abcd", maxZoom:19 }
    ).addTo(map);

    // Add ward polygons
    L.geoJSON(geojson, {
      style: (feature) => {
        const risk = wardRisk(feature.properties.offset);
        const col = riskCol(risk, isDark);
        return {
          fillColor: col, fillOpacity: 0.28,
          color: col, weight: 2, opacity: 0.85,
          dashArray: null,
        };
      },
      onEachFeature: (feature, layer) => {
        const risk = wardRisk(feature.properties.offset);
        const col = riskCol(risk, isDark);
        layer.bindTooltip(
          `<div style="font-family:Inter,sans-serif">
            <div style="font-weight:700;font-size:13px;color:${col}">${feature.properties.name}</div>
            <div style="font-size:12px;margin-top:3px">Risk Score: <strong style="color:${col}">${risk}/100</strong></div>
            <div style="font-size:11px;color:${col}">${riskLabel(risk)}</div>
          </div>`,
          { className:"civic-tooltip", sticky:true, direction:"top" }
        );
        layer.on("mouseover", function() {
          this.setStyle({ fillOpacity:0.55, weight:3 });
          setHovWard(feature.properties.name);
        });
        layer.on("mouseout", function() {
          this.setStyle({ fillOpacity:0.28, weight:2 });
          setHovWard(null);
        });
      },
    }).addTo(map);

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [L, cityKey, cityRisk, isDark, geo, geojson, wardRisk]);

  if (!geo || !geojson) return (
    <div style={{height:320,display:"flex",alignItems:"center",justifyContent:"center",
      color:t.txtMute,fontSize:13,fontFamily:"'Inter',sans-serif"}}>
      Ward data not available for {cityKey}.
    </div>
  );

  return (
    <div style={{ position:"relative" }}>
      <div ref={mapRef} style={{ height:340, borderRadius:8, overflow:"hidden", border:`1px solid ${t.border}` }}/>
      {/* Ward risk legend overlay */}
      <div style={{ position:"absolute", bottom:24, left:10, zIndex:1000,
        background: t.id==="dark"?"rgba(4,10,22,0.88)":"rgba(255,255,255,0.92)",
        border:`1px solid ${t.border}`, borderRadius:6, padding:"8px 12px",
        backdropFilter:"blur(12px)" }}>
        {[["≥70 Critical",isDark?"#ff3060":"#b80020"],["40–69 High",isDark?"#ffb800":"#8a5000"],["<40 Stable",isDark?"#00ff9d":"#007840"]].map(([l,c])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
            <div style={{width:12,height:8,borderRadius:2,background:c,opacity:.7}}/>
            <span style={{fontSize:11,color:t.txt,fontFamily:"'Inter',sans-serif"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE GRAPH VISUALIZER
// ══════════════════════════════════════════════════════════════════════════════
function KnowledgeGraph({ data, isDark }) {
  const t = useT();
  const canvasRef = useRef(null);

  // Build nodes/edges from whatever shape the API returns
  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    // Helper: ensure value is always a plain array
    const toArr = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === "object") return Object.values(v);
      return [];
    };

    // Handle top-level array
    if (Array.isArray(data)) {
      const ns = data.slice(0, 20).map((item, i) => ({
        id: i,
        label: item.entity || item.city || item.issue || item.name || `Node ${i}`,
        type: item.type || "entity",
        value: item.risk_score || item.score || 50,
      }));
      const es = ns.slice(0, -1).map((n, i) => ({
        from: i, to: (i + 1 + Math.floor(Math.random() * 3)) % ns.length,
      }));
      return { nodes: ns, edges: es };
    }

    // Handle { nodes: array|object, edges: array|object }
    if (data.nodes) {
      const rawNodes = toArr(data.nodes).slice(0, 20);
      const rawEdges = toArr(data.edges).slice(0, 30);
      const ns = rawNodes.map((n, i) => ({
        id: i,
        label: n.label || n.name || n.entity || n.id || `Node ${i}`,
        value: n.value || n.risk || n.weight || n.score || 50,
      }));
      const es = rawEdges.map((e, i) => ({
        from: typeof e.from === "number" ? e.from : (typeof e.source === "number" ? e.source : i % ns.length),
        to:   typeof e.to   === "number" ? e.to   : (typeof e.target === "number" ? e.target : (i + 1) % ns.length),
      }));
      return { nodes: ns, edges: es };
    }

    // Handle plain object map  e.g. { Mumbai: 72, Delhi: 55 }
    const keys = Object.keys(data).slice(0, 14);
    const ns = keys.map((k, i) => ({
      id: i, label: k, value: typeof data[k] === "number" ? data[k] : 50,
    }));
    const es = ns.slice(0, -1).map((_, i) => ({ from: i, to: (i + 2) % ns.length }));
    return { nodes: ns, edges: es };
  }, [data]);

  useEffect(() => {
    if (!nodes.length) return;
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    // Simple force-like layout: place nodes on ellipse
    const placed = nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      return { ...n, x: W/2 + Math.cos(angle)*(W*0.38), y: H/2 + Math.sin(angle)*(H*0.38) };
    });

    let frame = 0; let id;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      // Draw edges
      edges.forEach(e => {
        const from = placed[e.from]; const to = placed[e.to];
        if(!from||!to) return;
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y);
        ctx.strokeStyle = isDark ? `rgba(0,200,255,${0.08+Math.abs(Math.sin(frame*.02+e.from))*.08})` : "rgba(0,60,140,0.08)";
        ctx.lineWidth = .8; ctx.stroke();
      });
      // Draw nodes
      placed.forEach((n,i) => {
        const col = riskCol(n.value||50, isDark);
        const pulse = 1 + Math.sin(frame*.03+i)*.1;
        const r = (5 + (n.value||50)/100*6) * pulse;
        // Glow
        ctx.beginPath(); ctx.arc(n.x,n.y,r+4,0,Math.PI*2);
        ctx.fillStyle = isDark ? `${col}18` : `${col}10`; ctx.fill();
        // Core
        ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2);
        ctx.fillStyle = isDark ? `${col}55` : `${col}40`; ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
        // Center dot
        ctx.beginPath(); ctx.arc(n.x,n.y,2,0,Math.PI*2);
        ctx.fillStyle = isDark ? "white" : col; ctx.fill();
        // Label
        ctx.fillStyle = isDark ? "rgba(180,220,255,0.75)" : "rgba(12,24,40,0.65)";
        ctx.font = "600 7px Inter,sans-serif"; ctx.textAlign="center";
        ctx.fillText(String(n.label).slice(0,12), n.x, n.y - r - 4);
      });
      frame++; id = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(id);
  }, [nodes, edges, isDark]);

  if (!data) return <div style={{height:240,display:"flex",alignItems:"center",justifyContent:"center",color:t.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace"}}>⏳ Loading knowledge graph...</div>;

  return <canvas ref={canvasRef} width={460} height={240} style={{width:"100%",height:240,borderRadius:6}}/>;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INSIGHT PANEL — uses /ai-insight endpoint
// ══════════════════════════════════════════════════════════════════════════════
function AIInsightPanel({ insight, loading, error }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [localResult, setLocalResult] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  const fetchInsight = useCallback(async (q) => {
    setLocalLoading(true);
    try {
      const url = q ? `${API}/ai-insight?query=${encodeURIComponent(q)}` : `${API}/ai-insight`;
      const res = await fetch(url);
      const d = await res.json();
      setLocalResult(d);
    } catch(e) {
      setLocalResult({ error: e.message });
    }
    setLocalLoading(false);
  }, []);

  // Use live insight or local query result
  const display = localResult || insight;

  // Render insight — handle multiple possible shapes
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
        {!d.ai_analysis && !d.insight && !d.city && !d.error && (
          <pre style={{fontSize:13,color:t.txtSub,fontFamily:"'DM Mono',monospace",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{JSON.stringify(d,null,2).slice(0,600)}</pre>
        )}
      </div>
    );
  };

  const QUICK = ["water crisis", "electricity outage", "health emergency", "corruption report"];

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

      {/* Live insight display */}
      <div style={{flex:1,overflowY:"auto",marginBottom:14,maxHeight:280}}>
        {(loading || localLoading) && !display && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:14,color:t.accent,fontFamily:"'DM Mono',monospace",animation:"blink .8s infinite"}}>► QUERYING AI ENGINE... (may take ~30s on first load)</div>
            {[80,60,90,50].map((w,i)=><div key={i} style={{height:10,borderRadius:4,background:`${t.border}`,width:`${w}%`,animation:`pulse 1.5s ease ${i*.2}s infinite`}}/>)}
          </div>
        )}
        {display && !localLoading && renderInsight(display)}
        {error && !display && <div style={{fontSize:13,color:t.red,fontFamily:"'DM Mono',monospace",padding:"10px 0"}}>⚠ {error} — Backend may be waking up. Retrying...</div>}
      </div>

      {/* Quick queries */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:9}}>
        {QUICK.map(q=>(
          <button key={q} onClick={()=>fetchInsight(q)} style={{background:`${t.accent}08`,border:`1px solid ${t.accent}22`,color:t.accent,borderRadius:4,padding:"4px 10px",fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em"}}>{q.toUpperCase()}</button>
        ))}
      </div>

      {/* Custom query */}
      <div style={{display:"flex",gap:7}}>
        <div style={{position:"relative",flex:1}}>
          <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13,color:t.accent,pointerEvents:"none"}}>►</span>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchInsight(query)}
            placeholder="Query the AI insight engine..."
            style={{width:"100%",background:t.inputBg,border:`1px solid ${t.inputBorder}`,borderRadius:6,padding:"10px 12px 10px 28px",color:t.inputTxt,fontSize:14,fontFamily:"'DM Mono',monospace",outline:"none",caretColor:t.accent,transition:"border-color .2s"}}
            onFocus={e=>e.target.style.borderColor=t.inputFocus}
            onBlur={e=>e.target.style.borderColor=t.inputBorder}/>
        </div>
        <button onClick={()=>fetchInsight(query)} disabled={localLoading} style={{background:`linear-gradient(135deg,${t.accent}22,${t.green}16)`,border:`1px solid ${t.accent}40`,borderRadius:6,color:t.accent,padding:"10px 15px",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif",opacity:localLoading?0.5:1}}>ASK</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function Panel({ title, subtitle, children, acc, tag, style={} }) {
  const t = useT(); const a = acc||t.accent; const [hov,setHov]=useState(false);
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
          {tag && (typeof tag === "string"
            ? <div style={{fontSize:13,color:a,fontFamily:"'DM Mono',monospace",background:`${a}12`,border:`1px solid ${a}28`,borderRadius:3,padding:"2px 8px"}}>{tag}</div>
            : <div>{tag}</div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function CyberTip({ active, payload, label }) {
  const t = useT();
  if (!active || !payload || !payload.length) return null;
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
      <span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",fontSize:14,opacity:isDark?0.88:0.28,transition:"opacity .3s"}}>🌙</span>
      <span style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",fontSize:14,opacity:isDark?0.28:0.92,transition:"opacity .3s"}}>☀️</span>
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

// ══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ══════════════════════════════════════════════════════════════════════════════
function Skeleton({ h=16, w="100%", mb=8 }) {
  const t=useT();
  return <div style={{height:h,width:w,background:`${t.border}`,borderRadius:4,marginBottom:mb,animation:"skeletonPulse 1.4s ease infinite"}}/>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function CivicSentinelDashboard({ user, onReport, onLogout }) {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? DARK : LIGHT;
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCity, setSelectedCity] = useState(null);
  const [drillCity, setDrillCity] = useState(null); // city ward drill-down

  const {
    events, riskSummary, issueTrends, alerts, predictions,
    aiInsight, knowledgeGraph, loading, error, lastSync, connected,
  } = useDashboard();

  useEffect(() => { const id=setInterval(()=>setTime(new Date()),1000); return()=>clearInterval(id); }, []);

  // ── Derived ──
  const riskEntries = useMemo(() => Object.entries(riskSummary||{}).map(([city,score])=>({city,score})).sort((a,b)=>b.score-a.score), [riskSummary]);
  const trendEntries = useMemo(() => Object.entries(issueTrends||{}).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value), [issueTrends]);
  const avgRisk = useMemo(() => riskEntries.length ? Math.round(riskEntries.reduce((s,c)=>s+c.score,0)/riskEntries.length) : 0, [riskEntries]);
  const criticalCount = useMemo(() => riskEntries.filter(c=>c.score>=70).length, [riskEntries]);
  const eventList = Array.isArray(events) ? events : [];
  const alertList = Array.isArray(alerts) ? alerts : [];
  const predList  = Array.isArray(predictions) ? predictions : [];

  // Radardata for risk
  const radarData = useMemo(() => riskEntries.slice(0,6).map(c=>({city:c.city.slice(0,3).toUpperCase(),score:c.score})),[riskEntries]);

  // ── Sidebar nav items ──────────────────────────────────────────────────────
  const NAV_ITEMS = [
    { id:"overview",      icon:"⬡",  label:"Overview",         sub:"Live dashboard" },
    { id:"report",        icon:"📸",  label:"Report Issue",     sub:"Photo · GPS · AI", action:true },
    { id:"intelligence",  icon:"🧠",  label:"Intelligence",     sub:"AI copilot · alerts" },
    { id:"analytics",     icon:"📊",  label:"Analytics",        sub:"Risk · events · trends" },
    { id:"graph",         icon:"🕸",  label:"Knowledge Graph",  sub:"Entity connections" },
    { id:"myreports",     icon:"📋",  label:"My Reports",       sub:"Track submissions" },
  ];

  // My reports mock data (would come from user profile API)
  const MY_REPORTS = [
    { id:"CS1A2B3C", status:"resolved",   issue:"💧 Water Logging",     ward:"Bandra",       date:"2 days ago",  risk:42 },
    { id:"CS4D5E6F", status:"submitted",  issue:"🚧 Road Damage",       ward:"Andheri",      date:"Today",       risk:67 },
    { id:"CS7G8H9I", status:"in_progress",issue:"⚡ Power Outage",      ward:"Dharavi",      date:"Yesterday",   risk:58 },
    { id:"CSJKL012", status:"resolved",   issue:"🗑️ Garbage",           ward:"Colaba",       date:"5 days ago",  risk:30 },
  ];

  const userInitial = user && user.provider === "google" ? "G"
    : user && user.name ? user.name[0].toUpperCase()
    : "👤";

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
        @keyframes sidebarGlow{0%,100%{box-shadow:inset 0 0 0 transparent}50%{box-shadow:inset 2px 0 12px ${theme.accent}12}}
        input::placeholder{color:${theme.txtMute};}
      `}</style>

      <Particles isDark={isDark}/>
      {isDark&&<div style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.02) 2px,rgba(0,0,0,0.02) 4px)"}}/>}

      {/* ══ ROOT LAYOUT: sidebar + main ══ */}
      <div style={{position:"relative",zIndex:2,display:"flex",minHeight:"100vh",background:theme.bgGrad,transition:"background .5s"}}>

        {/* ════════════════ SIDEBAR ════════════════ */}
        <aside style={{
          width:220, flexShrink:0, height:"100vh", position:"sticky", top:0,
          background: isDark?"rgba(2,5,14,0.97)":"rgba(248,252,255,0.98)",
          borderRight:`1px solid ${theme.border}`,
          backdropFilter:"blur(28px)",
          display:"flex", flexDirection:"column",
          zIndex:110, transition:"background .4s",
          boxShadow: isDark?"2px 0 32px rgba(0,0,0,.5)":"2px 0 20px rgba(0,0,0,.06)",
        }}>
          {/* Logo block */}
          <div style={{padding:"20px 18px 16px",borderBottom:`1px solid ${theme.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:36,height:36,borderRadius:9,background:`${theme.accent}14`,border:`1px solid ${theme.accent}38`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,animation:"glow 4s infinite"}}>🏛</div>
                <div style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:connected?theme.green:theme.red,animation:"pulseDot 2s infinite",boxShadow:`0 0 6px ${connected?theme.green:theme.red}`}}/>
              </div>
              <div>
                <Glitch text="CIVICSENTINEL" size={13}/>
                <div style={{fontSize:9,color:theme.txtMute,letterSpacing:"0.08em",marginTop:1}}>DIGITAL DEMOCRACY</div>
              </div>
            </div>
            {/* Live clock */}
            <div style={{fontSize:18,fontFamily:"'DM Mono',monospace",fontWeight:900,color:theme.accent,letterSpacing:"0.02em",marginTop:6,lineHeight:1}}>{time.toLocaleTimeString("en-US",{hour12:false})}</div>
            <div style={{fontSize:10,color:theme.txtMute,marginTop:2}}>{lastSync?`SYNCED ${lastSync.toLocaleTimeString()}`:"CONNECTING…"}</div>
          </div>

          {/* ── Live stat pills ── */}
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${theme.border}`,display:"flex",flexDirection:"column",gap:6}}>
            {[
              {l:"AVG RISK",  v:loading?"…":avgRisk||"—",          c:riskCol(avgRisk,isDark)},
              {l:"CRITICAL",  v:loading?"…":`${criticalCount} CITIES`, c:theme.red},
              {l:"ALERTS",    v:loading?"…":`${alertList.length} ACTIVE`, c:theme.amber},
            ].map(({l,v,c})=>(
              <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",background:`${c}09`,border:`1px solid ${c}22`,borderRadius:6}}>
                <span style={{fontSize:10,color:theme.txtMute,letterSpacing:"0.05em"}}>{l}</span>
                <span style={{fontSize:11,fontWeight:700,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</span>
              </div>
            ))}
          </div>

          {/* ── Nav items ── */}
          <nav style={{flex:1,padding:"10px 10px",display:"flex",flexDirection:"column",gap:3,overflowY:"auto"}}>
            {NAV_ITEMS.map(item=>{
              const isActive = item.action ? false : activeTab===item.id;
              const isReport = item.id==="report";
              return (
                <button key={item.id}
                  onClick={()=>{ if(isReport){ onReport?.(); } else { setActiveTab(item.id); }}}
                  style={{
                    width:"100%", padding:"10px 12px", borderRadius:9, border:"none",
                    background: isReport
                      ? "linear-gradient(135deg,rgba(0,255,157,0.14),rgba(0,200,255,0.1))"
                      : isActive ? `${theme.accent}14` : "transparent",
                    borderLeft: isActive ? `3px solid ${theme.accent}` : isReport ? "3px solid rgba(0,255,157,0.5)" : "3px solid transparent",
                    cursor:"pointer", textAlign:"left", transition:"all .18s",
                    display:"flex", alignItems:"center", gap:11,
                    boxShadow: isActive ? `inset 0 0 20px ${theme.accent}08` : "none",
                  }}
                  onMouseEnter={e=>{ if(!isActive&&!isReport) e.currentTarget.style.background=`${theme.accent}09`; }}
                  onMouseLeave={e=>{ if(!isActive&&!isReport) e.currentTarget.style.background="transparent"; }}>
                  <span style={{
                    fontSize:16, flexShrink:0, width:24, textAlign:"center",
                    filter: isActive ? "none" : "grayscale(20%)",
                  }}>{item.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:isActive||isReport?700:500,color:isReport?theme.green:isActive?theme.accent:theme.txt,lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
                    <div style={{fontSize:10,color:theme.txtMute,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.sub}</div>
                  </div>
                  {isActive && <div style={{width:5,height:5,borderRadius:"50%",background:theme.accent,flexShrink:0}}/>}
                </button>
              );
            })}
          </nav>

          {/* ── User section at bottom ── */}
          <div style={{padding:"12px 14px",borderTop:`1px solid ${theme.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:`${theme.accent}18`,border:`1px solid ${theme.accent}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                {userInitial}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:theme.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name||"Citizen"}</div>
                <div style={{fontSize:10,color:theme.txtMute,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email||"Guest"}</div>
              </div>
            </div>
            {/* Controls row */}
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <Toggle isDark={isDark} onToggle={()=>setIsDark(d=>!d)}/>
              <div style={{flex:1}}/>
              {onLogout && (
                <button onClick={onLogout} style={{background:"rgba(255,60,60,.08)",border:"1px solid rgba(255,60,60,.2)",borderRadius:6,padding:"5px 10px",color:"rgba(255,100,100,.7)",fontSize:10,fontWeight:600,cursor:"pointer",letterSpacing:"0.04em",transition:"all .18s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,60,60,.16)";e.currentTarget.style.color="#ff6060";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,60,60,.08)";e.currentTarget.style.color="rgba(255,100,100,.7)";}}>
                  LOGOUT
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ════════════════ MAIN CONTENT ════════════════ */}
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",minHeight:"100vh"}}>

          {/* Slim top bar */}
          <header style={{height:52,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",borderBottom:`1px solid ${theme.border}`,background:isDark?"rgba(2,6,9,0.72)":"rgba(248,252,255,0.72)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:90,flexShrink:0}}>
            {/* Breadcrumb */}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,color:theme.txtMute,letterSpacing:"0.06em"}}>CIVICSENTINEL</span>
              <span style={{color:theme.txtMute,fontSize:10}}>/</span>
              <span style={{fontSize:12,fontWeight:700,color:theme.accent,letterSpacing:"0.04em"}}>
                {NAV_ITEMS.find(n=>n.id===activeTab)?.label?.toUpperCase()||"OVERVIEW"}
              </span>
            </div>
            {/* Status indicator */}
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:connected?theme.green:theme.red,fontFamily:"'DM Mono',monospace"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:connected?theme.green:theme.red,animation:"pulseDot 2s infinite",display:"inline-block"}}/>
              {connected?"ALL SYSTEMS LIVE":"BACKEND OFFLINE — RETRYING"}
            </div>
          </header>

          {/* Banners */}
          {loading && !connected && (
            <div style={{margin:"10px 24px 0",padding:"9px 16px",background:`${theme.amber}10`,border:`1px solid ${theme.amber}28`,borderRadius:6,display:"flex",alignItems:"center",gap:10,fontSize:13,color:theme.amber,fontFamily:"'DM Mono',monospace",animation:"fadeUp .3s ease"}}>
              <span style={{animation:"blink 1s infinite"}}>⏳</span>
              <span>Waking up backend — first request may take <strong>~30s</strong>…</span>
              <span style={{marginLeft:"auto",fontSize:12,opacity:.5}}>{API}</span>
            </div>
          )}
          {error && connected===false && lastSync && (
            <div style={{margin:"10px 24px 0",padding:"9px 16px",background:`${theme.red}10`,border:`1px solid ${theme.red}28`,borderRadius:6,fontSize:13,color:theme.red,fontFamily:"'DM Mono',monospace"}}>
              ⚠ {error} — Retrying every {POLL_MS/1000}s
            </div>
          )}

        <div style={{padding:"20px 28px 36px",animation:"fadeUp .5s ease",flex:1}}>

          {/* ════════════ OVERVIEW ════════════ */}
          {activeTab==="overview" && (<>
            {/* KPI Strip */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[
                {l:"AVG RISK INDEX",   v:loading?null:avgRisk,        sub:"Across monitored cities",   col:riskCol(avgRisk,isDark)},
                {l:"ACTIVE ALERTS",    v:loading?null:alertList.length,sub:`${alertList.filter(a=>(a||"").toLowerCase().includes("high")).length} HIGH RISK`, col:theme.red},
                {l:"LIVE PREDICTIONS", v:loading?null:predList.length, sub:"AI crisis forecasts",       col:theme.amber},
                {l:"LIVE EVENTS",      v:loading?null:eventList.length,sub:"From /events stream",       col:theme.accent},
              ].map((k,i)=>(
                <Panel key={k.l} acc={k.col} tag={`N-${i+1}`} style={{animation:`fadeUp .4s ease ${i*.07}s both`}}>
                  <div style={{fontSize:14,fontFamily:"'Inter',sans-serif",color:theme.txtMute,letterSpacing:"0.05em",marginBottom:8}}>{k.l}</div>
                  {k.v===null
                    ? <><Skeleton h={36} mb={8}/><Skeleton h={10} w="60%"/></>
                    : <><div style={{fontSize:36,fontWeight:900,color:k.col,fontFamily:"'Inter',sans-serif",lineHeight:1}}>{k.v}</div>
                       <div style={{fontSize:14,color:theme.txtMute,marginTop:6}}>{k.sub}</div></>
                  }
                  <div style={{display:"flex",gap:1.5,alignItems:"flex-end",height:18,marginTop:10}}>
                    {Array.from({length:20},(_,j)=>(<div key={j} style={{flex:1,height:`${20+Math.abs(Math.sin(j*.65))*(k.v||30)}%`,maxHeight:"100%",background:`${k.col}45`,borderRadius:"1px 1px 0 0"}}/>))}
                  </div>
                </Panel>
              ))}
            </div>

            {/* 3-col main */}
            <div style={{display:"grid",gridTemplateColumns:"1.1fr .95fr 290px",gap:12,marginBottom:12}}>
              {/* ── HEATMAP PANEL ── */}
              <Panel
                title={drillCity ? `${drillCity.toUpperCase()} — WARD RISK MAP` : "INDIA RISK HEATMAP"}
                subtitle={drillCity ? `8 wards · risk derived from live data · hover for details` : "LIVE · /risk-summary · click a city to drill into wards"}
                acc={theme.accent}
                tag={
                  // Dropdown replaces the GEO tag
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
                    }}
                  >
                    <option value="">🗺 India Overview</option>
                    {Object.keys(WARD_GEOJSON).map(c => (
                      <option key={c} value={c}>📍 {c}</option>
                    ))}
                  </select>
                }
              >
                {loading && !riskEntries.length ? (
                  <div style={{height:320}}><Skeleton h={320}/></div>
                ) : drillCity ? (
                  // ── WARD DRILL-DOWN VIEW ──
                  <div style={{animation:"fadeUp .3s ease"}}>
                    {/* Back button + city risk badge */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                      <button onClick={()=>setDrillCity(null)}
                        style={{background:`${theme.accent}12`,border:`1px solid ${theme.accent}30`,color:theme.accent,
                          borderRadius:5,padding:"5px 12px",cursor:"pointer",fontSize:12,
                          fontFamily:"'Inter',sans-serif",fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                        ← Back to India
                      </button>
                      {riskSummary[drillCity] !== undefined && (
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:12,color:theme.txtMute,fontFamily:"'Inter',sans-serif"}}>City Risk:</span>
                          <span style={{fontSize:15,fontWeight:700,color:riskCol(riskSummary[drillCity],isDark),
                            fontFamily:"'DM Mono',monospace"}}>{riskSummary[drillCity]}/100</span>
                          <span style={{fontSize:11,color:riskCol(riskSummary[drillCity],isDark),
                            background:`${riskCol(riskSummary[drillCity],isDark)}15`,
                            border:`1px solid ${riskCol(riskSummary[drillCity],isDark)}30`,
                            borderRadius:4,padding:"2px 8px",fontFamily:"'Inter',sans-serif",fontWeight:600}}>
                            {riskLabel(riskSummary[drillCity])}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Ward SVG map */}
                    <CityWardMap
                      cityKey={drillCity}
                      cityRisk={riskSummary[drillCity] || 55}
                      isDark={isDark}
                    />
                    {/* Ward risk table below map */}
                    <div style={{marginTop:12,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                      {WARD_GEOJSON[drillCity]?.features.map(f => {
                        const risk = Math.min(99,Math.max(5,(riskSummary[drillCity]||55)+f.properties.offset));
                        const col  = riskCol(risk, isDark);
                        return (
                          <div key={f.properties.name} style={{padding:"7px 10px",background:`${col}10`,
                            border:`1px solid ${col}28`,borderRadius:5,textAlign:"center"}}>
                            <div style={{fontSize:11,color:theme.txtMute,fontFamily:"'Inter',sans-serif",marginBottom:3}}>{f.properties.name}</div>
                            <div style={{fontSize:14,fontWeight:700,color:col,fontFamily:"'DM Mono',monospace"}}>{risk}</div>
                            <div style={{width:"100%",height:3,borderRadius:2,background:`${col}20`,marginTop:5}}>
                              <div style={{height:"100%",width:`${risk}%`,background:col,borderRadius:2}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // ── INDIA OVERVIEW ──
                  <IndiaMap
                    riskSummary={riskSummary}
                    isDark={isDark}
                    onCitySelect={city => setDrillCity(WARD_GEOJSON[city] ? city : null)}
                    drillCity={drillCity}
                  />
                )}
              </Panel>

              {/* Charts column */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Panel title="ISSUE TRENDS" subtitle="/issue-trends · civic category counts" acc={theme.amber} tag="BAR">
                  {loading && !trendEntries.length
                    ? <Skeleton h={148}/>
                    : trendEntries.length
                      ? <ResponsiveContainer width="100%" height={148}>
                          <BarChart data={trendEntries} margin={{top:4,right:4,bottom:0,left:-26}}>
                            <CartesianGrid strokeDasharray="2 4" stroke={theme.grid} vertical={false}/>
                            <XAxis dataKey="name" tick={{fill:theme.tick,fontSize:13,fontFamily:"'DM Mono',monospace"}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fill:theme.tick,fontSize:11}} axisLine={false} tickLine={false}/>
                            <Tooltip content={<CyberTip/>}/>
                            <Bar dataKey="value" name="COUNT" radius={[4,4,0,0]}>
                              {trendEntries.map((_,i)=><Cell key={i} fill={[theme.accent,theme.amber,theme.red,theme.green,theme.accent][i%5]}/>)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      : <div style={{height:148,display:"flex",alignItems:"center",justifyContent:"center",color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace"}}>⏳ Waiting for data…</div>
                  }
                </Panel>

                <Panel title="CITY RISK RADAR" subtitle="/risk-summary · multi-axis view" acc={theme.accent}>
                  {loading && !radarData.length
                    ? <Skeleton h={148}/>
                    : radarData.length
                      ? <ResponsiveContainer width="100%" height={148}>
                          <RadarChart data={radarData} margin={{top:0,right:20,bottom:0,left:20}}>
                            <PolarGrid stroke={isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"}/>
                            <PolarAngleAxis dataKey="city" tick={{fill:theme.tick,fontSize:13,fontFamily:"'Inter',sans-serif"}}/>
                            <Radar name="Risk" dataKey="score" stroke={theme.accent} fill={theme.accent} fillOpacity={.12} strokeWidth={1.5}/>
                            <Tooltip content={<CyberTip/>}/>
                          </RadarChart>
                        </ResponsiveContainer>
                      : <div style={{height:148,display:"flex",alignItems:"center",justifyContent:"center",color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace"}}>⏳ Loading…</div>
                  }
                </Panel>
              </div>

              {/* Alert panel */}
              <Panel title="AI ALERT FEED" subtitle={`/alerts · ${alertList.length} active`} acc={theme.red} tag="LIVE">
                <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:490,overflowY:"auto"}}>
                  {loading && !alertList.length
                    ? Array.from({length:4},(_,i)=><Skeleton key={i} h={60} mb={0}/>)
                    : alertList.length
                      ? alertList.map((a,i)=>{
                          const txt = typeof a==="string"?a:(a.message||a.alert||JSON.stringify(a));
                          const {col,label} = severityFromText(txt,theme);
                          return (
                            <div key={i} style={{padding:"9px 11px",background:`${col}08`,border:`1px solid ${col}20`,borderLeft:`3px solid ${col}`,borderRadius:3,animation:`fadeUp .3s ease ${i*.05}s both`}}>
                              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                                {col===theme.red&&<span style={{width:5,height:5,borderRadius:"50%",background:theme.red,display:"inline-block",animation:"pulseDot 1s infinite"}}/>}
                                <span style={{fontSize:13,fontFamily:"'Inter',sans-serif",color:col,letterSpacing:"0.01em"}}>{label}</span>
                              </div>
                              <div style={{fontSize:13,color:theme.txtSub,lineHeight:1.5}}>{txt}</div>
                            </div>
                          );
                        })
                      : <div style={{color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace",padding:"20px 0",textAlign:"center"}}>⏳ No alerts yet…</div>
                  }
                </div>
              </Panel>
            </div>

            {/* Bottom row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {/* AI Copilot */}
              <Panel title="AI CIVIC COPILOT" subtitle="REAL RAG+LLM · /ai-insight endpoint" acc={theme.green} tag="AI-LIVE" style={{minHeight:420}}>
                <AIInsightPanel insight={aiInsight} loading={loading} error={error}/>
              </Panel>

              {/* Predictions + event mini */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Panel title="CRISIS PREDICTIONS" subtitle={`/predictions · ${predList.length} forecasts`} acc={theme.amber}>
                  <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:200,overflowY:"auto"}}>
                    {loading && !predList.length
                      ? Array.from({length:3},(_,i)=><Skeleton key={i} h={48} mb={0}/>)
                      : predList.length
                        ? predList.map((p,i)=>{
                            const txt=typeof p==="string"?p:(p.prediction||p.message||JSON.stringify(p));
                            return (
                              <div key={i} style={{padding:"9px 12px",background:`${theme.amber}08`,border:`1px solid ${theme.amber}22`,borderRadius:5,display:"flex",gap:9,animation:`fadeUp .3s ease ${i*.07}s both`}}>
                                <span style={{fontSize:14,flexShrink:0}}>🔮</span>
                                <div><div style={{fontSize:13,color:theme.amber,fontFamily:"'Inter',sans-serif",marginBottom:3}}>AI FORECAST</div><div style={{fontSize:13,color:theme.txtSub,lineHeight:1.55}}>{txt}</div></div>
                              </div>
                            );
                          })
                        : <div style={{color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace",padding:"16px 0",textAlign:"center"}}>⏳ Loading predictions…</div>
                    }
                  </div>
                </Panel>

                {/* Mini event feed preview */}
                <Panel title="RECENT EVENTS" subtitle={`/events · latest ${Math.min(eventList.length,5)} of ${eventList.length}`} acc={theme.accent}>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {loading && !eventList.length
                      ? Array.from({length:3},(_,i)=><Skeleton key={i} h={42} mb={0}/>)
                      : eventList.slice(0,5).map((e,i)=>{
                          const loc = e.location||e.city||"—"; const issue=e.issue||"—";
                          const risk=e.risk_score??e.risk??0; const sent=e.sentiment??0;
                          return (
                            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${theme.border}22`,animation:`fadeUp .3s ease ${i*.05}s both`}}>
                              <div style={{width:6,height:6,borderRadius:"50%",background:riskCol(risk,isDark),flexShrink:0,boxShadow:isDark?`0 0 5px ${riskCol(risk,isDark)}`:"none"}}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:13,color:theme.accent,fontFamily:"'Inter',sans-serif",fontWeight:700}}>{loc} <span style={{color:theme.txtMute,fontWeight:400,fontSize:11}}>— {issue}</span></div>
                                {e.text&&<div style={{fontSize:14,color:theme.txtMute,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:280}}>{e.text}</div>}
                              </div>
                              <div style={{fontSize:13,color:riskCol(risk,isDark),fontFamily:"'Inter',sans-serif",fontWeight:700,flexShrink:0}}>{risk}</div>
                              <div style={{fontSize:14,color:sent<0?theme.red:theme.green,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{typeof sent==="number"?sent.toFixed(2):"—"}</div>
                            </div>
                          );
                        })
                    }
                  </div>
                </Panel>
              </div>
            </div>
          </>)}

          {/* ════════════ INTELLIGENCE ════════════ */}
          {activeTab==="intelligence" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,animation:"slideIn .4s ease"}}>
              <Panel title="AI CIVIC COPILOT" subtitle="FULL INTERFACE · /ai-insight · RAG+LLM powered" acc={theme.green} tag="AI-LIVE" style={{minHeight:580}}>
                <AIInsightPanel insight={aiInsight} loading={loading} error={error}/>
              </Panel>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Panel title="CRISIS PREDICTIONS" subtitle={`/predictions · ${predList.length} active`} acc={theme.amber}>
                  <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:260,overflowY:"auto"}}>
                    {predList.map((p,i)=>{const txt=typeof p==="string"?p:(p.prediction||p.message||JSON.stringify(p));return(<div key={i} style={{padding:"9px 12px",background:`${theme.amber}08`,border:`1px solid ${theme.amber}22`,borderRadius:5,display:"flex",gap:9}}><span style={{fontSize:14}}>🔮</span><div><div style={{fontSize:13,color:theme.amber,fontFamily:"'Inter',sans-serif",marginBottom:3}}>AI FORECAST</div><div style={{fontSize:13,color:theme.txtSub,lineHeight:1.55}}>{txt}</div></div></div>);})}
                    {!predList.length&&<div style={{color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace",padding:"16px 0",textAlign:"center"}}>⏳ Loading…</div>}
                  </div>
                </Panel>
                <Panel title="AI ALERT FEED" subtitle="/alerts · real-time classification" acc={theme.red}>
                  <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:260,overflowY:"auto"}}>
                    {alertList.map((a,i)=>{const txt=typeof a==="string"?a:(a.message||a.alert||JSON.stringify(a));const {col,label}=severityFromText(txt,theme);return(<div key={i} style={{padding:"8px 11px",background:`${col}08`,borderLeft:`3px solid ${col}`,borderRadius:3,marginBottom:4}}><div style={{fontSize:13,color:col,fontFamily:"'Inter',sans-serif",marginBottom:3}}>{label}</div><div style={{fontSize:13,color:theme.txtSub,lineHeight:1.5}}>{txt}</div></div>);})}
                    {!alertList.length&&<div style={{color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace",padding:"16px 0",textAlign:"center"}}>⏳ Loading…</div>}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ════════════ ANALYTICS ════════════ */}
          {activeTab==="analytics" && (
            <div style={{animation:"slideIn .4s ease"}}>
              {/* City gauge grid */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
                {(loading&&!riskEntries.length?Array.from({length:8},(_,i)=>({city:`CITY-${i+1}`,score:0,_loading:true})):riskEntries).map((c,i)=>(
                  <Panel key={c.city} acc={c._loading?theme.accent:riskCol(c.score,isDark)} style={{animation:`fadeUp .4s ease ${i*.05}s both`,cursor:c._loading?"default":"pointer"}}>
                    <div style={{textAlign:"center"}} onClick={()=>!c._loading&&setSelectedCity(c.city)}>
                      <div style={{fontSize:13,color:theme.txtMute,fontFamily:"'Inter',sans-serif",marginBottom:10}}>{c.city.toUpperCase()}</div>
                      {c._loading?<Skeleton h={80} w="80px" mb={0} style={{margin:"0 auto"}}/>:(
                        <svg width="80" height="80" style={{display:"block",margin:"0 auto"}}>
                          <circle cx="40" cy="40" r="30" fill="none" stroke={isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.07)"} strokeWidth="5"/>
                          <circle cx="40" cy="40" r="30" fill="none" stroke={riskCol(c.score,isDark)} strokeWidth="5"
                            strokeDasharray={`${(c.score/100)*188.5} ${188.5-(c.score/100)*188.5}`}
                            strokeDashoffset="47.1" strokeLinecap="round" style={{transition:"stroke-dasharray 1.2s ease"}}/>
                          <text x="40" y="45" textAnchor="middle" fill={riskCol(c.score,isDark)} fontSize="18" fontFamily="DM Mono,monospace" fontWeight="500">{c.score}</text>
                        </svg>
                      )}
                      <div style={{fontSize:13,color:c._loading?theme.txtMute:riskCol(c.score,isDark),fontFamily:"'Inter',sans-serif",marginTop:8}}>{c._loading?"LOADING…":riskLabel(c.score)}</div>
                    </div>
                  </Panel>
                ))}
              </div>

              {/* Full event table */}
              <Panel title="LIVE CIVIC EVENT FEED" subtitle={`/events · ${eventList.length} incidents · polling every ${POLL_MS/1000}s`} acc={theme.accent} tag={`${eventList.length} EVENTS`}>
                <div style={{display:"grid",gridTemplateColumns:"85px 110px 1fr 100px 70px 70px"}}>
                  {["TIME","LOCATION","DESCRIPTION","ISSUE","SENTIMENT","RISK SCORE"].map(h=>(
                    <div key={h} style={{fontSize:13,color:theme.txtMute,fontFamily:"'Inter',sans-serif",letterSpacing:"0.07em",padding:"5px 8px",borderBottom:`1px solid ${theme.border}`}}>{h}</div>
                  ))}
                </div>
                <div style={{maxHeight:360,overflowY:"auto"}}>
                  {loading&&!eventList.length
                    ? Array.from({length:6},(_,i)=><div key={i} style={{padding:"8px",borderBottom:`1px solid ${theme.border}22`}}><Skeleton h={14} mb={0}/></div>)
                    : eventList.length
                      ? eventList.map((e,i)=>{
                          const ts=e.timestamp?new Date(e.timestamp).toLocaleTimeString():"—";
                          const risk=e.risk_score??e.risk??0; const sent=e.sentiment??0;
                          return (
                            <div key={i} style={{display:"grid",gridTemplateColumns:"85px 110px 1fr 100px 70px 70px",alignItems:"center",borderBottom:`1px solid ${theme.border}20`,animation:`fadeUp .3s ease ${Math.min(i,.2)*i*.02}s both`,transition:"background .15s"}}
                              onMouseEnter={e2=>e2.currentTarget.style.background=`${theme.accent}06`}
                              onMouseLeave={e2=>e2.currentTarget.style.background="transparent"}>
                              <div style={{fontSize:14,color:theme.txtMute,fontFamily:"'DM Mono',monospace",padding:"6px 8px"}}>{ts}</div>
                              <div style={{fontSize:14,color:theme.accent,fontFamily:"'Inter',sans-serif",fontWeight:700,padding:"6px 8px"}}>{e.location||e.city||"—"}</div>
                              <div style={{fontSize:14,color:theme.txtSub,fontFamily:"'DM Mono',monospace",padding:"6px 8px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.text||e.description||"—"}</div>
                              <div style={{fontSize:14,color:theme.txtMute,fontFamily:"'DM Mono',monospace",padding:"6px 8px"}}>{e.issue||"—"}</div>
                              <div style={{fontSize:14,color:sent<0?theme.red:theme.green,fontFamily:"'DM Mono',monospace",padding:"6px 8px"}}>{typeof sent==="number"?sent.toFixed(2):"—"}</div>
                              <div style={{padding:"6px 8px",display:"flex",alignItems:"center",gap:6}}>
                                <div style={{flex:1,height:4,borderRadius:2,background:`${riskCol(risk,isDark)}25`}}><div style={{height:"100%",width:`${risk}%`,background:riskCol(risk,isDark),borderRadius:2,transition:"width 1s ease"}}/></div>
                                <span style={{fontSize:14,color:riskCol(risk,isDark),fontFamily:"'Inter',sans-serif",fontWeight:700}}>{risk}</span>
                              </div>
                            </div>
                          );
                        })
                      : <div style={{padding:"30px",textAlign:"center",color:theme.txtMute,fontSize:13,fontFamily:"'DM Mono',monospace"}}>⏳ Waiting for events from backend…</div>
                  }
                </div>
              </Panel>
            </div>
          )}

          {/* ════════════ KNOWLEDGE GRAPH ════════════ */}
          {activeTab==="graph" && (
            <div style={{animation:"slideIn .4s ease"}}>
              <Panel title="CIVIC KNOWLEDGE GRAPH" subtitle="/knowledge-graph · entity relationships · AI-mapped connections" acc={theme.green} tag="NETWORK">
                {loading&&!knowledgeGraph
                  ? <div style={{height:300,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
                      <div style={{fontSize:13,color:theme.txtMute,fontFamily:"'DM Mono',monospace",animation:"blink .8s infinite"}}>► LOADING KNOWLEDGE GRAPH FROM BACKEND…</div>
                      <Skeleton h={200}/>
                    </div>
                  : <KnowledgeGraph data={knowledgeGraph} isDark={isDark}/>
                }
              </Panel>
              {/* Raw data dump */}
              {knowledgeGraph && (
                <div style={{marginTop:12}}>
                  <Panel title="RAW GRAPH DATA" subtitle="/knowledge-graph · API response" acc={theme.accent}>
                    <pre style={{fontSize:13,color:theme.txtSub,fontFamily:"'DM Mono',monospace",whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:300,overflowY:"auto",lineHeight:1.7}}>
                      {JSON.stringify(knowledgeGraph,null,2).slice(0,2000)}{JSON.stringify(knowledgeGraph).length>2000?"…":""}
                    </pre>
                  </Panel>
                </div>
              )}
            </div>
          )}
          {/* ════════════ MY REPORTS ════════════ */}
          {activeTab==="myreports" && (
            <div style={{animation:"slideIn .4s ease"}}>
              <div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:17,fontWeight:800,color:theme.txt}}>My Reports</div>
                  <div style={{fontSize:12,color:theme.txtMute,marginTop:2}}>Issues you've submitted · auto-dispatched to ward offices</div>
                </div>
                <button onClick={()=>onReport?.()} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 18px",background:"linear-gradient(135deg,rgba(0,255,157,.14),rgba(0,200,255,.1))",border:`1px solid ${theme.green}50`,borderRadius:8,color:theme.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  📸 New Report
                </button>
              </div>

              {/* Status legend */}
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                {[["resolved","#00ff9d","✓ Resolved"],["in_progress","#ffb800","⏳ In Progress"],["submitted","rgba(0,200,255,.8)","📤 Submitted"]].map(([s,c,l])=>(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:theme.txtMute}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>
                    {l}
                  </div>
                ))}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {MY_REPORTS.map((r,i)=>{
                  const statusColor = r.status==="resolved"?"#00ff9d":r.status==="in_progress"?theme.amber:theme.accent;
                  const statusLabel = r.status==="resolved"?"✓ Resolved":r.status==="in_progress"?"⏳ In Progress":"📤 Submitted";
                  const progress    = r.status==="resolved"?100:r.status==="in_progress"?55:20;
                  return (
                    <div key={r.id} style={{background:theme.panel,border:`1px solid ${theme.border}`,borderLeft:`3px solid ${statusColor}`,borderRadius:10,padding:"14px 18px",display:"grid",gridTemplateColumns:"1fr auto",gap:12,animation:`fadeUp .3s ease ${i*.06}s both`,transition:"border-color .2s,box-shadow .2s",cursor:"default"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=statusColor+"60";e.currentTarget.style.boxShadow=`0 4px 20px ${statusColor}14`;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=theme.border;e.currentTarget.style.boxShadow="none";}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                          <span style={{fontSize:16}}>{r.issue.split(" ")[0]}</span>
                          <span style={{fontSize:14,fontWeight:700,color:theme.txt}}>{r.issue.split(" ").slice(1).join(" ")}</span>
                          <span style={{fontSize:10,background:`${statusColor}18`,border:`1px solid ${statusColor}40`,borderRadius:20,padding:"2px 10px",color:statusColor,fontWeight:700}}>{statusLabel}</span>
                        </div>
                        <div style={{display:"flex",gap:16,marginBottom:8}}>
                          {[["🏘️",r.ward],["🕐",r.date],["⚡",`Risk: ${r.risk}/100`]].map(([icon,val])=>(
                            <div key={val} style={{fontSize:11,color:theme.txtMute}}>{icon} {val}</div>
                          ))}
                        </div>
                        {/* Progress bar */}
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{flex:1,height:4,background:`${statusColor}15`,borderRadius:2}}>
                            <div style={{height:"100%",width:`${progress}%`,background:statusColor,borderRadius:2,transition:"width 1s ease"}}/>
                          </div>
                          <span style={{fontSize:10,color:statusColor,fontFamily:"'DM Mono',monospace",minWidth:32}}>{progress}%</span>
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",justifyContent:"space-between"}}>
                        <span style={{fontSize:10,color:theme.txtMute,fontFamily:"'DM Mono',monospace"}}>{r.id}</span>
                        <div style={{width:42,height:42,position:"relative"}}>
                          <svg width="42" height="42">
                            <circle cx="21" cy="21" r="17" fill="none" stroke={`${statusColor}20`} strokeWidth="4"/>
                            <circle cx="21" cy="21" r="17" fill="none" stroke={statusColor} strokeWidth="4"
                              strokeDasharray={`${(progress/100)*106.8} ${106.8-(progress/100)*106.8}`}
                              strokeDashoffset="26.7" strokeLinecap="round"/>
                          </svg>
                          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:statusColor,fontFamily:"'DM Mono',monospace"}}>{progress}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>{/* end content padding */}

          {/* Footer */}
          <footer style={{padding:"10px 28px 16px",borderTop:`1px solid ${theme.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{fontSize:11,color:theme.txtMute,fontFamily:"'Inter',sans-serif",letterSpacing:"0.02em"}}>CIVICSENTINEL AI · DIGITAL DEMOCRACY · {API}</div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{fontSize:11,color:theme.txtMute,fontFamily:"'DM Mono',monospace"}}>POLL: {POLL_MS/1000}s · 9 ENDPOINTS</div>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:connected?theme.green:theme.red}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:connected?theme.green:theme.red,animation:"pulseDot 2s infinite"}}/>
                {connected?"ALL SYSTEMS LIVE":"BACKEND OFFLINE — RETRYING"}
              </div>
            </div>
          </footer>
        </div>{/* end main column */}
      </div>{/* end root flex layout */}
    </Ctx.Provider>
  );
}