// Graph Properties
// Keeps the counts, components and degree sequence in the page up to date.

const GraphProperties = (() => {

    let cy = null;
    let updateScheduled = false;


    function setText(id, text) {
        document.getElementById(id).textContent = text;
    }


    function degreeSequence() {
        return cy.nodes()
            .map(node => node.degree(false))
            .sort((a, b) => b - a);
    }


    function update() {
        updateScheduled = false;

        const vertices = cy.nodes().length;
        const edges = cy.edges().length;
        const degrees = degreeSequence();

        setText("vertexCount", vertices);
        setText("edgeCount", edges);
        setText("componentCount", cy.elements().components().length);
        setText("degreeSequence", degrees.length > 0 ? degrees.join(", ") : "—");

        setText("statusVertices", `Vertices: ${vertices}`);
        setText("statusEdges", `Edges: ${edges}`);

        document.getElementById("emptyCanvas").classList.toggle("d-none", vertices > 0);
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
