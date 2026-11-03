// Settings
// Holds the app settings, saves them in the browser, and keeps the settings modal in sync.

const AppSettings = (() => {

    const STORAGE_KEY = "graphsandbox.settings";

    const DEFAULTS = {
        autoUpdate: true,
        nodeNames: "numbers",
        nodePrefix: "v",
        edgeNames: "none",
        edgePrefix: "e",
        showLabels: true,
        showGrid: true,
        darkMode: false,
    };

    const values = { ...DEFAULTS };
    const listeners = [];


    // Storage
    // Storage can be unavailable (private windows, blocked site data), so failures fall back to defaults.

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};

            Object.keys(DEFAULTS)
                .filter(key => typeof saved[key] === typeof DEFAULTS[key])
                .forEach(key => { values[key] = saved[key]; });
        } catch {
            // Keep the defaults.
        }
    }


    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        } catch {
            // Settings still apply for this visit.
        }
    }


    // Values

    function get(key) {
        return values[key];
    }


    function set(key, value) {
        values[key] = value;
        save();
        listeners.forEach(listener => listener(key, value));
    }


    // Listener is called with (key, value) whenever a setting changes.
    function onChange(listener) {
        listeners.push(listener);
    }


    // Calls the listener once for every setting, e.g. to apply saved settings on load.
    function applyAll(listener) {
        Object.entries(values).forEach(([key, value]) => listener(key, value));
    }


    // Modal
    // Inputs name their setting with data-setting: radios use their value,
    // checkboxes their checked state, text inputs their text.

    function bindInput(input) {
        const key = input.dataset.setting;

        if (input.type === "radio") {
            input.checked = input.value === values[key];
            input.addEventListener("change", () => set(key, input.value));
        } else if (input.type === "checkbox") {
            input.checked = values[key];
            input.addEventListener("change", () => set(key, input.checked));
        } else {
            input.value = values[key];
            input.addEventListener("input", () => set(key, input.value.trim()));
        }
    }


    function init() {
        load();
        document.querySelectorAll("[data-setting]").forEach(bindInput);
    }


    return { init, get, onChange, applyAll };

})();
