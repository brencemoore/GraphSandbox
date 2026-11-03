// Graph Data
// Plain-object form of the graph that is sent to Python for analysis and export.

const GraphData = (() => {

    // Blank edge values are sent as null so Python can treat them as weight 1.
    function edgeValue(edge) {
        const value = edge.data("value");
        return value === "" ? null : Number(value);
    }


    // Nodes are listed in numeric id order so matrix rows follow creation order.
    function serialize(cy) {
        const nodes = cy.nodes()
            .sort((a, b) => Number(a.id()) - Number(b.id()))
            .map(node => ({
                id: node.id(),
                label: node.data("label"),
                x: Math.round(node.position("x")),
                y: Math.round(node.position("y")),
            }));

        const edges = cy.edges().map(edge => ({
            source: edge.source().id(),
            target: edge.target().id(),
            name: edge.data("name"),
            value: edgeValue(edge),
        }));

        return { nodes, edges };
    }


    return { serialize };

})();
