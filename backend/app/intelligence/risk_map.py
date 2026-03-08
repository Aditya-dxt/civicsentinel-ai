def generate_risk_map(events):

    city_risk = {}

    for event in events:

        city = event["location"]
        risk = event["risk_score"]

        if city not in city_risk:
            city_risk[city] = risk
        else:
            city_risk[city] += risk

    # normalize to 0–100
    max_risk = max(city_risk.values()) if city_risk else 1

    for city in city_risk:
        city_risk[city] = round((city_risk[city] / max_risk) * 100, 2)

    return city_risk