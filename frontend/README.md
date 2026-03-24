# CivicSentinel AI — Frontend

> Civic issue reporting platform for Indian citizens with AI-powered detection, multilingual support, and real-time ward officer dashboard.

**Live URLs**
- Citizen App: https://civicsentinel-ai-pszx.onrender.com
- Admin Dashboard: https://civicsentinel-admin.onrender.com
- Backend API: https://civicsentinel-ai-1.onrender.com

---

## Project Structure

```
frontend/
├── citizen-app/                  ← React app for citizens (port 3000)
│   ├── src/
│   │   ├── App.jsx               ← Root — Firebase auth, routing, lang state
│   │   ├── firebase.js           ← Firebase config, auth, googleProvider
│   │   ├── translations.js       ← All 6 languages, shared across components
│   │   ├── CitizenLogin.jsx      ← Login/signup with Firebase + Google OAuth
│   │   ├── CitizenHome.jsx       ← Home screen, My Reports (real backend feed)
│   │   ├── CitizenReport.jsx     ← 5-step report wizard
│   │   └── CitizenProfile.jsx    ← User profile, language preference
│   ├── .env                      ← SKIP_PREFLIGHT_CHECK=true
│   └── package.json
│
└── admin-app/            ← React app for ward officers (port 3001)
    ├── src/
    │   ├── App.jsx               ← Root — officer login routing
    │   ├── OfficerLogin.jsx      ← Hardcoded demo credentials login
    │   └── OfficerDashboard.jsx  ← Full dashboard with map, charts, AI
    ├── .env
    └── package.json
```

---

## Running Locally

```bash
# Citizen App
cd frontend/citizen-app
npm install
npm start          # → localhost:3000

# Admin App (new terminal)
cd frontend/admin-app
npm install
npm start          # → localhost:3001 (press Y when prompted)
```

---

## Citizen App

### Authentication (Firebase)
- **Email/Password** — `createUserWithEmailAndPassword` + `signInWithEmailAndPassword`
- **Google OAuth** — `signInWithPopup` with `GoogleAuthProvider`
- **Guest mode** — bypasses Firebase, limited features
- **Persistent sessions** — `onAuthStateChanged` restores session on refresh
- **Password reset** — `sendPasswordResetEmail`
- Language preference saved to `localStorage` keyed by Firebase `uid`

**Firebase Project:** `civicsentinel-5f761`
> After deploying, add your Render URL to Firebase Console → Authentication → Settings → Authorized Domains

### Report Wizard (5 Steps)

**Step 1 — Photo**
- Camera capture via `getUserMedia` (rear camera preferred)
- Gallery upload via file input
- Skip option for text-only reports (water supply, noise, power cut)

**Step 2 — GPS Location**
- Auto-detects via `navigator.geolocation` with `enableHighAccuracy: true`
- Reverse geocodes via Nominatim OpenStreetMap API
- `normalizeCity()` maps detected city names to standard names (e.g. "Kanpur Nagar" → "Kanpur") for correct backend risk scoring
- **Manual city dropdown** — 30 Indian cities selectable for demos when GPS fails

**Step 3 — AI Scan** (photo only)
- Sends image to Anthropic Claude API
- Returns: issue category, label, confidence, severity, bounding box
- Falls back to deterministic mock if API fails

**Step 4 — Details**
- Category grid (Water, Road, Electricity, Garbage, Encroachment, Crime, Health, Other)
- Severity picker (Low / Medium / High / Critical)
- Description textarea
- Anonymous toggle

**Step 5 — Preview & Submit**
- POSTs to `POST /report-complaint` on backend
- Payload: `{ location, issue, text }`
- Shows report ID on success

### My Reports
- Fetches real data from `GET /events` backend endpoint
- Handles backend field names: `issue`, `text`, `city`, `status`, `created_at`
- Refreshes when tab is switched to "My Reports"

### Multilingual Support
All 6 languages supported across **every screen**:
```text
| Code | Language |
|------|----------|
| en | English |
| hi | हिन्दी |
| ta | தமிழ் |
| te | తెలుగు |
| bn | বাংলা |
| mr | मराठी |
```
- Single source of truth: `translations.js` (~70 keys per language)
- Language picker in top-right on Login and Home screens
- Language selection persists via Firebase user profile + localStorage
- `lang` state lives in `App.jsx` and is passed down to all components including the Report wizard
- When user changes language in `CitizenHome`, `onLangChange` prop updates `App.jsx` state so `CitizenReport` also opens in the correct language

---

## Admin Dashboard

### Login Credentials

| Email | Password | Role |
|-------|----------|------|
| officer@mcgm.gov.in | Ward@2024 | Ward Officer — Bandra |
| admin@civicsentinel.in | Admin@2024 | Admin — All Cities |
| ward@andheri.gov.in | Ward@2024 | Ward Officer — Andheri |

### Dashboard Tabs

**Overview**
- 5 KPI cards: Total Complaints, Avg Risk Index, High Risk Cities, Active Alerts, AI Predictions
- India Risk Heatmap (Leaflet map, real `/risk-summary` data)
- Issue Trends bar chart (`/issue-trends`)
- City Risk Radar chart
- AI Alert Feed (`/alerts`)
- AI Civic Copilot panel (`/ai-insight`)
- Crisis Predictions (`/predictions`)
- Recent Events feed (`/events`)

**Intelligence** — Full AI Copilot + Alerts + Predictions

**AI Civic Copilot** — Chat interface hitting `/ai-civic-copilot` endpoint with local data fallback

**Live Stream** — WebSocket connection to `wss://civicsentinel-ai-1.onrender.com/ws/events`

**Analytics** — City gauge grid + full event table

**Knowledge Graph** — Canvas-based force graph from `/knowledge-graph`

### India Risk Heatmap
- Leaflet map loaded from CDN (no npm install needed)
- Dark/light tile layers from CartoCDN
- City markers sized and colored by risk score (≥70 critical/red, 40-69 high/amber, <40 stable/green)
- Click city to drill into ward-level map
- **45 Indian cities** with GPS coordinates including all metros and tier-2 cities
- Case-insensitive city name matching (handles backend returning "bangalore" vs "Bangalore")

**Cities covered:** Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, Jaipur, Surat, Kanpur, Nagpur, Lucknow, Bhopal, Indore, Patna, Vadodara, Coimbatore, Agra, Nashik, Rajkot, Meerut, Varanasi, Amritsar, Visakhapatnam, Thane, Navi Mumbai, Faridabad, Ghaziabad, Noida, Kochi, Chandigarh, Guwahati, Bhubaneswar, Ranchi, Raipur, Jodhpur, Madurai, Mysuru, Mangaluru, Thiruvananthapuram, Kozhikode, Vijayawada, Warangal

**Ward drill-down** available for: Mumbai, Delhi, Bangalore, Chennai (8 wards each with approximate GeoJSON boundaries)

### Data Polling
- All endpoints polled every 8 seconds (`POLL_MS = 8000`)
- WebSocket auto-reconnects on disconnect (5s retry)
- REST + WebSocket status indicators in top-right header

---

## Backend API Endpoints Used
```text
| Method | Endpoint | Used By |
|--------|----------|---------|
| POST | `/report-complaint` | CitizenReport submit |
| GET | `/events` | CitizenHome My Reports, Admin event feed |
| GET | `/risk-summary` | Admin heatmap + radar |
| GET | `/issue-trends` | Admin bar chart |
| GET | `/alerts` | Admin alert feed |
| GET | `/predictions` | Admin predictions |
| GET | `/ai-insight` | Admin AI copilot |
| GET | `/ai-civic-copilot` | Admin chat interface |
| GET | `/knowledge-graph` | Admin graph tab |
| GET | `/dashboard` | Admin KPI cards |
| GET | `/risk-map` | Admin map data |
| GET | `/health` | Connection status indicator |
| WSS | `/ws/events` | Admin live stream |
```
---

## Deployment (Render Static Sites)

### Citizen App
- **Root Directory:** `frontend/citizen-app`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `build`
- **Env Var:** `SKIP_PREFLIGHT_CHECK=true`

### Admin App
- **Root Directory:** `frontend/admin-app`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `build`
- **Env Var:** `SKIP_PREFLIGHT_CHECK=true`

### Deploying Updates
```bash
# After making changes locally:
copy citizen-app\src\<file> frontend\citizen-app\src\<file>
git add .
git commit -m "description"
git push origin master:main
# Then: Render → Manual Deploy → Clear build cache & deploy
```

> **Important:** Always copy changed files to both `citizen-app/src/` (local dev) AND `frontend/citizen-app/src/` (what Render builds from) before pushing.

---

## Known Issues & Notes

- GPS may return incorrect location if browser has cached coordinates from a VPN session. Fix: clear site data in DevTools → Application → Storage, or use the manual city dropdown.
- Backend on Render free tier sleeps after inactivity — first request may take ~30 seconds to wake up.
- Anthropic API key for AI photo scan is called directly from the browser (CitizenReport.jsx). For production, this should be proxied through the backend.
- My Reports shows all events from `/events` — filtering by user ID requires backend support for `?user_id=` query param.

---

## Tech Stack
```text
| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 (Create React App) |
| Auth | Firebase Authentication |
| Maps | Leaflet.js (CDN) + OpenStreetMap |
| Charts | Recharts |
| AI Detection | Anthropic Claude API (claude-sonnet-4) |
| Geocoding | Nominatim (OpenStreetMap) |
| Styling | Inline styles (no CSS framework) |
| Fonts | Inter + DM Mono (Google Fonts) |
| Deployment | Render (Static Sites) |
| Repo | github.com/Aditya-dxt/civicsentinel-ai |
```
