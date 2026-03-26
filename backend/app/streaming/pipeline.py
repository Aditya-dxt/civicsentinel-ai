# ─────────────────────────────────────────────────────────────────────────────
# pipeline.py  —  CivicSentinel AI · Event Processing Pipeline
#
# FIX: process_event() now accepts the full event_store so it can compute
#      per-city volume-based risk alongside the per-event base score.
#
# Flow for each incoming event:
#   1. Sentiment analysis on event text (unchanged)
#   2. Anomaly detection on issue type (unchanged)
#   3. Base risk score from sentiment + anomaly (unchanged)
#   4. NEW: Build city stats from event_store (per-city, isolated)
#   5. NEW: Compute city-level risk using volume thresholds
#   6. NEW: Store triggered_by + highlighted_issue in event for alerts/dashboard
# ─────────────────────────────────────────────────────────────────────────────

from app.intelligence.sentiment import analyze_sentiment
from app.intelligence.anomaly   import detect_anomaly
from app.intelligence.risk      import (
    compute_risk,
    build_city_stats,
    compute_city_risk,
)


def process_event(event, event_store=None):
    """
    Process a single incoming civic event through the full AI pipeline.

    Args:
        event       : dict with keys: location, issue, text (+ any extras)
        event_store : the current list of all stored events (used for
                      per-city volume scoring). Pass [] or omit for the
                      very first event.

    Returns:
        The enriched event dict with these new fields:
            sentiment         – float, negative = bad
            anomaly           – 0 or 1
            risk_score        – per-event base score (sentiment + anomaly)
            city_risk_score   – volume-based city score (the one shown on map)
            triggered_by      – string reason if threshold breached, else None
            highlighted_issue – issue to highlight in dashboard, else None
    """
    if event_store is None:
        event_store = []

    # ── Step 1: Sentiment ──────────────────────────────────────────────────
    sentiment = analyze_sentiment(event["text"])

    # ── Step 2: Anomaly ───────────────────────────────────────────────────
    anomaly = detect_anomaly(event["issue"])

    # ── Step 3: Base per-event risk (sentiment + anomaly) ─────────────────
    base_risk = compute_risk(sentiment, anomaly)

    # ── Step 4 + 5: City-level volume risk ────────────────────────────────
    # Include the current event in the store snapshot before scoring
    # so that "this event" counts toward the threshold check.
    snapshot = event_store + [event]
    city     = event.get("location") or event.get("city") or "Unknown"

    city_stats                    = build_city_stats(snapshot)
    city_risk, triggered_by, highlighted_issue = compute_city_risk(city, city_stats)

    # ── Step 6: Enrich event ──────────────────────────────────────────────
    event["sentiment"]         = sentiment
    event["anomaly"]           = anomaly
    event["risk_score"]        = base_risk        # per-event score
    event["city_risk_score"]   = city_risk        # city volume-based score
    event["triggered_by"]      = triggered_by     # None if below threshold
    event["highlighted_issue"] = highlighted_issue

    return event