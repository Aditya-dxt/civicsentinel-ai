import pathway as pw

from app.intelligence.sentiment import analyze_sentiment
from app.intelligence.anomaly import detect_anomaly
from app.intelligence.risk import compute_risk


class CivicEvent(pw.Schema):
    event_id: str
    timestamp: str
    location: str
    issue: str
    text: str


def build_pipeline(events: pw.Table):

    # Sentiment analysis
    events = events.with_columns(
        sentiment=pw.apply(analyze_sentiment, pw.this.text)
    )

    # Anomaly detection
    events = events.with_columns(
        anomaly=pw.apply(detect_anomaly, pw.this.issue)
    )

    # Risk scoring
    events = events.with_columns(
        risk_score=pw.apply(compute_risk, pw.this.sentiment, pw.this.anomaly)
    )

    return events