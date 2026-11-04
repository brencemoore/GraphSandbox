// Isomorphism Dialog
// Checks whether the two workspaces' graphs are isomorphic and shows the node mapping,
// or the reason they are not. The check itself is py/graph_compare.py.

const IsomorphismDialog = (() => {

    const UNCHECKED_CYCLES_NOTE = "Not checked: the number of 4-cycles, 5-cycles, or longer cycles. "
        + "Counts like these can reveal a structural difference even when the invariants above, "
        + "including the adjacency eigenvalues, all match.";

    let modal = null;
    let resultContainer = null;


    function createElement(tag, className = "", text = "") {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }


    // Names
    // When both graphs use a name, every name gets a subscript with its workspace number (A₁ ↦ A₂).

    function sharesNames(mapping) {
        const firstNames = new Set(mapping.map(([first]) => first));
        return mapping.some(([, second]) => firstNames.has(second));
    }


    function nodeName(label, workspaceNumber, withSubscript) {
        const name = createElement("span", "fw-semibold", label);

        if (withSubscript) {
            name.append(createElement("sub", "fw-normal", workspaceNumber));
        }

        return name;
    }


    // Sections

    function verdict(outcome) {
        const box = createElement("div", `alert ${outcome.isomorphic ? "alert-success" : "alert-warning"} mb-4`);
        box.append(
            createElement("div", "fw-semibold mb-1", outcome.isomorphic ? "The graphs are isomorphic" : "The graphs are not isomorphic"),
            createElement("div", "small", outcome.reason),
        );
        return box;
    }


    function heading(text) {
        return createElement("h6", "fw-semibold mb-2", text);
    }


    function mappingTable(mapping) {
        const withSubscripts = sharesNames(mapping);
        const table = createElement("table", "table table-sm align-middle mb-4");

        const head = createElement("thead");
        const headRow = createElement("tr");
        headRow.append(createElement("th", "", "Graph 1"), createElement("th", "text-center", ""), createElement("th", "", "Graph 2"));
        head.append(headRow);

        const body = createElement("tbody");

        mapping.forEach(([first, second]) => {
            const row = createElement("tr");
            const firstCell = createElement("td");
            const arrowCell = createElement("td", "text-center text-body-secondary", "↦");
            const secondCell = createElement("td");

            firstCell.append(nodeName(first, 1, withSubscripts));
            secondCell.append(nodeName(second, 2, withSubscripts));
            row.append(firstCell, arrowCell, secondCell);
            body.append(row);
        });

        table.append(head, body);
        return table;
    }


    function checksTable(checks) {
        const table = createElement("table", "table table-sm small align-middle mb-0");

        const head = createElement("thead");
        const headRow = createElement("tr");
        ["", "Graph 1", "Graph 2", ""].forEach(text => headRow.append(createElement("th", "", text)));
        head.append(headRow);

        const body = createElement("tbody");

        checks.forEach(([name, first, second, same]) => {
            const row = createElement("tr", same ? "" : "table-warning");
            const mark = createElement("i", same ? "bi bi-check-lg text-success" : "bi bi-x-lg text-danger");
            const markCell = createElement("td", "text-end");

            markCell.append(mark);
            row.append(createElement("th", "fw-normal text-body-secondary", name), createElement("td", "", first), createElement("td", "", second), markCell);
            body.append(row);
        });

        table.append(head, body);

        const wrapper = createElement("div", "table-responsive");
        wrapper.append(table);
        return wrapper;
    }


    function render(outcome) {
        const sections = [verdict(outcome)];

        if (outcome.isomorphic && outcome.mapping.length > 0) {
            sections.push(heading("Node mapping"), mappingTable(outcome.mapping));
        }

        sections.push(heading("Invariants"), checksTable(outcome.checks));

        if (!outcome.isomorphic) {
            sections.push(createElement("p", "form-text mb-0 mt-3", UNCHECKED_CYCLES_NOTE));
        }

        sections.push(
            createElement("p", "form-text mb-0 mt-2", "Only the structure is compared: node names, edge names and edge values are ignored."),
        );

        resultContainer.replaceChildren(...sections);
    }


    // Opening

    async function open(firstWorkspace, secondWorkspace) {
        resultContainer.replaceChildren(ResultViews.loading(PythonEngine.isReady() ? "Comparing the graphs…" : "Loading Python…"));
        modal.show();

        try {
            render(await PythonEngine.compareGraphs(
                GraphData.serialize(firstWorkspace.cy),
                GraphData.serialize(secondWorkspace.cy),
            ));
        } catch (error) {
            resultContainer.replaceChildren(ResultViews.message(`Python is unavailable: ${error.message}`, "danger"));
        }
    }


    function init() {
        modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("isomorphismModal"));
        resultContainer = document.getElementById("isomorphismResult");
    }


    return { init, open };

})();
