import networkx as nx


class CivicKnowledgeGraph:

    def __init__(self):
        self.graph = nx.DiGraph()

    def add_event(self, issue, location):

        authority_map = {
            "Mumbai": "Mumbai Municipal Corporation",
            "Delhi": "Delhi Municipal Corporation",
            "Lucknow": "Lucknow Nagar Nigam",
        }

        department_map = {
            "Water Crisis": "Water Department",
            "Electricity Outage": "Electricity Board",
            "Corruption Complaint": "Anti-Corruption Bureau",
        }

        authority = authority_map.get(location, "Local Authority")
        department = department_map.get(issue, "General Department")

        # Add nodes
        self.graph.add_node(issue, type="issue")
        self.graph.add_node(location, type="location")
        self.graph.add_node(authority, type="authority")
        self.graph.add_node(department, type="department")

        # Add edges
        self.graph.add_edge(issue, location, relation="occurs_in")
        self.graph.add_edge(location, authority, relation="governed_by")
        self.graph.add_edge(authority, department, relation="responsible_for")

    def get_neighbors(self, node):
        return list(self.graph.neighbors(node))