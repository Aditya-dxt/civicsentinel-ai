import os

from openai import OpenAI
from langchain_chroma import Chroma

from app.intelligence.llm_engine import generate_llm_insight


class CivicRetriever:

    def __init__(self):

        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

        self.db = Chroma(
            persist_directory="rag_store"
        )

    def embed(self, text):

        response = self.client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )

        return response.data[0].embedding

    def query(self, question):

        query_embedding = self.embed(question)

        docs = self.db.similarity_search_by_vector(
            query_embedding,
            k=3
        )

        context = "\n".join([doc.page_content for doc in docs])

        insight = generate_llm_insight(question, context)

        return insight