// Settings Dialog
// Edits a draft of the settings: Save applies it (renaming existing nodes/edges if their naming
// style changed, after asking), Cancel or closing the dialog throws it away.

const SettingsDialog = (() => {

    const NAMING = {
        node: { style: "nodeNames", prefix: "nodePrefix", singular: "node", plural: "nodes" },
        edge: { style: "edgeNames", prefix: "edgePrefix", singular: "edge", plural: "edges" },
    };

    let getWorkspaces = () => [];
    let dialog = null;
    let modal = null;
    let draft = {};
    let keepDraft = false;


    // Draft and Inputs
    // Inputs name their setting with data-setting: radios use their value,
    // checkboxes their checked state, text inputs their text.

    function inputValue(input) {
        if (input.type === "radio") {
            return input.value;
        }

        return input.type === "checkbox" ? input.checked : input.value.trim();
    }


    function showDraft(input) {
        const value = draft[input.dataset.setting];

        if (input.type === "radio") {
            input.checked = input.value === value;
        } else if (input.type === "checkbox") {
            input.checked = value;
        } else {
            input.value = value;
        }
    }


    function onInput(event) {
        draft[event.target.dataset.setting] = inputValue(event.target);
        updateNamingPreviews();
    }


    // Naming

    function exampleNames(kind, settings) {
        const naming = NAMING[kind];
        return GraphNaming.examples(settings[naming.style], settings[naming.prefix]);
    }


    function describeNames(kind, settings) {
        const names = exampleNames(kind, settings);
        return names.every(name => name === "") ? "no name" : `${names.join(", ")}, …`;
    }


    // The prefix box only applies to the "Prefix" style; the preview shows what names will look like.
    function updateNamingPreviews() {
        Object.entries(NAMING).forEach(([kind, naming]) => {
            document.getElementById(`${kind}PrefixSetting`).disabled = draft[naming.style] !== "custom";
            document.getElementById(`${kind}NamesPreview`).textContent = `New ${naming.plural}: ${describeNames(kind, draft)}`;
        });
    }


    // How many nodes or edges there are across the open workspaces.
    function countAll(kind) {
        return getWorkspaces()
            .map(workspace => (kind === "node" ? workspace.cy.nodes() : workspace.cy.edges()).length)
            .reduce((total, count) => total + count, 0);
    }


    // "1 node", "3 nodes"
    function countOf(kind, count) {
        return `${count} ${count === 1 ? NAMING[kind].singular : NAMING[kind].plural}`;
    }


    // Kinds whose names would come out differently and that exist on the canvas.
    function kindsToRename() {
        const saved = AppSettings.all();

        return Object.keys(NAMING).filter(kind => {
            const changed = exampleNames(kind, draft).join() !== exampleNames(kind, saved).join();
            return changed && countAll(kind) > 0;
        });
    }


    function renameSentence(kind) {
        const items = countOf(kind, countAll(kind));
        const names = exampleNames(kind, draft);

        return names.every(name => name === "")
            ? `Names will be removed from ${items}.`
            : `${items[0].toUpperCase()}${items.slice(1)} will be renamed to ${names.join(", ")}, …`;
    }


    function confirmRename(kinds) {
        const subject = kinds.map(kind => NAMING[kind].plural).join(" and ");

        return ConfirmDialog.ask({
            title: `Rename existing ${subject}?`,
            message: `${kinds.map(renameSentence).join(" ")} You can undo this with Ctrl+Z.`,
            confirmLabel: "Save and rename",
            confirmVariant: "accent",
        });
    }


    // Saving

    function hideDialog() {
        return new Promise(resolve => {
            dialog.addEventListener("hidden.bs.modal", resolve, { once: true });
            modal.hide();
        });
    }


    function renameExisting(kinds) {
        const renamed = kinds.map(kind => {
            const count = getWorkspaces()
                .map(({ tools }) => (kind === "node" ? tools.renameNodes() : tools.renameEdges()))
                .reduce((total, renamedHere) => total + renamedHere, 0);

            return countOf(kind, count);
        });

        return renamed.length > 0 ? ` Renamed ${renamed.join(" and ")}.` : "";
    }


    // Asks before renaming; if the user says no, the dialog comes back with their edits intact.
    async function save() {
        const kinds = kindsToRename();
        await hideDialog();

        if (kinds.length > 0 && !(await confirmRename(kinds))) {
            keepDraft = true;
            modal.show();
            return;
        }

        AppSettings.update(draft);
        Notify.show(`Settings saved.${renameExisting(kinds)}`);
    }


    // Setup

    // Each opening starts from the saved settings, except when returning from the rename question.
    function onShow() {
        if (!keepDraft) {
            draft = AppSettings.all();
        }

        keepDraft = false;
        dialog.querySelectorAll("[data-setting]").forEach(showDraft);
        updateNamingPreviews();
    }


    // workspacesGetter returns the open workspaces, whose existing names may be renamed.
    function init(workspacesGetter) {
        getWorkspaces = workspacesGetter;
        dialog = document.getElementById("settingsModal");
        modal = bootstrap.Modal.getOrCreateInstance(dialog);

        dialog.querySelectorAll("[data-setting]").forEach(input => {
            input.addEventListener(input.type === "text" ? "input" : "change", onInput);
        });

        dialog.addEventListener("show.bs.modal", onShow);
        document.getElementById("saveSettings").addEventListener("click", save);
    }


    return { init };

})();
