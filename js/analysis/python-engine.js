// Python Engine
// Loads Pyodide with NetworkX and calls the Python functions in py/ (analysis and export).

const PythonEngine = (() => {

    const PACKAGES = ["numpy", "scipy", "networkx"];
    const SCRIPT_URLS = ["py/graph_math.py", "py/graph_export.py"];

    let enginePromise = null;
    let ready = false;
    const pythonFunctions = {};


    // Loading by URL skips dependency resolution, which keeps NetworkX's
    // optional plotting packages (matplotlib) from being downloaded.
    function packageUrls(pyodide) {
        const baseUrl = `https://cdn.jsdelivr.net/pyodide/v${pyodide.version}/full/`;
        return PACKAGES.map(name => baseUrl + pyodide.lockfile.packages[name].file_name);
    }


    async function fetchText(url) {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Could not load ${url}`);
        }

        return response.text();
    }


    async function loadEngine() {
        const pyodide = await loadPyodide();
        await pyodide.loadPackage(packageUrls(pyodide));

        for (const url of SCRIPT_URLS) {
            pyodide.runPython(await fetchText(url));
        }

        ready = true;
        return pyodide;
    }


    function isReady() {
        return ready;
    }


    // Loads once; a failed load is retried on the next call.
    function load() {
        enginePromise ??= loadEngine().catch(error => {
            enginePromise = null;
            throw error;
        });

        return enginePromise;
    }


    // Calls a Python function that takes (name, graph JSON) and returns text.
    // Function proxies are kept so Pyodide does not create a new one per call.
    async function call(functionName, name, graphData) {
        const pyodide = await load();
        pythonFunctions[functionName] ??= pyodide.globals.get(functionName);
        return pythonFunctions[functionName](name, JSON.stringify(graphData));
    }


    async function run(analysisName, graphData) {
        return JSON.parse(await call("run_analysis", analysisName, graphData));
    }


    // Returns the file contents for a data format such as "graphml" or "edges_csv".
    function exportGraph(format, graphData) {
        return call("export_graph", format, graphData);
    }


    return { load, isReady, run, exportGraph };

})();
