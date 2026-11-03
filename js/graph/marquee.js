// Marquee
// Makes box selection also select every edge the box crosses,
// not only edges whose whole line lies inside it.

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

    function selectCrossedEdges(box) {
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
        setTimeout(() => selectCrossedEdges(box));
    }


    function init(graph) {
        cy = graph;
        cy.on("tapstart", onPress);
        cy.on("boxend", onBoxEnd);
    }


    return { init };

})();
