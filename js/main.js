// Main
// Creates the graph and wires the page controls to the modules.

const ACTIVE_TOOL_CLASS = "btn-primary";
const INACTIVE_TOOL_CLASS = "btn-outline-secondary";


function setStatus(message) {
    document.getElementById("statusMessage").textContent = message;
}


function bindButton(id, action) {
    document.getElementById(id).addEventListener("click", action);
}


// Tools

function selectTool(tool) {
    GraphTools.setTool(tool);

    document.querySelectorAll("[data-tool]").forEach(button => {
        const active = button.dataset.tool === tool;
        button.classList.toggle(ACTIVE_TOOL_CLASS, active);
        button.classList.toggle(INACTIVE_TOOL_CLASS, !active);
    });

    document.getElementById("toolHint").textContent = GraphTools.HINTS[tool];
}


function updateHistoryButtons() {
    document.getElementById("undo").disabled = !GraphHistory.canUndo();
    document.getElementById("redo").disabled = !GraphHistory.canRedo();
}


function bindControls() {
    document.querySelectorAll("[data-tool]").forEach(button => {
        button.addEventListener("click", () => selectTool(button.dataset.tool));
    });

    bindButton("newGraph", GraphTools.clearGraph);
    bindButton("selectAll", GraphTools.selectAll);
    bindButton("deleteSelected", GraphTools.deleteSelected);
    bindButton("undo", GraphTools.undo);
    bindButton("redo", GraphTools.redo);
    bindButton("zoomIn", GraphCanvas.zoomIn);
    bindButton("zoomOut", GraphCanvas.zoomOut);
    bindButton("fit", GraphCanvas.fit);
}


// Python

// Starts loading in the background so the first analysis runs quickly.
function loadPython() {
    setStatus("Loading Python…");

    PythonEngine.load()
        .then(() => setStatus("Ready"))
        .catch(() => {
            const servedFromFile = location.protocol === "file:";
            setStatus(servedFromFile ? "Python needs the app served over HTTP" : "Python failed to load");
        });
}


// Setup

function initApp() {
    const cy = GraphCanvas.create(document.getElementById("graphCanvas"));

    GraphHistory.init(cy, updateHistoryButtons);
    GraphTools.init(cy);
    GraphProperties.init(cy);
    AnalysisPanel.init(cy);
    Settings.init();

    bindControls();
    selectTool("select");
    updateHistoryButtons();
    loadPython();
}


initApp();
