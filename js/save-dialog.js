// Save Dialog
// Previews and downloads the graph as an image, or as a data file other graph tools can read.

const SaveDialog = (() => {

    const IMAGE_SCALE = 2;
    const JPG_QUALITY = 0.92;
    const PREVIEW_LINES = 40;
    const DEFAULT_NAME = "graph";

    // Data formats are written by py/graph_export.py.
    const FORMATS = {
        png: {
            image: true,
            extension: "png",
            help: "High-resolution image of the whole graph.",
        },
        jpg: {
            image: true,
            extension: "jpg",
            help: "Smaller image file with a solid background.",
        },
        json: {
            extension: "json",
            type: "application/json",
            help: "NetworkX node-link JSON: nx.node_link_graph(data, edges=\"edges\"). Also easy to use from JavaScript (e.g. D3).",
        },
        graphml: {
            extension: "graphml",
            type: "application/xml",
            help: "Opens in NetworkX (nx.read_graphml), igraph, Gephi and Cytoscape.",
        },
        gml: {
            extension: "gml",
            type: "text/plain",
            help: "Opens in NetworkX (nx.read_gml), igraph and Gephi.",
        },
        edges_csv: {
            extension: "csv",
            suffix: "-edges",
            type: "text/csv",
            help: "One row per edge: source, target, name, weight. Load with pandas and nx.from_pandas_edgelist. Nodes without edges are not included.",
        },
        nodes_csv: {
            extension: "csv",
            suffix: "-nodes",
            type: "text/csv",
            help: "One row per node with its name and position on the canvas.",
        },
        adjacency_csv: {
            extension: "csv",
            suffix: "-adjacency",
            type: "text/csv",
            help: "Weighted adjacency matrix with node names as row and column headers.",
        },
    };

    let cy = null;
    let modal = null;
    let formatSelect = null;
    let helpText = null;
    let nameInput = null;
    let extensionLabel = null;
    let preview = null;
    let downloadButton = null;
    let suggestedName = DEFAULT_NAME;
    let latestRequest = 0;


    function selectedFormat() {
        return FORMATS[formatSelect.value];
    }


    // File Name
    // The name follows the format (graph, graph-edges, ...) until the user types their own.

    function updateFileName() {
        const format = selectedFormat();
        const nextSuggestion = DEFAULT_NAME + (format.suffix ?? "");

        if (nameInput.value.trim() === suggestedName || nameInput.value.trim() === "") {
            nameInput.value = nextSuggestion;
        }

        suggestedName = nextSuggestion;
        extensionLabel.textContent = `.${format.extension}`;
        helpText.textContent = format.help;
    }


    function fileName() {
        return `${nameInput.value.trim() || DEFAULT_NAME}.${selectedFormat().extension}`;
    }


    // Content

    function imageOptions(output) {
        return {
            output,
            full: true,
            scale: IMAGE_SCALE,
            bg: getComputedStyle(document.body).backgroundColor,
        };
    }


    function renderImage(output) {
        return formatSelect.value === "png"
            ? cy.png(imageOptions(output))
            : cy.jpg({ ...imageOptions(output), quality: JPG_QUALITY });
    }


    function graphText() {
        return PythonEngine.exportGraph(formatSelect.value, GraphData.serialize(cy));
    }


    // Preview

    function showElement(element) {
        preview.replaceChildren(element);
    }


    function showMessage(content) {
        const box = document.createElement("div");
        box.className = "d-flex align-items-center justify-content-center text-body-secondary small p-3 text-center";
        box.append(content);
        showElement(box);
    }


    function showImage(uri) {
        const image = document.createElement("img");
        image.className = "object-fit-contain p-3";
        image.alt = "Preview of the image that will be downloaded";
        image.src = uri;
        showElement(image);
    }


    function showText(text) {
        const lines = text.split("\n");
        const shown = lines.slice(0, PREVIEW_LINES).join("\n");

        const block = document.createElement("pre");
        block.className = "small m-0 p-3 overflow-auto text-start";
        block.textContent = lines.length > PREVIEW_LINES ? `${shown}\n…` : shown;
        showElement(block);
    }


    async function refreshPreview() {
        const request = ++latestRequest;
        updateFileName();

        if (cy.nodes().empty()) {
            downloadButton.disabled = true;
            showMessage("Add some nodes to save the graph.");
            return;
        }

        if (selectedFormat().image) {
            downloadButton.disabled = false;
            showImage(renderImage("base64uri"));
            return;
        }

        downloadButton.disabled = true;

        if (!PythonEngine.isReady()) {
            showMessage(ResultViews.loading("Loading Python…"));
        }

        try {
            const text = await graphText();

            if (request === latestRequest) {
                showText(text);
                downloadButton.disabled = false;
            }
        } catch (error) {
            showMessage(`Python is unavailable: ${error.message}`);
        }
    }


    // Download

    function downloadBlob(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName();
        link.click();

        setTimeout(() => URL.revokeObjectURL(url));
    }


    async function download() {
        const format = selectedFormat();
        const blob = format.image
            ? renderImage("blob")
            : new Blob([await graphText()], { type: format.type });

        downloadBlob(blob);
        modal.hide();
    }


    // Setup

    function open() {
        refreshPreview();
        modal.show();
    }


    function init(graph) {
        cy = graph;

        const dialog = document.getElementById("saveModal");
        modal = bootstrap.Modal.getOrCreateInstance(dialog);
        formatSelect = document.getElementById("saveFormat");
        helpText = document.getElementById("saveFormatHelp");
        nameInput = document.getElementById("saveFileName");
        extensionLabel = document.getElementById("saveExtension");
        preview = document.getElementById("savePreview");
        downloadButton = document.getElementById("saveDownload");

        formatSelect.addEventListener("change", refreshPreview);
        downloadButton.addEventListener("click", download);
    }


    return { init, open };

})();
