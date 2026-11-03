// Confirm Dialog
// Asks the user to confirm an action, such as deleting or renaming the graph.

const ConfirmDialog = (() => {

    let modal = null;
    let resolveAnswer = null;


    function answer(confirmed) {
        resolveAnswer?.(confirmed);
        resolveAnswer = null;
    }


    // Resolves to true when the user confirms, false when they cancel or close the dialog.
    // confirmVariant is the confirm button's style, e.g. "danger" or "accent".
    function ask({ title, message, confirmLabel, confirmVariant = "danger" }) {
        const acceptButton = document.getElementById("confirmAccept");

        document.getElementById("confirmTitle").textContent = title;
        document.getElementById("confirmMessage").textContent = message;
        acceptButton.textContent = confirmLabel;
        acceptButton.className = `btn btn-${confirmVariant}`;

        answer(false);
        modal.show();

        return new Promise(resolve => { resolveAnswer = resolve; });
    }


    function init() {
        const dialog = document.getElementById("confirmModal");
        modal = bootstrap.Modal.getOrCreateInstance(dialog);

        document.getElementById("confirmAccept").addEventListener("click", () => {
            answer(true);
            modal.hide();
        });

        dialog.addEventListener("hidden.bs.modal", () => answer(false));
    }


    return { init, ask };

})();
