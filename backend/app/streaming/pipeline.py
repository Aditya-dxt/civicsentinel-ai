from app.ingestion.generator import generate_event
from app.intelligence.sentiment import analyze_sentiment
from app.intelligence.risk import compute_risk


def process_event():

    event = generate_event()

    sentiment = analyze_sentiment(event["text"])

    risk = compute_risk(sentiment)

    event["sentiment"] = sentiment
    event["risk_score"] = risk

    return event