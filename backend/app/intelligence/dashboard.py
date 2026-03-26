# ─────────────────────────────────────────────────────────────────────────────
# dashboard.py  —  CivicSentinel AI · Crisis Dashboard
#
# FIX 1: issue_counts are now per-city, not global.
#         Kanpur's "health: 6" never merges with Lucknow's "health: 1".
#
# FIX 2: city_risk_score (volume-based) is used for KPIs, not risk_score.
#
# FIX 3: Dashboard now returns a per-city breakdown with highlighted issues
#         so the frontend can show which issue is driving a city's risk.
#
# FIX 4: high_risk_cities count uses the volume threshold logic, not raw
#         per-event scores that could be inflated by a single bad sentiment.
# ─────────────────────────────────────────────────────────────────────────────

from app.intelligence.alerts     import generate_alerts
from app.intelligence.prediction import predict_crisis
from app.intelligence.risk_map   import generate_risk_map
from app.intelligence.risk       import (
    build_city_stats,
    compute_city_risk,
    HIGH_RISK_SCORE,
)


def crisis_dashboard(event_store):

    if not event_store:
        return {"status": "no_data"}

    # ── Per-city stats (fully isolated) ───────────────────────────────────
    city_stats = build_city_stats(event_store)

    # ── Build per-city risk scores and highlights ─────────────────────────
    city_risk_details = {}
    high_risk_cities  = 0

    for city, data in city_stats.items():
        score, triggered_by, highlighted_issue = compute_city_risk(city, city_stats)

        city_risk_details[city] = {
            "risk_score":        score,
            "total_reports":     data["total"],
            "issues":            data["issues"],          # per-city issue counts
            "highlighted_issue": highlighted_issue,       # issue driving the risk
            "triggered_by":      triggered_by,
            "dominant_issue":    data.get("dominant_issue"),
            "dominant_count":    data.get("dominant_count", 0),
        }

        if score >= HIGH_RISK_SCORE:
            high_risk_cities += 1

    # ── Global issue trends (for the bar chart — still global but clearly labeled) ──
    # This is the GLOBAL count used for the Issue Trends bar chart only.
    # Per-city counts live in city_risk_details above.
    global_issue_counts = {}
    for event in event_store:
        issue = (event.get("issue") or "other").lower().strip()
        global_issue_counts[issue] = global_issue_counts.get(issue, 0) + 1

    # ── Other intelligence modules ────────────────────────────────────────
    alerts      = generate_alerts(event_store)
    predictions = predict_crisis(event_store)
    risk_map    = generate_risk_map(event_store)

    recent_events = event_store[-5:]

    return {
        "status": "active",

        # KPI counts
        "total_complaints":  len(event_store),
        "high_risk_cities":  high_risk_cities,
        "active_alerts":     len(alerts),
        "predictions_count": len(predictions),

        # Per-city breakdown — used by frontend for map + drill-down
        "city_risk_details": city_risk_details,

        # Global issue trend (bar chart)
        "issue_trends": global_issue_counts,

        # Intelligence modules
        "heatmap":       risk_map,
        "alerts":        alerts,
        "predictions":   predictions,
        "recent_events": recent_events,
    }