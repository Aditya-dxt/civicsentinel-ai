#venv\Scripts\activate
#uvicorn main:app --reload


from app.rag.rag_index import CivicRAG
from fastapi import FastAPI
from app.streaming.pipeline import process_event
from app.streaming.stream_service import start_stream, event_store
import asyncio

app = FastAPI(title="CivicSentinel AI")

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
    results = rag.search(query)

    insights = []
    for r in results:
        insights.append(r.page_content)

    return {
        "query": query,
        "insights": insights
    }