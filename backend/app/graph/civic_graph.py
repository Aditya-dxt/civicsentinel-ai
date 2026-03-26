import networkx as nx


class CivicGraph:

    def __init__(self):
        self.graph = nx.Graph()

    def build_graph(self, events):

        for event in events:
            city  = event.get("location") or event.get("city", "Unknown")
            issue = event.get("issue", "other")

            # FIX: always tag nodes with their type on creation.
            # This is what get_relations() uses to tell city from issue,
            # regardless of the order NetworkX returns the edge endpoints.
            self.graph.add_node(city,  type="city")
            self.graph.add_node(issue, type="issue")
            self.graph.add_edge(city,  issue)

        return self.graph

    def get_relations(self):
        """
        FIX: NetworkX undirected Graph does not guarantee that edge[0]
        is the city and edge[1] is the issue. The order depends on
        insertion history and can flip, causing the swap bug
        (e.g. {"city": "water", "issue": "Jaipur"}).

        Solution: read the 'type' attribute stored on each node and
        assign city/issue fields based on that — never by position.
        """
        relations = []

        for node_a, node_b in self.graph.edges():
            type_a = self.graph.nodes[node_a].get("type", "")
            type_b = self.graph.nodes[node_b].get("type", "")

            # Correctly assign regardless of which end comes first
            if type_a == "city" and type_b == "issue":
                city  = node_a
                issue = node_b
            elif type_a == "issue" and type_b == "city":
                city  = node_b
                issue = node_a
            else:
                # Both nodes have the same type or unknown type —
                # skip this edge rather than emit corrupted data
                continue

            # Extra guard: a city name should never look like an issue
            # keyword and vice versa. If something slipped through
            # (e.g. a city named "water"), skip it.
            KNOWN_ISSUES = {
                "water", "road", "electricity", "garbage",
                "encroachment", "crime", "health", "other",
            }
            if city.lower() in KNOWN_ISSUES or issue.lower() not in KNOWN_ISSUES:
                # Swap was undetected by type — correct it now
                if city.lower() in KNOWN_ISSUES and issue.lower() not in KNOWN_ISSUES:
                    city, issue = issue, city
                else:
                    continue  # genuinely ambiguous — skip

            relations.append({
                "city":  city,
                "issue": issue,
            })

        return relations