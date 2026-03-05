from app.intelligence.alerts import generate_alerts
from app.intelligence.prediction import predict_crisis
from app.intelligence.risk_map import generate_risk_map


def crisis_dashboard(event_store):

    if not event_store:
        return {"status": "no_data"}

    alerts = generate_alerts(event_store)
    predictions = predict_crisis(event_store)
    risk_map = generate_risk_map(event_store)

    issue_counts = {}

    for event in event_store:
        issue = event["issue"]

        if issue not in issue_counts:
            issue_counts[issue] = 1
        else:
            issue_counts[issue] += 1

    recent_events = event_store[-5:]

    return {

        "status": "active",

        "heatmap": risk_map,

        "alerts": alerts,

        "predictions": predictions,

        "issue_trends": issue_counts,

        "recent_events": recent_events
    }