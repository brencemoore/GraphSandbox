// Edge Preview
// Draws a dashed line from the pending edge's source node to the cursor, or to the hovered target node.

const EdgePreview = (() => {

    // Point on a node's border in the direction of another point, in rendered (screen) coordinates.
    function borderPoint(node, toward) {
        const center = node.renderedPosition();
        const radius = node.renderedOuterWidth() / 2;
        const dx = toward.x - center.x;
        const dy = toward.y - center.y;
        const length = Math.hypot(dx, dy) || 1;

        return {
            x: center.x + (dx / length) * radius,
            y: center.y + (dy / length) * radius,
        };
    }


    // overlay is the workspace's <svg> with one <line>.
    function create(overlay) {
        const line = overlay.querySelector("line");


        function draw(source, cursor, target) {
            const end = target ? borderPoint(target, source.renderedPosition()) : cursor;
            const start = borderPoint(source, end);

            line.setAttribute("x1", start.x);
            line.setAttribute("y1", start.y);
            line.setAttribute("x2", end.x);
            line.setAttribute("y2", end.y);

            overlay.classList.remove("d-none");
        }


        function hide() {
            overlay.classList.add("d-none");
        }


        return { draw, hide };
    }


    return { create };

})();
