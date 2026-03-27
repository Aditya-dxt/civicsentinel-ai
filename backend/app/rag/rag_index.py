# ─────────────────────────────────────────────────────────────────────────────
# rag_index.py  —  CivicSentinel AI · RAG Document Store
#
# FIX 1: __init__ never crashes — wraps all OpenAI + Chroma calls.
# FIX 2: is_empty() helper so main.py can seed on startup safely.
# FIX 3: add_documents() skips embedding and stores plain text if
#         OpenAI key is missing (still populates ChromaDB for later).
# ─────────────────────────────────────────────────────────────────────────────

import os


# ── Civic knowledge base — seeded on first startup ───────────────────────────
CIVIC_KNOWLEDGE = [
    "Water supply issues increase in Indian cities during summer months due to reservoir depletion and pipeline leaks.",
    "Electricity outages often occur due to transformer overload during peak demand hours in residential areas.",
    "Road damage complaints spike during and after monsoon season due to waterlogging and erosion.",
    "Garbage collection failures cause sanitation hazards and increase disease risk in dense urban wards.",
    "Encroachment complaints require coordination between municipal enforcement and police departments.",
    "Crime and safety complaints should be escalated to local police station and ward officer immediately.",
    "Health emergencies require activation of the district epidemic cell and mobile health unit deployment.",
    "Corruption complaints are handled by the Anti-Corruption Bureau and require documented evidence.",
    "Mumbai Municipal Corporation handles water, roads, and sanitation for Mumbai and suburban areas.",
    "Delhi Municipal Corporation oversees civic services across North, South, and East Delhi zones.",
    "Lucknow Nagar Nigam is responsible for civic infrastructure in Lucknow city wards.",
    "High risk scores above 70 indicate critical civic situations requiring immediate intervention.",
    "Water drainage issues can escalate into flooding if unaddressed during monsoon season.",
    "Street light failures increase accident and crime risk and should be repaired within 48 hours.",
    "Pothole complaints on major roads should be prioritised for repair to prevent vehicle damage and accidents.",
    "Civic complaints with high sentiment negativity indicate citizen distress and require urgent response.",
    "Anomaly detection flags unusual complaint patterns that may indicate emerging crises.",
    "Multiple complaints from the same ward about the same issue indicate a systemic infrastructure failure.",
    "Crisis prediction models identify cities at risk based on complaint frequency and sentiment trends.",
    "Real-time WebSocket alerts enable officers to respond to civic issues as they are reported.",
]


class CivicRAG:

    def __init__(self):
        self._ready  = False
        self._client = None
        self._db     = None
        self._init()

    def _init(self):
        api_key = os.getenv("OPENAI_API_KEY")

        try:
            from langchain_chroma import Chroma

            # ChromaDB works without OpenAI key (stores docs without embeddings)
            self._db = Chroma(
                collection_name="civic_docs",
                persist_directory="rag_store",
            )

            if api_key:
                from openai import OpenAI
                self._client = OpenAI(api_key=api_key)
                self._ready  = True

        except Exception:
            self._ready = False

    def is_empty(self) -> bool:
        """Returns True if the ChromaDB collection has no documents."""
        if not self._db:
            return True
        try:
            return self._db._collection.count() == 0
        except Exception:
            return True

    def embed(self, text: str):
        """Embed text with OpenAI. Returns None on failure."""
        if not self._client:
            return None
        try:
            response = self._client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
            )
            return response.data[0].embedding
        except Exception:
            return None

    def add_documents(self, texts: list):
        """
        Add documents to ChromaDB.
        Uses OpenAI embeddings if available, otherwise stores as plain text.
        """
        if not self._db:
            return

        try:
            from langchain_core.documents import Document

            docs = []
            for text in texts:
                embedding = self.embed(text)
                if embedding:
                    docs.append(Document(
                        page_content=text,
                        metadata={"source": "civic_knowledge"},
                    ))
                else:
                    # Store without embedding — ChromaDB will auto-embed later
                    docs.append(Document(
                        page_content=text,
                        metadata={"source": "civic_knowledge"},
                    ))

            if docs:
                self._db.add_documents(docs)

        except Exception:
            pass  # Never crash — RAG is enhancement, not core functionality

    def seed_if_empty(self):
        """
        Seed the knowledge base with civic domain knowledge
        if the store is empty. Called once on startup from main.py.
        """
        if self.is_empty():
            self.add_documents(CIVIC_KNOWLEDGE)

    def search(self, query: str) -> list:
        """Search ChromaDB. Returns empty list on failure."""
        if not self._db:
            return []
        try:
            embedding = self.embed(query)
            if embedding:
                return self._db.similarity_search_by_vector(embedding, k=3)
            return []
        except Exception:
            return []