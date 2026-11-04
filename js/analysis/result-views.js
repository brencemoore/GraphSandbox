// Result Views
// Builds Bootstrap markup for each kind of result returned by py/graph_math.py.

const ResultViews = (() => {

    function createElement(tag, className = "", text = "") {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }


    // Results can carry a note, e.g. how edge values were used.
    function heading(result) {
        const wrapper = createElement("div", "mb-3");
        wrapper.append(createElement("h6", "fw-semibold mb-1", result.title));

        if (result.note) {
            wrapper.append(createElement("div", "small text-body-secondary", result.note));
        }

        return wrapper;
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
        return [statCards(result.highlights), heading(result), propertyList(result.rows)];
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

        return [heading(result), list];
    }


    // Routes: one card per route with its verdict, an example route and the reasoning.

    const VERDICT_BADGES = {
        "Yes": "bg-accent",
        "No": "text-bg-secondary",
        "Unknown": "text-bg-warning",
        "—": "text-bg-secondary",
    };


    function routeCard(route) {
        const card = createElement("div", "border rounded-3 p-3");

        const header = createElement("div", "d-flex justify-content-between align-items-center gap-3");
        header.append(
            createElement("span", "fw-semibold", route.name),
            createElement("span", `badge rounded-pill ${VERDICT_BADGES[route.verdict]}`, route.verdict),
        );

        card.append(header, createElement("div", "small text-body-secondary mb-2", route.definition));

        if (route.route) {
            card.append(createElement("div", "font-monospace small bg-body-tertiary rounded-2 px-2 py-1 mb-2 text-break", route.route.join(" → ")));
        }

        card.append(createElement("div", "small", route.reason));
        return card;
    }


    function routes(result) {
        const list = createElement("div", "d-flex flex-column gap-3");
        result.rows.forEach(route => list.append(routeCard(route)));
        return [heading(result), list];
    }


    // Tables: matrices, eigenvalues and eigenvectors. The first value in each row is its label.

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


    function tableElement(result) {
        const element = createElement("table", "table table-sm table-bordered table-hover font-monospace small text-end mb-0");
        element.append(tableHeader(result.columns), tableBody(result.rows));

        const wrapper = createElement("div", "table-responsive");
        wrapper.append(element);
        return wrapper;
    }


    function table(result) {
        return [heading(result), tableElement(result)];
    }


    // Several titled tables under one heading, e.g. eigenvalues and eigenvectors.
    function tables(result) {
        const sections = result.tables.flatMap(section => [
            createElement("div", "small fw-semibold text-body-secondary mt-4 mb-2", section.title),
            tableElement(section),
        ]);

        return [heading(result), ...sections];
    }


    const RENDERERS = { properties, routes, scores, table, tables };


    // Returns the elements to place in a result container.
    function render(result) {
        if (result.error) {
            return [message(result.error, "warning")];
        }

        return RENDERERS[result.kind](result);
    }


    return { render, message, loading };

})();
