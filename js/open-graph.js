// Open Graph
// Loads a graph file (JSON, GraphML, GML, CSV or edge list) into the canvas, read by py/graph_io.py.

const OpenGraph = (() => {

    const MAX_FILE_BYTES = 5 * 1024 * 1024;

    let cy = null;
    let fileInput = null;


    // Elements

    // Files give nodes by index; the canvas uses ids 1, 2, 3, …
    // Python fills in positions for files that have none, so every node arrives placed.
    function toElements(graph) {
        const nodes = graph.nodes.map((node, index) => ({
            group: "nodes",
            data: { id: String(index + 1), label: node.label },
            position: { x: node.x, y: node.y },
        }));

        const edges = graph.edges.map(edge => ({
            group: "edges",
            data: {
                source: String(edge.source + 1),
                target: String(edge.target + 1),
                name: edge.name,
                value: edge.value === null ? "" : String(edge.value),
            },
        }));

        return [...nodes, ...edges];
    }


    // Messages

    function plural(count, word) {
        return `${count} ${word}${count === 1 ? "" : "s"}`;
    }


    function summary(fileName, graph) {
        const counts = `${plural(graph.nodes.length, "node")}, ${plural(graph.edges.length, "edge")}`;
        return [`Opened ${fileName}: ${counts}.`, ...graph.notes].join(" ");
    }


    function confirmReplace() {
        if (cy.elements().empty()) {
            return Promise.resolve(true);
        }

        return ConfirmDialog.ask({
            title: "Replace the current graph?",
            message: "The graph on the canvas will be replaced by the file. You can still bring it back with Undo.",
            confirmLabel: "Open file",
        });
    }


    // Loading

    async function load(file) {
        if (file.size > MAX_FILE_BYTES) {
            Notify.show(`${file.name} is larger than 5 MB.`, "danger");
            return;
        }

        if (!PythonEngine.isReady()) {
            Notify.show("Reading the file once Python has loaded…", "secondary");
        }

        try {
            const graph = await PythonEngine.importGraph(file.name, await file.text());

            if (graph.error) {
                Notify.show(graph.error, "danger");
                return;
            }

            if (await confirmReplace()) {
                GraphTools.replaceGraph(toElements(graph));
                GraphCanvas.fit();
                Notify.show(summary(file.name, graph));
            }
        } catch (error) {
            Notify.show(`Could not open ${file.name}: ${error.message}`, "danger");
        }
    }


    function onFileChosen() {
        const file = fileInput.files[0];
        fileInput.value = "";

        if (file) {
            load(file);
        }
    }


    function open() {
        fileInput.click();
    }


    function init(graph) {
        cy = graph;
        fileInput = document.getElementById("openGraphFile");
        fileInput.addEventListener("change", onFileChosen);
    }


    return { init, open };

})();
