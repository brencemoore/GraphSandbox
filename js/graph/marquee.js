// Marquee
// Makes box selection select everything the box touches: every node whose shape overlaps it
// and every edge whose line crosses it, not only elements lying wholly inside it.

const Marquee = (() => {

    let cy = null;
    let origin = null;


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


    // Selection

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


    function init(graph) {
        cy = graph;
        cy.on("tapstart", onPress);
        cy.on("boxend", onBoxEnd);
    }


    return { init };

})();
