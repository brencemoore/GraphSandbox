// Analysis Panel
// Runs the selected analysis in Python and shows the result as a table.

const AnalysisPanel = (() => {

    let cy = null;
    let select = null;
    let runButton = null;
    let resultContainer = null;


    // Vertices are sent in numeric order so matrix rows match the labels.
    function graphData() {
        const nodes = cy.nodes()
            .map(node => node.id())
            .sort((a, b) => Number(a) - Number(b));

        const edges = cy.edges().map(edge => [edge.source().id(), edge.target().id()]);

        return { nodes, edges };
    }


    // Rendering

    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }


    function renderMessage(text, variant) {
        resultContainer.replaceChildren(createElement("div", `alert alert-${variant} small`, text));
    }


    function createHeader(columns) {
        const row = document.createElement("tr");
        columns.forEach(column => row.append(createElement("th", "", column)));

        const head = document.createElement("thead");
        head.append(row);
        return head;
    }


    // The first value in each row is its label.
    function createBody(rows) {
        const body = document.createElement("tbody");

        rows.forEach(([label, ...values]) => {
            const row = document.createElement("tr");
            row.append(createElement("th", "text-start", label));
            values.forEach(value => row.append(createElement("td", "", value)));
            body.append(row);
        });

        return body;
    }


    function renderTable(result) {
        const table = createElement("table", "table table-sm table-bordered table-hover font-monospace small text-end mb-0");
        table.append(createHeader(result.columns), createBody(result.rows));

        const wrapper = createElement("div", "table-responsive");
        wrapper.append(table);

        resultContainer.replaceChildren(createElement("h6", "", result.title), wrapper);
    }


    // Running

    async function run() {
        runButton.disabled = true;
        renderMessage("Running…", "secondary");

        try {
            const result = await PythonEngine.run(select.value, graphData());
            result.error ? renderMessage(result.error, "warning") : renderTable(result);
        } catch (error) {
            renderMessage(`Python is unavailable: ${error.message}`, "danger");
        } finally {
            runButton.disabled = false;
        }
    }


    function init(graph) {
        cy = graph;
        select = document.getElementById("analysisSelect");
        runButton = document.getElementById("runAnalysis");
        resultContainer = document.getElementById("analysisResult");

        runButton.addEventListener("click", run);
    }


    return { init };

})();
