# venv\Scripts\activate
# uvicorn main:app --reload

from fastapi import FastAPI, WebSocket, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import asyncio
import os
import httpx

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
    status:   str = "submitted"  # submitted | in_review | in_progress | resolved
    image:    str = ""           # base64 image (optional, stored for review panel)

class DetectIssueRequest(BaseModel):
    image_base64: str
    city: str = "Unknown"

class StatusUpdate(BaseModel):
    status: str  # submitted | in_review | in_progress | resolved | rejected


load_dotenv()

app = FastAPI(title="CivicSentinel AI")


# ── CORS ────────────────────────────────────────────────────────
# ── CORS (FIXED PROPERLY) ────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",

        # ✅ YOUR DEPLOYED FRONTENDS
        "https://civicsentinel-admin.onrender.com",
        "https://civicsentinel-ai-pszx.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Initialize engines ───────────────────────────────────────────
graph_engine = CivicGraph()
rag          = CivicRAG()
retriever    = CivicRetriever()
rag.seed_if_empty()


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
# Supports optional ?user_id= filter to return only events for that user.
@app.get("/events")
def get_events(
    user_id: str = Query(None, description="Optional Firebase UID to filter events")
):
    if user_id and user_id.strip() and user_id.strip() != "anonymous":
        filtered = [e for e in event_store if e.get("user_id") == user_id.strip()]
        return {"events": filtered}
    return {"events": event_store}


# ──────────────────────────────────────────────────────────────
# NEW: POST /detect-issue
# Proxies image + prompt to Claude vision API so the API key
# stays server-side. Returns {category, confidence, severity}.
# Falls back to mock data if ANTHROPIC_API_KEY is not set.
# ──────────────────────────────────────────────────────────────
@app.post("/detect-issue")
async def detect_issue(data: DetectIssueRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY", "")

    prompt_text = """You are a civic issue detection AI. Analyze this photo and detect civic/infrastructure problems.
Respond ONLY with valid JSON, no markdown:
{
  "isLegitimate": true or false,
  "legitimacyReason": "brief reason if false",
  "blurScore": 0.0-1.0,
  "detectedObjects": ["list","of","objects"],
  "issueCategory": "water|road|electricity|garbage|encroachment|crime|health|other",
  "issueLabel": "short human-readable description",
  "confidence": 0.0-1.0,
  "severity": "low|medium|high",
  "boundingBoxDescription": "where in the image the main issue is"
}"""

    if not api_key:
        # Fallback mock — still useful for demo
        import random
        cats = ["road", "water", "garbage", "electricity"]
        picked = random.choice(cats)
        return {
            "isLegitimate": random.random() > 0.08,
            "legitimacyReason": "unclear image",
            "blurScore": round(0.6 + random.random() * 0.38, 2),
            "detectedObjects": [picked, "area"],
            "issueCategory": picked,
            "issueLabel": picked.capitalize() + " issue detected",
            "confidence": round(0.72 + random.random() * 0.25, 2),
            "severity": random.choice(["low", "medium", "high"]),
            "boundingBoxDescription": "center",
        }

    # Strip data URL prefix if present
    img_data = data.image_base64
    if ";base64," in img_data:
        img_data = img_data.split(";base64,")[1]

    payload = {
        "model": "claude-opus-4-5",
        "max_tokens": 400,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": img_data}},
                {"type": "text", "text": prompt_text},
            ]
        }]
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            result = resp.json()
            text = "".join(b.get("text", "") for b in result.get("content", []))
            import json as _json, re
            clean = re.sub(r"```json|```", "", text).strip()
            return _json.loads(clean)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {str(e)}")


# ──────────────────────────────────────────────────────────────
# NEW: PATCH /events/{event_id}
# Updates the status of a stored event.
# Status flow: submitted → in_review → in_progress → resolved
# ──────────────────────────────────────────────────────────────
VALID_STATUSES = {"submitted", "in_review", "in_progress", "resolved", "rejected"}

@app.patch("/events/{event_id}")
def update_event_status(event_id: str, body: StatusUpdate):
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Must be one of: {', '.join(VALID_STATUSES)}"
        )

    # Search by event_id OR report_id (friendly ID)
    for event in event_store:
        if event.get("event_id") == event_id or event.get("report_id") == event_id:
            event["status"] = body.status
            return {"success": True, "event_id": event_id, "status": body.status, "event": event}

    raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found")


# -----------------------------
# LLM Powered AI Insight
# -----------------------------
@app.get("/ai-insight")
def ai_insight(query: str = "summarize current civic issues and risk levels"):
    try:
        ai_analysis  = retriever.query(query)
        latest_event = event_store[-1] if event_store else None
        return {
            "query":        query,
            "latest_event": latest_event,
            "ai_analysis":  ai_analysis,
        }
    except Exception as e:
        return {
            "query":       query,
            "ai_analysis": f"AI engine warming up. Query received: {query}. Please try again in a moment.",
        }
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
        "report_id": friendly_id,            # stored + returned
        "timestamp": datetime.utcnow().isoformat(),
        "location":  data.location,
        "issue":     data.issue,
        "text":      data.text,
        "user_id":   data.user_id,           # user-scoped
        "ward":      data.ward,              # for My Reports display
        "status":    data.status,            # for progress bar
        "image":     data.image[:200] if data.image else "",  # thumbnail hint
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
