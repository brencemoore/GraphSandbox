// Main
// Creates the graph and wires the page controls to the modules.

const PYTHON_STATUS = {
    loading: { color: "bg-warning", text: "Loading Python…" },
    ready: { color: "bg-success", text: "Python ready" },
    failed: { color: "bg-danger", text: "Python failed to load" },
    needsServer: { color: "bg-danger", text: "Run npm start to enable Python" },
};


function bindButton(id, action) {
    document.getElementById(id).addEventListener("click", action);
}


// Tools

function selectTool(tool) {
    GraphTools.setTool(tool);

    document.querySelectorAll("[data-tool]").forEach(button => {
        button.classList.toggle("active", button.dataset.tool === tool);
    });

    document.getElementById("toolHint").textContent = GraphTools.hint(tool);
}


function updateHistoryButtons() {
    document.getElementById("undo").disabled = !GraphHistory.canUndo();
    document.getElementById("redo").disabled = !GraphHistory.canRedo();
}


function updateDeleteButton(cy) {
    document.getElementById("deleteSelected").disabled = cy.elements(":selected").empty();
}


function updateZoomLevel() {
    document.getElementById("zoomLevel").textContent = `${GraphCanvas.zoomPercent()}%`;
}


function bindControls(cy) {
    document.querySelectorAll("[data-tool]").forEach(button => {
        button.addEventListener("click", () => selectTool(button.dataset.tool));
    });

    bindButton("newGraph", GraphTools.clearGraph);
    bindButton("deleteSelected", GraphTools.deleteSelected);
    bindButton("undo", GraphTools.undo);
    bindButton("redo", GraphTools.redo);
    bindButton("zoomIn", GraphCanvas.zoomIn);
    bindButton("zoomOut", GraphCanvas.zoomOut);
    bindButton("fit", GraphCanvas.fit);
    bindButton("toggleAnalysis", AnalysisPanel.toggle);

    cy.on("select unselect add remove", () => updateDeleteButton(cy));
    cy.on("zoom", updateZoomLevel);
}


// Settings

function applySetting(key, value) {
    if (key === "autoUpdate") {
        AnalysisPanel.setAutoUpdate(value);
    } else if (key === "showLabels") {
        GraphCanvas.setLabelsVisible(value);
    } else if (key === "showGrid") {
        GraphCanvas.setGridVisible(value);
    } else if (key === "darkMode") {
        document.documentElement.setAttribute("data-bs-theme", value ? "dark" : "light");
        GraphCanvas.refreshStyle();
    }
}


// Python

function setPythonStatus(state) {
    const status = PYTHON_STATUS[state];
    document.getElementById("pythonStatusDot").className = `p-1 rounded-circle d-inline-block ${status.color}`;
    document.getElementById("pythonStatusText").textContent = status.text;
}


// Starts loading in the background so the first analysis runs quickly.
function loadPython() {
    setPythonStatus("loading");

    PythonEngine.load()
        .then(() => setPythonStatus("ready"))
        .catch(() => setPythonStatus(location.protocol === "file:" ? "needsServer" : "failed"));
}


// Setup

function initApp() {
    const cy = GraphCanvas.create(document.getElementById("graphCanvas"));

    AppSettings.init();
    GraphHistory.init(cy, updateHistoryButtons);
    GraphTools.init(cy);
    Inspector.init(cy);
    GraphSummary.init(cy);
    AnalysisPanel.init(cy);

    bindControls(cy);
    AppSettings.onChange(applySetting);

    selectTool("select");
    updateHistoryButtons();
    updateDeleteButton(cy);
    updateZoomLevel();
    loadPython();
}


initApp();
