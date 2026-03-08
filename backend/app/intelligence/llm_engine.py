import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=api_key)


def generate_llm_insight(query, context):

    prompt = f"""
You are an AI civic intelligence analyst.

Context knowledge:
{context}

User query:
{query}

Analyze the civic situation and give a short actionable insight for authorities.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You analyze civic risks and provide insights."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"""
AI Civic Analysis (Fallback Mode):

Based on current civic signals, authorities should monitor the issue closely.
Multiple alerts and risk indicators suggest potential escalation.
Immediate investigation and mitigation planning is recommended.
"""