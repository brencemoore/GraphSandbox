// Main
// Creates the graph and wires the page controls to the modules.

const PYTHON_STATUS = {
    loading: { color: "bg-warning", text: "Loading Python…" },
    ready: { color: "bg-success", text: "Python ready" },
    failed: { color: "bg-danger", text: "Python failed to load" },
    needsServer: { color: "bg-danger", text: "Run npm start to enable Python" },
};

const FEEDBACK_DURATION = 1800;
const feedbackTimers = new Map();


function bindButton(id, action) {
    document.getElementById(id).addEventListener("click", action);
}


// Feedback

// Runs `undo` after a short delay, restarting the delay if the same element gets feedback again.
function scheduleFeedbackReset(element, undo) {
    clearTimeout(feedbackTimers.get(element));
    feedbackTimers.set(element, setTimeout(undo, FEEDBACK_DURATION));
}


// Briefly shows a confirmation in place of a button's label.
function flashButtonText(button, text) {
    button.dataset.label ??= button.textContent.trim();
    button.textContent = text;
    scheduleFeedbackReset(button, () => { button.textContent = button.dataset.label; });
}


function showSettingsSaved() {
    const indicator = document.getElementById("settingsSaved");
    indicator.classList.add("show");
    scheduleFeedbackReset(indicator, () => indicator.classList.remove("show"));
}


function renameWithFeedback(buttonId, rename, singular) {
    const count = rename();
    const text = count === 0
        ? `No ${singular}s to rename`
        : `✓ Renamed ${count} ${singular}${count === 1 ? "" : "s"}`;

    flashButtonText(document.getElementById(buttonId), text);
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
    bindButton("renameNodes", () => renameWithFeedback("renameNodes", GraphTools.renameNodes, "node"));
    bindButton("renameEdges", () => renameWithFeedback("renameEdges", GraphTools.renameEdges, "edge"));
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


// The prefix box only applies to the "Prefix" style; the preview shows what new names will look like.
function updateNamingControls(kind) {
    const style = AppSettings.get(`${kind}Names`);
    const prefix = AppSettings.get(`${kind}Prefix`);
    const plural = kind === "node" ? "nodes" : "edges";

    document.getElementById(`${kind}PrefixSetting`).disabled = style !== "custom";
    document.getElementById(`${kind}NamesPreview`).textContent = style === "none"
        ? `New ${plural} have no name.`
        : `New ${plural}: ${GraphNaming.examples(style, prefix).join(", ")}, …`;
}


const SETTING_HANDLERS = {
    autoUpdate: value => AnalysisPanel.setAutoUpdate(value),
    nodeNames: () => updateNamingControls("node"),
    nodePrefix: () => updateNamingControls("node"),
    edgeNames: () => updateNamingControls("edge"),
    edgePrefix: () => updateNamingControls("edge"),
    showLabels: value => GraphCanvas.setLabelsVisible(value),
    showGrid: value => GraphCanvas.setGridVisible(value),
    darkMode: setDarkMode,
};


function applySetting(key, value) {
    SETTING_HANDLERS[key](value);
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
    SaveDialog.init(cy);
    OpenGraph.init(cy);
    Marquee.init(cy);

    bindControls(cy);
    AppSettings.onChange(applySetting);
    AppSettings.onChange(showSettingsSaved);
    AppSettings.applyAll(applySetting);

    selectTool("select");
    updateHistoryButtons();
    updateDeleteButton(cy);
    updateZoomLevel();
    loadPython();
}


initApp();
