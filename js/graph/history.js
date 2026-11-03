// Graph History
// Undo and redo by storing snapshots of the graph's elements.

const GraphHistory = (() => {

    const MAX_STEPS = 100;

    let cy = null;
    let onChange = () => {};
    let undoStack = [];
    let redoStack = [];


    // Classes and grab state only describe the current interaction (hover, connecting, dragging), so they are not kept.
    function snapshot() {
        return cy.elements().jsons().map(json => ({ ...json, classes: "", grabbed: false }));
    }


    function restore(state) {
        cy.batch(() => {
            cy.elements().remove();
            cy.add(state);
        });
    }


    // Call before changing the graph, or pass a snapshot taken earlier.
    function record(state = snapshot()) {
        undoStack.push(state);

        if (undoStack.length > MAX_STEPS) {
            undoStack.shift();
        }

        redoStack = [];
        onChange();
    }


    function undo() {
        if (undoStack.length === 0) {
            return;
        }

        redoStack.push(snapshot());
        restore(undoStack.pop());
        onChange();
    }


    function redo() {
        if (redoStack.length === 0) {
            return;
        }

        undoStack.push(snapshot());
        restore(redoStack.pop());
        onChange();
    }


    function canUndo() {
        return undoStack.length > 0;
    }


    function canRedo() {
        return redoStack.length > 0;
    }


    function init(graph, changeListener) {
        cy = graph;
        onChange = changeListener;
    }


    return { init, snapshot, record, undo, redo, canUndo, canRedo };

})();
