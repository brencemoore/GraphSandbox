// Inspector
// Renames the selected node or edge, and sets an edge's value.

const Inspector = (() => {

    let cy = null;
    let element = null;
    let editStartState = null;
    let refreshScheduled = false;

    let card = null;
    let title = null;
    let nameInput = null;
    let valueField = null;
    let valueInput = null;


    function selectedElement() {
        const selected = cy.elements(":selected");
        return selected.length === 1 ? selected[0] : null;
    }


    function describe(target) {
        if (target.isNode()) {
            return "Node";
        }

        return `Edge ${target.source().data("label")} – ${target.target().data("label")}`;
    }


    // Display

    function show(target) {
        element = target;

        title.textContent = describe(target);
        nameInput.value = target.isNode() ? target.data("label") : target.data("name");
        valueInput.value = target.isEdge() ? target.data("value") : "";

        valueField.classList.toggle("d-none", target.isNode());
        card.classList.remove("d-none");
    }


    function hide() {
        element = null;
        card.classList.add("d-none");
    }


    function refresh() {
        refreshScheduled = false;

        const target = selectedElement();
        target ? show(target) : hide();
    }


    // Selection events fire once per element, so refresh once per frame.
    function scheduleRefresh() {
        if (!refreshScheduled) {
            refreshScheduled = true;
            requestAnimationFrame(refresh);
        }
    }


    // Editing
    // Typing updates the graph live; each committed change is one undo step.

    function startEdit() {
        editStartState = GraphHistory.snapshot();
    }


    function commitEdit() {
        GraphHistory.record(editStartState);
        startEdit();
    }


    // An empty node name falls back to the node's id.
    function onNameInput() {
        const name = nameInput.value.trim();

        if (element.isNode()) {
            element.data("label", name || element.id());
        } else {
            element.data("name", name);
        }
    }


    function onValueInput() {
        element.data("value", valueInput.value);
    }


    function blurOnEnter(event) {
        if (event.key === "Enter") {
            event.target.blur();
        }
    }


    function bindInput(input, onInput) {
        input.addEventListener("focus", startEdit);
        input.addEventListener("input", onInput);
        input.addEventListener("change", commitEdit);
        input.addEventListener("keydown", blurOnEnter);
    }


    // Setup

    function init(graph) {
        cy = graph;

        card = document.getElementById("inspector");
        title = document.getElementById("inspectorTitle");
        nameInput = document.getElementById("elementName");
        valueField = document.getElementById("edgeValueField");
        valueInput = document.getElementById("edgeValue");

        bindInput(nameInput, onNameInput);
        bindInput(valueInput, onValueInput);

        cy.on("select unselect add remove", scheduleRefresh);
    }


    return { init };

})();
