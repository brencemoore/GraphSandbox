// Main
// Creates the workspaces and wires the page controls to them. Header actions, undo/redo and
// keyboard shortcuts act on the active workspace; the tool rail applies to every workspace.

const PYTHON_STATUS = {
    idle: { color: "bg-secondary", text: "Python loads on first use" },
    loading: { color: "bg-warning", text: "Loading Python…" },
    ready: { color: "bg-success", text: "Python ready" },
    failed: { color: "bg-danger", text: "Python failed to load" },
    needsServer: { color: "bg-danger", text: "Run npm start to enable Python" },
};


function bindButton(id, action) {
    document.getElementById(id).addEventListener("click", action);
}


function activeWorkspace() {
    return Workspaces.active();
}


// File Actions

// Asks before clearing, since a new graph deletes the current one.
async function requestNewGraph(workspace) {
    if (workspace.cy.elements().empty()) {
        return;
    }

    const where = Workspaces.isSplit() ? ` in ${workspace.name}` : "";
    const confirmed = await ConfirmDialog.ask({
        title: "Start a new graph?",
        message: `The current graph${where} (${workspace.summary.text()}) will be deleted. You can still bring it back with Undo.`,
        confirmLabel: "Delete graph",
    });

    if (confirmed) {
        workspace.tools.clearGraph();
    }
}


// File actions appear twice (header buttons and the phone menu), so they are bound by data-action.
function bindFileActions() {
    const actions = {
        newGraph: () => requestNewGraph(activeWorkspace()),
        openGraph: () => OpenGraph.open(activeWorkspace()),
        saveGraph: () => SaveDialog.open(activeWorkspace()),
        addWorkspace: Workspaces.addSecond,
    };

    document.querySelectorAll("[data-action]").forEach(element => {
        element.addEventListener("click", actions[element.dataset.action]);
    });
}


// Tools

function selectTool(tool) {
    Workspaces.all().forEach(workspace => workspace.tools.setTool(tool));

    document.querySelectorAll("[data-tool]").forEach(button => {
        button.classList.toggle("active", button.dataset.tool === tool);
    });

    document.getElementById("toolHint").textContent = GraphTools.hint(tool);
}


function updateHistoryButtons() {
    const { history } = activeWorkspace();
    document.getElementById("undo").disabled = !history.canUndo();
    document.getElementById("redo").disabled = !history.canRedo();
}


function updateDeleteButton() {
    document.getElementById("deleteSelected").disabled = activeWorkspace().cy.elements(":selected").empty();
}


// Keyboard

function isTyping(event) {
    return event.target.closest("input, select, textarea") !== null;
}


function onKeyDown(event) {
    if (isTyping(event)) {
        return;
    }

    const { tools } = activeWorkspace();
    const key = event.key.toLowerCase();
    const withCtrl = event.ctrlKey || event.metaKey;

    if (key === "delete" || key === "backspace") {
        tools.deleteSelected();
    } else if (key === "escape") {
        tools.clearSelection();
    } else if (withCtrl && key === "z") {
        event.preventDefault();
        event.shiftKey ? tools.redo() : tools.undo();
    } else if (withCtrl && key === "y") {
        event.preventDefault();
        tools.redo();
    }
}


// Workspaces

// Only the active workspace drives the undo/redo and delete buttons.
const WORKSPACE_CALLBACKS = {
    onHistoryChange: workspace => {
        if (workspace === activeWorkspace()) {
            updateHistoryButtons();
        }
    },
    onSelectionChange: workspace => {
        if (workspace === activeWorkspace()) {
            updateDeleteButton();
        }
    },
    onActivate: workspace => Workspaces.setActive(workspace),
};


function createWorkspaces() {
    const tabs = document.querySelectorAll("[data-workspace-tab]");
    return Array.from(tabs, (tab, index) => Workspace.create(index + 1, tab, WORKSPACE_CALLBACKS));
}


function resizeCanvases() {
    Workspaces.all().forEach(workspace => workspace.canvas.resize());
}


// The counts over each canvas follow the setting; with two workspaces the workspace bar shows them instead.
function updateWorkspaceHeaders() {
    const visible = AppSettings.get("showCounts") && !Workspaces.isSplit();
    Workspaces.all().forEach(workspace => workspace.header.classList.toggle("d-none", !visible));
}


// With two workspaces, analysis is replaced by the isomorphism check;
// with one, the analysis panel follows the remaining workspace.
function onWorkspacesChange() {
    const split = Workspaces.isSplit();

    document.getElementById("toggleAnalysis").classList.toggle("d-none", split);
    document.getElementById("checkIsomorphism").classList.toggle("d-none", !split);
    document.getElementById("toolHintPill").classList.toggle("d-lg-flex", !split);
    document.querySelectorAll("[data-action='addWorkspace']").forEach(button => { button.disabled = split; });

    if (split) {
        AnalysisPanel.close();
    } else {
        AnalysisPanel.setGraph(activeWorkspace().cy);
    }

    updateWorkspaceHeaders();
    updateHistoryButtons();
    updateDeleteButton();
}


function checkIsomorphism() {
    const [first, second] = Workspaces.visible();
    IsomorphismDialog.open(first, second);
}


function bindControls() {
    document.querySelectorAll("[data-tool]").forEach(button => {
        button.addEventListener("click", () => selectTool(button.dataset.tool));
    });

    bindFileActions();
    bindButton("deleteSelected", () => activeWorkspace().tools.deleteSelected());
    bindButton("undo", () => activeWorkspace().tools.undo());
    bindButton("redo", () => activeWorkspace().tools.redo());
    bindButton("toggleAnalysis", AnalysisPanel.toggle);
    bindButton("checkIsomorphism", checkIsomorphism);

    document.addEventListener("keydown", onKeyDown);
}


// Settings

function forEachCanvas(action) {
    Workspaces.all().forEach(workspace => action(workspace.canvas));
}


function setDarkMode(enabled) {
    document.documentElement.setAttribute("data-bs-theme", enabled ? "dark" : "light");
    forEachCanvas(canvas => canvas.refreshStyle());
}


// Naming settings need no handler here: tools read them when naming, and the
// settings dialog renames existing nodes and edges when they change.
const SETTING_HANDLERS = {
    autoUpdate: value => AnalysisPanel.setAutoUpdate(value),
    showLabels: value => forEachCanvas(canvas => canvas.setLabelsVisible(value)),
    showCounts: updateWorkspaceHeaders,
    showGrid: value => forEachCanvas(canvas => canvas.setGridVisible(value)),
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


let pythonRequested = false;


function loadPython() {
    if (pythonRequested) {
        return;
    }

    pythonRequested = true;
    setPythonStatus("loading");

    PythonEngine.load()
        .then(() => setPythonStatus("ready"))
        .catch(() => setPythonStatus(location.protocol === "file:" ? "needsServer" : "failed"));
}


// Python and its packages are about 20 MB and keep the page busy while they start, so they load
// on the first click, tap or key press rather than with the page. People usually draw before
// they analyze, so it is normally ready in time; anything that needs it sooner waits for it.
function loadPythonOnFirstInteraction() {
    setPythonStatus("idle");

    ["pointerdown", "keydown"].forEach(type => {
        document.addEventListener(type, loadPython, { once: true, capture: true });
    });
}


// Leaving the Page

// The graphs only live in this tab, so closing, reloading or going back would lose them.
// Browsers show their own "Leave site?" wording; a custom message is not allowed.
function warnBeforeLeaving() {
    window.addEventListener("beforeunload", event => {
        if (Workspaces.all().some(workspace => workspace.cy.elements().nonempty())) {
            event.preventDefault();
            event.returnValue = "";
        }
    });
}


// Setup

function initApp() {
    AppSettings.init();

    const workspaces = createWorkspaces();
    Workspaces.init(workspaces);

    AnalysisPanel.init(workspaces[0].cy, resizeCanvases);
    ConfirmDialog.init();
    SettingsDialog.init(Workspaces.visible);
    SaveDialog.init();
    OpenGraph.init();
    IsomorphismDialog.init();

    bindControls();
    AppSettings.onChange(applySetting);
    AppSettings.applyAll(applySetting);
    Workspaces.onChange(onWorkspacesChange);

    selectTool("select");
    onWorkspacesChange();
    warnBeforeLeaving();
    loadPythonOnFirstInteraction();
}


initApp();
