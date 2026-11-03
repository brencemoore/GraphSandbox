"""Graph analysis functions called from the browser through Pyodide.

The browser sends {"nodes": [{"id", "label"}], "edges": [{"source", "target", "name"}]}.
Every analysis takes the NetworkX graph and returns one of these result kinds:

- table:      {"kind", "title", "columns": [str], "rows": [[label, value, ...]]}
- scores:     {"kind", "title", "rows": [[node label, score]]}
- properties: {"kind", "title", "highlights": [[name, value]], "rows": [[name, value]]}
"""

import json

import networkx as nx
import numpy as np


DECIMALS = 4
INFINITY = "∞"


# Labels

def vertices(graph):
    return list(graph.nodes)


def vertex_label(graph, vertex):
    return graph.nodes[vertex]["label"]


def vertex_labels(graph):
    return [vertex_label(graph, vertex) for vertex in graph.nodes]


def edge_label(graph, edge):
    source, target = edge
    return graph.edges[edge]["name"] or f"{vertex_label(graph, source)}–{vertex_label(graph, target)}"


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


def table_result(title, columns, rows):
    return {"kind": "table", "title": title, "columns": columns, "rows": rows}


def matrix_result(title, matrix, row_labels, column_labels):
    rows = [
        [label] + [format_value(value) for value in row]
        for label, row in zip(row_labels, matrix)
    ]
    return table_result(title, [""] + column_labels, rows)


def spectrum_result(title, matrix, descending):
    eigenvalues = np.sort(np.linalg.eigvalsh(matrix))

    if descending:
        eigenvalues = eigenvalues[::-1]

    rows = [[f"λ{index}", format_value(value)] for index, value in enumerate(eigenvalues, start=1)]
    return table_result(title, ["", "Eigenvalue"], rows)


def scores_result(title, graph, scores):
    rows = [[vertex_label(graph, vertex), format_value(scores[vertex])] for vertex in graph.nodes]
    return {"kind": "scores", "title": title, "rows": rows}


# Matrices

def adjacency(graph):
    return nx.to_numpy_array(graph, nodelist=vertices(graph))


def laplacian(graph):
    return nx.laplacian_matrix(graph, nodelist=vertices(graph)).toarray()


def normalized_laplacian(graph):
    return nx.normalized_laplacian_matrix(graph, nodelist=vertices(graph)).toarray()


def incidence(graph, oriented):
    edges = list(graph.edges)
    matrix = nx.incidence_matrix(graph, nodelist=vertices(graph), edgelist=edges, oriented=oriented).toarray()
    return matrix, [edge_label(graph, edge) for edge in edges]


def square_matrix_result(title, graph, matrix):
    labels = vertex_labels(graph)
    return matrix_result(title, matrix, labels, labels)


def adjacency_matrix(graph):
    return square_matrix_result("Adjacency Matrix", graph, adjacency(graph))


def degree_matrix(graph):
    degrees = [degree for _, degree in graph.degree(vertices(graph))]
    return square_matrix_result("Degree Matrix", graph, np.diag(degrees))


def laplacian_matrix(graph):
    return square_matrix_result("Laplacian Matrix", graph, laplacian(graph))


def normalized_laplacian_matrix(graph):
    return square_matrix_result("Normalized Laplacian Matrix", graph, normalized_laplacian(graph))


def distance_matrix(graph):
    return square_matrix_result("Distance Matrix", graph, nx.floyd_warshall_numpy(graph, nodelist=vertices(graph)))


def incidence_matrix(graph):
    matrix, edge_labels = incidence(graph, oriented=False)
    return matrix_result("Incidence Matrix", matrix, vertex_labels(graph), edge_labels)


def oriented_incidence_matrix(graph):
    matrix, edge_labels = incidence(graph, oriented=True)
    return matrix_result("Oriented Incidence Matrix", matrix, vertex_labels(graph), edge_labels)


# Spectra

def adjacency_spectrum(graph):
    return spectrum_result("Adjacency Eigenvalues", adjacency(graph), descending=True)


def laplacian_spectrum(graph):
    return spectrum_result("Laplacian Eigenvalues", laplacian(graph), descending=False)


def normalized_laplacian_spectrum(graph):
    return spectrum_result("Normalized Laplacian Eigenvalues", normalized_laplacian(graph), descending=False)


# Centrality

def degree_centrality(graph):
    return scores_result("Degree Centrality", graph, nx.degree_centrality(graph))


def betweenness_centrality(graph):
    return scores_result("Betweenness Centrality", graph, nx.betweenness_centrality(graph))


def closeness_centrality(graph):
    return scores_result("Closeness Centrality", graph, nx.closeness_centrality(graph))


def harmonic_centrality(graph):
    return scores_result("Harmonic Centrality", graph, nx.harmonic_centrality(graph))


def eigenvector_centrality(graph):
    return scores_result("Eigenvector Centrality", graph, nx.eigenvector_centrality(graph, max_iter=1000))


def pagerank(graph):
    return scores_result("PageRank", graph, nx.pagerank(graph))


# Structure

def algebraic_connectivity(graph):
    if graph.number_of_nodes() < 2:
        return 0
    return np.sort(np.linalg.eigvalsh(laplacian(graph)))[1]


def degree_sequence(graph):
    return ", ".join(str(degree) for degree in sorted((degree for _, degree in graph.degree), reverse=True))


def graph_properties(graph):
    connected = nx.is_connected(graph)

    highlights = [
        ("Nodes", graph.number_of_nodes()),
        ("Edges", graph.number_of_edges()),
        ("Density", round(nx.density(graph), 2)),
        ("Components", nx.number_connected_components(graph)),
    ]

    properties = [
        ("Connected", connected),
        ("Degree sequence", degree_sequence(graph)),
        ("Diameter", nx.diameter(graph) if connected else INFINITY),
        ("Radius", nx.radius(graph) if connected else INFINITY),
        ("Girth", nx.girth(graph)),
        ("Tree", nx.is_tree(graph)),
        ("Bipartite", nx.is_bipartite(graph)),
        ("Planar", nx.is_planar(graph)),
        ("Average clustering", nx.average_clustering(graph)),
        ("Transitivity", nx.transitivity(graph)),
        ("Algebraic connectivity", algebraic_connectivity(graph)),
    ]

    return {
        "kind": "properties",
        "title": "Properties",
        "highlights": [[name, format_value(value)] for name, value in highlights],
        "rows": [[name, format_value(value)] for name, value in properties],
    }


# Entry Point

ANALYSES = {
    "graph_properties": graph_properties,
    "degree_centrality": degree_centrality,
    "betweenness_centrality": betweenness_centrality,
    "closeness_centrality": closeness_centrality,
    "harmonic_centrality": harmonic_centrality,
    "eigenvector_centrality": eigenvector_centrality,
    "pagerank": pagerank,
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
}


def build_graph(graph_data):
    graph = nx.Graph()

    for node in graph_data["nodes"]:
        graph.add_node(node["id"], label=node["label"])

    for edge in graph_data["edges"]:
        graph.add_edge(edge["source"], edge["target"], name=edge["name"])

    return graph


def run_analysis(name, graph_json):
    """Runs one analysis on a graph sent as JSON and returns the result as JSON."""
    graph = build_graph(json.loads(graph_json))

    if graph.number_of_nodes() == 0:
        return json.dumps({"error": "Add at least one node to analyze the graph."})

    try:
        return json.dumps(ANALYSES[name](graph))
    except Exception as error:  # NetworkX errors are shown in the panel instead of crashing
        return json.dumps({"error": str(error)})
