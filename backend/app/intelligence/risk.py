# ─────────────────────────────────────────────────────────────────────────────
# risk.py  —  CivicSentinel AI · Risk Scoring Engine
#
# FIX: Risk is now computed per-city using volume thresholds, not just
#      sentiment + anomaly of a single event.
#
# Rules (your specification):
#   1. If total reports for a city exceed 10  → HIGH RISK (score ≥ 70)
#   2. If any single issue in a city has ≥ 5 reports → HIGH RISK (score ≥ 70)
#   3. Base score still uses sentiment + anomaly per event (unchanged)
#   4. Cities are completely isolated — no cross-city merging ever
# ─────────────────────────────────────────────────────────────────────────────

# Thresholds — single source of truth, easy to tune
TOTAL_REPORT_THRESHOLD  = 10   # total reports in a city → high risk
ISSUE_REPEAT_THRESHOLD  = 5    # same issue repeated in a city → high risk
HIGH_RISK_SCORE         = 75   # score assigned when a threshold is breached
CRITICAL_SCORE          = 90   # score when BOTH thresholds are breached


def compute_risk(sentiment, anomaly):
    """
    Base per-event risk score from sentiment + anomaly.
    This is still used as the starting point for each event,
    but the final city risk score is calculated by
    compute_city_risk() which accounts for volume.
    """
    base_risk = 50

    if sentiment < 0:
        base_risk += abs(sentiment) * 50

    if anomaly == 1:
        base_risk += 30

    return round(max(0, min(100, base_risk)), 2)


def build_city_stats(event_store):
    """
    Aggregate event_store into per-city statistics.
    Returns a dict:
    {
        "Kanpur": {
            "total": 8,
            "issues": {"health": 6, "road": 2},
            "dominant_issue": "health",
            "dominant_count": 6,
        },
        ...
    }
    Each city is counted completely independently.
    """
    stats = {}

    for event in event_store:
        city  = event.get("location") or event.get("city") or "Unknown"
        issue = (event.get("issue") or "other").lower().strip()

        if city not in stats:
            stats[city] = {"total": 0, "issues": {}}

        stats[city]["total"] += 1

        if issue not in stats[city]["issues"]:
            stats[city]["issues"][issue] = 0
        stats[city]["issues"][issue] += 1

    # Compute dominant issue per city
    for city, data in stats.items():
        if data["issues"]:
            dominant = max(data["issues"], key=data["issues"].get)
            data["dominant_issue"] = dominant
            data["dominant_count"] = data["issues"][dominant]
        else:
            data["dominant_issue"] = None
            data["dominant_count"] = 0

    return stats


def compute_city_risk(city, city_stats):
    """
    Compute the final risk score for a city based on volume thresholds.

    Returns:
        score (int): 0–100
        triggered_by (str | None): human-readable reason if threshold breached
        highlighted_issue (str | None): the issue to highlight in the dashboard
    """
    data = city_stats.get(city)
    if not data:
        return 0, None, None

    total          = data["total"]
    dominant       = data["dominant_issue"]
    dominant_count = data["dominant_count"]

    total_breached = total          >= TOTAL_REPORT_THRESHOLD
    issue_breached = dominant_count >= ISSUE_REPEAT_THRESHOLD

    if total_breached and issue_breached:
        score        = CRITICAL_SCORE
        triggered_by = (
            f"{total} total reports + "
            f"{dominant_count} '{dominant}' reports"
        )
        highlighted_issue = dominant

    elif total_breached:
        score        = HIGH_RISK_SCORE
        triggered_by = f"{total} total reports exceeded threshold of {TOTAL_REPORT_THRESHOLD}"
        highlighted_issue = dominant  # highlight most common issue anyway

    elif issue_breached:
        score        = HIGH_RISK_SCORE
        triggered_by = (
            f"{dominant_count} '{dominant}' reports "
            f"exceeded threshold of {ISSUE_REPEAT_THRESHOLD}"
        )
        highlighted_issue = dominant

    else:
        # Below both thresholds — use proportional score
        # Scale linearly toward HIGH_RISK_SCORE as counts approach thresholds
        total_ratio  = total          / TOTAL_REPORT_THRESHOLD
        issue_ratio  = dominant_count / ISSUE_REPEAT_THRESHOLD
        ratio        = max(total_ratio, issue_ratio)
        score        = round(min(69, 20 + ratio * 49))  # caps at 69 (below high risk)
        triggered_by = None
        highlighted_issue = dominant if dominant_count >= 2 else None

    return score, triggered_by, highlighted_issue


def generate_risk_summary(event_store):
    """
    Build the full risk summary dict used by /risk-summary endpoint.
    Returns: { "Kanpur": 75, "Lucknow": 35, ... }

    Each city's score is derived only from its own reports.
    """
    stats   = build_city_stats(event_store)
    summary = {}

    for city in stats:
        score, _, _ = compute_city_risk(city, stats)
        summary[city] = score

    return summary