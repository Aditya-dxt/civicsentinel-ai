def compute_risk(sentiment, anomaly):

    base_risk = 50

    # negative sentiment increases risk
    if sentiment < 0:
        base_risk += abs(sentiment) * 50

    # anomaly adds risk
    if anomaly == 1:
        base_risk += 30

    # clamp between 0 and 100
    base_risk = max(0, min(100, base_risk))

    return round(base_risk, 2)