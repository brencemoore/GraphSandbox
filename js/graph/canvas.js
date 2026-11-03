// Graph Canvas
// Creates the Cytoscape instance and owns its styling and viewport controls.

const GraphCanvas = (() => {

    const ZOOM_STEP = 1.25;
    const FIT_PADDING = 60;
    const MAX_FIT_ZOOM = 1;
    const GRID_SIZE = 24;

    let cy = null;
    let labelsVisible = true;


    // Styling

    function cssVariable(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }


    // Colors come from CSS variables so the graph follows the light/dark theme.
    function themeColors() {
        return {
            background: cssVariable("--bs-body-bg"),
            foreground: cssVariable("--bs-emphasis-color"),
            text: cssVariable("--bs-body-color"),
            edge: cssVariable("--bs-secondary-color"),
            accent: cssVariable("--gs-accent"),
            accentHover: cssVariable("--gs-accent-hover"),
            accentSubtle: cssVariable("--gs-accent-subtle"),
        };
    }


    function baseStyles(colors) {
        return [
            {
                selector: "node",
                style: {
                    "width": 36,
                    "height": 36,
                    "background-color": colors.background,
                    "border-width": 2,
                    "border-color": colors.foreground,
                    "label": labelsVisible ? "data(label)" : "",
                    "color": colors.text,
                    "font-size": 13,
                    "font-weight": 600,
                    "text-valign": "center",
                    "text-halign": "center",
                    "overlay-opacity": 0,
                },
            },
            {
                selector: "edge",
                style: {
                    "width": 2,
                    "line-color": colors.edge,
                    "curve-style": "straight",
                    "label": labelsVisible ? GraphNaming.edgeLabel : "",
                    "color": colors.text,
                    "font-size": 12,
                    "text-background-color": colors.background,
                    "text-background-opacity": 1,
                    "text-background-padding": 2,
                },
            },
            {
                selector: "node:selected",
                style: {
                    "border-width": 3,
                    "border-color": colors.accent,
                    "background-color": colors.accentSubtle,
                },
            },
            {
                selector: "edge:selected",
                style: {
                    "width": 3,
                    "line-color": colors.accent,
                },
            },
        ];
    }


    // Hovered and dragged nodes get a thick accent border and a dashed halo.
    function hoverStyles(colors) {
        return [
            {
                selector: "node.hovered, node:grabbed",
                style: {
                    "border-width": 4,
                    "border-color": colors.accent,
                    "background-color": colors.accentSubtle,
                    "outline-width": 1,
                    "outline-style": "dashed",
                    "outline-color": colors.accent,
                    "outline-opacity": 0.8,
                    "outline-offset": 8,
                },
            },
        ];
    }


    // While connecting: the source is filled with the accent, the hovered target is outlined in it.
    function connectStyles(colors) {
        return [
            {
                selector: "node.edge-source",
                style: {
                    "background-color": colors.accent,
                    "border-width": 2,
                    "border-color": colors.accentHover,
                    "color": "#fff",
                },
            },
            {
                selector: "node.edge-target",
                style: {
                    "border-width": 2.5,
                    "border-color": colors.accent,
                    "background-color": colors.accentSubtle,
                },
            },
        ];
    }


    function buildStyle() {
        const colors = themeColors();
        return [...baseStyles(colors), ...hoverStyles(colors), ...connectStyles(colors)];
    }


    function refreshStyle() {
        cy.style(buildStyle());
    }


    function setLabelsVisible(visible) {
        labelsVisible = visible;
        refreshStyle();
    }


    // Grid

    function setGridVisible(visible) {
        cy.container().classList.toggle("show-grid", visible);
    }


    // Moves the dot grid with the graph so it feels attached to the canvas.
    function syncGrid() {
        const size = GRID_SIZE * cy.zoom();
        const pan = cy.pan();
        const style = cy.container().style;

        style.backgroundSize = `${size}px ${size}px`;
        style.backgroundPosition = `${pan.x}px ${pan.y}px`;
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


    function zoomPercent() {
        return Math.round(cy.zoom() * 100);
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


    // Call after the canvas container changes size.
    function resize() {
        cy.resize();
    }


    // Setup

    function create(container) {
        cy = cytoscape({
            container,
            style: buildStyle(),
            layout: { name: "preset" },
            minZoom: 0.2,
            maxZoom: 4,
        });

        cy.on("viewport", syncGrid);
        syncGrid();

        return cy;
    }


    return {
        create,
        refreshStyle,
        setLabelsVisible,
        setGridVisible,
        zoomIn,
        zoomOut,
        zoomPercent,
        fit,
        resize,
    };

})();
