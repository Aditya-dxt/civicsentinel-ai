# ─────────────────────────────────────────────────────────────────────────────
# retriever.py  —  CivicSentinel AI · RAG Retriever
#
# FIX 1: Wrapped Chroma init and all OpenAI calls in try/except.
#         Empty or missing rag_store no longer causes a 500.
# FIX 2: Falls back to llm_engine's rule-based insight when:
#         - OpenAI key is missing
#         - ChromaDB is empty
#         - Embedding call fails
# FIX 3: query() always returns a string — never raises.
# ─────────────────────────────────────────────────────────────────────────────

import os
from app.intelligence.llm_engine import generate_llm_insight


class CivicRetriever:

    def __init__(self):
        self._ready = False
        self._client = None
        self._db     = None
        self._init()

    def _init(self):
        """
        Lazy initialisation — fail silently if OpenAI key or
        ChromaDB is not available. query() still works via fallback.
        """
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return  # will use fallback in query()

        try:
            from openai import OpenAI
            from langchain_chroma import Chroma

            self._client = OpenAI(api_key=api_key)
            self._db     = Chroma(persist_directory="rag_store")
            self._ready  = True
        except Exception as e:
            # ChromaDB may fail if rag_store doesn't exist yet
            self._ready = False

    def embed(self, text: str):
        """Embed text using OpenAI. Returns None on failure."""
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

    def query(self, question: str) -> str:
        """
        Retrieve relevant civic documents and generate an LLM insight.
        Always returns a string — never raises an exception.
        """
        context = ""

        # ── Try RAG retrieval if DB is ready ────────────────────────────
        if self._ready and self._db:
            try:
                embedding = self.embed(question)
                if embedding:
                    docs = self._db.similarity_search_by_vector(embedding, k=3)
                    if docs:
                        context = "\n".join([doc.page_content for doc in docs])
            except Exception:
                context = ""  # fall through to LLM with empty context

        # ── Always call generate_llm_insight — it has its own fallback ──
        return generate_llm_insight(question, context)