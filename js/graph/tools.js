// Graph Tools
// Mouse and keyboard editing of the graph: select, add vertex, add edge, delete.

const GraphTools = (() => {

    const HINTS = {
        select: "Drag vertices to move them. Shift + drag to select an area.",
        vertex: "Click the canvas to add a vertex.",
        edge: "Click two vertices to connect them.",
        delete: "Click a vertex or edge to delete it.",
    };

    let cy = null;
    let activeTool = "select";
    let edgeSource = null;
    let dragStartState = null;


    // Editing

    function nextVertexId() {
        const ids = cy.nodes().map(node => Number(node.id()));
        return String(ids.length === 0 ? 1 : Math.max(...ids) + 1);
    }


    function addVertex(position) {
        GraphHistory.record();
        cy.add({ group: "nodes", data: { id: nextVertexId() }, position });
    }


    // Simple graph: no loops and no parallel edges.
    function addEdge(source, target) {
        if (source.same(target) || source.edgesWith(target).nonempty()) {
            return;
        }

        GraphHistory.record();
        cy.add({ group: "edges", data: { source: source.id(), target: target.id() } });
    }


    function removeElements(elements) {
        if (elements.empty()) {
            return;
        }

        cancelEdge();
        GraphHistory.record();
        elements.remove();
    }


    function deleteSelected() {
        removeElements(cy.elements(":selected"));
    }


    function clearGraph() {
        removeElements(cy.elements());
    }


    function selectAll() {
        cy.elements().select();
    }


    function undo() {
        cancelEdge();
        GraphHistory.undo();
    }


    function redo() {
        cancelEdge();
        GraphHistory.redo();
    }


    // Edge Tool

    function startEdge(node) {
        edgeSource = node;
        node.addClass("edge-source");
    }


    function cancelEdge() {
        if (edgeSource) {
            edgeSource.removeClass("edge-source");
            edgeSource = null;
        }
    }


    function connectTo(node) {
        if (!edgeSource) {
            startEdge(node);
            return;
        }

        addEdge(edgeSource, node);
        cancelEdge();
    }


    function setTool(tool) {
        cancelEdge();
        activeTool = tool;
    }


    // Event Handlers

    function onTapBackground(event) {
        if (event.target !== cy) {
            return;
        }

        cancelEdge();

        if (activeTool === "vertex") {
            addVertex(event.position);
        }
    }


    function onTapNode(event) {
        if (activeTool === "edge") {
            connectTo(event.target);
        } else if (activeTool === "delete") {
            removeElements(event.target);
        }
    }


    function onTapEdge(event) {
        if (activeTool === "delete") {
            removeElements(event.target);
        }
    }


    function onDoubleTap(event) {
        if (event.target === cy && activeTool !== "vertex") {
            addVertex(event.position);
        }
    }


    // Dragging moves every selected vertex, so one snapshot covers the whole move.
    function onGrab() {
        dragStartState = GraphHistory.snapshot();
    }


    function onDragFree() {
        GraphHistory.record(dragStartState);
    }


    function isTyping(event) {
        return event.target.closest("input, select, textarea") !== null;
    }


    function onKeyDown(event) {
        if (isTyping(event)) {
            return;
        }

        const key = event.key.toLowerCase();
        const withCtrl = event.ctrlKey || event.metaKey;

        if (key === "delete" || key === "backspace") {
            deleteSelected();
        } else if (key === "escape") {
            cancelEdge();
            cy.elements().unselect();
        } else if (withCtrl && key === "z") {
            event.preventDefault();
            event.shiftKey ? redo() : undo();
        } else if (withCtrl && key === "y") {
            event.preventDefault();
            redo();
        }
    }


    // Setup

    function init(graph) {
        cy = graph;

        cy.on("tap", onTapBackground);
        cy.on("tap", "node", onTapNode);
        cy.on("tap", "edge", onTapEdge);
        cy.on("dbltap", onDoubleTap);
        cy.on("grabon", "node", onGrab);
        cy.on("dragfreeon", "node", onDragFree);

        document.addEventListener("keydown", onKeyDown);
    }


    return { HINTS, init, setTool, deleteSelected, clearGraph, selectAll, undo, redo };

})();
