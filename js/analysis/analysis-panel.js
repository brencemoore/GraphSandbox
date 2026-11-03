// Analysis Panel
// Runs the active tab's analysis in Python and keeps it current as the graph changes.

const AnalysisPanel = (() => {

    const AUTO_UPDATE_DELAY = 250;

    let cy = null;
    let panel = null;
    let refreshButton = null;
    let autoUpdate = true;
    let updateTimer = null;
    let latestRun = 0;


    // Tabs either pick their analysis with a select or name it in data-analysis.
    function analysisName(pane) {
        const select = pane.querySelector("select");
        return select ? select.value : pane.dataset.analysis;
    }


    function isOpen() {
        return !panel.classList.contains("d-none");
    }


    // Running

    async function runActiveTab() {
        const pane = panel.querySelector(".tab-pane.active");
        const container = pane.querySelector("[data-result]");
        const run = ++latestRun;

        if (!PythonEngine.isReady()) {
            container.replaceChildren(ResultViews.loading("Loading Python…"));
        }

        try {
            const result = await PythonEngine.run(analysisName(pane), GraphData.serialize(cy));

            if (run === latestRun) {
                container.replaceChildren(...ResultViews.render(result));
            }
        } catch (error) {
            container.replaceChildren(ResultViews.message(`Python is unavailable: ${error.message}`, "danger"));
        }
    }


    // Waits briefly so a burst of edits (or typing a name) runs once.
    function scheduleUpdate() {
        if (!autoUpdate || !isOpen()) {
            return;
        }

        clearTimeout(updateTimer);
        updateTimer = setTimeout(runActiveTab, AUTO_UPDATE_DELAY);
    }


    function setAutoUpdate(enabled) {
        autoUpdate = enabled;
        refreshButton.classList.toggle("d-none", enabled);
        scheduleUpdate();
    }


    // Opening and Closing

    function open() {
        panel.classList.remove("d-none");
        GraphCanvas.resize();
        runActiveTab();
    }


    function close() {
        panel.classList.add("d-none");
        GraphCanvas.resize();
    }


    function toggle() {
        isOpen() ? close() : open();
    }


    // Setup

    function init(graph) {
        cy = graph;
        panel = document.getElementById("analysisPanel");
        refreshButton = document.getElementById("refreshAnalysis");

        panel.querySelectorAll("select").forEach(select => select.addEventListener("change", runActiveTab));
        panel.querySelectorAll("[data-bs-toggle='tab']").forEach(tab => tab.addEventListener("shown.bs.tab", runActiveTab));

        refreshButton.addEventListener("click", runActiveTab);
        document.getElementById("closeAnalysis").addEventListener("click", close);

        cy.on("add remove data", scheduleUpdate);
    }


    return { init, toggle, setAutoUpdate };

})();
