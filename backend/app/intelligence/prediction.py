def predict_crisis(events):

    predictions = []
    seen = set()

    for event in events:

        city = event["location"]
        issue = event["issue"]
        risk = event["risk_score"]

        key = f"{city}-{issue}"

        if risk >= 50 and key not in seen:

            predictions.append(
                f"⚠ {issue} may escalate into a civic crisis in {city} if not addressed quickly."
            )

            seen.add(key)

    return predictions