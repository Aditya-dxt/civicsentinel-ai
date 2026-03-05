#venv\Scripts\activate
#uvicorn main:app --reload


from app.rag.rag_index import CivicRAG
from fastapi import FastAPI
from app.streaming.pipeline import process_event
from app.streaming.stream_service import start_stream, event_store
from app.graph.civic_graph import CivicGraph
import asyncio

app = FastAPI(title="CivicSentinel AI")

graph_engine = CivicGraph()

rag = CivicRAG()

rag.add_documents([
    "Water supply issues increase in Mumbai during summer.",
    "Electricity outages often occur due to transformer overload.",
    "Corruption complaints are handled by Anti-Corruption Bureau.",
])


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(start_stream())


@app.get("/")
def root():
    return {"message": "CivicSentinel backend running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/event")
def get_event():
    return process_event()


@app.get("/events")
def get_events():
    return {"events": event_store}

@app.get("/ai-insight")
def ai_insight(query: str):

    rag_results = rag.search(query)

    knowledge = [r.page_content for r in rag_results]

    # get latest event
    latest_event = event_store[-1] if event_store else None

    if not latest_event:
        return {"query": query, "insight": "No civic events detected yet."}

    city = latest_event["location"]
    issue = latest_event["issue"]
    risk = latest_event["risk_score"]
    sentiment = latest_event["sentiment"]

    if risk > 75:
        severity = "HIGH"
    elif risk > 50:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    insight_text = f"""
    Civic issue detected in {city}.
    Issue type: {issue}.
    Risk level: {severity}.
    Sentiment score: {sentiment}.
    Authorities may need to investigate this situation.
    """

    return {
        "query": query,
        "insight": insight_text,
        "knowledge": knowledge
    }

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

@app.get("/knowledge-graph")
def knowledge_graph():

    graph_engine.build_graph(event_store)

    relations = graph_engine.get_relations()

    return {
        "nodes": len(graph_engine.graph.nodes),
        "edges": len(graph_engine.graph.edges),
        "relations": relations
    }