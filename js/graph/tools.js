// Graph Tools
// Mouse and keyboard editing of the graph: select, add node, connect nodes, pan.

const GraphTools = (() => {

    const IS_TOUCH_SCREEN = matchMedia("(pointer: coarse)").matches;

    const MODES = {
        select: {
            hint: "Click, drag, or marquee to select · Shift adds",
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
        const label = GraphNaming.nextNodeName(cy, AppSettings.get("nodeNames"), AppSettings.get("nodePrefix")) || id;

        GraphHistory.record();
        cy.add({ group: "nodes", data: { id, label }, position });
    }


    // Simple graph: no loops and no parallel edges.
    function addEdge(source, target) {
        if (source.same(target) || source.edgesWith(target).nonempty()) {
            return;
        }

        const name = GraphNaming.nextEdgeName(cy, AppSettings.get("edgeNames"), AppSettings.get("edgePrefix"));

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


    // Renames every node (in id order) or edge (in creation order) with the current default pattern, as one undo step.
    // Returns how many were renamed.
    function renameAll(elements, dataKey, style, prefix, fallback) {
        if (elements.empty()) {
            return 0;
        }

        GraphHistory.record();
        cy.batch(() => {
            elements.forEach((element, index) => {
                element.data(dataKey, GraphNaming.nameAt(style, prefix, index + 1) || fallback(element));
            });
        });

        return elements.length;
    }


    function renameNodes() {
        const nodes = cy.nodes().sort((a, b) => Number(a.id()) - Number(b.id()));
        return renameAll(nodes, "label", AppSettings.get("nodeNames"), AppSettings.get("nodePrefix"), node => node.id());
    }


    function renameEdges() {
        return renameAll(cy.edges(), "name", AppSettings.get("edgeNames"), AppSettings.get("edgePrefix"), () => "");
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
        node.removeClass("hovered").addClass("edge-source");
    }


    function cancelEdge() {
        if (edgeSource) {
            edgeSource.removeClass("edge-source");
            edgeSource = null;
        }

        cy.nodes(".edge-target").removeClass("edge-target");
        EdgePreview.hide();
    }


    function connectTo(node) {
        if (!edgeSource) {
            startEdge(node);
            return;
        }

        addEdge(edgeSource, node);
        cancelEdge();
        node.addClass("hovered");
    }


    // Modes

    function setCursor(cursor) {
        cy.container().style.cursor = cursor;
    }


    // Only select mode selects; it drags a marquee, pan drags the view, other modes only drag nodes.
    // Touch screens cannot marquee with one finger, so there select mode pans instead.
    function setTool(tool) {
        cancelEdge();
        activeTool = tool;

        cy.autounselectify(tool !== "select");
        cy.boxSelectionEnabled(tool === "select");
        cy.userPanningEnabled(tool === "pan" || (tool === "select" && IS_TOUCH_SCREEN));
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


    function onHoverElement(event) {
        if (activeTool === "select") {
            setCursor(event.target.selected() ? "move" : "pointer");
        }
    }


    function onLeaveElement() {
        setCursor(MODES[activeTool].cursor);
    }


    // While connecting, a hovered node is shown as the edge's target; otherwise it gets the hover halo.
    function onHoverNode(event) {
        const node = event.target;

        if (activeTool === "pan" || (edgeSource && node.same(edgeSource))) {
            return;
        }

        node.addClass(edgeSource ? "edge-target" : "hovered");
    }


    function onLeaveNode(event) {
        event.target.removeClass("hovered edge-target");
    }


    // Cytoscape sends no mouseout when the pointer leaves the canvas, so clear hover looks here.
    function onLeaveCanvas() {
        cy.nodes(".hovered, .edge-target").removeClass("hovered edge-target");
    }


    function onPointerMove(event) {
        if (edgeSource) {
            const target = cy.nodes(".edge-target");
            EdgePreview.draw(edgeSource, event.renderedPosition, target.nonempty() ? target[0] : null);
        }
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
        cy.on("mouseover", "node, edge", onHoverElement);
        cy.on("mouseout", "node, edge", onLeaveElement);
        cy.on("mouseover", "node", onHoverNode);
        cy.on("mouseout", "node", onLeaveNode);
        cy.on("mousemove", onPointerMove);
        cy.on("grabon", "node", onGrabNode);
        cy.on("dragfreeon", "node", onDropNode);
        cy.on("tapstart", "edge", onEdgePress);
        cy.on("tapdrag", onPointerDrag);
        cy.on("tapend", onPointerRelease);

        cy.container().addEventListener("mouseleave", onLeaveCanvas);
        document.addEventListener("keydown", onKeyDown);

        setTool(activeTool);
    }


    return { init, setTool, hint, deleteSelected, clearGraph, renameNodes, renameEdges, undo, redo };

})();
