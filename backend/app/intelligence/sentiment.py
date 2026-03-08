from textblob import TextBlob


def analyze_sentiment(text):

    polarity = TextBlob(text).sentiment.polarity

    # civic issues should trend negative
    if "crisis" in text.lower():
        polarity -= 0.5
    if "failure" in text.lower():
        polarity -= 0.4
    if "corruption" in text.lower():
        polarity -= 0.6
    if "outage" in text.lower():
        polarity -= 0.3

    return round(polarity, 2)