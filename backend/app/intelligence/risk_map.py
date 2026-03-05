def generate_risk_map(events):

    city_risk = {}

    for event in events:

        city = event["location"]
        risk = event["risk_score"]

        if city not in city_risk:
            city_risk[city] = risk
        else:
            city_risk[city] += risk

    return city_risk