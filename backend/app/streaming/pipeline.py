from app.ingestion.generator import generate_event
from app.intelligence.sentiment import analyze_sentiment
from app.intelligence.risk import compute_risk
from app.intelligence.anomaly import detect_anomaly


def process_event():

    event = generate_event()

    sentiment = analyze_sentiment(event["text"])

    anomaly = detect_anomaly(event["issue"])

    risk = compute_risk(sentiment, anomaly)

    event["sentiment"] = sentiment
    event["anomaly"] = anomaly
    event["risk_score"] = risk

    return event