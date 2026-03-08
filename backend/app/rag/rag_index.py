import os

from openai import OpenAI
from langchain_chroma import Chroma
from langchain_core.documents import Document


class CivicRAG:

    def __init__(self):

        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

        self.db = Chroma(
            collection_name="civic_docs",
            persist_directory="rag_store"
        )

    def embed(self, text):

        response = self.client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )

        return response.data[0].embedding

    def add_documents(self, texts):

        docs = []

        for t in texts:

            embedding = self.embed(t)

            docs.append(
                Document(
                    page_content=t,
                    metadata={"embedding": embedding}
                )
            )

        self.db.add_documents(docs)

    def search(self, query):

        query_embedding = self.embed(query)

        return self.db.similarity_search_by_vector(
            query_embedding,
            k=3
        )