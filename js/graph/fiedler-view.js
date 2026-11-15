// Fiedler View
// Colors one workspace's nodes by the Fiedler vector (the Laplacian eigenvector for λ₂) and lists
// the vector in a panel at the canvas's top right. Positive entries are red, negative blue, and
// the color deepens with the entry's size, from white at 0. Both are turned on in Settings.

const FiedlerView = (() => {

    const UPDATE_DELAY = 250;
    const WHITE = [255, 255, 255];
    const POSITIVE = [178, 24, 43];
    const NEGATIVE = [33, 102, 172];
    const LIGHT_TEXT_FROM = 0.5;
    const LIGHT_TEXT = "#fff";
    const DARK_TEXT = "#212529";


    // Colors

    function mix(from, to, amount) {
        const channels = from.map((start, index) => Math.round(start + (to[index] - start) * amount));
        return `rgb(${channels.join(", ")})`;
    }


    // strength is the entry's size relative to the largest entry, from 0 to 1.
    function colorFor(value, largest) {
        const strength = largest > 0 ? Math.abs(value) / largest : 0;

        return {
            fill: mix(WHITE, value < 0 ? NEGATIVE : POSITIVE, strength),
            text: strength > LIGHT_TEXT_FROM ? LIGHT_TEXT : DARK_TEXT,
        };
    }


    // values are [node id, label, value] rows from py/graph_math.py.
    function colorsFrom(values) {
        const largest = Math.max(...values.map(([, , value]) => Math.abs(value)));
        return new Map(values.map(([id, , value]) => [id, colorFor(value, largest)]));
    }


    // Panel Rows

    function createElement(tag, className, text = "") {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }


    // Hovering a row highlights its node, so the list and the canvas can be matched up.
    function valueRow(cy, [id, label, value], color) {
        const row = createElement("li", "d-flex align-items-center gap-2 py-1");

        const swatch = createElement("span", "d-inline-block p-2 rounded-circle border");
        swatch.style.backgroundColor = color.fill;

        row.append(
            swatch,
            createElement("span", "fw-semibold me-auto", label || "(no name)"),
            createElement("span", "font-monospace ps-2", value),
        );

        row.addEventListener("mouseenter", () => cy.getElementById(id).addClass("hovered"));
        row.addEventListener("mouseleave", () => cy.getElementById(id).removeClass("hovered"));

        return row;
    }


    // Instance

    // panel is the workspace's [data-role="fiedler"] overlay.
    function create(cy, canvas, panel) {
        const summary = panel.querySelector("[data-role='fiedler-summary']");
        const note = panel.querySelector("[data-role='fiedler-note']");
        const list = panel.querySelector("[data-role='fiedler-values']");

        let coloring = false;
        let panelVisible = false;
        let result = null;
        let updateTimer = null;
        let latestRun = 0;


        function isActive() {
            return coloring || panelVisible;
        }


        // Panel

        function showMessage(text) {
            summary.textContent = text;
            note.textContent = "";
            list.replaceChildren();
        }


        // Rows run from the largest positive entry to the largest negative one.
        function showValues(colors) {
            summary.textContent = `λ₂ = ${result.eigenvalue}`;
            note.textContent = result.note;

            const rows = [...result.values].sort((a, b) => b[2] - a[2]);
            list.replaceChildren(...rows.map(row => valueRow(cy, row, colors.get(row[0]))));
        }


        function renderPanel(colors) {
            if (!result) {
                showMessage(PythonEngine.isReady() ? "Calculating…" : "Loading Python…");
            } else if (result.error) {
                showMessage(result.error);
            } else {
                showValues(colors);
            }
        }


        // Applies the latest result to the canvas and the panel.
        function show() {
            const colors = result?.values ? colorsFrom(result.values) : null;

            canvas.setNodeColors(coloring ? colors : null);
            panel.classList.toggle("d-none", !panelVisible);

            if (panelVisible) {
                renderPanel(colors);
            }
        }


        // Calculating

        async function update() {
            if (!isActive()) {
                return;
            }

            if (cy.nodes().length < 2) {
                result = { error: "Add at least 2 nodes to see the Fiedler vector." };
                show();
                return;
            }

            const run = ++latestRun;
            let latest;

            try {
                latest = await PythonEngine.run("fiedler_vector", GraphData.serialize(cy));
            } catch (error) {
                latest = { error: `Python is unavailable: ${error.message}` };
            }

            if (run === latestRun) {
                result = latest;
                show();
            }
        }


        // Waits briefly so a burst of edits (or typing a name) calculates once.
        function scheduleUpdate() {
            if (!isActive()) {
                return;
            }

            clearTimeout(updateTimer);
            updateTimer = setTimeout(update, UPDATE_DELAY);
        }


        // Settings

        function setColoring(enabled) {
            coloring = enabled;
            show();
            scheduleUpdate();
        }


        function setPanelVisible(visible) {
            panelVisible = visible;
            show();
            scheduleUpdate();
        }


        cy.on("add remove data", scheduleUpdate);

        return { setColoring, setPanelVisible };
    }


    return { create };

})();
