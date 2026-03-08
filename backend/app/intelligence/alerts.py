def generate_alerts(events):

    alerts = []

    for event in events:

        city = event["location"]
        issue = event["issue"]
        risk = event["risk_score"]

        if risk >= 80:
            alerts.append(f"🚨 HIGH RISK: {issue} reported in {city}. Immediate action recommended.")

        elif risk >= 60:
            alerts.append(f"⚠ WARNING: {issue} increasing in {city}. Authorities should monitor.")

        elif risk >= 40:
            alerts.append(f"ℹ Notice: {issue} detected in {city}. Situation developing.")

    return alerts