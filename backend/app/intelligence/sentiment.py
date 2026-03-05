from textblob import TextBlob

def analyze_sentiment(text):

    blob = TextBlob(text)

    polarity = blob.sentiment.polarity

    return round(polarity, 3)