"""Euler and Hamilton traversals for the Metrics tab.

Each check takes the NetworkX graph and a function that gives a vertex's label, and returns
the text shown in the Metrics list: "Yes" with an example route, or "No" with a reason.

Euler trails and circuits use every edge once; isolated nodes are ignored. Every Euler circuit
is also an Euler trail. Hamilton paths and cycles visit every node once. Finding them is slow in
the worst case, so the search stops after MAX_SEARCH_STEPS and reports that it gave up.
"""

import networkx as nx

MAX_ROUTE_LABELS = 8
MAX_SEARCH_STEPS = 50_000


class SearchLimitReached(Exception):
    pass


# Formatting

def route_text(route, label):
    """'Yes (a → b → c → a)', listing at most MAX_ROUTE_LABELS stops."""
    labels = [label(vertex) for vertex in route]
    shown = " → ".join(labels[:MAX_ROUTE_LABELS])
    more = " → …" if len(labels) > MAX_ROUTE_LABELS else ""
    return f"Yes ({shown}{more})"


def plural(count, word):
    return f"{count} {word}" if count == 1 else f"{count} {word}s"


# Euler

def odd_degree_count(graph):
    return sum(1 for _, degree in graph.degree if degree % 2 == 1)


def edge_subgraph(graph):
    """The graph without isolated nodes, which Euler routes do not need to visit."""
    return graph.subgraph(vertex for vertex, degree in graph.degree if degree > 0)


def edges_to_route(edges):
    edges = list(edges)
    return [source for source, _ in edges] + [edges[-1][1]]


def euler_reason(graph, allowed_odd):
    """Why there is no Euler route, or None when there is one."""
    if not nx.is_connected(edge_subgraph(graph)):
        return "No (edges are not all connected)"

    odd = odd_degree_count(graph)
    if odd > allowed_odd:
        return f"No ({plural(odd, 'odd-degree node')})"

    return None


def euler_circuit(graph, label):
    if graph.number_of_edges() == 0:
        return "— (no edges)"

    reason = euler_reason(graph, allowed_odd=0)
    if reason:
        return reason

    return route_text(edges_to_route(nx.eulerian_circuit(edge_subgraph(graph))), label)


def euler_trail(graph, label):
    if graph.number_of_edges() == 0:
        return "— (no edges)"

    reason = euler_reason(graph, allowed_odd=2)
    if reason:
        return reason

    return route_text(edges_to_route(nx.eulerian_path(edge_subgraph(graph))), label)


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


def hamilton_cycle(graph, label):
    nodes = graph.number_of_nodes()

    if nodes < 3:
        return "No (needs 3+ nodes)"

    if not nx.is_connected(graph):
        return "No (not connected)"

    weakest = min(graph, key=graph.degree)
    if graph.degree[weakest] < 2:
        return f"No ({label(weakest)} has degree 1)"

    cut_vertex = next(nx.articulation_points(graph), None)
    if cut_vertex is not None:
        return f"No (removing {label(cut_vertex)} disconnects the graph)"

    if bipartite_imbalance(graph):
        return "No (bipartite with unequal sides)"

    try:
        route = search_route(graph, [weakest], closed=True)
    except SearchLimitReached:
        return "Yes (by Ore's theorem)" if satisfies_ore(graph) else "Unknown (search took too long)"

    return route_text(route, label) if route else "No"


def hamilton_path(graph, label):
    nodes = graph.number_of_nodes()

    if nodes == 0:
        return "— (no nodes)"

    if not nx.is_connected(graph):
        return "No (not connected)"

    # A degree-1 node can only be an end of the path, and a path has two ends.
    leaves = [vertex for vertex in graph if graph.degree[vertex] == 1]
    if len(leaves) > 2:
        return f"No ({len(leaves)} nodes have degree 1)"

    imbalance = bipartite_imbalance(graph)
    if imbalance is not None and imbalance > 1:
        return f"No (bipartite sides differ by {imbalance})"

    starts = leaves[:1] or sorted(graph, key=graph.degree)

    try:
        route = search_route(graph, starts, closed=False)
    except SearchLimitReached:
        return "Yes (by Ore's theorem)" if satisfies_ore(graph) else "Unknown (search took too long)"

    return route_text(route, label) if route else "No"
