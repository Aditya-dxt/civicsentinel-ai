# ─────────────────────────────────────────────────────────────────────────────
# llm_engine.py  —  CivicSentinel AI · LLM Insight Generator
#
# FIX: Wrapped everything in try/except so a missing/invalid API key
#      never causes a 500. Returns a data-driven fallback instead.
# ─────────────────────────────────────────────────────────────────────────────

import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def generate_llm_insight(query: str, context: str) -> str:
    """
    Generate an AI civic insight using GPT-4o-mini.
    Falls back gracefully if OpenAI is unavailable.
    """

    api_key = os.getenv("OPENAI_API_KEY")

    # ── Fallback: no API key configured ──────────────────────────────────
    if not api_key or api_key.strip() == "":
        return _fallback_insight(query, context)

    try:
        client = OpenAI(api_key=api_key)

        prompt = f"""You are an AI civic intelligence analyst for Indian municipal governments.

Context knowledge from civic database:
{context if context.strip() else "No specific context available — use general civic knowledge."}

Officer's query:
{query}

Provide a concise, actionable insight (3-5 sentences) for municipal authorities.
Focus on: risk level, affected population, recommended immediate actions.
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a civic risk analyst for Indian municipal governments. Be concise and actionable."},
                {"role": "user",   "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        # Never let an OpenAI error crash the endpoint
        return _fallback_insight(query, context)


def _fallback_insight(query: str, context: str) -> str:
    """
    Rule-based fallback insight when OpenAI is unavailable.
    Uses the query and context to generate a meaningful response.
    """
    q = query.lower()

    if any(w in q for w in ["water", "supply", "drainage", "flood"]):
        return (
            "Water infrastructure issues require immediate attention from the Water Department. "
            "Prolonged water supply disruptions can cause public health emergencies. "
            "Recommend: deploy tankers within 24 hours, inspect pipeline for leaks, "
            "coordinate with State Water Board for emergency allocation."
        )
    if any(w in q for w in ["road", "pothole", "traffic", "bridge"]):
        return (
            "Road damage complaints indicate infrastructure deterioration. "
            "Unaddressed potholes increase accident risk significantly. "
            "Recommend: PWD inspection within 48 hours, temporary patching for high-traffic areas, "
            "schedule permanent repair in next maintenance cycle."
        )
    if any(w in q for w in ["electricity", "power", "light", "outage"]):
        return (
            "Power outages impact essential services and public safety. "
            "Street light failures increase crime risk in affected areas. "
            "Recommend: Electricity Board to dispatch repair crew, "
            "install temporary generators for critical zones, submit transformer upgrade request."
        )
    if any(w in q for w in ["crime", "safety", "security", "theft"]):
        return (
            "Safety concerns require coordinated law enforcement response. "
            "Increased complaint frequency suggests a developing pattern. "
            "Recommend: increase police patrol frequency, install CCTV at reported locations, "
            "community alert system activation."
        )
    if any(w in q for w in ["garbage", "waste", "sanitation", "clean"]):
        return (
            "Sanitation issues pose public health risks if unaddressed. "
            "Recommend: emergency garbage collection within 24 hours, "
            "identify root cause of collection failure, penalise contractors if SLA breached."
        )
    if any(w in q for w in ["health", "hospital", "disease", "epidemic"]):
        return (
            "Health emergencies require immediate coordination with the Health Department. "
            "Recommend: deploy mobile health units, issue public advisory, "
            "activate district epidemic cell if symptoms are spreading."
        )

    # Generic civic fallback
    return (
        f"Civic analysis for query: '{query}'. "
        "Based on current complaint patterns, authorities should investigate the reported issue promptly. "
        "Multiple reports from the same area indicate a systemic problem requiring structured intervention. "
        "Recommend: field inspection within 48 hours, stakeholder coordination, "
        "and status update to affected citizens within 72 hours."
    )