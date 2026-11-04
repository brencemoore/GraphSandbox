// Highlight Box
// Dragging empty canvas in the Select tool highlights an area (Cytoscape's box selection). This
// selects everything the box touches: every node whose shape overlaps it and every edge whose line
// crosses it, not only elements lying wholly inside it. On touch screens, where Cytoscape needs
// three fingers to box-select, a one-finger drag draws the box instead.

const HighlightBox = (() => {

    // Geometry

    function boxBetween(a, b) {
        return {
            x1: Math.min(a.x, b.x),
            x2: Math.max(a.x, b.x),
            y1: Math.min(a.y, b.y),
            y2: Math.max(a.y, b.y),
        };
    }


    function boxesOverlap(a, b) {
        return a.x1 <= b.x2 && b.x1 <= a.x2 && a.y1 <= b.y2 && b.y1 <= a.y2;
    }


    // Liang–Barsky clipping: true when the segment from a to b touches the box.
    function segmentTouchesBox(a, b, box) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const edges = [
            [-dx, a.x - box.x1],
            [dx, box.x2 - a.x],
            [-dy, a.y - box.y1],
            [dy, box.y2 - a.y],
        ];

        let enter = 0;
        let exit = 1;

        for (const [direction, distance] of edges) {
            if (direction === 0) {
                if (distance < 0) {
                    return false;
                }
                continue;
            }

            const t = distance / direction;

            if (direction < 0) {
                enter = Math.max(enter, t);
            } else {
                exit = Math.min(exit, t);
            }

            if (enter > exit) {
                return false;
            }
        }

        return true;
    }


    // Touch Box
    // Cytoscape box-selects by touch only with three fingers, so a one-finger drag on empty canvas
    // in the Select tool draws this box instead. overlay is the workspace's <svg> with one <rect>.

    const MIN_TOUCH_BOX = 6;


    function createTouchBox(cy, overlay, selectTouched) {
        const rect = overlay.querySelector("rect");
        let drag = null;


        function draw(box) {
            rect.setAttribute("x", box.x1);
            rect.setAttribute("y", box.y1);
            rect.setAttribute("width", box.x2 - box.x1);
            rect.setAttribute("height", box.y2 - box.y1);
            overlay.classList.remove("d-none");
        }


        function cancel() {
            drag = null;
            overlay.classList.add("d-none");
        }


        // Box selection is only enabled in the Select tool, and not while a selected edge is dragged.
        function onTouchStart(event) {
            const singleTouch = event.originalEvent.touches.length === 1;

            if (event.target !== cy || !cy.boxSelectionEnabled() || !singleTouch) {
                cancel();
                return;
            }

            drag = {
                start: { ...event.position },
                end: { ...event.position },
                renderedStart: { ...event.renderedPosition },
                drawn: false,
            };
        }


        // Cytoscape only blocks the browser's own touch gestures over nodes or while panning. Without
        // this, iOS Safari takes over a drag on empty canvas, cancels the touch, and the box never ends.
        function onTouchMove(event) {
            if (!drag) {
                return;
            }

            if (event.originalEvent.touches.length > 1) {
                cancel();
                return;
            }

            event.originalEvent.preventDefault();

            const rendered = boxBetween(drag.renderedStart, event.renderedPosition);
            drag.end = { ...event.position };
            drag.drawn = drag.drawn || Math.max(rendered.x2 - rendered.x1, rendered.y2 - rendered.y1) >= MIN_TOUCH_BOX;

            if (drag.drawn) {
                draw(rendered);
            }
        }


        // Like the mouse box without Shift, the new box replaces the selection.
        function onTouchEnd() {
            if (drag?.drawn) {
                cy.elements().unselect();
                selectTouched(boxBetween(drag.start, drag.end));
            }

            cancel();
        }


        cy.on("touchstart", onTouchStart);
        cy.on("touchmove", onTouchMove);
        cy.on("touchend", onTouchEnd);

        // Cytoscape does not pass on touchcancel (e.g. an incoming call), so a cancelled box is cleared here.
        cy.container().addEventListener("touchcancel", cancel);
    }


    // Instance

    function create(cy, touchOverlay) {
        let origin = null;


        function selectTouched(box) {
            cy.nodes()
                .filter(node => boxesOverlap(node.boundingBox({ includeLabels: false }), box))
                .select();

            cy.edges()
                .filter(edge => segmentTouchesBox(edge.source().position(), edge.target().position(), box))
                .select();
        }


        function onPress(event) {
            origin = event.target === cy ? { ...event.position } : null;
        }


        // Cytoscape applies its own box selection right after "boxend", so ours runs just after it.
        function onBoxEnd(event) {
            if (!origin) {
                return;
            }

            const box = boxBetween(origin, event.position);
            setTimeout(() => selectTouched(box));
        }


        cy.on("tapstart", onPress);
        cy.on("boxend", onBoxEnd);
        createTouchBox(cy, touchOverlay, selectTouched);
    }


    return { create };

})();
