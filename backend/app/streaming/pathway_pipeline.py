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


def process_stream(events: pw.Table):

    processed = events.select(
        event_id=pw.this.event_id,
        timestamp=pw.this.timestamp,
        location=pw.this.location,
        issue=pw.this.issue,
        text=pw.this.text,
        sentiment=pw.apply(analyze_sentiment, pw.this.text),
    )

    processed = processed.select(
        event_id=pw.this.event_id,
        timestamp=pw.this.timestamp,
        location=pw.this.location,
        issue=pw.this.issue,
        text=pw.this.text,
        sentiment=pw.this.sentiment,
        anomaly=pw.apply(detect_anomaly, pw.this.issue),
    )

    processed = processed.select(
        event_id=pw.this.event_id,
        timestamp=pw.this.timestamp,
        location=pw.this.location,
        issue=pw.this.issue,
        text=pw.this.text,
        sentiment=pw.this.sentiment,
        anomaly=pw.this.anomaly,
        risk_score=pw.apply(compute_risk, pw.this.sentiment, pw.this.anomaly),
    )

    return processed