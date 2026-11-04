// Workspaces
// Shows one or two graph workspaces and tracks the active one: the workspace that New graph,
// Open, Save, undo/redo and keyboard shortcuts act on. With two, they sit side by side from
// tablets up, and the workspace bar above them highlights the active one; on phones only the
// active workspace is shown and the bar's tabs switch between them.

const Workspaces = (() => {

    let list = [];
    let shown = [];
    let active = null;
    const listeners = [];


    function isSplit() {
        return shown.length === 2;
    }


    // Listener is called whenever the active workspace or the layout changes.
    function onChange(listener) {
        listeners.push(listener);
    }


    function notify() {
        listeners.forEach(listener => listener());
    }


    // Layout

    function applyLayout() {
        const split = isSplit();
        document.getElementById("workspaceBar").classList.toggle("d-none", !split);

        list.forEach(workspace => {
            const inView = shown.includes(workspace);
            const phoneHidden = split && workspace !== active;

            workspace.root.classList.toggle("d-none", !inView || phoneHidden);
            workspace.root.classList.toggle("d-md-block", inView && phoneHidden);
            workspace.root.classList.toggle("border-start", split && workspace === shown[1]);
            workspace.tab.querySelector("[data-role='tab-select']").classList.toggle("active", workspace === active);
        });

        list.forEach(workspace => workspace.canvas.resize());
    }


    // Actions

    function setActive(workspace) {
        if (workspace === active || !shown.includes(workspace)) {
            return;
        }

        active = workspace;
        applyLayout();
        notify();
    }


    function addSecond() {
        const hidden = list.find(workspace => !shown.includes(workspace));

        if (!hidden) {
            return;
        }

        shown = list.filter(workspace => workspace === hidden || shown.includes(workspace));
        active = hidden;

        // Each workspace is now half as wide, so refit both views to keep their graphs in sight.
        applyLayout();
        shown.forEach(workspace => workspace.canvas.fit());
        notify();
    }


    function confirmClose(workspace) {
        if (workspace.cy.elements().empty()) {
            return Promise.resolve(true);
        }

        return ConfirmDialog.ask({
            title: `Close ${workspace.name}?`,
            message: `Its graph (${workspace.summary.text()}) will be deleted. This can't be undone.`,
            confirmLabel: "Close and delete",
        });
    }


    // Closing deletes the workspace's graph and its undo history.
    async function close(workspace) {
        if (!isSplit() || !(await confirmClose(workspace))) {
            return;
        }

        workspace.tools.clearSelection();
        workspace.cy.elements().remove();
        workspace.history.clear();

        shown = shown.filter(other => other !== workspace);
        active = shown[0];

        applyLayout();
        notify();
    }


    // Setup

    function init(workspaces) {
        list = workspaces;
        shown = [list[0]];
        active = list[0];

        list.forEach(workspace => {
            workspace.tab.querySelector("[data-role='tab-select']").addEventListener("click", () => setActive(workspace));
            workspace.tab.querySelector("[data-role='tab-close']").addEventListener("click", () => close(workspace));
        });

        applyLayout();
    }


    return {
        init,
        onChange,
        isSplit,
        setActive,
        addSecond,
        close,
        all: () => list,
        visible: () => shown,
        active: () => active,
    };

})();
