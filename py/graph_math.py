"""Graph analysis functions called from the browser through Pyodide.

Every analysis takes a NetworkX graph and returns a table:
{"title": str, "columns": [str], "rows": [[label, value, ...]]}
"""

import json

import networkx as nx
import numpy as np


DECIMALS = 4
INFINITY = "∞"


# Formatting

def format_value(value):
    if isinstance(value, (bool, np.bool_)):
        return "Yes" if value else "No"

    if isinstance(value, str):
        return value

    if np.isinf(value):
        return INFINITY

    rounded = round(float(value), DECIMALS) + 0.0  # + 0.0 turns -0.0 into 0.0
    return int(rounded) if rounded.is_integer() else rounded


def edge_label(edge):
    return f"{edge[0]}–{edge[1]}"


def matrix_table(title, matrix, row_labels, column_labels):
    rows = [
        [label] + [format_value(value) for value in row]
        for label, row in zip(row_labels, matrix)
    ]
    return {"title": title, "columns": [""] + column_labels, "rows": rows}


def vertex_table(title, column, scores):
    rows = [[vertex, format_value(scores[vertex])] for vertex in sorted(scores, key=float)]
    return {"title": title, "columns": ["Vertex", column], "rows": rows}


def spectrum_table(title, matrix, descending):
    eigenvalues = np.sort(np.linalg.eigvalsh(matrix))

    if descending:
        eigenvalues = eigenvalues[::-1]

    rows = [[f"λ{index}", format_value(value)] for index, value in enumerate(eigenvalues, start=1)]
    return {"title": title, "columns": ["", "Eigenvalue"], "rows": rows}


# Matrices

def vertices(graph):
    return list(graph.nodes)


def adjacency(graph):
    return nx.to_numpy_array(graph, nodelist=vertices(graph))


def laplacian(graph):
    return nx.laplacian_matrix(graph, nodelist=vertices(graph)).toarray()


def normalized_laplacian(graph):
    return nx.normalized_laplacian_matrix(graph, nodelist=vertices(graph)).toarray()


def adjacency_matrix(graph):
    return matrix_table("Adjacency Matrix", adjacency(graph), vertices(graph), vertices(graph))


def degree_matrix(graph):
    degrees = [degree for _, degree in graph.degree(vertices(graph))]
    return matrix_table("Degree Matrix", np.diag(degrees), vertices(graph), vertices(graph))


def laplacian_matrix(graph):
    return matrix_table("Laplacian Matrix", laplacian(graph), vertices(graph), vertices(graph))


def normalized_laplacian_matrix(graph):
    return matrix_table("Normalized Laplacian Matrix", normalized_laplacian(graph), vertices(graph), vertices(graph))


def incidence(graph, oriented):
    edges = list(graph.edges)
    matrix = nx.incidence_matrix(graph, nodelist=vertices(graph), edgelist=edges, oriented=oriented).toarray()
    return matrix, [edge_label(edge) for edge in edges]


def incidence_matrix(graph):
    matrix, edge_labels = incidence(graph, oriented=False)
    return matrix_table("Incidence Matrix", matrix, vertices(graph), edge_labels)


def oriented_incidence_matrix(graph):
    matrix, edge_labels = incidence(graph, oriented=True)
    return matrix_table("Oriented Incidence Matrix", matrix, vertices(graph), edge_labels)


def distance_matrix(graph):
    matrix = nx.floyd_warshall_numpy(graph, nodelist=vertices(graph))
    return matrix_table("Distance Matrix", matrix, vertices(graph), vertices(graph))


# Spectra

def adjacency_spectrum(graph):
    return spectrum_table("Adjacency Eigenvalues", adjacency(graph), descending=True)


def laplacian_spectrum(graph):
    return spectrum_table("Laplacian Eigenvalues", laplacian(graph), descending=False)


def normalized_laplacian_spectrum(graph):
    return spectrum_table("Normalized Laplacian Eigenvalues", normalized_laplacian(graph), descending=False)


# Centrality

def degree_centrality(graph):
    return vertex_table("Degree Centrality", "Score", nx.degree_centrality(graph))


def betweenness_centrality(graph):
    return vertex_table("Betweenness Centrality", "Score", nx.betweenness_centrality(graph))


def closeness_centrality(graph):
    return vertex_table("Closeness Centrality", "Score", nx.closeness_centrality(graph))


def harmonic_centrality(graph):
    return vertex_table("Harmonic Centrality", "Score", nx.harmonic_centrality(graph))


def eigenvector_centrality(graph):
    return vertex_table("Eigenvector Centrality", "Score", nx.eigenvector_centrality(graph, max_iter=1000))


def pagerank(graph):
    return vertex_table("PageRank", "Score", nx.pagerank(graph))


# Structure

def algebraic_connectivity(graph):
    if graph.number_of_nodes() < 2:
        return 0
    return np.sort(np.linalg.eigvalsh(laplacian(graph)))[1]


def graph_properties(graph):
    connected = nx.is_connected(graph)

    properties = [
        ("Vertices", graph.number_of_nodes()),
        ("Edges", graph.number_of_edges()),
        ("Density", nx.density(graph)),
        ("Connected", connected),
        ("Components", nx.number_connected_components(graph)),
        ("Diameter", nx.diameter(graph) if connected else INFINITY),
        ("Radius", nx.radius(graph) if connected else INFINITY),
        ("Girth", nx.girth(graph)),
        ("Tree", nx.is_tree(graph)),
        ("Bipartite", nx.is_bipartite(graph)),
        ("Planar", nx.is_planar(graph)),
        ("Average clustering", nx.average_clustering(graph)),
        ("Algebraic connectivity", algebraic_connectivity(graph)),
    ]

    rows = [[name, format_value(value)] for name, value in properties]
    return {"title": "Graph Properties", "columns": ["Property", "Value"], "rows": rows}


# Entry Point

ANALYSES = {
    "adjacency_matrix": adjacency_matrix,
    "degree_matrix": degree_matrix,
    "laplacian_matrix": laplacian_matrix,
    "normalized_laplacian_matrix": normalized_laplacian_matrix,
    "incidence_matrix": incidence_matrix,
    "oriented_incidence_matrix": oriented_incidence_matrix,
    "distance_matrix": distance_matrix,
    "adjacency_spectrum": adjacency_spectrum,
    "laplacian_spectrum": laplacian_spectrum,
    "normalized_laplacian_spectrum": normalized_laplacian_spectrum,
    "degree_centrality": degree_centrality,
    "betweenness_centrality": betweenness_centrality,
    "closeness_centrality": closeness_centrality,
    "harmonic_centrality": harmonic_centrality,
    "eigenvector_centrality": eigenvector_centrality,
    "pagerank": pagerank,
    "graph_properties": graph_properties,
}


def build_graph(graph_data):
    graph = nx.Graph()
    graph.add_nodes_from(graph_data["nodes"])
    graph.add_edges_from(graph_data["edges"])
    return graph


def run_analysis(name, graph_json):
    """Runs one analysis on a graph sent as JSON and returns the table as JSON."""
    graph = build_graph(json.loads(graph_json))

    if graph.number_of_nodes() == 0:
        return json.dumps({"error": "Add at least one vertex first."})

    try:
        return json.dumps(ANALYSES[name](graph))
    except Exception as error:  # NetworkX errors are shown in the panel instead of crashing
        return json.dumps({"error": str(error)})
