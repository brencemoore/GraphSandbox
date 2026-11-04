// Graph Summary
// Keeps a workspace's node and edge counts and its empty-canvas message up to date.

const GraphSummary = (() => {

    function plural(count, word) {
        return `${count} ${word}${count === 1 ? "" : "s"}`;
    }


    // countElements show "3 nodes · 2 edges"; emptyMessage is hidden once there are nodes.
    function create(cy, countElements, emptyMessage) {
        let updateScheduled = false;


        function text() {
            return `${plural(cy.nodes().length, "node")} · ${plural(cy.edges().length, "edge")}`;
        }


        function update() {
            updateScheduled = false;

            countElements.forEach(element => { element.textContent = text(); });
            emptyMessage.classList.toggle("d-none", cy.nodes().nonempty());
        }


        // Batched changes fire one event per element, so update once per frame.
        function scheduleUpdate() {
            if (!updateScheduled) {
                updateScheduled = true;
                requestAnimationFrame(update);
            }
        }


        cy.on("add remove", scheduleUpdate);
        update();

        return { text };
    }


    return { create };

})();
