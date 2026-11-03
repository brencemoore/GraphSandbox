// Settings
// Holds the app settings and saves them in the browser. The settings dialog is js/settings-dialog.js.

const AppSettings = (() => {

    const STORAGE_KEY = "graphsandbox.settings";

    const DEFAULTS = {
        autoUpdate: true,
        nodeNames: "numbers",
        nodePrefix: "v",
        edgeNames: "none",
        edgePrefix: "e",
        showLabels: true,
        showCounts: true,
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


    function all() {
        return { ...values };
    }


    // Applies every changed value, saves once, then tells the listeners about each change.
    function update(changes) {
        const changedKeys = Object.keys(changes).filter(key => key in DEFAULTS && changes[key] !== values[key]);

        changedKeys.forEach(key => { values[key] = changes[key]; });
        save();
        changedKeys.forEach(key => listeners.forEach(listener => listener(key, values[key])));
    }


    // Listener is called with (key, value) whenever a setting changes.
    function onChange(listener) {
        listeners.push(listener);
    }


    // Calls the listener once for every setting, e.g. to apply saved settings on load.
    function applyAll(listener) {
        Object.entries(values).forEach(([key, value]) => listener(key, value));
    }


    function init() {
        load();
    }


    return { init, get, all, update, onChange, applyAll };

})();
