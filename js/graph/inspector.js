// Inspector
// Renames a workspace's selected node or edge, and sets an edge's value.

const Inspector = (() => {

    function describe(target) {
        if (target.isNode()) {
            return "Node";
        }

        return `Edge ${target.source().data("label")} – ${target.target().data("label")}`;
    }


    function blurOnEnter(event) {
        if (event.key === "Enter") {
            event.target.blur();
        }
    }


    // card is the workspace's inspector element; its parts are found by data-role.
    function create(cy, history, card) {
        const title = card.querySelector("[data-role='inspector-title']");
        const nameInput = card.querySelector("[data-role='element-name']");
        const valueField = card.querySelector("[data-role='edge-value-field']");
        const valueInput = card.querySelector("[data-role='edge-value']");

        let element = null;
        let editStartState = null;
        let refreshScheduled = false;


        function selectedElement() {
            const selected = cy.elements(":selected");
            return selected.length === 1 ? selected[0] : null;
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

            // Leave the fields alone while the user is typing in them.
            if (card.contains(document.activeElement)) {
                return;
            }

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
            editStartState = history.snapshot();
        }


        function commitEdit() {
            history.record(editStartState);
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


        function bindInput(input, onInput) {
            input.addEventListener("focus", startEdit);
            input.addEventListener("input", onInput);
            input.addEventListener("change", commitEdit);
            input.addEventListener("keydown", blurOnEnter);
        }


        bindInput(nameInput, onNameInput);
        bindInput(valueInput, onValueInput);

        cy.on("select unselect add remove data", scheduleRefresh);
    }


    return { create };

})();
