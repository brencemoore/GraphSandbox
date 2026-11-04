"""Graph analysis functions called from the browser through Pyodide.

The browser sends {"nodes": [{"id", "label"}], "edges": [{"source", "target", "name", "value"}]}.
Every analysis takes the NetworkX graph and returns one of these result kinds:

- table:      {"kind", "title", "columns": [str], "rows": [[label, value, ...]]}
- tables:     {"kind", "title", "tables": [table, ...]}
- scores:     {"kind", "title", "rows": [[node label, score]]}
- properties: {"kind", "title", "highlights": [[name, value]], "rows": [[name, value]]}
- routes:     {"kind", "title", "rows": [{"name", "definition", "verdict", "route", "reason"}]}

Any result may also carry a "note" shown under its title.

Edge values are stored as the "weight" attribute; a blank value is weight 1.
Matrices, spectra, eigenvector centrality and PageRank treat weights as connection
strengths. Shortest-path measures (distances, betweenness, closeness, harmonic,
diameter, radius) treat them as lengths.
"""

import json
from functools import partial

import networkx as nx
import numpy as np

from graph_traversals import routes_result


DECIMALS = 4
INFINITY = "∞"
MAX_CUT_LABELS = 6
WEIGHT = "weight"

STRENGTH_NOTE = "Edge values are used as connection strengths (blank = 1)."
DISTANCE_NOTE = "Edge values are used as distances (blank = 1)."
UNWEIGHTED_NOTE = "Counts edges; edge values are not used."
PROPERTIES_NOTE = "Diameter, radius and algebraic connectivity use edge values (blank = 1)."


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


# Weights

def is_weighted(graph):
    return graph.graph["weighted"]


def with_note(result, graph, note):
    """Adds a note about edge values to a result when the graph has any."""
    if is_weighted(graph):
        result["note"] = f"{result['note']} {note}" if "note" in result else note
    return result


def has_negative_weights(graph):
    return any(weight < 0 for _, _, weight in graph.edges(data=WEIGHT))


def require_nonnegative_weights(graph):
    if has_negative_weights(graph):
        raise ValueError("Distance-based results need edge values of 0 or more.")


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


def orient_eigenvectors(eigenvectors):
    """Eigenvectors are only defined up to sign, so flip each to make its largest entry positive."""
    for column in eigenvectors.T:
        if column[np.argmax(np.abs(column))] < 0:
            column *= -1
    return eigenvectors


def eigen_decomposition(matrix, descending):
    """Eigenvalues of a symmetric matrix in order, with unit eigenvectors as matching columns."""
    eigenvalues, eigenvectors = np.linalg.eigh(matrix)
    order = np.argsort(eigenvalues)

    if descending:
        order = order[::-1]

    return eigenvalues[order], orient_eigenvectors(eigenvectors[:, order])


def spectral_result(title, graph, matrix, descending):
    eigenvalues, eigenvectors = eigen_decomposition(matrix, descending)
    names = [f"λ{index}" for index in range(1, len(eigenvalues) + 1)]

    eigenvalue_rows = [[name, format_value(value)] for name, value in zip(names, eigenvalues)]

    result = {
        "kind": "tables",
        "title": title,
        "note": "Column λk is the unit-length eigenvector for eigenvalue λk.",
        "tables": [
            table_result("Eigenvalues", ["", "Eigenvalue"], eigenvalue_rows),
            matrix_result("Eigenvectors", eigenvectors, vertex_labels(graph), names),
        ],
    }
    return with_note(result, graph, STRENGTH_NOTE)


def scores_result(title, graph, scores):
    rows = [[vertex_label(graph, vertex), format_value(scores[vertex])] for vertex in graph.nodes]
    return {"kind": "scores", "title": title, "rows": rows}


# Matrices

def adjacency(graph):
    return nx.to_numpy_array(graph, nodelist=vertices(graph), weight=WEIGHT)


def laplacian(graph):
    return nx.laplacian_matrix(graph, nodelist=vertices(graph), weight=WEIGHT).toarray()


def normalized_laplacian(graph):
    return nx.normalized_laplacian_matrix(graph, nodelist=vertices(graph), weight=WEIGHT).toarray()


def incidence(graph, oriented):
    edges = list(graph.edges)
    matrix = nx.incidence_matrix(
        graph, nodelist=vertices(graph), edgelist=edges, oriented=oriented, weight=WEIGHT,
    ).toarray()
    return matrix, [edge_label(graph, edge) for edge in edges]


def square_matrix_result(title, graph, matrix, note):
    labels = vertex_labels(graph)
    return with_note(matrix_result(title, matrix, labels, labels), graph, note)


def adjacency_matrix(graph):
    return square_matrix_result("Adjacency Matrix", graph, adjacency(graph), STRENGTH_NOTE)


def degree_matrix(graph):
    degrees = [degree for _, degree in graph.degree(vertices(graph), weight=WEIGHT)]
    return square_matrix_result("Degree Matrix", graph, np.diag(degrees), STRENGTH_NOTE)


def laplacian_matrix(graph):
    return square_matrix_result("Laplacian Matrix", graph, laplacian(graph), STRENGTH_NOTE)


def normalized_laplacian_matrix(graph):
    return square_matrix_result("Normalized Laplacian Matrix", graph, normalized_laplacian(graph), STRENGTH_NOTE)


def distance_matrix(graph):
    require_nonnegative_weights(graph)
    matrix = nx.floyd_warshall_numpy(graph, nodelist=vertices(graph), weight=WEIGHT)
    return square_matrix_result("Distance Matrix", graph, matrix, DISTANCE_NOTE)


def incidence_matrix(graph):
    matrix, edge_labels = incidence(graph, oriented=False)
    result = matrix_result("Incidence Matrix", matrix, vertex_labels(graph), edge_labels)
    return with_note(result, graph, STRENGTH_NOTE)


def oriented_incidence_matrix(graph):
    matrix, edge_labels = incidence(graph, oriented=True)
    result = matrix_result("Oriented Incidence Matrix", matrix, vertex_labels(graph), edge_labels)
    return with_note(result, graph, STRENGTH_NOTE)


# Spectra

def adjacency_spectrum(graph):
    return spectral_result("Adjacency Spectrum", graph, adjacency(graph), descending=True)


def laplacian_spectrum(graph):
    return spectral_result("Laplacian Spectrum", graph, laplacian(graph), descending=False)


def normalized_laplacian_spectrum(graph):
    return spectral_result("Normalized Laplacian Spectrum", graph, normalized_laplacian(graph), descending=False)


# Centrality

def degree_centrality(graph):
    result = scores_result("Degree Centrality", graph, nx.degree_centrality(graph))
    return with_note(result, graph, UNWEIGHTED_NOTE)


def betweenness_centrality(graph):
    require_nonnegative_weights(graph)
    result = scores_result("Betweenness Centrality", graph, nx.betweenness_centrality(graph, weight=WEIGHT))
    return with_note(result, graph, DISTANCE_NOTE)


def closeness_centrality(graph):
    require_nonnegative_weights(graph)
    result = scores_result("Closeness Centrality", graph, nx.closeness_centrality(graph, distance=WEIGHT))
    return with_note(result, graph, DISTANCE_NOTE)


def harmonic_centrality(graph):
    require_nonnegative_weights(graph)
    result = scores_result("Harmonic Centrality", graph, nx.harmonic_centrality(graph, distance=WEIGHT))
    return with_note(result, graph, DISTANCE_NOTE)


def eigenvector_centrality(graph):
    scores = nx.eigenvector_centrality(graph, max_iter=1000, weight=WEIGHT)
    return with_note(scores_result("Eigenvector Centrality", graph, scores), graph, STRENGTH_NOTE)


def pagerank(graph):
    result = scores_result("PageRank", graph, nx.pagerank(graph, weight=WEIGHT))
    return with_note(result, graph, STRENGTH_NOTE)


# Structure

def algebraic_connectivity(graph):
    if graph.number_of_nodes() < 2:
        return 0
    return np.sort(np.linalg.eigvalsh(laplacian(graph)))[1]


def degree_sequence(graph):
    return ", ".join(str(degree) for degree in sorted((degree for _, degree in graph.degree), reverse=True))


def cut_text(size, labels):
    """'2 (cut a, b)', listing at most MAX_CUT_LABELS of the cut's members."""
    shown = sorted(labels)[:MAX_CUT_LABELS]
    more = ", …" if len(labels) > MAX_CUT_LABELS else ""
    return f"{size} (cut {', '.join(shown)}{more})"


def edge_connectivity(graph, connected):
    """Fewest edges whose removal disconnects the graph, with one such set."""
    if graph.number_of_nodes() < 2:
        return "— (one node)"

    if not connected:
        return "0 (already disconnected)"

    order = {vertex: index for index, vertex in enumerate(graph.nodes)}
    cut = [tuple(sorted(edge, key=order.get)) for edge in nx.minimum_edge_cut(graph)]
    return cut_text(len(cut), [edge_label(graph, edge) for edge in cut])


def node_connectivity(graph, connected):
    """Fewest nodes whose removal disconnects the graph, with one such set."""
    nodes = graph.number_of_nodes()

    if nodes < 2:
        return "— (one node)"

    if not connected:
        return "0 (already disconnected)"

    if graph.number_of_edges() == nodes * (nodes - 1) // 2:
        return "None (complete graph)"

    cut = nx.minimum_node_cut(graph)
    return cut_text(len(cut), [vertex_label(graph, vertex) for vertex in cut])


def path_extent(graph, measure, connected):
    """Diameter or radius: infinite when disconnected, undefined with negative distances."""
    if not connected:
        return INFINITY

    if has_negative_weights(graph):
        return "Needs values ≥ 0"

    return measure(graph, weight=WEIGHT)


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
        ("Edge connectivity", edge_connectivity(graph, connected)),
        ("Node connectivity", node_connectivity(graph, connected)),
        ("Degree sequence", degree_sequence(graph)),
    ]

    if is_weighted(graph):
        properties.append(("Total edge value", graph.size(weight=WEIGHT)))

    properties += [
        ("Diameter", path_extent(graph, nx.diameter, connected)),
        ("Radius", path_extent(graph, nx.radius, connected)),
        ("Girth", nx.girth(graph)),
        ("Tree", nx.is_tree(graph)),
        ("Bipartite", nx.is_bipartite(graph)),
        ("Planar", nx.is_planar(graph)),
        ("Average clustering", nx.average_clustering(graph)),
        ("Transitivity", nx.transitivity(graph)),
        ("Algebraic connectivity", algebraic_connectivity(graph)),
    ]

    result = {
        "kind": "properties",
        "title": "Properties",
        "highlights": [[name, format_value(value)] for name, value in highlights],
        "rows": [[name, format_value(value)] for name, value in properties],
    }
    return with_note(result, graph, PROPERTIES_NOTE)


def graph_routes(graph):
    return routes_result(graph, partial(vertex_label, graph))


# Entry Point

ANALYSES = {
    "graph_properties": graph_properties,
    "graph_routes": graph_routes,
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
    graph.graph["weighted"] = any(edge["value"] is not None for edge in graph_data["edges"])

    for node in graph_data["nodes"]:
        graph.add_node(node["id"], label=node["label"])

    for edge in graph_data["edges"]:
        weight = 1 if edge["value"] is None else edge["value"]
        graph.add_edge(edge["source"], edge["target"], name=edge["name"], weight=weight)

    return graph


def run_analysis(name, graph_json):
    """Runs one analysis on a graph sent as JSON and returns the result as JSON."""
    graph = build_graph(json.loads(graph_json))

    # The page asked for an analysis this file doesn't have, so one of them is an older copy.
    if name not in ANALYSES:
        return json.dumps({"error": "This page is out of date. Reload it to get the latest version."})

    if graph.number_of_nodes() == 0:
        return json.dumps({"error": "Add at least one node to analyze the graph."})

    try:
        return json.dumps(ANALYSES[name](graph))
    except Exception as error:  # NetworkX errors are shown in the panel instead of crashing
        return json.dumps({"error": str(error)})
