"""Graph files: export to and import from formats other graph tools use, via NetworkX.

Export: the browser sends the same graph JSON as for analysis (nodes with id, label, x, y;
edges with source, target, name, value). Nodes are keyed by their names when every
name is unique, otherwise by their internal ids (names are still kept as "label").

Import: a file's text becomes {"nodes": [{"label", "x", "y"}], "edges": [{"source", "target",
"name", "value"}], "notes": [str]} with edges pointing at node indexes, or {"error": str}.
Graphs are turned into simple undirected graphs to match the sandbox, and laid out when the
file has no positions.
"""

import csv
import io
import json
import math

import networkx as nx


MAX_IMPORT_NODES = 2000
KAMADA_KAWAI_LIMIT = 300
LAYOUT_SCALE = 60


# Export Graph

def node_keys(nodes):
    labels = [node["label"] for node in nodes]
    use_labels = all(labels) and len(set(labels)) == len(labels)
    return {node["id"]: (node["label"] if use_labels else node["id"]) for node in nodes}


def export_network(graph_data):
    """NetworkX graph with only the attributes that are set, since some formats reject empty values."""
    keys = node_keys(graph_data["nodes"])
    graph = nx.Graph()

    for node in graph_data["nodes"]:
        graph.add_node(keys[node["id"]], label=node["label"], x=node["x"], y=node["y"])

    for edge in graph_data["edges"]:
        attributes = {}

        if edge["name"]:
            attributes["name"] = edge["name"]

        if edge["value"] is not None:
            attributes["weight"] = edge["value"]

        graph.add_edge(keys[edge["source"]], keys[edge["target"]], **attributes)

    return graph


def csv_text(header, rows):
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return output.getvalue()


# Formats

def to_json(graph):
    return json.dumps(nx.node_link_data(graph, edges="edges"), indent=2)


def to_graphml(graph):
    return "\n".join(nx.generate_graphml(graph))


def to_gml(graph):
    """GML uses "label" for node identity, so node names are stored as "name" instead."""
    gml_graph = graph.copy()

    for _, data in gml_graph.nodes(data=True):
        data["name"] = data.pop("label")

    return "\n".join(nx.generate_gml(gml_graph))


def to_edges_csv(graph):
    rows = [
        [source, target, data.get("name", ""), data.get("weight", 1)]
        for source, target, data in graph.edges(data=True)
    ]
    return csv_text(["source", "target", "name", "weight"], rows)


def to_nodes_csv(graph):
    rows = [[node, data["label"], data["x"], data["y"]] for node, data in graph.nodes(data=True)]
    return csv_text(["id", "label", "x", "y"], rows)


def to_adjacency_csv(graph):
    nodes = list(graph.nodes)
    matrix = nx.to_numpy_array(graph, nodelist=nodes, weight="weight")
    rows = [[node] + [f"{value:g}" for value in row] for node, row in zip(nodes, matrix)]
    return csv_text([""] + nodes, rows)


EXPORTERS = {
    "json": to_json,
    "graphml": to_graphml,
    "gml": to_gml,
    "edges_csv": to_edges_csv,
    "nodes_csv": to_nodes_csv,
    "adjacency_csv": to_adjacency_csv,
}


def export_graph(file_format, graph_json):
    """Returns the file contents for one export format."""
    return EXPORTERS[file_format](export_network(json.loads(graph_json)))


# Import Readers
# Each reader turns file text into a NetworkX graph.

def read_json(text):
    data = json.loads(text)
    edges_key = "edges" if "edges" in data else "links"
    return nx.node_link_graph(data, edges=edges_key)


def read_graphml(text):
    return nx.parse_graphml(text)


# GML normally identifies nodes by label, but labels can repeat, so fall back to ids.
def read_gml(text):
    try:
        return nx.parse_gml(text)
    except nx.NetworkXError:
        return nx.parse_gml(text, label="id")


def is_adjacency_csv(rows):
    header = rows[0]
    return header[0].strip() == "" and [row[0] for row in rows[1:]] == header[1:]


def find_column(header, names, default):
    lowered = [column.strip().lower() for column in header]
    return next((lowered.index(name) for name in names if name in lowered), default)


def read_adjacency_rows(rows):
    graph = nx.Graph()
    nodes = rows[0][1:]
    graph.add_nodes_from(nodes)

    for row_index, row in enumerate(rows[1:]):
        for column_index, cell in enumerate(row[1:]):
            weight = float(cell or 0)
            if weight != 0 and column_index >= row_index:
                graph.add_edge(nodes[row_index], nodes[column_index], weight=weight)

    return graph


# Edge lists use source/target (or from/to) columns when present, otherwise the first two.
def read_edge_rows(rows):
    header = rows[0]
    has_header = any(cell.strip().lower() in ("source", "target", "from", "to") for cell in header)
    source = find_column(header, ("source", "from"), 0) if has_header else 0
    target = find_column(header, ("target", "to"), 1) if has_header else 1
    name = find_column(header, ("name", "label"), None) if has_header else None
    weight = find_column(header, ("weight", "value"), None) if has_header else (2 if len(header) > 2 else None)

    graph = nx.Graph()

    for row in rows[1:] if has_header else rows:
        attributes = {}

        if name is not None and row[name].strip():
            attributes["name"] = row[name].strip()

        if weight is not None and row[weight].strip():
            attributes["weight"] = float(row[weight])

        graph.add_edge(row[source].strip(), row[target].strip(), **attributes)

    return graph


def read_csv(text):
    rows = [row for row in csv.reader(io.StringIO(text)) if any(cell.strip() for cell in row)]

    if not rows:
        raise ValueError("The file is empty.")

    if [cell.strip().lower() for cell in rows[0]][:2] == ["id", "label"]:
        raise ValueError("this is a node list without edges. Open the edge list, JSON, GraphML or GML file instead.")

    return read_adjacency_rows(rows) if is_adjacency_csv(rows) else read_edge_rows(rows)


# Plain edge lists: one "source target [weight]" per line; # starts a comment.
def read_edge_list(text):
    rows = []

    for line in text.splitlines():
        tokens = line.split("#")[0].split()
        if len(tokens) >= 2:
            rows.append(tokens[:3])

    return read_edge_rows(rows)


READERS = {
    "json": read_json,
    "graphml": read_graphml,
    "xml": read_graphml,
    "gml": read_gml,
    "csv": read_csv,
    "txt": read_edge_list,
    "edgelist": read_edge_list,
}


# Import Conversion

def to_simple_graph(graph, notes):
    """Undirected, no parallel edges, no loops: the kind of graph the sandbox edits."""
    if graph.is_directed():
        notes.append("Edge directions were removed.")

    if graph.is_multigraph():
        notes.append("Parallel edges were merged.")

    simple = nx.Graph(graph)
    loops = list(nx.selfloop_edges(simple))

    if loops:
        simple.remove_edges_from(loops)
        notes.append(f"Removed {len(loops)} self-loop{'s' if len(loops) != 1 else ''}.")

    return simple


def number_or_none(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def node_entry(node, data):
    label = data.get("label") or data.get("name") or node
    return {"label": str(label), "x": number_or_none(data.get("x")), "y": number_or_none(data.get("y"))}


def edge_entry(index, source, target, data):
    name = data.get("name") or data.get("label") or ""
    return {
        "source": index[source],
        "target": index[target],
        "name": str(name),
        "value": number_or_none(data.get("weight", data.get("value"))),
    }


# A blank value already counts as 1, so values of 1 are left blank to keep edge labels clean.
def drop_unit_weights(edges):
    for edge in edges:
        if edge["value"] == 1:
            edge["value"] = None


def layout_positions(graph):
    """Positions for files that have none: Kamada-Kawai for small connected graphs, spring otherwise."""
    if graph.number_of_nodes() <= KAMADA_KAWAI_LIMIT and nx.is_connected(graph):
        positions = nx.kamada_kawai_layout(graph)
    else:
        positions = nx.spring_layout(graph, seed=1)

    scale = LAYOUT_SCALE * math.sqrt(graph.number_of_nodes())
    return {node: (float(x) * scale, float(y) * scale) for node, (x, y) in positions.items()}


def add_missing_positions(graph, node_entries):
    if all(node["x"] is not None and node["y"] is not None for node in node_entries):
        return

    positions = layout_positions(graph)

    for node, entry in zip(graph.nodes, node_entries):
        entry["x"], entry["y"] = positions[node]


def browser_graph(graph, notes):
    nodes = list(graph.nodes)
    index = {node: position for position, node in enumerate(nodes)}

    node_entries = [node_entry(node, graph.nodes[node]) for node in nodes]
    edge_entries = [edge_entry(index, source, target, data) for source, target, data in graph.edges(data=True)]
    drop_unit_weights(edge_entries)

    if node_entries:
        add_missing_positions(graph, node_entries)

    return {"nodes": node_entries, "edges": edge_entries, "notes": notes}


def file_extension(file_name):
    return file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""


def import_graph(file_name, text):
    """Reads a graph file and returns the sandbox graph (or an error) as JSON."""
    reader = READERS.get(file_extension(file_name))

    if reader is None:
        supported = ", ".join(f".{extension}" for extension in READERS)
        return json.dumps({"error": f"Unsupported file type. Use {supported}."})

    try:
        notes = []
        graph = to_simple_graph(reader(text), notes)
    except Exception as error:  # Any parsing problem is reported to the user
        return json.dumps({"error": f"Could not read {file_name}: {error}"})

    if graph.number_of_nodes() > MAX_IMPORT_NODES:
        return json.dumps({"error": f"The graph has {graph.number_of_nodes()} nodes; the sandbox opens up to {MAX_IMPORT_NODES}."})

    return json.dumps(browser_graph(graph, notes))
