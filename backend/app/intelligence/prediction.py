def predict_crisis(events):

    predictions = []

    for event in events:

        city = event["location"]
        issue = event["issue"]
        risk = event["risk_score"]

        if risk >= 50:

            predictions.append(
                f"⚠ {issue} may escalate into a civic crisis in {city} if not addressed quickly."
            )

    return predictions