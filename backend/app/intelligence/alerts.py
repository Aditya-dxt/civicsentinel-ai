# ─────────────────────────────────────────────────────────────────────────────
# alerts.py  —  CivicSentinel AI · Alert Generation
#
# FIX 1: Alerts are now generated per-city, not per-event.
#         One alert per city maximum — no flood of duplicate alerts.
#
# FIX 2: Uses city_risk_score (volume-based) instead of per-event risk_score.
#
# FIX 3: When a threshold is breached, the alert names the specific
#         highlighted_issue so officers know exactly what to focus on.
#
# FIX 4: Each city's stats are completely isolated — Kanpur's health count
#         never affects Lucknow's health count or vice versa.
# ─────────────────────────────────────────────────────────────────────────────

from app.intelligence.risk import (
    build_city_stats,
    compute_city_risk,
)


def generate_alerts(event_store):
    """
    Generate one alert per city based on volume-threshold risk scores.

    Returns a list of alert strings, deduplicated per city.
    """
    if not event_store:
        return []

    # Build per-city stats (fully isolated per city)
    city_stats = build_city_stats(event_store)

    alerts = []

    for city, data in city_stats.items():
        score, triggered_by, highlighted_issue = compute_city_risk(city, city_stats)

        total          = data["total"]
        dominant       = data.get("dominant_issue", "unknown")
        dominant_count = data.get("dominant_count", 0)

        # ── CRITICAL (≥ 90): both thresholds breached ────────────────────
        if score >= 90:
            alerts.append(
                f"🚨 CRITICAL: {city} has {total} reports including "
                f"{dominant_count} '{highlighted_issue}' reports. "
                f"Immediate intervention required."
            )

        # ── HIGH RISK (70–89): one threshold breached ────────────────────
        elif score >= 70:
            if highlighted_issue:
                alerts.append(
                    f"⚠ HIGH RISK: '{highlighted_issue}' in {city} "
                    f"has {dominant_count} reports. Authorities should act. "
                    f"({triggered_by})"
                )
            else:
                alerts.append(
                    f"⚠ HIGH RISK: {city} has {total} complaints. "
                    f"Authorities should act. ({triggered_by})"
                )

        # ── WARNING (40–69): approaching threshold ────────────────────────
        elif score >= 40:
            if highlighted_issue and dominant_count >= 2:
                alerts.append(
                    f"ℹ Notice: '{highlighted_issue}' detected in {city} "
                    f"({dominant_count} reports). Situation developing."
                )
            else:
                alerts.append(
                    f"ℹ Notice: {city} has {total} civic report(s). Monitoring."
                )

        # Below 40 → no alert (stable city, no noise)

    return alerts