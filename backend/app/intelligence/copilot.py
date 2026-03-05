from app.intelligence.alerts import generate_alerts
from app.intelligence.prediction import predict_crisis
from app.intelligence.risk_map import generate_risk_map
from app.rag.rag_index import CivicRAG
from app.intelligence.llm_engine import generate_llm_insight


rag = CivicRAG()


def civic_copilot(query, event_store):

    if not event_store:
        return {"status": "no_data"}

    latest_event = event_store[-1]

    alerts = generate_alerts(event_store)
    predictions = predict_crisis(event_store)
    risk_map = generate_risk_map(event_store)

    rag_results = rag.search(query)
    knowledge = [doc.page_content for doc in rag_results]

    context = f"""
Latest Event: {latest_event}
Alerts: {alerts}
Predictions: {predictions}
Knowledge: {knowledge}
Risk Map: {risk_map}
"""

    ai_report = generate_llm_insight(query, context)

    return {
        "status": "success",

        "query": query,

        "incident": {
            "city": latest_event["location"],
            "issue": latest_event["issue"],
            "risk_score": latest_event["risk_score"],
            "sentiment": latest_event["sentiment"]
        },

        "alerts": alerts,

        "predictions": predictions,

        "risk_heatmap": risk_map,

        "ai_analysis": ai_report
    }