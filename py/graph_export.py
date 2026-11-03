"""Graph export formats, written with NetworkX so other tools can read them back.

The browser sends the same graph JSON as for analysis (nodes with id, label, x, y;
edges with source, target, name, value). Nodes are keyed by their names when every
name is unique, otherwise by their internal ids (names are still kept as "label").
"""

import csv
import io
import json

import networkx as nx


# Graph

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
