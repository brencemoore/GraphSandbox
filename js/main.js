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


// File Actions

// Asks before clearing, since a new graph deletes the current one.
async function requestNewGraph(cy) {
    if (cy.elements().empty()) {
        return;
    }

    const counts = document.getElementById("graphCounts").textContent.trim();
    const confirmed = await ConfirmDialog.ask({
        title: "Start a new graph?",
        message: `The current graph (${counts}) will be deleted. You can still bring it back with Undo.`,
        confirmLabel: "Delete graph",
    });

    if (confirmed) {
        GraphTools.clearGraph();
    }
}


// File actions appear twice (header buttons and the phone menu), so they are bound by data-action.
function bindFileActions(cy) {
    const actions = {
        newGraph: () => requestNewGraph(cy),
        openGraph: OpenGraph.open,
        saveGraph: SaveDialog.open,
    };

    document.querySelectorAll("[data-action]").forEach(element => {
        element.addEventListener("click", actions[element.dataset.action]);
    });
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

    bindFileActions(cy);
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

function setDarkMode(enabled) {
    document.documentElement.setAttribute("data-bs-theme", enabled ? "dark" : "light");
    GraphCanvas.refreshStyle();
}


// Naming settings need no handler here: tools read them when naming, and the
// settings dialog renames existing nodes and edges when they change.
const SETTING_HANDLERS = {
    autoUpdate: value => AnalysisPanel.setAutoUpdate(value),
    showLabels: value => GraphCanvas.setLabelsVisible(value),
    showCounts: value => document.getElementById("workspaceHeader").classList.toggle("d-none", !value),
    showGrid: value => GraphCanvas.setGridVisible(value),
    darkMode: setDarkMode,
};


function applySetting(key, value) {
    SETTING_HANDLERS[key]?.(value);
}


// Python

function setPythonStatus(state) {
    const status = PYTHON_STATUS[state];
    document.getElementById("pythonStatusDot").className = `p-1 rounded-circle d-inline-block ${status.color}`;
    document.getElementById("pythonStatusText").textContent = status.text;
    document.getElementById("pythonStatus").title = status.text;
}


// Starts loading in the background so the first analysis runs quickly.
function loadPython() {
    setPythonStatus("loading");

    PythonEngine.load()
        .then(() => setPythonStatus("ready"))
        .catch(() => setPythonStatus(location.protocol === "file:" ? "needsServer" : "failed"));
}


// Leaving the Page

// The graph only lives in this tab, so closing, reloading or going back would lose it.
// Browsers show their own "Leave site?" wording; a custom message is not allowed.
function warnBeforeLeaving(cy) {
    window.addEventListener("beforeunload", event => {
        if (cy.elements().nonempty()) {
            event.preventDefault();
            event.returnValue = "";
        }
    });
}


// Setup

function initApp() {
    const cy = GraphCanvas.create(document.getElementById("graphCanvas"));

    AppSettings.init();
    EdgePreview.init();
    GraphHistory.init(cy, updateHistoryButtons);
    GraphTools.init(cy);
    Inspector.init(cy);
    GraphSummary.init(cy);
    AnalysisPanel.init(cy);
    ConfirmDialog.init();
    SettingsDialog.init(cy);
    SaveDialog.init(cy);
    OpenGraph.init(cy);
    Marquee.init(cy);

    bindControls(cy);
    AppSettings.onChange(applySetting);
    AppSettings.applyAll(applySetting);

    selectTool("select");
    updateHistoryButtons();
    updateDeleteButton(cy);
    updateZoomLevel();
    warnBeforeLeaving(cy);
    loadPython();
}


initApp();
