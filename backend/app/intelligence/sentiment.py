from textblob import TextBlob

def analyze_sentiment(text: str):

    sentiment = TextBlob(text).sentiment.polarity

    return round(sentiment, 3)