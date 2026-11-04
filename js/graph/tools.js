// Graph Tools
// Mouse editing of one workspace's graph: select, add node, connect nodes, pan.
// Keyboard shortcuts are routed to the active workspace by main.js.

const GraphTools = (() => {

    const MODES = {
        select: {
            hint: "Click, drag, or marquee to select · Shift adds",
            cursor: "default",
        },
        node: {
            hint: "Click the canvas to add a node · drag to pan",
            cursor: "crosshair",
        },
        edge: {
            hint: "Click or drag from one node to another to connect them",
            cursor: "pointer",
        },
        pan: {
            hint: "Drag to move the canvas",
            cursor: "grab",
        },
    };


    function hint(tool) {
        return MODES[tool].hint;
    }


    function create(cy, history, preview) {
        let activeTool = "select";
        let edgeSource = null;
        let dragStartState = null;
        let edgeDrag = null;
        let connectPress = null;


        // Editing

        function addNode(position) {
            const id = GraphNaming.nextNodeId(cy);
            const label = GraphNaming.nextNodeName(cy, AppSettings.get("nodeNames"), AppSettings.get("nodePrefix")) || id;

            history.record();
            cy.add({ group: "nodes", data: { id, label }, position });
        }


        // Simple graph: no loops and no parallel edges.
        function addEdge(source, target) {
            if (source.same(target) || source.edgesWith(target).nonempty()) {
                return;
            }

            const name = GraphNaming.nextEdgeName(cy, AppSettings.get("edgeNames"), AppSettings.get("edgePrefix"));

            history.record();
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
            history.record();
            elements.remove();
        }


        function deleteSelected() {
            removeElements(cy.elements(":selected"));
        }


        function clearGraph() {
            removeElements(cy.elements());
        }


        // Swaps in a whole new graph (e.g. from a file) as one undo step.
        function replaceGraph(elements) {
            cancelEdge();
            history.record();

            cy.batch(() => {
                cy.elements().remove();
                cy.add(elements);
            });
        }


        // Renames every node (in id order) or edge (in creation order) with the current default pattern, as one undo step.
        // Returns how many were renamed.
        function renameAll(elements, dataKey, style, prefix, fallback) {
            if (elements.empty()) {
                return 0;
            }

            history.record();
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
            history.undo();
        }


        function redo() {
            cancelEdge();
            history.redo();
        }


        function clearSelection() {
            cancelEdge();
            cy.elements().unselect();
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
            preview.hide();
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


        // Only select mode selects, and dragging empty canvas there draws a marquee.
        // Every other tool pans when dragging empty canvas (they only act on clicks).
        // Select never pans; mouse-wheel zoom works in every tool (canvas.js).
        // Leaving select clears the selection; nodes cannot be moved with the pan or connect tools.
        function setTool(tool) {
            cancelEdge();
            activeTool = tool;

            if (tool !== "select") {
                cy.elements().unselect();
            }

            cy.autounselectify(tool !== "select");
            cy.boxSelectionEnabled(tool === "select");
            cy.userPanningEnabled(tool !== "select");
            cy.autoungrabify(tool === "pan" || tool === "edge");

            setCursor(MODES[tool].cursor);
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


        function drawEdgePreview(renderedPosition) {
            const target = cy.nodes(".edge-target");
            preview.draw(edgeSource, renderedPosition, target.nonempty() ? target[0] : null);
        }


        function onPointerMove(event) {
            if (edgeSource) {
                drawEdgePreview(event.renderedPosition);
            }
        }


        // Connect Tool Dragging
        // Pressing a node and dragging to another node connects them; releasing anywhere else cancels.
        // A plain click is still handled by onTapNode (click one node, then the other).

        function onNodePress(event) {
            if (activeTool !== "edge") {
                return;
            }

            // A drag that starts on a node draws an edge, so it must not pan the canvas.
            connectPress = { node: event.target, panning: cy.userPanningEnabled(), dragging: false };
            cy.userPanningEnabled(false);
        }


        function onConnectDrag(event) {
            if (!connectPress) {
                return;
            }

            if (!connectPress.dragging) {
                connectPress.dragging = true;

                if (!edgeSource) {
                    startEdge(connectPress.node);
                }
            }

            drawEdgePreview(event.renderedPosition);
        }


        function onConnectRelease(event) {
            if (!connectPress) {
                return;
            }

            const { dragging, panning } = connectPress;
            connectPress = null;
            cy.userPanningEnabled(panning);

            if (!dragging) {
                return;
            }

            const target = event.target;

            if (target !== cy && target.isNode()) {
                addEdge(edgeSource, target);
            }

            cancelEdge();
        }


        // Dragging a node moves every selected node, so one snapshot covers the whole move.
        function onGrabNode() {
            dragStartState = history.snapshot();
        }


        function onDropNode() {
            history.record(dragStartState);
        }


        // Cytoscape cannot drag edges, so dragging a selected edge moves
        // the selected nodes and the endpoints of the selected edges.
        // Cytoscape treats a drag from an edge like the background, so marquee and panning are paused meanwhile.
        function onEdgePress(event) {
            if (activeTool !== "select" || !event.target.selected()) {
                return;
            }

            const selected = cy.elements(":selected");

            edgeDrag = {
                panning: cy.userPanningEnabled(),
                edge: event.target,
                nodes: selected.nodes().union(selected.edges().connectedNodes()),
                lastPosition: { ...event.position },
                startState: history.snapshot(),
                moved: false,
            };

            cy.boxSelectionEnabled(false);
            cy.userPanningEnabled(false);
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
                history.record(edgeDrag.startState);
                setTimeout(() => edge.selectify());
            }

            cy.boxSelectionEnabled(activeTool === "select");
            cy.userPanningEnabled(edgeDrag.panning);
            edgeDrag = null;
        }


        // Setup

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
        cy.on("tapstart", "node", onNodePress);
        cy.on("tapdrag", onConnectDrag);
        cy.on("tapend", onConnectRelease);

        cy.container().addEventListener("mouseleave", onLeaveCanvas);

        setTool(activeTool);

        return {
            setTool,
            deleteSelected,
            clearSelection,
            clearGraph,
            replaceGraph,
            renameNodes,
            renameEdges,
            undo,
            redo,
        };
    }


    return { create, hint };

})();
