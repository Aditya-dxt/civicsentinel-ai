# venv\Scripts\activate
# uvicorn main:app --reload

from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import asyncio
import os

# Streaming
from app.streaming.pipeline import process_event
from app.streaming.stream_service import event_store
from app.api.ws import event_stream

# Intelligence modules
from app.intelligence.alerts import generate_alerts
from app.intelligence.prediction import predict_crisis
from app.intelligence.risk_map import generate_risk_map

# Knowledge graph
from app.graph.civic_graph import CivicGraph

# RAG + LLM
from app.rag.rag_index import CivicRAG
from app.rag.retriever import CivicRetriever

# AI Copilot
from app.intelligence.copilot import civic_copilot

# Dashboard
from app.intelligence.dashboard import crisis_dashboard

# Pydantic model for complaint reporting
from pydantic import BaseModel
import uuid
from datetime import datetime
from app.streaming.stream_service import broadcast_event


# ──────────────────────────────────────────────────────────────
# FIX: Added user_id, ward, status fields to Complaint model.
#      This makes every stored event user-scoped so /my-reports
#      can filter by Firebase UID and return only that user's data.
# ──────────────────────────────────────────────────────────────
class Complaint(BaseModel):
    location: str
    issue:    str
    text:     str
    user_id:  str = "anonymous"  # Firebase UID from citizen app
    ward:     str = "Unknown"    # Ward/suburb from reverse geocode
    status:   str = "submitted"  # submitted | in_progress | resolved


load_dotenv()

app = FastAPI(title="CivicSentinel AI")


# ── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # allows deployed frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Initialize engines ───────────────────────────────────────────
graph_engine = CivicGraph()
rag          = CivicRAG()
retriever    = CivicRetriever()


# Seed knowledge base (uncomment to seed on startup)
# rag.add_documents([
#     "Water supply issues increase in Mumbai during summer.",
#     "Electricity outages often occur due to transformer overload.",
#     "Corruption complaints are handled by Anti-Corruption Bureau.",
# ])


# ── Root ─────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "CivicSentinel backend running"}


# ── Health check ─────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


# ── Generate single event ─────────────────────────────────────────
@app.get("/event")
def get_event():
    return process_event()


# ── Get all events ────────────────────────────────────────────────
@app.get("/events")
def get_events():
    return {"events": event_store}


# -----------------------------
# LLM Powered AI Insight
# -----------------------------
@app.get("/ai-insight")
def ai_insight(query: str):
    ai_analysis  = retriever.query(query)
    latest_event = event_store[-1] if event_store else None
    return {
        "query":        query,
        "latest_event": latest_event,
        "ai_analysis":  ai_analysis,
    }


# -----------------------------
# Risk Summary
# -----------------------------
from app.intelligence.risk import generate_risk_summary

@app.get("/risk-summary")
def risk_summary():
    return generate_risk_summary(event_store)


# -----------------------------
# Issue Trends
# -----------------------------
@app.get("/issue-trends")
def issue_trends():
    trends = {}
    for event in event_store:
        issue = event["issue"]
        if issue not in trends:
            trends[issue] = 1
        else:
            trends[issue] += 1
    return trends


# -----------------------------
# Knowledge Graph
# -----------------------------
@app.get("/knowledge-graph")
def knowledge_graph():
    graph_engine.build_graph(event_store)
    relations = graph_engine.get_relations()
    return {
        "nodes":     len(graph_engine.graph.nodes),
        "edges":     len(graph_engine.graph.edges),
        "relations": relations,
    }


# -----------------------------
# WebSocket Live Events
# -----------------------------
@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await event_stream(websocket)


# -----------------------------
# AI Alerts
# -----------------------------
@app.get("/alerts")
def get_alerts():
    alerts = generate_alerts(event_store)
    return {"alerts": alerts}


# -----------------------------
# Crisis Predictions
# -----------------------------
@app.get("/predictions")
def get_predictions():
    predictions = predict_crisis(event_store)
    return {"predictions": predictions}


# -----------------------------
# AI Risk Heatmap
# -----------------------------
@app.get("/risk-map")
def risk_map():
    risk_data = generate_risk_map(event_store)
    return {"heatmap": risk_data}


# -----------------------------
# AI-Civic Copilot
# -----------------------------
@app.get("/ai-civic-copilot")
def ai_civic_copilot(query: str):
    report = civic_copilot(query, event_store)
    return report


# -----------------------------
# Crisis Dashboard
# -----------------------------
@app.get("/dashboard")
def get_dashboard():
    data = crisis_dashboard(event_store)
    return data


# ──────────────────────────────────────────────────────────────
# Report new complaint
# FIX: Now stores user_id, ward, status, and a friendly
#      report_id ("CS" + 6 hex chars) in every event.
#      Returns report_id so the frontend displays the exact
#      ID that matches what /my-reports returns.
# ──────────────────────────────────────────────────────────────
@app.post("/report-complaint")
async def report_complaint(data: Complaint):

    # Human-readable report ID e.g. CS3F9A2B
    friendly_id = "CS" + str(uuid.uuid4()).replace("-", "").upper()[:6]

    event = {
        "event_id":  str(uuid.uuid4()),
        "report_id": friendly_id,            # FIX: stored + returned
        "timestamp": datetime.utcnow().isoformat(),
        "location":  data.location,
        "issue":     data.issue,
        "text":      data.text,
        "user_id":   data.user_id,           # FIX: user-scoped
        "ward":      data.ward,              # FIX: for My Reports display
        "status":    data.status,            # FIX: for progress bar
    }

    processed = process_event(event, event_store)

    event_store.append(processed)
    from app.streaming.stream_service import _save
    _save(event_store)

    # Bumped from 50 → 200 so demo reports survive longer on free tier
    if len(event_store) > 200:
        event_store.pop(0)

    # Broadcast to admin dashboard via WebSocket
    await broadcast_event(processed)

    return {
        "status":    "complaint received",
        "report_id": friendly_id,            # FIX: returned to frontend
        "event":     processed,
    }


# ──────────────────────────────────────────────────────────────
# FIX: NEW ENDPOINT — My Reports (user-scoped)
# GET /my-reports?user_id=<firebase_uid>
#
# Returns only the reports belonging to the authenticated user.
# Filters event_store by user_id field.
# Never leaks data — anonymous/missing user_id returns empty list.
# ──────────────────────────────────────────────────────────────
@app.get("/my-reports")
def get_my_reports(
    user_id: str = Query(..., description="Firebase UID of the authenticated citizen")
):
    # Hard reject anonymous — never expose global event data
    if not user_id or user_id.strip() == "anonymous":
        return {"reports": []}

    user_reports = []

    for e in event_store:
        if e.get("user_id") != user_id:
            continue

        user_reports.append({
            "id":     e.get("report_id") or e.get("event_id", "CS000000"),
            "issue":  e.get("issue",     "other"),
            "ward":   e.get("ward",      "Unknown"),
            "city":   e.get("location",  "Unknown"),
            "date":   e.get("timestamp", ""),   # ISO string — frontend formats it
            "status": e.get("status",    "submitted"),
            "desc":   e.get("text",      ""),
        })

    # Newest first
    user_reports.reverse()

    return {"reports": user_reports}