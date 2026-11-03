// Graph Naming
// Default ids and names for new nodes and edges, and the text shown on edges.

const GraphNaming = (() => {

    // 1 → a, 26 → z, 27 → aa
    function letterName(index) {
        let name = "";

        while (index > 0) {
            index--;
            name = String.fromCharCode(97 + (index % 26)) + name;
            index = Math.floor(index / 26);
        }

        return name;
    }


    const EDGE_NAME_FORMATS = {
        letters: letterName,
        numbers: String,
    };


    function nextNodeId(cy) {
        const ids = cy.nodes().map(node => Number(node.id()));
        return String(ids.length === 0 ? 1 : Math.max(...ids) + 1);
    }


    // First name in the sequence that no edge uses yet; empty when edges are nameless.
    function nextEdgeName(cy, style) {
        const format = EDGE_NAME_FORMATS[style];

        if (!format) {
            return "";
        }

        const usedNames = new Set(cy.edges().map(edge => edge.data("name")));
        let index = 1;

        while (usedNames.has(format(index))) {
            index++;
        }

        return format(index);
    }


    function edgeLabel(edge) {
        const name = edge.data("name");
        const value = edge.data("value");

        if (name && value !== "") {
            return `${name} = ${value}`;
        }

        return name || value;
    }


    return { nextNodeId, nextEdgeName, edgeLabel };

})();
