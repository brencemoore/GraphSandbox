// Settings
// Applies the options in the settings modal.

const Settings = (() => {

    function setDarkMode(enabled) {
        document.documentElement.setAttribute("data-bs-theme", enabled ? "dark" : "light");
        GraphCanvas.refreshStyle();
    }


    function init() {
        const darkMode = document.getElementById("darkMode");
        const showLabels = document.getElementById("showLabels");

        darkMode.addEventListener("change", () => setDarkMode(darkMode.checked));
        showLabels.addEventListener("change", () => GraphCanvas.setLabelsVisible(showLabels.checked));
    }


    return { init };

})();
