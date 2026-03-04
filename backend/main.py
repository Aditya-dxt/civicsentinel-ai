from fastapi import FastAPI
from app.streaming.pipeline import process_event

app = FastAPI(title="CivicSentinel AI")


@app.get("/")
def root():
    return {"message": "CivicSentinel backend running"}


@app.get("/event")
def get_event():

    return process_event()