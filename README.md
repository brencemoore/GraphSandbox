# GraphSandbox

**Try it online: [brencemoore.github.io/GraphSandbox](https://brencemoore.github.io/GraphSandbox/)**

GraphSandbox is a free browser app for drawing simple graphs and analyzing them. Click to add nodes, connect them with edges, give edges values, and see the graph's matrices, eigenvalues, centralities and structural properties update as you edit. Graphs can be saved as images or as data files that other graph tools, such as NetworkX, Gephi and igraph, can open.

It's meant for exploring graph theory by hand: build a small graph, change it, and watch the math change with it.


## Running It

You need [Node.js](https://nodejs.org/) (for npm) and [Python 3](https://www.python.org/).

Install the libraries (first time only):

```bash
npm install
```

Start the local server:

```bash
npm start
```

Then open http://localhost:8000. Press Ctrl+C in the terminal to stop the server.

- **Serve it, don't double-click it:** opening `index.html` directly won't work, because the Python engine can't load from a file. `npm start` runs a small server (`scripts/serve.py`) that serves the files correctly.
- **Internet needed for analysis:** the Python packages (NumPy, SciPy, NetworkX) are downloaded from Pyodide's CDN. To keep the page fast, Python starts loading on your first click, tap or key press. The status dot in the header turns green when it's ready, usually within 10–15 seconds, and you can keep drawing meanwhile.


## Using It

### Tools

| Tool | What it does |
|---|---|
| **Select** | Click a node or edge to select it. Drag on empty canvas to highlight an area; every node and edge it touches is selected; hold Shift to add to the selection. Drag a selected node or edge to move everything selected. |
| **Add node** | Click empty canvas to add a node. Drag empty canvas to pan. |
| **Connect nodes** | Drag from one node to another, or click one and then the other, to add an edge. Nodes don't move with this tool. Drag empty canvas to pan. |
| **Pan canvas** | Drag anywhere to move the view. |
| **Delete** | Deletes everything selected. |

- **Adding nodes:** double-click empty canvas in Select or Connect nodes to add a node.
- **Zooming:** the mouse wheel zooms in every tool; the zoom buttons are in the bottom-right corner.
- **Simple graphs only:** edges are undirected, and loops or duplicate edges aren't allowed.

### Keyboard Shortcuts

| Keys | Action |
|---|---|
| Delete / Backspace | Delete the selection |
| Esc | Clear the selection, or cancel an edge being drawn |
| Ctrl+Z | Undo |
| Ctrl+Y or Ctrl+Shift+Z | Redo |

### Naming Nodes and Giving Edges Values

Select a single node or edge and a small panel appears in the top-left of the canvas.

- **Nodes:** you can rename them.
- **Edges:** you can give them a name and a numeric value.
- **Values are weights:** they're used in the analysis. Blank values count as 1.

### Analysis

Click **Analyze** to open the analysis panel. Results update as you edit the graph (this can be turned off in Settings) and whenever you pick a different output.

| Tab | Contents |
|---|---|
| **Metrics** | Node, edge and component counts, density, connectivity, the fewest edges and fewest nodes whose removal disconnects the graph (with an example cut), degree sequence, diameter, radius, girth, and whether the graph is a tree, bipartite or planar, plus clustering, transitivity and algebraic connectivity |
| **Routes** | Whether the graph has an Euler trail, Euler circuit, Hamilton path or Hamilton cycle, each with an example route or the reason there is none |
| **Centrality** | Degree, betweenness, closeness, harmonic, eigenvector and PageRank, shown as bars |
| **Matrices** | Adjacency, degree, Laplacian, normalized Laplacian, incidence, oriented incidence and distance matrices |
| **Spectral** | Eigenvalues and unit eigenvectors of the adjacency, Laplacian and normalized Laplacian matrices |

How edge values are used depends on the measure:

- **As connection strengths:** matrices, spectra, eigenvector centrality and PageRank.
- **As distances:** distances, betweenness, closeness, harmonic centrality, diameter and radius.

A note under each result says which applies.

Euler and Hamilton routes ignore edge values. Euler routes ignore nodes with no edges. Finding a Hamilton path or cycle can take very long on some graphs, so the search stops after 50,000 steps and shows **Unknown** if it hasn't decided by then. Small and typical graphs are decided right away.

### Comparing Two Graphs

Click **Compare** (on phones: the File menu → **Second workspace**) to open a second workspace beside the first.

- **Active workspace:** click inside a workspace or on its tab in the bar above to make it active; its tab is highlighted. New graph, Open, Save, undo/redo and keyboard shortcuts act on the active workspace. The tools on the left apply to both.
- **Isomorphism:** while two workspaces are open, **Isomorphism** replaces Analyze. It checks whether the two graphs are isomorphic.
  - If they are, it shows how the nodes map onto each other. When both graphs use the same names, the names get subscripts (A₁ ↦ C₂) to tell them apart.
  - If they are not, it gives a reason, such as different degree sequences, and a table of the invariants it compared.
  - Only structure counts: names and edge values are ignored.
- **Closing:** the × on a workspace's tab closes it and deletes its graph, after asking.
- **Phones:** the two workspaces become tabs; only the active one is shown.

### Saving and Opening

- **Save** shows a preview, then downloads one of these:

  | Format | Opens in |
  |---|---|
  | PNG, JPG | Images of the whole graph |
  | JSON | NetworkX `node_link_graph(data, edges="edges")`, D3 and other JavaScript libraries |
  | GraphML | NetworkX, igraph, Gephi and Cytoscape |
  | GML | NetworkX, igraph and Gephi |
  | CSV edge list | `source, target, name, weight`; works with pandas and `nx.from_pandas_edgelist` |
  | CSV node list | Node names and positions |
  | CSV adjacency matrix | Weighted matrix with node names as headers |

- **Open** loads JSON, GraphML, GML, CSV edge lists, CSV adjacency matrices, and plain-text edge lists (`a b [weight]` per line).
  - Files from other tools are converted to simple undirected graphs, and you're told what changed.
  - Files without node positions are laid out automatically.
  - Opening replaces the current graph after asking, and can be undone.
  - Files are limited to 5 MB and 2,000 nodes.

- **New graph** clears the canvas after asking, and can also be undone.

The graph isn't stored anywhere else, so the browser warns you before closing or leaving the page while a graph is on the canvas.

### Help

The **?** button in the header (on phones: the File menu → **Help & about**) gives a short guide to the tools, the header buttons and comparing two graphs.

### Settings

Settings are saved in your browser and come back when you reopen the page.

- **Applying changes:** changes apply when you press **Save**; **Cancel** discards them.
- **Analysis:** turn automatic updates on or off.
- **Names:** default names for new nodes and edges: numbers (`1, 2`), letters (`a, b`), capitals (`A, B`), or a prefix of your choice (`v1, v2`, `e1, e2`). Edges can also have no name. Changing a style offers to rename the existing nodes or edges.
- **Appearance:** labels, the node and edge counts over the canvas, the dot grid, and dark mode.

### Phones and Tablets

The layout works down to small phones such as the iPhone SE.

- **Layout:** the page fits the screen without scrolling, the tools move to a bar at the bottom, and the file actions and help are grouped in a menu.
- **Panels and dialogs:** the analysis panel and dialogs open full screen.
- **Touch:** double-tap to add a node, drag one finger on empty canvas in Select to highlight an area, and pinch to zoom in any tool except Select.


## How It's Built

- **Frontend:** plain JavaScript with no framework, laid out and styled with [Bootstrap](https://getbootstrap.com/) and [Bootstrap Icons](https://icons.getbootstrap.com/), plus a small amount of custom CSS.
- **Graph drawing:** [Cytoscape.js](https://js.cytoscape.org/) draws and edits the graph.
- **Graph math:** runs in Python, in the browser, through [Pyodide](https://pyodide.org/). [NetworkX](https://networkx.org/), [NumPy](https://numpy.org/) and [SciPy](https://scipy.org/) do the analysis and read and write the file formats.
- **Libraries:** installed with npm and copied into `css/` and `js/` by `scripts/copy-dependencies.js`, so the app is a set of static files with no build step.

```
index.html               Page layout
css/style.css            Custom styles (theme colors, tool rail, canvas grid, analysis panel)
js/main.js               Starts the app and connects the controls
js/graph/                One workspace: canvas, tools, selection, naming, undo/redo, inspector
js/workspaces.js         One or two workspaces, and which is active
js/analysis/             Python engine, analysis panel, result views
js/*.js                  Settings, save/open dialogs, confirmations, notifications
py/graph_math.py         Analysis functions
py/graph_traversals.py   Euler and Hamilton routes
py/graph_compare.py      Isomorphism check
py/graph_io.py           File import and export
scripts/serve.py         Local development server
```

Much of the code in this project was generated with Claude Opus 5.5, Anthropic's AI model, through Claude Code, and then reviewed and directed by the author.


## Issues and Support

Found a bug or have an idea? [Open an issue on GitHub](https://github.com/brencemoore/GraphSandbox/issues/new/choose) (a free GitHub account is needed).

If GraphSandbox is useful to you, you can [buy me a coffee](https://buymeacoffee.com/brence). It's greatly appreciated.


## License

ISC
