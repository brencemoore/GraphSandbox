// Graph Tools
// Mouse and keyboard editing of the graph: select, add node, connect nodes, pan.

const GraphTools = (() => {

    const MODES = {
        select: {
            hint: "Select, drag, or marquee nodes and edges",
            cursor: "default",
        },
        node: {
            hint: "Click the canvas to add a node",
            cursor: "crosshair",
        },
        edge: {
            hint: "Click two nodes to connect them",
            cursor: "pointer",
        },
        pan: {
            hint: "Drag to move the canvas",
            cursor: "grab",
        },
    };

    let cy = null;
    let activeTool = "select";
    let edgeSource = null;
    let dragStartState = null;
    let edgeDrag = null;


    // Editing

    function addNode(position) {
        const id = GraphNaming.nextNodeId(cy);

        GraphHistory.record();
        cy.add({ group: "nodes", data: { id, label: id }, position });
    }


    // Simple graph: no loops and no parallel edges.
    function addEdge(source, target) {
        if (source.same(target) || source.edgesWith(target).nonempty()) {
            return;
        }

        const name = GraphNaming.nextEdgeName(cy, AppSettings.get("edgeNames"));

        GraphHistory.record();
        cy.add({
            group: "edges",
            data: { source: source.id(), target: target.id(), name, value: "" },
        });
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


    function undo() {
        cancelEdge();
        GraphHistory.undo();
    }


    function redo() {
        cancelEdge();
        GraphHistory.redo();
    }


    // Connect Tool

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


    // Modes

    function setCursor(cursor) {
        cy.container().style.cursor = cursor;
    }


    // Only select mode selects; it drags a marquee, pan drags the view, other modes only drag nodes.
    function setTool(tool) {
        cancelEdge();
        activeTool = tool;

        cy.autounselectify(tool !== "select");
        cy.boxSelectionEnabled(tool === "select");
        cy.userPanningEnabled(tool === "pan");
        cy.autoungrabify(tool === "pan");

        setCursor(MODES[tool].cursor);
    }


    function hint(tool) {
        return MODES[tool].hint;
    }


    // Event Handlers

    function onTapBackground(event) {
        if (event.target !== cy) {
            return;
        }

        cancelEdge();

        if (activeTool === "node") {
            addNode(event.position);
        }
    }


    function onTapNode(event) {
        if (activeTool === "edge") {
            connectTo(event.target);
        }
    }


    function onDoubleTap(event) {
        if (event.target === cy && activeTool !== "node" && activeTool !== "pan") {
            addNode(event.position);
        }
    }


    // A new marquee replaces the selection unless Shift is held.
    function onBoxStart(event) {
        if (!event.originalEvent.shiftKey) {
            cy.elements().unselect();
        }
    }


    function onHoverElement(event) {
        if (activeTool === "select") {
            setCursor(event.target.selected() ? "move" : "pointer");
        }
    }


    function onLeaveElement() {
        setCursor(MODES[activeTool].cursor);
    }


    // Dragging a node moves every selected node, so one snapshot covers the whole move.
    function onGrabNode() {
        dragStartState = GraphHistory.snapshot();
    }


    function onDropNode() {
        GraphHistory.record(dragStartState);
    }


    // Cytoscape cannot drag edges, so dragging a selected edge moves
    // the selected nodes and the endpoints of the selected edges.
    // Cytoscape treats a drag from an edge like the background, so the marquee is paused meanwhile.
    function onEdgePress(event) {
        if (activeTool !== "select" || !event.target.selected()) {
            return;
        }

        const selected = cy.elements(":selected");
        cy.boxSelectionEnabled(false);

        edgeDrag = {
            edge: event.target,
            nodes: selected.nodes().union(selected.edges().connectedNodes()),
            lastPosition: { ...event.position },
            startState: GraphHistory.snapshot(),
            moved: false,
        };
    }


    function onPointerDrag(event) {
        if (!edgeDrag) {
            return;
        }

        edgeDrag.nodes.shift({
            x: event.position.x - edgeDrag.lastPosition.x,
            y: event.position.y - edgeDrag.lastPosition.y,
        });

        edgeDrag.lastPosition = { ...event.position };
        edgeDrag.moved = true;

        // Releasing over the edge would otherwise count as a click that selects only it.
        edgeDrag.edge.unselectify();
    }


    function onPointerRelease() {
        if (!edgeDrag) {
            return;
        }

        if (edgeDrag.moved) {
            const edge = edgeDrag.edge;
            GraphHistory.record(edgeDrag.startState);
            setTimeout(() => edge.selectify());
        }

        edgeDrag = null;
        cy.boxSelectionEnabled(activeTool === "select");
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
        cy.on("dbltap", onDoubleTap);
        cy.on("boxstart", onBoxStart);
        cy.on("mouseover", "node, edge", onHoverElement);
        cy.on("mouseout", "node, edge", onLeaveElement);
        cy.on("grabon", "node", onGrabNode);
        cy.on("dragfreeon", "node", onDropNode);
        cy.on("tapstart", "edge", onEdgePress);
        cy.on("tapdrag", onPointerDrag);
        cy.on("tapend", onPointerRelease);

        document.addEventListener("keydown", onKeyDown);

        setTool(activeTool);
    }


    return { init, setTool, hint, deleteSelected, clearGraph, undo, redo };

})();
