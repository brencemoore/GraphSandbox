// Settings
// Holds the app settings and keeps the settings modal in sync with them.

const AppSettings = (() => {

    const values = {
        autoUpdate: true,
        edgeNames: "none",
        showLabels: true,
        showGrid: true,
        darkMode: false,
    };

    const listeners = [];


    function get(key) {
        return values[key];
    }


    function set(key, value) {
        values[key] = value;
        listeners.forEach(listener => listener(key, value));
    }


    // Listener is called with (key, value) whenever a setting changes.
    function onChange(listener) {
        listeners.push(listener);
    }


    // Inputs name their setting with data-setting; radios use their value, checkboxes their checked state.
    function bindInput(input) {
        const key = input.dataset.setting;
        const isRadio = input.type === "radio";

        input.checked = isRadio ? input.value === values[key] : values[key];
        input.addEventListener("change", () => set(key, isRadio ? input.value : input.checked));
    }


    function init() {
        document.querySelectorAll("[data-setting]").forEach(bindInput);
    }


    return { init, get, onChange };

})();
