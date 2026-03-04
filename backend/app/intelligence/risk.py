def compute_risk(sentiment, anomaly):

    sentiment_risk = abs(min(sentiment, 0)) * 60
    anomaly_risk = anomaly * 40

    risk_score = sentiment_risk + anomaly_risk

    return min(100, round(risk_score, 2))