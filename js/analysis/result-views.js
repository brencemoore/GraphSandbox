// Result Views
// Builds Bootstrap markup for each kind of result returned by py/graph_math.py.

const ResultViews = (() => {

    function createElement(tag, className = "", text = "") {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }


    function heading(text) {
        return createElement("h6", "fw-semibold mb-3", text);
    }


    // Messages

    function message(text, variant) {
        return createElement("div", `alert alert-${variant} small mb-0`, text);
    }


    function loading(text) {
        const wrapper = createElement("div", "d-flex align-items-center gap-2 text-body-secondary small");
        wrapper.append(createElement("div", "spinner-border spinner-border-sm"), createElement("span", "", text));
        return wrapper;
    }


    // Properties: highlighted stats in a row of cards, then a list.

    function statCards(highlights) {
        const row = createElement("div", "row row-cols-4 g-0 border rounded-3 text-center mb-4");

        highlights.forEach(([name, value], index) => {
            const cell = createElement("div", index > 0 ? "col py-3 border-start" : "col py-3");
            cell.append(
                createElement("div", "small text-body-secondary", name),
                createElement("div", "fs-4 fw-semibold", value),
            );
            row.append(cell);
        });

        return row;
    }


    function propertyList(rows) {
        const list = createElement("ul", "list-group list-group-flush");

        rows.forEach(([name, value]) => {
            const item = createElement("li", "list-group-item d-flex justify-content-between gap-3 px-0");
            item.append(
                createElement("span", "text-body-secondary", name),
                createElement("span", "fw-semibold text-end", value),
            );
            list.append(item);
        });

        return list;
    }


    function properties(result) {
        return [statCards(result.highlights), heading(result.title), propertyList(result.rows)];
    }


    // Scores: one bar per node, scaled to the highest score.

    function scoreRow(label, score, maxScore) {
        const row = createElement("div", "d-flex align-items-center gap-3");

        const bar = createElement("div", "progress score-bar flex-grow-1");
        const fill = createElement("div", "progress-bar bg-accent");
        fill.style.width = `${maxScore > 0 ? (score / maxScore) * 100 : 0}%`;
        bar.append(fill);

        row.append(
            createElement("span", "vertex-badge d-inline-flex align-items-center justify-content-center px-2 border rounded-pill bg-body-tertiary small fw-semibold", label),
            bar,
            createElement("span", "score-value text-end fw-semibold small", score),
        );

        return row;
    }


    function scores(result) {
        const maxScore = Math.max(...result.rows.map(([, score]) => score));
        const list = createElement("div", "d-flex flex-column gap-3");

        result.rows.forEach(([label, score]) => list.append(scoreRow(label, score, maxScore)));

        return [heading(result.title), list];
    }


    // Tables: matrices and spectra. The first value in each row is its label.

    function tableHeader(columns) {
        const row = document.createElement("tr");
        columns.forEach(column => row.append(createElement("th", "", column)));

        const head = document.createElement("thead");
        head.append(row);
        return head;
    }


    function tableBody(rows) {
        const body = document.createElement("tbody");

        rows.forEach(([label, ...values]) => {
            const row = document.createElement("tr");
            row.append(createElement("th", "text-start", label));
            values.forEach(value => row.append(createElement("td", "", value)));
            body.append(row);
        });

        return body;
    }


    function table(result) {
        const element = createElement("table", "table table-sm table-bordered table-hover font-monospace small text-end mb-0");
        element.append(tableHeader(result.columns), tableBody(result.rows));

        const wrapper = createElement("div", "table-responsive");
        wrapper.append(element);

        return [heading(result.title), wrapper];
    }


    const RENDERERS = { properties, scores, table };


    // Returns the elements to place in a result container.
    function render(result) {
        if (result.error) {
            return [message(result.error, "warning")];
        }

        return RENDERERS[result.kind](result);
    }


    return { render, message, loading };

})();
