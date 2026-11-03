// Confirm Dialog
// Asks the user to confirm an action that deletes something.

const ConfirmDialog = (() => {

    let modal = null;
    let resolveAnswer = null;


    function answer(confirmed) {
        resolveAnswer?.(confirmed);
        resolveAnswer = null;
    }


    // Resolves to true when the user confirms, false when they cancel or close the dialog.
    function ask({ title, message, confirmLabel }) {
        document.getElementById("confirmTitle").textContent = title;
        document.getElementById("confirmMessage").textContent = message;
        document.getElementById("confirmAccept").textContent = confirmLabel;

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
