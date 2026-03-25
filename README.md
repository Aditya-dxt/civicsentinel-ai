# 🧠 CivicSentinel AI
### Civic Intelligence & Risk Monitoring System

CivicSentinel AI is a **full-stack AI-powered civic intelligence platform** that enables citizens to report issues and empowers authorities with **real-time monitoring, risk analysis, and predictive insights**.

It bridges the gap between **citizen signals → AI processing → government action**.

---

# 🌐 Live Applications
```text
- 🚀 Citizen App: https://civicsentinel-ai-pszx.onrender.com
- 🛠 Admin Dashboard: https://civicsentinel-admin.onrender.com
- 🔗 Backend API: https://civicsentinel-ai-1-z7io.onrender.com
- 📘 Swagger Docs: https://civicsentinel-ai-1-z7io.onrender.com/docs
```
---

# 👤 Author

**Aditya Dixit**
**Vaibhav Tripathi**

# GitHub
```text
https://github.com/Aditya-dxt
```
---

# 🧩 System Overview

CivicSentinel AI consists of:
```text
### 🖥 Frontend (React)
- Citizen Reporting App
- Admin Intelligence Dashboard

### ⚙ Backend (FastAPI)
- AI processing pipelines
- Risk scoring & predictions
- Real-time APIs & WebSockets
```
---

# 🏗 Complete Architecture

```text
Citizen Reports / Civic Data
            │
            ▼
    React Frontend Apps
 (Citizen + Admin Dashboard)
            │
            ▼
     FastAPI Backend API
            │
 ┌──────────┼──────────┐
 ▼          ▼          ▼
NLP     Anomaly    Risk Engine
        Detection
            │
            ▼
     Intelligence Layer
 (Alerts | Trends | Predictions)
            │
            ▼
   Knowledge Graph + RAG
            │
            ▼
       AI Insights APIs
```

# 📁 Project Structure
```text
civicsentinel-ai/
│
├── frontend/
│   ├── citizen-app/      # Citizen reporting app (React)
│   └── admin-app/        # Admin dashboard (React)
│
├── backend/
│   ├── app/
│   ├── models/
│   ├── services/
│   ├── rag/
│   ├── streaming/
│   └── main.py
│
└── README.md
```

# 🚀 Features
```text
👥 Citizen App
📸 AI-powered issue detection (image upload)
📍 GPS + manual location support
🌍 Multi-language support (6 languages)
🧾 5-step reporting system
🔐 Firebase authentication (Google + Email)
📊 My Reports (real backend data)
🛠 Admin Dashboard
📊 KPI metrics & analytics
🗺 India risk heatmap (45+ cities)
📈 Issue trends & predictions
🚨 AI alert feed
🤖 AI Civic Copilot (chat interface)
🔴 Real-time event streaming (WebSockets)
🧠 Knowledge Graph visualization
⚙ Backend (AI Engine)
⚡ FastAPI async APIs
📡 Real-time event streaming
🧠 Sentiment analysis (TextBlob)
🔍 Anomaly detection
📊 Risk scoring engine
🔗 Knowledge graph (NetworkX)
📦 RAG pipeline (ChromaDB + LangChain)
🤖 LLM insights (OpenAI)
🔄 AI Processing Pipeline
Civic Event
    ↓
FastAPI Ingestion
    ↓
Sentiment Analysis
    ↓
Anomaly Detection
    ↓
Risk Scoring
    ↓
Knowledge Graph Update
    ↓
RAG + LLM Processing
    ↓
AI Insight Output
```

# 📡 API Endpoints
```text
Core
GET /health
GET /
Events
GET /events
POST /report-complaint
Analytics
GET /risk-summary
GET /issue-trends
GET /alerts
GET /predictions
AI
GET /ai-insight
GET /ai-civic-copilot
GET /knowledge-graph
Streaming
WSS /ws/events
```

# 🧪 Running Locally

# Citizen App
```text
cd frontend/citizen-app
npm install
npm start
```
# Admin App (new terminal)
### Frontend
```text
cd frontend/admin-app
npm install
npm start
```
### Backend
```text
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

# ⚙ Tech Stack

### Frontend
```text
React 18 (CRA)
Firebase Auth
Leaflet.js (Maps)
Recharts (Charts)
OpenStreetMap (Geocoding)
```
### Backend
```text
FastAPI
Uvicorn
AsyncIO
WebSockets
AI / ML
OpenAI GPT
LangChain
ChromaDB
TextBlob
NetworkX
ONNX Runtime
Infrastructure
Render (Deployment)
```
# GitHub (Version Control)
```text
🌍 Key Capabilities
📡 Real-time civic monitoring
📊 Risk intelligence scoring
🚨 Automated alerts & predictions
🧠 AI-powered governance insights
🔗 Knowledge graph relationships
💬 Natural language civic copilot
```
# ⚠ Known Issues
```text
GPS inaccuracies (browser caching / VPN)
Backend cold start (Render free tier)
AI image scan exposed client-side (needs backend proxy)
User-specific report filtering requires backend update
```
# 🚀 Deployment (Render)
### Frontend
```text
Build: npm install && npm run build
Publish: build
```
### Backend
```text
Deploy FastAPI service
Enable WebSocket support
```

# 🔮 Future Roadmap
```text
• Mobile app release
• IoT integration
• Geo-fencing alerts
• Advanced ML models
• Multi-city scaling
• Government system integration
```

# ⭐ Support
```text
If you found this project useful, please ⭐ the repo:
https://github.com/Aditya-dxt/civicsentinel-ai
```
