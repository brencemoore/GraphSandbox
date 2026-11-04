// Workspace
// One graph canvas with everything attached to it: undo history, tools, inspector, selection box,
// edge preview, counts and zoom controls. Built from the #workspaceTemplate markup.

const Workspace = (() => {

    function part(root, role) {
        return root.querySelector(`[data-role="${role}"]`);
    }


    function bindZoomControls(workspace) {
        const { root, canvas, cy } = workspace;
        const zoomLevel = part(root, "zoom-level");

        part(root, "zoom-in").addEventListener("click", canvas.zoomIn);
        part(root, "zoom-out").addEventListener("click", canvas.zoomOut);
        part(root, "fit").addEventListener("click", canvas.fit);

        const showZoom = () => { zoomLevel.textContent = `${canvas.zoomPercent()}%`; };
        cy.on("zoom", showZoom);
        showZoom();
    }


    // tab is this workspace's tab in the workspace bar.
    // callbacks: onHistoryChange, onSelectionChange and onActivate, each called with the workspace.
    function create(number, tab, callbacks) {
        const root = document.getElementById("workspaceTemplate").content.firstElementChild.cloneNode(true);
        document.getElementById("workspaces").append(root);

        const canvas = GraphCanvas.create(part(root, "canvas"));
        const cy = canvas.cy;
        const workspace = { number, name: `Graph ${number}`, root, tab, canvas, cy };

        workspace.history = GraphHistory.create(cy, () => callbacks.onHistoryChange(workspace));
        workspace.tools = GraphTools.create(cy, workspace.history, EdgePreview.create(part(root, "edge-preview")));
        workspace.summary = GraphSummary.create(
            cy,
            [part(root, "counts"), tab.querySelector("[data-role='tab-counts']")],
            part(root, "empty"),
        );
        workspace.header = part(root, "header");

        Inspector.create(cy, workspace.history, part(root, "inspector"));
        Marquee.create(cy, part(root, "touch-marquee"));
        bindZoomControls(workspace);

        cy.on("select unselect add remove", () => callbacks.onSelectionChange(workspace));
        root.addEventListener("pointerdown", () => callbacks.onActivate(workspace), true);

        return workspace;
    }


    return { create };

})();
