// Python Engine
// Loads Pyodide with NetworkX and calls the Python functions in py/ (analysis, comparison, file import/export).

const PythonEngine = (() => {

    const PACKAGES = ["numpy", "scipy", "networkx"];
    const MODULES = ["graph_math", "graph_compare", "graph_io"];

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


    // Each py/ file is written into Pyodide's file system so it can be imported as its own module;
    // that keeps names in one file from clashing with another, and lets files import each other.
    async function loadEngine() {
        const pyodide = await loadPyodide();
        await pyodide.loadPackage(packageUrls(pyodide));

        for (const module of MODULES) {
            pyodide.FS.writeFile(`${module}.py`, await fetchText(`py/${module}.py`));
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


    // Calls module.function with string arguments; it returns text.
    // Function proxies are kept so Pyodide does not create a new one per call.
    async function call(module, functionName, ...args) {
        const pyodide = await load();
        const key = `${module}.${functionName}`;

        pythonFunctions[key] ??= pyodide.pyimport(module)[functionName];
        return pythonFunctions[key](...args);
    }


    async function run(analysisName, graphData) {
        return JSON.parse(await call("graph_math", "run_analysis", analysisName, JSON.stringify(graphData)));
    }


    // Returns the file contents for a data format such as "graphml" or "edges_csv".
    function exportGraph(format, graphData) {
        return call("graph_io", "export_graph", format, JSON.stringify(graphData));
    }


    // Checks two graphs for isomorphism; see py/graph_compare.py for the result's shape.
    async function compareGraphs(firstGraph, secondGraph) {
        const result = await call("graph_compare", "compare_graphs", JSON.stringify(firstGraph), JSON.stringify(secondGraph));
        return JSON.parse(result);
    }


    // Reads a graph file's text; returns the graph (see py/graph_io.py) or { error }.
    async function importGraph(fileName, text) {
        return JSON.parse(await call("graph_io", "import_graph", fileName, text));
    }


    return { load, isReady, run, compareGraphs, exportGraph, importGraph };

})();
