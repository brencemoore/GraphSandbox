"""Compares the graphs of two workspaces: are they isomorphic, and how do their nodes match up?

Only structure is compared: node names, edge names and edge values are ignored.

Returns {"isomorphic": bool, "mapping": [[first label, second label]], "reason": str,
"checks": [[invariant, first value, second value, same]]}.
"""

import json

import networkx as nx
import numpy as np

from graph_math import build_graph, vertex_label


MAX_LISTED = 12
SPECTRUM_DECIMALS = 3


# Formatting

def listed(values):
    shown = ", ".join(str(value) for value in values[:MAX_LISTED])
    more = ", …" if len(values) > MAX_LISTED else ""
    return f"{shown}{more}" if values else "—"


def yes_no(value):
    return "Yes" if value else "No"


def finite_or_infinity(value):
    return "∞" if value == float("inf") else str(value)


def spectrum_text(values):
    return listed([f"{value:.{SPECTRUM_DECIMALS}f}".replace("-0.000", "0.000") for value in values])


# Invariants
# Isomorphic graphs always agree on these, so any difference proves they are not isomorphic.

def degree_sequence(graph):
    return sorted((degree for _, degree in graph.degree), reverse=True)


def component_sizes(graph):
    return sorted((len(component) for component in nx.connected_components(graph)), reverse=True)


def triangle_count(graph):
    return sum(nx.triangles(graph).values()) // 3


def adjacency_spectrum(graph):
    if graph.number_of_nodes() == 0:
        return []
    return list(np.sort(np.linalg.eigvalsh(nx.to_numpy_array(graph, weight=None))))


def same_spectrum(first, second):
    return len(first) == len(second) and bool(np.allclose(first, second, atol=1e-6))


def invariant(name, measure, show, difference, same=None):
    """name: row label; measure: value of a graph; show: value as text;
    difference: sentence explaining a mismatch; same: how to compare (default ==)."""
    return {"name": name, "measure": measure, "show": show, "difference": difference, "same": same}


INVARIANTS = [
    invariant("Nodes", nx.number_of_nodes, str, "They have different numbers of nodes"),
    invariant("Edges", nx.number_of_edges, str, "They have different numbers of edges"),
    invariant("Degree sequence", degree_sequence, listed, "Their degree sequences differ"),
    invariant("Component sizes", component_sizes, listed, "Their connected components differ in size"),
    invariant("Triangles", triangle_count, str, "They have different numbers of triangles"),
    invariant("Bipartite", nx.is_bipartite, yes_no, "One is bipartite and the other is not"),
    invariant("Girth", nx.girth, finite_or_infinity, "Their shortest cycles (girth) differ"),
    invariant("Adjacency eigenvalues", adjacency_spectrum, spectrum_text,
              "Their adjacency eigenvalues differ", same_spectrum),
]


# Each check is [name, Graph 1 value, Graph 2 value, same, difference sentence].
def compare_invariants(first, second):
    checks = []

    for check in INVARIANTS:
        first_value, second_value = check["measure"](first), check["measure"](second)
        same = check["same"](first_value, second_value) if check["same"] else first_value == second_value
        checks.append([check["name"], check["show"](first_value), check["show"](second_value), same, check["difference"]])

    return checks


# Result

def mapping_rows(first, second, mapping):
    return [[vertex_label(first, node), vertex_label(second, mapping[node])] for node in first.nodes]


def difference_reason(checks):
    _, first_value, second_value, _, difference = next(check for check in checks if not check[3])
    return f"{difference} (Graph 1: {first_value}; Graph 2: {second_value})."


def compare_graphs(first_json, second_json):
    """Checks two graphs (sent as JSON) for isomorphism and returns the result as JSON."""
    first = build_graph(json.loads(first_json))
    second = build_graph(json.loads(second_json))

    checks = compare_invariants(first, second)
    invariants_match = all(check[3] for check in checks)

    # The node search only runs when no invariant already rules isomorphism out.
    mapping = nx.vf2pp_isomorphism(first, second) if invariants_match else None

    if invariants_match and first.number_of_nodes() == 0:
        result = {"isomorphic": True, "mapping": [], "reason": "Both graphs are empty."}
    elif mapping is not None:
        result = {
            "isomorphic": True,
            "mapping": mapping_rows(first, second, mapping),
            "reason": "Every edge of Graph 1 matches an edge of Graph 2 under this mapping of nodes.",
        }
    elif invariants_match:
        result = {
            "isomorphic": False,
            "mapping": [],
            "reason": "They agree on every invariant below, but no mapping of nodes keeps every edge.",
        }
    else:
        result = {"isomorphic": False, "mapping": [], "reason": difference_reason(checks)}

    result["checks"] = [check[:4] for check in checks]
    return json.dumps(result)
