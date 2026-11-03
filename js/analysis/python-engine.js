// Python Engine
// Loads Pyodide with NetworkX and runs the analysis functions in py/graph_math.py.

const PythonEngine = (() => {

    const PACKAGES = ["numpy", "scipy", "networkx"];
    const SCRIPT_URL = "py/graph_math.py";

    let enginePromise = null;
    let ready = false;


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

        pyodide.runPython(await fetchText(SCRIPT_URL));
        ready = true;
        return pyodide.globals.get("run_analysis");
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


    async function run(analysisName, graphData) {
        const runAnalysis = await load();
        return JSON.parse(runAnalysis(analysisName, JSON.stringify(graphData)));
    }


    return { load, isReady, run };

})();
