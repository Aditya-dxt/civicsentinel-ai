from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

class CivicRAG:

    def __init__(self):

        self.embedding = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        self.db = Chroma(
            collection_name="civic_docs",
            embedding_function=self.embedding
        )

    def add_documents(self, texts):

        docs = [Document(page_content=t) for t in texts]

        self.db.add_documents(docs)

    def search(self, query):

        return self.db.similarity_search(query, k=3)