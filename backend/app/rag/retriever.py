import os

from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings

from app.intelligence.llm_engine import generate_llm_insight


class CivicRetriever:

    def __init__(self):

        # HuggingFace API based embeddings (no local model loading)
        self.embedding = HuggingFaceInferenceAPIEmbeddings(
            api_key=os.getenv("HF_API_KEY"),
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        # Load Chroma vector DB
        self.db = Chroma(
            persist_directory="rag_store",
            embedding_function=self.embedding
        )

    def query(self, question):

        # Retrieve relevant knowledge
        docs = self.db.similarity_search(question, k=3)

        context = "\n".join([doc.page_content for doc in docs])

        # Send context + question to LLM
        insight = generate_llm_insight(question, context)

        return insight