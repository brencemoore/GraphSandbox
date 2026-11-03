// Graph Naming
// Default ids and names for new nodes and edges, and the text shown on edges.
// Name styles: "numbers" (1, 2), "letters" (a, b), "custom" (prefix + number, e.g. v1, E2) or "none".

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


    const STYLES = {
        numbers: index => String(index),
        letters: letterName,
        custom: (index, prefix) => `${prefix}${index}`,
    };


    // The name at a position in a style's sequence; empty for "none".
    function nameAt(style, prefix, index) {
        const format = STYLES[style];
        return format ? format(index, prefix) : "";
    }


    // First name in the sequence that is not used yet.
    function nextName(usedNames, style, prefix) {
        if (!STYLES[style]) {
            return "";
        }

        const used = new Set(usedNames);
        let index = 1;

        while (used.has(nameAt(style, prefix, index))) {
            index++;
        }

        return nameAt(style, prefix, index);
    }


    function examples(style, prefix, count = 3) {
        return Array.from({ length: count }, (_, index) => nameAt(style, prefix, index + 1));
    }


    function nextNodeId(cy) {
        const ids = cy.nodes().map(node => Number(node.id()));
        return String(ids.length === 0 ? 1 : Math.max(...ids) + 1);
    }


    function nextNodeName(cy, style, prefix) {
        return nextName(cy.nodes().map(node => node.data("label")), style, prefix);
    }


    function nextEdgeName(cy, style, prefix) {
        return nextName(cy.edges().map(edge => edge.data("name")), style, prefix);
    }


    function edgeLabel(edge) {
        const name = edge.data("name");
        const value = edge.data("value");

        if (name && value !== "") {
            return `${name} = ${value}`;
        }

        return name || value;
    }


    return { nextNodeId, nextNodeName, nextEdgeName, examples, edgeLabel };

})();
