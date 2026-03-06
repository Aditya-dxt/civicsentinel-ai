# venv\Scripts\activate
# uvicorn main:app --reload

from fastapi import FastAPI, WebSocket
from dotenv import load_dotenv
import asyncio
import os

# Streaming
from app.streaming.pipeline import process_event
from app.streaming.stream_service import start_stream, event_store
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

#AI-copilot
from app.intelligence.copilot import civic_copilot

# Dashboard
from app.intelligence.dashboard import crisis_dashboard

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ADD THIS BLOCK ↓
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# rest of his routes below...



load_dotenv()

app = FastAPI(title="CivicSentinel AI")

# Initialize engines
graph_engine = CivicGraph()
rag = CivicRAG()
retriever = CivicRetriever()

# Seed knowledge base
rag.add_documents([
    "Water supply issues increase in Mumbai during summer.",
    "Electricity outages often occur due to transformer overload.",
    "Corruption complaints are handled by Anti-Corruption Bureau.",
])

# Start streaming pipeline
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(start_stream())


# Root
@app.get("/")
def root():
    return {"message": "CivicSentinel backend running"}


# Health check
@app.get("/health")
def health():
    return {"status": "ok"}


# Generate single event
@app.get("/event")
def get_event():
    return process_event()


# Get all events
@app.get("/events")
def get_events():
    return {"events": event_store}


# -----------------------------
# LLM Powered AI Insight
# -----------------------------
@app.get("/ai-insight")
def ai_insight(query: str):

    # Use RAG + LLM reasoning
    ai_analysis = retriever.query(query)

    latest_event = event_store[-1] if event_store else None

    return {
        "query": query,
        "latest_event": latest_event,
        "ai_analysis": ai_analysis
    }


# -----------------------------
# Risk Summary
# -----------------------------
@app.get("/risk-summary")
def risk_summary():

    summary = {}

    for event in event_store:

        city = event["location"]
        risk = event["risk_score"]

        if city not in summary:
            summary[city] = risk
        else:
            summary[city] = max(summary[city], risk)

    return summary


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
        "nodes": len(graph_engine.graph.nodes),
        "edges": len(graph_engine.graph.edges),
        "relations": relations
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