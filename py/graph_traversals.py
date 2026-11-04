"""Euler and Hamilton routes, shown as Yes/No in the Metrics tab and explained in the Routes tab.

Each check takes the NetworkX graph and a function that gives a vertex's label, and returns
{"verdict", "route", "reason"}: the verdict is "Yes", "No", "Unknown" or "—" (does not apply),
the route is an example as a list of labels (or None), and the reason explains the verdict.

Euler trails and circuits use every edge once; isolated nodes are ignored. Every Euler circuit
is also an Euler trail. Hamilton paths and cycles visit every node once. Finding them is slow in
the worst case, so the search stops after MAX_SEARCH_STEPS and reports that it gave up.
"""

import re

import networkx as nx

MAX_LISTED_NODES = 6
MAX_SEARCH_STEPS = 50_000

SEARCH_STOPPED = f"The search stopped after {MAX_SEARCH_STEPS:,} steps without finding a route or ruling one out."


class SearchLimitReached(Exception):
    pass


# Results

def found(route, label, reason):
    return {"verdict": "Yes", "route": [label(vertex) for vertex in route], "reason": reason}


def not_found(reason):
    return {"verdict": "No", "route": None, "reason": reason}


def not_applicable(reason):
    return {"verdict": "—", "route": None, "reason": reason}


def unknown(reason):
    return {"verdict": "Unknown", "route": None, "reason": reason}


def natural_key(text):
    """Sorts '2' before '10' and 'v2' before 'v10'."""
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", text)]


def listed(vertices, label):
    """'a, b and c', listing at most MAX_LISTED_NODES labels."""
    labels = sorted((label(vertex) for vertex in vertices), key=natural_key)

    if len(labels) > MAX_LISTED_NODES:
        return f"{', '.join(labels[:MAX_LISTED_NODES])} and {len(labels) - MAX_LISTED_NODES} more"

    if len(labels) == 1:
        return labels[0]

    return f"{', '.join(labels[:-1])} and {labels[-1]}"


# Euler

def nodes_with(vertices, label, description):
    """'C and E have odd degree' or '4 nodes have odd degree (a, b, c and d)'."""
    if len(vertices) == 1:
        return f"{listed(vertices, label)} has {description}"
    if len(vertices) == 2:
        return f"{listed(vertices, label)} have {description}"
    return f"{len(vertices)} nodes have {description} ({listed(vertices, label)})"


def odd_degree_vertices(graph):
    return [vertex for vertex, degree in graph.degree if degree % 2 == 1]


def edge_subgraph(graph):
    """The graph without isolated nodes, which Euler routes do not need to visit."""
    return graph.subgraph(vertex for vertex, degree in graph.degree if degree > 0)


def edges_to_route(edges):
    edges = list(edges)
    return [source for source, _ in edges] + [edges[-1][1]]


def euler_obstacle(graph):
    """Why no Euler route of any kind exists, or None."""
    if graph.number_of_edges() == 0:
        return not_applicable("The graph has no edges to travel along.")

    if not nx.is_connected(edge_subgraph(graph)):
        return not_found("The edges are split into separate pieces, so no single route can reach all of them.")

    return None


def euler_circuit(graph, label):
    obstacle = euler_obstacle(graph)
    if obstacle:
        return obstacle

    odd = odd_degree_vertices(graph)
    if odd:
        return not_found(
            f"{nodes_with(odd, label, 'odd degree')}. A circuit leaves every node "
            "as often as it arrives, so every node needs even degree."
        )

    route = edges_to_route(nx.eulerian_circuit(edge_subgraph(graph)))
    return found(route, label, "Every node has even degree and the edges are connected, so a circuit exists.")


def euler_trail(graph, label):
    obstacle = euler_obstacle(graph)
    if obstacle:
        return obstacle

    odd = odd_degree_vertices(graph)
    if len(odd) > 2:
        return not_found(
            f"{nodes_with(odd, label, 'odd degree')}. A trail can only start and end at "
            "odd-degree nodes, so at most 2 are allowed."
        )

    route = edges_to_route(nx.eulerian_path(edge_subgraph(graph)))

    if odd:
        reason = f"Exactly 2 nodes have odd degree ({listed(odd, label)}), so a trail runs from one to the other."
    else:
        reason = "Every node has even degree, so the trail can be closed into a circuit."

    return found(route, label, reason)


# Hamilton

def search_route(graph, starts, closed):
    """Backtracking search for a route through every node, trying neighbors with the fewest
    unvisited neighbors first. Returns the route, or None when there is none."""
    neighbors = {vertex: set(graph[vertex]) for vertex in graph}
    total = len(neighbors)
    steps = 0

    def extend(route, visited):
        nonlocal steps
        steps += 1
        if steps > MAX_SEARCH_STEPS:
            raise SearchLimitReached

        if len(route) == total:
            return not closed or route[0] in neighbors[route[-1]]

        candidates = sorted(neighbors[route[-1]] - visited, key=lambda vertex: len(neighbors[vertex] - visited))

        for vertex in candidates:
            route.append(vertex)
            visited.add(vertex)

            if extend(route, visited):
                return True

            route.pop()
            visited.remove(vertex)

        return False

    for start in starts:
        route = [start]
        if extend(route, {start}):
            return route + [start] if closed else route

    return None


def bipartite_imbalance(graph):
    """How many more nodes one side of a connected bipartite graph has than the other, or None.
    Every route alternates sides, so a cycle needs equal sides and a path sides within one."""
    if not nx.is_bipartite(graph):
        return None

    side_a, side_b = nx.bipartite.sets(graph)
    return abs(len(side_a) - len(side_b))


def satisfies_ore(graph):
    """Ore's theorem: with 3+ nodes, if every two non-adjacent nodes have degrees summing to at
    least the node count, the graph has a Hamilton cycle."""
    nodes = graph.number_of_nodes()
    return nodes >= 3 and all(
        graph.degree[a] + graph.degree[b] >= nodes
        for a, b in nx.non_edges(graph)
    )


def search_result(graph, label, starts, closed, found_reason, none_reason):
    try:
        route = search_route(graph, starts, closed)
    except SearchLimitReached:
        if satisfies_ore(graph):
            return {
                "verdict": "Yes",
                "route": None,
                "reason": "Every two non-adjacent nodes have degrees adding up to at least the number of nodes, "
                          "so Ore's theorem guarantees a Hamilton cycle. The search stopped before finding an example.",
            }
        return unknown(SEARCH_STOPPED)

    return found(route, label, found_reason) if route else not_found(none_reason)


def hamilton_cycle(graph, label):
    if graph.number_of_nodes() < 3:
        return not_found("A cycle in a simple graph needs at least 3 nodes.")

    if not nx.is_connected(graph):
        return not_found("The graph is not connected, so no route can reach every node.")

    weakest = min(graph, key=graph.degree)
    if graph.degree[weakest] < 2:
        return not_found(f"{label(weakest)} has degree {graph.degree[weakest]}. A cycle enters and leaves every node, so each needs degree 2 or more.")

    cut_vertex = next(nx.articulation_points(graph), None)
    if cut_vertex is not None:
        return not_found(f"Removing {label(cut_vertex)} disconnects the graph, so a cycle would have to pass through it twice.")

    if bipartite_imbalance(graph):
        return not_found("The graph is bipartite with sides of different sizes. A cycle alternates sides, so the sides must be equal.")

    return search_result(
        graph, label, [weakest], closed=True,
        found_reason="This cycle visits every node once and returns to the start.",
        none_reason="An exhaustive search tried every possible route and none returns to the start after visiting every node.",
    )


def hamilton_path(graph, label):
    if graph.number_of_nodes() == 0:
        return not_applicable("The graph has no nodes.")

    if not nx.is_connected(graph):
        return not_found("The graph is not connected, so no route can reach every node.")

    # A degree-1 node can only be an end of the path, and a path has two ends.
    leaves = [vertex for vertex in graph if graph.degree[vertex] == 1]
    if len(leaves) > 2:
        return not_found(f"{nodes_with(leaves, label, 'degree 1')}. Each must be an end of the path, and a path has only 2 ends.")

    imbalance = bipartite_imbalance(graph)
    if imbalance is not None and imbalance > 1:
        return not_found(f"The graph is bipartite and one side has {imbalance} more nodes. A path alternates sides, so they can differ by at most 1.")

    starts = leaves[:1] or sorted(graph, key=graph.degree)

    return search_result(
        graph, label, starts, closed=False,
        found_reason="This path visits every node once.",
        none_reason="An exhaustive search tried every possible route and none visits every node.",
    )


# Routes Tab

ROUTES = [
    ("Euler trail", "Uses every edge exactly once.", euler_trail),
    ("Euler circuit", "Uses every edge exactly once and ends where it started.", euler_circuit),
    ("Hamilton path", "Visits every node exactly once.", hamilton_path),
    ("Hamilton cycle", "Visits every node exactly once and returns to the start.", hamilton_cycle),
]


def route_verdicts(graph, label):
    """[name, verdict] for each route, for the Metrics list."""
    return [(name, check(graph, label)["verdict"]) for name, _, check in ROUTES]


def routes_result(graph, label):
    rows = [
        {"name": name, "definition": definition, **check(graph, label)}
        for name, definition, check in ROUTES
    ]
    return {
        "kind": "routes",
        "title": "Euler and Hamilton routes",
        "note": "Routes ignore edge values. Euler routes ignore nodes with no edges.",
        "rows": rows,
    }
