from app.rag.rag_index import CivicRAG

def test_rag():

    rag = CivicRAG()

    rag.add_documents([
        "Water supply issues increase in Mumbai during summer.",
        "Electricity outages often occur due to transformer overload.",
        "Corruption complaints are handled by Anti-Corruption Bureau."
    ])

    results = rag.search("water crisis in Mumbai")

    for r in results:
        print(r.page_content)


if __name__ == "__main__":
    test_rag()