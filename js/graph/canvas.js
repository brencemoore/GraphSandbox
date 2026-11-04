// Graph Canvas
// Creates a Cytoscape instance and owns its styling and viewport controls (one per workspace).

const GraphCanvas = (() => {

    const ZOOM_STEP = 1.35;
    const FIT_PADDING = 60;
    const MAX_FIT_ZOOM = 1;
    const GRID_SIZE = 24;
    const WHEEL_ZOOM_SPEED = 0.003;
    const LINE_HEIGHT = 33;


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


    function baseStyles(colors, labelsVisible) {
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


    function buildStyle(labelsVisible) {
        const colors = themeColors();
        return [...baseStyles(colors, labelsVisible), ...hoverStyles(colors), ...connectStyles(colors)];
    }


    // Instance

    function create(container) {
        let labelsVisible = true;

        const cy = cytoscape({
            container,
            style: buildStyle(labelsVisible),
            layout: { name: "preset" },
            minZoom: 0.2,
            maxZoom: 4,
        });


        // Styling

        function refreshStyle() {
            cy.style(buildStyle(labelsVisible));
        }


        function setLabelsVisible(visible) {
            labelsVisible = visible;
            refreshStyle();
        }


        // Grid

        function setGridVisible(visible) {
            container.classList.toggle("show-grid", visible);
        }


        // Moves the dot grid with the graph so it feels attached to the canvas.
        function syncGrid() {
            const size = GRID_SIZE * cy.zoom();
            const pan = cy.pan();

            container.style.backgroundSize = `${size}px ${size}px`;
            container.style.backgroundPosition = `${pan.x}px ${pan.y}px`;
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


        // Call after the canvas container changes size or becomes visible.
        function resize() {
            cy.resize();
        }


        // Cytoscape only wheel-zooms while drag-panning is on (Pan tool), so wheel zoom is handled
        // here for every tool, at one consistent speed. Touch pinch-zoom is still Cytoscape's.
        function onWheel(event) {
            event.preventDefault();
            event.stopPropagation();

            const pixels = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * LINE_HEIGHT : event.deltaY;
            const bounds = container.getBoundingClientRect();

            cy.zoom({
                level: cy.zoom() * Math.exp(-pixels * WHEEL_ZOOM_SPEED),
                renderedPosition: { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
            });
        }


        cy.on("viewport", syncGrid);
        syncGrid();

        // Listening on the parent in the capture phase runs before Cytoscape's own wheel handler.
        container.parentElement.addEventListener("wheel", onWheel, { capture: true, passive: false });

        return {
            cy,
            refreshStyle,
            setLabelsVisible,
            setGridVisible,
            zoomIn,
            zoomOut,
            zoomPercent,
            fit,
            resize,
        };
    }


    return { create };

})();
