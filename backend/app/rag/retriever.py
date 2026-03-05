from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

from app.intelligence.llm_engine import generate_llm_insight


class CivicRetriever:

    def __init__(self):

        self.embedding = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        self.db = Chroma(
            persist_directory="rag_store",
            embedding_function=self.embedding
        )

    def query(self, question):

        # Retrieve relevant knowledge
        docs = self.db.similarity_search(question, k=3)

        context = "\n".join([doc.page_content for doc in docs])

        # Send to LLM for reasoning
        insight = generate_llm_insight(question, context)

        return insight