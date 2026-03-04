#venv\Scripts\activate
#uvicorn main:app --reload



from fastapi import FastAPI
from app.streaming.pipeline import process_event
from app.streaming.stream_service import start_stream, event_store
import asyncio

app = FastAPI(title="CivicSentinel AI")


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