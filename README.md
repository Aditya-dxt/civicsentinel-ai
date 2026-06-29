<div align="center">

# 🧠 CivicSentinel AI
### Civic Intelligence & Risk Monitoring System

**An AI-powered full-stack platform bridging citizen signals → intelligent processing → government action.**  
Built with FastAPI · React · LangChain · RAG · WebSockets · Knowledge Graphs

[![Citizen App](https://img.shields.io/badge/🌐%20Citizen%20App-Live-brightgreen?style=for-the-badge)](https://civicsentinel-ai-pszx.onrender.com)
[![Admin Dashboard](https://img.shields.io/badge/🛠%20Admin%20Dashboard-Live-blue?style=for-the-badge)](https://civicsentinel-admin.onrender.com)
[![API Docs](https://img.shields.io/badge/📘%20Swagger%20Docs-Live-orange?style=for-the-badge)](https://civicsentinel-ai-1-z7io.onrender.com/docs)
[![Stars](https://img.shields.io/github/stars/Aditya-dxt/civicsentinel-ai?style=for-the-badge)](https://github.com/Aditya-dxt/civicsentinel-ai/stargazers)

</div>

---

## 🖼️ Preview

> *(Drop screenshots here — drag PNGs into the file on GitHub)*

| Citizen App | Admin Dashboard | Knowledge Graph |
|---|---|---|
| ![citizen](public/citizen.png) | ![admin](public/admin.png) | ![graph](public/graph.png) |

---

## 🌐 Live Links

| App | URL |
|---|---|
| 🚀 Citizen Reporting App | https://civicsentinel-ai-pszx.onrender.com |
| 🛠️ Admin Intelligence Dashboard | https://civicsentinel-admin.onrender.com |
| 🔗 Backend REST API | https://civicsentinel-ai-1-z7io.onrender.com |
| 📘 Swagger API Docs | https://civicsentinel-ai-1-z7io.onrender.com/docs |

> **Note:** Backend may take 30–60 seconds on first load (Render free tier cold start).

---

## 🧩 What Is CivicSentinel AI?

CivicSentinel AI is a **three-part platform** — a citizen app, an admin intelligence dashboard, and an AI backend engine — designed to modernize how civic issues are reported, analyzed, and acted upon.
## 🏗️ How It Works

```
Citizen Reports / Civic Events
           │
           ▼
   React Frontend Apps
(Citizen App + Admin Dashboard)
           │
           ▼
    FastAPI Backend (AI Engine)
           │
  ┌────────┼────────┐
  ▼        ▼        ▼
 NLP   Anomaly   Risk Engine
       Detection
           │
           ▼
   Intelligence Layer
(Alerts · Trends · Predictions)
           │
           ▼
 Knowledge Graph + RAG Pipeline
           │
           ▼
    AI Insight APIs → Dashboard
```
---

## ✨ Features

### 👥 Citizen App
- 📸 AI-powered issue detection from image uploads
- 📍 GPS + manual location support (OpenStreetMap geocoding)
- 🌍 Multi-language support (6 languages)
- 🧾 5-step guided issue reporting flow
- 🔐 Firebase Authentication (Google + Email/Password)
- 📊 Personal report history with real backend data

### 🛠️ Admin Intelligence Dashboard
- 📊 Live KPI metrics — total reports, risk scores, resolution rates
- 🗺️ India risk heatmap across 45+ cities (Leaflet.js)
- 📈 Issue trend charts and AI-generated predictions
- 🚨 Real-time AI alert feed (WebSocket streaming)
- 🤖 AI Civic Copilot — natural language chat interface for querying civic data
- 🧠 Interactive knowledge graph visualization (NetworkX)
- 🔴 Live event stream (WebSockets)

### ⚙️ AI Backend Engine
- ⚡ Async FastAPI with WebSocket support
- 🧠 Sentiment analysis (TextBlob) on citizen reports
- 🔍 Anomaly detection on incoming civic events
- 📊 Risk scoring engine per city and category
- 🔗 Knowledge graph (NetworkX) — maps relationships between issues, locations, departments
- 📦 RAG pipeline (ChromaDB + LangChain) for context-aware AI responses
- 🤖 LLM insights (OpenAI GPT) for the Civic Copilot
- 📡 Real-time streaming via WebSocket (`/ws/events`)

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 (CRA) | Citizen app & admin dashboard |
| Firebase Auth | Google + email authentication |
| Leaflet.js | Interactive India risk heatmap |
| Recharts | Trend charts & analytics visualizations |
| OpenStreetMap | Geocoding & location services |

### Backend (AI Engine)
| Technology | Purpose |
|---|---|
| FastAPI + Uvicorn | Async REST API & WebSocket server |
| LangChain | RAG orchestration |
| ChromaDB | Vector store for RAG pipeline |
| OpenAI GPT | LLM for Civic Copilot & insights |
| TextBlob | Sentiment analysis on reports |
| NetworkX | Knowledge graph construction |
| ONNX Runtime | Edge ML model inference |

### Infrastructure
| Tool | Purpose |
|---|---|
| Render | Deployment (all 3 services) |
| Firebase | Auth + real-time data |
| GitHub | Version control (128+ commits) |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health check |
| GET | `/events` | All civic events |
| POST | `/report-complaint` | Submit a citizen report |
| GET | `/risk-summary` | Risk scores by city/category |
| GET | `/issue-trends` | Historical trend data |
| GET | `/alerts` | Active AI-generated alerts |
| GET | `/predictions` | ML-based predictions |
| GET | `/ai-insight` | AI-generated civic insights |
| GET | `/ai-civic-copilot` | Natural language Q&A |
| GET | `/knowledge-graph` | Graph node/edge data |
| WSS | `/ws/events` | Real-time event stream |

Full interactive docs: [Swagger UI →](https://civicsentinel-ai-1-z7io.onrender.com/docs)

---

## 🚀 Running Locally

### 1. Citizen App
```bash
cd citizen-app
npm install
npm start          # → http://localhost:3000
```

### 2. Admin Dashboard
```bash
cd admin-app
npm install
npm start          # → http://localhost:3001
```

### 3. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload   # → http://localhost:8000
```

---

## 📂 Project Structure
civicsentinel-ai/

├── citizen-app/        # React citizen reporting app

├── admin-app/          # React admin intelligence dashboard

├── frontend/           # Shared frontend utilities

├── backend/

│   ├── app/            # FastAPI app setup

│   ├── models/         # Data models

│   ├── services/       # AI services (NLP, risk, anomaly)

│   ├── rag/            # ChromaDB + LangChain RAG pipeline

│   ├── streaming/      # WebSocket event streaming

│   └── main.py         # Entry point

└── README.md

---

## ⚠️ Known Limitations

- GPS accuracy issues due to browser caching / VPN interference
- Backend cold start delay (~30–60s) on Render free tier
- AI image scan currently runs client-side (should be proxied through backend)
- User-specific report filtering needs a backend update

---

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] IoT sensor integration
- [ ] Geo-fencing alerts for residents
- [ ] Advanced ML models (fine-tuned on Indian civic data)
- [ ] Multi-city government portal integration
- [ ] Razorpay / government payment gateway for fines

---

## 👨‍💻 Authors

**Aditya Dixit** — [@Aditya-dxt](https://github.com/Aditya-dxt)  
**Vaibhav Tripathi**

---

<div align="center">
  Built to make civic governance smarter 🇮🇳<br/>
  If this project helped you, please ⭐ the repo!
</div>
