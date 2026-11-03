// Graph Canvas
// Creates the Cytoscape instance and owns its styling and viewport controls.

const GraphCanvas = (() => {

    const ZOOM_STEP = 1.25;
    const FIT_PADDING = 40;
    const MAX_FIT_ZOOM = 1;

    let cy = null;
    let labelsVisible = true;


    // Styling

    function cssVariable(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }


    // Colors come from Bootstrap variables so the graph follows the light/dark theme.
    function buildStyle() {
        const colors = {
            background: cssVariable("--bs-body-bg"),
            foreground: cssVariable("--bs-emphasis-color"),
            text: cssVariable("--bs-body-color"),
            edge: cssVariable("--bs-secondary-color"),
            selected: cssVariable("--bs-primary"),
            edgeSource: cssVariable("--bs-success"),
        };

        return [
            {
                selector: "node",
                style: {
                    "width": 30,
                    "height": 30,
                    "background-color": colors.background,
                    "border-width": 2,
                    "border-color": colors.foreground,
                    "label": labelsVisible ? "data(id)" : "",
                    "color": colors.text,
                    "font-size": 12,
                    "text-valign": "center",
                    "text-halign": "center",
                },
            },
            {
                selector: "edge",
                style: {
                    "width": 2,
                    "line-color": colors.edge,
                    "curve-style": "straight",
                },
            },
            {
                selector: "node:selected",
                style: {
                    "border-width": 3,
                    "border-color": colors.selected,
                },
            },
            {
                selector: "edge:selected",
                style: {
                    "width": 3,
                    "line-color": colors.selected,
                },
            },
            {
                selector: "node.edge-source",
                style: {
                    "border-width": 3,
                    "border-color": colors.edgeSource,
                },
            },
        ];
    }


    function refreshStyle() {
        cy.style(buildStyle());
    }


    function setLabelsVisible(visible) {
        labelsVisible = visible;
        refreshStyle();
    }


    // Viewport

    function zoomBy(factor) {
        cy.zoom({
            level: cy.zoom() * factor,
            renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
        });
    }


    function zoomIn() {
        zoomBy(ZOOM_STEP);
    }


    function zoomOut() {
        zoomBy(1 / ZOOM_STEP);
    }


    function fit() {
        if (cy.nodes().empty()) {
            cy.reset();
            return;
        }

        cy.fit(cy.elements(), FIT_PADDING);

        if (cy.zoom() > MAX_FIT_ZOOM) {
            cy.zoom(MAX_FIT_ZOOM);
            cy.center();
        }
    }


    // Setup

    function create(container) {
        cy = cytoscape({
            container,
            style: buildStyle(),
            layout: { name: "preset" },
            boxSelectionEnabled: true,
            minZoom: 0.2,
            maxZoom: 4,
        });

        return cy;
    }


    return { create, refreshStyle, setLabelsVisible, zoomIn, zoomOut, fit };

})();
