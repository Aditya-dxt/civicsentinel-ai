def compute_risk(sentiment):

    if sentiment < -0.5:
        return 80

    if sentiment < -0.2:
        return 60

    return 20