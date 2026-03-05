import networkx as nx

class CivicGraph:

    def __init__(self):
        self.graph = nx.Graph()

    def build_graph(self, events):

        for event in events:
            city = event["location"]
            issue = event["issue"]

            self.graph.add_node(city, type="city")
            self.graph.add_node(issue, type="issue")

            self.graph.add_edge(city, issue)

        return self.graph

    def get_relations(self):

        relations = []

        for edge in self.graph.edges():
            relations.append({
                "city": edge[0],
                "issue": edge[1]
            })

        return relations