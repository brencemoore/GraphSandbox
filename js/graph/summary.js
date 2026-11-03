// Graph Summary
// Keeps the node and edge counts and the empty-canvas message up to date.

const GraphSummary = (() => {

    let cy = null;
    let updateScheduled = false;


    function plural(count, word) {
        return `${count} ${word}${count === 1 ? "" : "s"}`;
    }


    function update() {
        updateScheduled = false;

        const nodes = cy.nodes().length;
        const edges = cy.edges().length;

        document.getElementById("graphCounts").textContent = `${plural(nodes, "node")} · ${plural(edges, "edge")}`;
        document.getElementById("emptyCanvas").classList.toggle("d-none", nodes > 0);
    }


    // Batched changes fire one event per element, so update once per frame.
    function scheduleUpdate() {
        if (!updateScheduled) {
            updateScheduled = true;
            requestAnimationFrame(update);
        }
    }


    function init(graph) {
        cy = graph;
        cy.on("add remove", scheduleUpdate);
        update();
    }


    return { init };

})();
